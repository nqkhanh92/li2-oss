import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WIDTH,
  MAX_MARGIN,
  MAX_WIDTH,
  MIN_WIDTH,
  parseQrFormat,
  publicLinkUrl,
  qrPng,
  qrSvg,
  resolveQrOptions,
} from '@/lib/qr/generate'

describe('resolveQrOptions — giới hạn máy chủ thắng tuỳ chọn người dùng', () => {
  it('kẹp `width` vào [64, 2048]', () => {
    expect(resolveQrOptions({ width: 100_000 }).width).toBe(MAX_WIDTH)
    expect(resolveQrOptions({ width: 1 }).width).toBe(MIN_WIDTH)
    expect(resolveQrOptions({ width: -500 }).width).toBe(MIN_WIDTH)
    expect(resolveQrOptions({ width: 1024 }).width).toBe(1024)
  })

  it('giá trị `width` không phải số thì dùng mặc định máy chủ', () => {
    expect(resolveQrOptions({}).width).toBe(DEFAULT_WIDTH)
    expect(resolveQrOptions({ width: Number.NaN }).width).toBe(DEFAULT_WIDTH)
    expect(resolveQrOptions({ width: Number.POSITIVE_INFINITY }).width).toBe(DEFAULT_WIDTH)
    expect(resolveQrOptions({ width: 'rất to' as unknown as number }).width).toBe(DEFAULT_WIDTH)
  })

  it('kẹp `margin`', () => {
    expect(resolveQrOptions({ margin: 999 }).margin).toBe(MAX_MARGIN)
    expect(resolveQrOptions({ margin: -5 }).margin).toBe(0)
  })

  it('người dùng KHÔNG ghi đè được `errorCorrectionLevel`', () => {
    // Đây là bài test cho thứ tự spread: `...user` phải đi TRƯỚC các khoá có giới hạn. Nếu ai đảo
    // lại thành `{ ...serverDefaults, ...user }` thì test này đỏ.
    const sneaky = { errorCorrectionLevel: 'L', width: 99_999 } as unknown as { width: number }
    const resolved = resolveQrOptions(sneaky)
    expect(resolved.errorCorrectionLevel).toBe('M')
    expect(resolved.width).toBe(MAX_WIDTH)
  })

  it('thêm khoá lạ không vượt được giới hạn nào', () => {
    const resolved = resolveQrOptions({
      width: 5000,
      margin: 100,
      // Các khoá dưới đây không có trong API; mục đích là chứng minh chúng không đụng tới giới hạn.
      scale: 100,
      type: 'utf8',
    } as unknown as { width: number })

    expect(resolved.width).toBe(MAX_WIDTH)
    expect(resolved.margin).toBe(MAX_MARGIN)
    expect(resolved.errorCorrectionLevel).toBe('M')
  })

  it('chỉ nhận màu hex, giá trị khác rơi về mặc định', () => {
    expect(resolveQrOptions({ dark: '#ff0000' }).color.dark).toBe('#ff0000')
    expect(resolveQrOptions({ dark: '#f00' }).color.dark).toBe('#f00')
    expect(resolveQrOptions({ light: '#ffffff80' }).color.light).toBe('#ffffff80')

    // Chuỗi tự do đi thẳng vào thuộc tính `fill` của SVG là một đường tiêm.
    expect(resolveQrOptions({ dark: 'red" onload="alert(1)' }).color.dark).toBe('#000000')
    expect(resolveQrOptions({ dark: 'url(https://x/)' }).color.dark).toBe('#000000')
    expect(resolveQrOptions({ light: 'javascript:alert(1)' }).color.light).toBe('#ffffff')
  })
})

describe('parseQrFormat', () => {
  it('chỉ `svg` ra svg, mọi thứ khác ra png', () => {
    expect(parseQrFormat('svg')).toBe('svg')
    expect(parseQrFormat('png')).toBe('png')
    expect(parseQrFormat(null)).toBe('png')
    expect(parseQrFormat('SVG')).toBe('png')
    expect(parseQrFormat('../../etc/passwd')).toBe('png')
  })
})

describe('publicLinkUrl', () => {
  it('nối slug vào PUBLIC_BASE_URL', () => {
    const original = process.env.PUBLIC_BASE_URL
    try {
      process.env.PUBLIC_BASE_URL = 'https://vi-du.test'
      expect(publicLinkUrl('abc123')).toBe('https://vi-du.test/abc123')

      // Base có đường dẫn con hay dấu `/` cuối đều không làm sai kết quả.
      process.env.PUBLIC_BASE_URL = 'https://vi-du.test/'
      expect(publicLinkUrl('abc123')).toBe('https://vi-du.test/abc123')
    } finally {
      if (original === undefined) delete process.env.PUBLIC_BASE_URL
      else process.env.PUBLIC_BASE_URL = original
    }
  })

  it('thiếu PUBLIC_BASE_URL thì throw, không có domain mặc định nào', () => {
    const original = process.env.PUBLIC_BASE_URL
    try {
      delete process.env.PUBLIC_BASE_URL
      expect(() => publicLinkUrl('abc123')).toThrow(/PUBLIC_BASE_URL/)
    } finally {
      if (original !== undefined) process.env.PUBLIC_BASE_URL = original
    }
  })
})

describe('sinh QR thật', () => {
  it('PNG ra buffer khác rỗng và có magic bytes của PNG', async () => {
    const png = await qrPng('https://vi-du.test/abc123')
    expect(png.length).toBeGreaterThan(0)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('SVG chứa `<svg`', async () => {
    const svg = await qrSvg('https://vi-du.test/abc123')
    expect(svg).toContain('<svg')
    expect(svg.length).toBeGreaterThan(0)
  })

  it('`width` quá lớn không sinh ra ảnh quá lớn', async () => {
    // Nếu giới hạn bị ghi đè được thì lệnh này cố cấp phát một ảnh 100000px và test chết vì OOM
    // thay vì đỏ. Nên so sánh với ảnh ở đúng MAX_WIDTH: hai cái phải bằng nhau.
    const huge = await qrPng('https://vi-du.test/abc123', {
      width: 100_000,
    })
    const atMax = await qrPng('https://vi-du.test/abc123', { width: MAX_WIDTH })
    expect(huge.length).toBe(atMax.length)
  })
})
