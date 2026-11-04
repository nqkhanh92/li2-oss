import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  pool: {},
}))

/**
 * `checkDestination` được mock để CHỨNG MINH service gọi nó.
 *
 * Đây là điểm quan trọng nhất của file test này. Phép kiểm URL thật nằm ở
 * `lib/links/destination.ts` và nó xử một cái bẫy cụ thể (`/\evil.com` đi qua guard viết tay).
 * Nếu một ngày ai đó "đơn giản hoá" service bằng cách tự kiểm `startsWith('http')`, bẫy đó mở
 * lại mà không test nào đỏ — trừ test dưới đây.
 */
// `vi.hoisted` vì `vi.mock` được nâng lên đầu file: một `const` khai báo bình thường ở đây sẽ
// chưa khởi tạo lúc factory chạy, và lỗi hiện ra là "Cannot access before initialization".
const { checkDestination } = vi.hoisted(() => ({
  checkDestination: vi.fn(
    (raw: string): { ok: true; normalized: string } | { ok: false; reason: string } => ({
      ok: true,
      normalized: raw,
    })
  ),
}))
vi.mock('@/lib/links/destination', () => ({ checkDestination }))

import {
  SLUG_PATTERN,
  generateSlug,
  isValidSlug,
  normalizeSlug,
  prepareCreate,
  prepareUpdate,
} from '@/lib/links/service'

const baseInput = { destination: 'https://example.com/x', createdBy: 'user-1' }

beforeEach(() => {
  checkDestination.mockClear()
  checkDestination.mockImplementation((raw: string) => ({ ok: true, normalized: raw }))
})

describe('generateSlug', () => {
  it('khớp đúng CHECK constraint của schema', () => {
    // SLUG_PATTERN là bản sao của `db/schema.sql:44`. Slug sinh ra mà không khớp nghĩa là mỗi lần
    // tạo link tự động đều rơi vào một lỗi Postgres — và đó là lỗi chỉ hiện ra lúc chạy thật.
    for (let i = 0; i < 2000; i++) {
      expect(generateSlug()).toMatch(SLUG_PATTERN)
    }
  })

  it('dài 7 ký tự', () => {
    expect(generateSlug()).toHaveLength(7)
  })

  it('không bắt đầu bằng `_` hay `-` — ký tự đầu bị schema cấm', () => {
    for (let i = 0; i < 2000; i++) {
      expect(generateSlug().charAt(0)).toMatch(/[a-z0-9]/)
    }
  })

  it('đủ ngẫu nhiên để không trùng trong 2000 lần', () => {
    const slugs = new Set(Array.from({ length: 2000 }, () => generateSlug()))
    expect(slugs.size).toBe(2000)
  })
})

describe('normalizeSlug', () => {
  it('hạ chữ thường và bỏ khoảng trắng hai đầu', () => {
    expect(normalizeSlug('  Khuyen-Mai  ')).toBe('khuyen-mai')
  })
})

describe('isValidSlug — regex đúng như schema', () => {
  it.each(['a', '0', 'abc', 'a_b-c', 'a'.repeat(64)])('nhận %o', (slug) => {
    expect(isValidSlug(slug)).toBe(true)
  })

  it.each([
    ['', 'rỗng'],
    ['a'.repeat(65), '65 ký tự — dài hơn giới hạn 64'],
    ['ABC', 'chữ hoa'],
    ['a/b', 'dấu gạch chéo — sẽ thành hai đoạn path'],
    ['a.b', 'dấu chấm'],
    ['_abc', 'bắt đầu bằng gạch dưới'],
    ['-abc', 'bắt đầu bằng gạch nối'],
    ['a b', 'khoảng trắng'],
    ['a%2fb', 'đã encode nhưng vẫn có ký tự ngoài bảng'],
    ['tét', 'chữ có dấu'],
    ['a\nb', 'ký tự xuống dòng'],
  ])('từ chối %o (%s)', (slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })
})

describe('prepareCreate — slug', () => {
  it('slug rỗng thì sinh tự động', () => {
    const result = prepareCreate({ ...baseInput, slug: '' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toMatch(SLUG_PATTERN)
  })

  it('không truyền slug thì sinh tự động', () => {
    const result = prepareCreate(baseInput)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toMatch(SLUG_PATTERN)
  })

  it('slug chỉ có khoảng trắng cũng coi như rỗng → sinh tự động', () => {
    const result = prepareCreate({ ...baseInput, slug: '   ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toMatch(SLUG_PATTERN)
  })

  it.each(['a/b', 'a.b', '_abc', 'a b', 'a'.repeat(65), 'tét'])('từ chối slug %o', (slug) => {
    const result = prepareCreate({ ...baseInput, slug })
    expect(result.ok).toBe(false)
  })

  it('chữ hoa được CHUẨN HOÁ thành chữ thường, không bị từ chối', () => {
    // Có chủ ý: người dùng gõ "Khuyen-Mai" thì nhận "khuyen-mai", không nhận một lỗi. Nhưng
    // `isValidSlug('ABC')` vẫn phải là false, vì nó canh đúng CHECK constraint của DB.
    const result = prepareCreate({ ...baseInput, slug: 'Khuyen-Mai' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toBe('khuyen-mai')
  })

  it('slug 64 ký tự được nhận, 65 thì không', () => {
    expect(prepareCreate({ ...baseInput, slug: 'a'.repeat(64) }).ok).toBe(true)
    expect(prepareCreate({ ...baseInput, slug: 'a'.repeat(65) }).ok).toBe(false)
  })
})

describe('prepareCreate — destination', () => {
  it('GỌI checkDestination, không tự kiểm URL', () => {
    prepareCreate({ ...baseInput, destination: 'https://example.com/a' })
    expect(checkDestination).toHaveBeenCalledTimes(1)
    expect(checkDestination).toHaveBeenCalledWith('https://example.com/a')
  })

  it('checkDestination từ chối thì prepareCreate từ chối, kèm đúng lý do của nó', () => {
    checkDestination.mockReturnValue({ ok: false, reason: 'lý do từ destination.ts' })
    const result = prepareCreate(baseInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('lý do từ destination.ts')
  })

  it('kiểm destination TRƯỚC khi sinh slug — không tiêu slug cho một yêu cầu sẽ fail', () => {
    checkDestination.mockReturnValue({ ok: false, reason: 'sai' })
    const result = prepareCreate({ ...baseInput, slug: 'a/b' })
    // Cả hai đều sai; lỗi trả về là của destination, nghĩa là nó được kiểm trước.
    if (!result.ok) expect(result.error).toBe('sai')
  })

  it('dùng giá trị ĐÃ CHUẨN HOÁ của checkDestination, không dùng chuỗi thô', () => {
    checkDestination.mockReturnValue({
      ok: true,
      normalized: 'https://example.com/chuan-hoa',
    })
    const result = prepareCreate({ ...baseInput, destination: 'HTTPS://Example.com/thô' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.destination).toBe('https://example.com/chuan-hoa')
  })
})

describe('prepareCreate — title', () => {
  it('title rỗng hoặc chỉ khoảng trắng thành null, không thành chuỗi rỗng', () => {
    // Chuỗi rỗng trong DB và NULL là hai thứ khác nhau khi hiển thị; chọn một và giữ nó.
    const a = prepareCreate({ ...baseInput, title: '   ' })
    if (a.ok) expect(a.data.title).toBeNull()
    const b = prepareCreate({ ...baseInput, title: undefined })
    if (b.ok) expect(b.data.title).toBeNull()
  })

  it('title được trim', () => {
    const result = prepareCreate({ ...baseInput, title: '  Khuyến mãi  ' })
    if (result.ok) expect(result.data.title).toBe('Khuyến mãi')
  })
})

describe('prepareUpdate', () => {
  it('không có trường nào thì từ chối, thay vì chạy một UPDATE rỗng', () => {
    expect(prepareUpdate({}).ok).toBe(false)
  })

  it('cũng gọi checkDestination ở đường sửa', () => {
    prepareUpdate({ destination: 'https://example.com/b' })
    expect(checkDestination).toHaveBeenCalledWith('https://example.com/b')
  })

  it('không đụng destination thì không gọi checkDestination', () => {
    prepareUpdate({ title: 'x' })
    expect(checkDestination).not.toHaveBeenCalled()
  })

  it('isActive=false đi qua được — không bị nhầm là "không có giá trị"', () => {
    // Bẫy kinh điển: kiểm `if (input.isActive)` thay vì `!== undefined` làm nút "Tắt" im lặng
    // không làm gì, vì `false` là falsy.
    const result = prepareUpdate({ isActive: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.isActive).toBe(false)
  })

  it('không nhận slug — đổi slug làm QR đã in trỏ vào hư không', () => {
    // `as never` vì TypeScript đã chặn `slug` ở `UpdateLinkInput`. Test này chốt phép chặn còn
    // đúng cả lúc CHẠY — đường gọi từ JSON (API route) không đi qua type nào.
    const result = prepareUpdate({ slug: 'moi' } as never)
    expect(result.ok).toBe(false)
  })
})
