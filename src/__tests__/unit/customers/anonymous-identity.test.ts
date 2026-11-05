import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS_NAME_COMBINATIONS,
  anonymousAvatarSvg,
  anonymousDeviceName,
  anonymousIdentity,
} from '@/shared/lib/anonymous-identity'

/**
 * Danh tính của thiết bị ẩn danh sinh LÚC ĐỌC, không lưu DB. Cả thiết kế đó đứng trên MỘT tính
 * chất: hàm thuần. Nếu cùng `fp` ra hai tên khác nhau giữa hai lần tải trang thì người dùng thấy
 * "Cáo Lặng Lẽ" biến thành "Hổ Tò Mò" và không còn tin được gì — và vì không có hàng nào trong DB,
 * không có chỗ nào để đối chiếu mà phát hiện. Nên tính chất đó phải bị ghim bằng test.
 */

const fps = Array.from({ length: 200 }, (_, i) => `fp-${i}-${(i * 7919) % 1000}`)

describe('anonymousIdentity — cùng fp thì luôn cùng kết quả', () => {
  it('gọi 50 lần một fp ra đúng một tên và đúng một avatar', () => {
    const names = new Set<string>()
    const avatars = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const identity = anonymousIdentity('52454703-0214-4195-a4ea-78ea7d21343f')
      names.add(identity.name)
      avatars.add(JSON.stringify(identity.avatar))
    }
    expect([...names]).toHaveLength(1)
    expect([...avatars]).toHaveLength(1)
  })

  it('`anonymousDeviceName` và `anonymousIdentity().name` nói cùng một thứ', () => {
    // Service dùng hàm rút gọn, component dùng hàm đầy đủ. Hai đường lệch nhau thì bảng hiện một
    // tên mà ô tìm kiếm lọc theo tên khác.
    for (const fp of fps.slice(0, 20)) {
      expect(anonymousDeviceName(fp)).toBe(anonymousIdentity(fp).name)
    }
  })

  it('SVG cũng thuần — cùng fp ra cùng chuỗi', () => {
    const first = anonymousAvatarSvg('fp-stable', 24)
    expect(anonymousAvatarSvg('fp-stable', 24)).toBe(first)
  })
})

describe('anonymousIdentity — phân biệt được', () => {
  it('bộ từ cho ít nhất 100 tổ hợp trước khi tính mã ngắn', () => {
    expect(ANONYMOUS_NAME_COMBINATIONS).toBeGreaterThanOrEqual(100)
  })

  it('200 fp khác nhau ra ít nhất 100 tên khác nhau', () => {
    const names = new Set(fps.map(anonymousDeviceName))
    expect(names.size).toBeGreaterThanOrEqual(100)
  })

  it('200 fp khác nhau ra ít nhất 100 avatar khác nhau', () => {
    // So chuỗi SVG, không so "trông khác nhau" — nhưng mỗi khác biệt ở đây là một khác biệt về
    // màu nền, dạng hình, vị trí hoặc kích thước, tức là thấy được bằng mắt.
    const avatars = new Set(fps.map((fp) => anonymousAvatarSvg(fp)))
    expect(avatars.size).toBeGreaterThanOrEqual(100)
  })

  it('màu nền rải trên nhiều hơn một màu', () => {
    const backgrounds = new Set(fps.map((fp) => anonymousIdentity(fp).avatar.background))
    expect(backgrounds.size).toBeGreaterThanOrEqual(8)
  })
})

describe('anonymousIdentity — hình dạng cái tên', () => {
  it('là "<Con vật> <Tính từ> #<4 hex>", tiếng Việt có dấu', () => {
    const identity = anonymousIdentity('52454703-0214-4195-a4ea-78ea7d21343f')
    expect(identity.name).toBe(`${identity.animal} ${identity.adjective} #${identity.code}`)
    expect(identity.code).toMatch(/^[0-9a-f]{4}$/)
  })

  it('bộ từ giữ nguyên dấu — không có "Cao Lang Le"', () => {
    const names = fps.map(anonymousDeviceName).join(' ')
    expect(names).toMatch(/[àáâãèéêìíòóôõùúăđĩũơưĂĐĨŨƠƯạảấầẩẫậắằẳẵặẹẻẽềềểễệ]/i)
  })

  it('fp rỗng vẫn ra một danh tính, không nổ', () => {
    expect(anonymousIdentity('').name).toMatch(/#[0-9a-f]{4}$/)
  })
})

describe('anonymousAvatarSvg — SVG tự dựng, không gọi mạng', () => {
  const svg = anonymousAvatarSvg('fp-shape-check', 32)

  it('là một SVG hợp lệ với kích thước yêu cầu', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('width="32"')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('không tham chiếu tài nguyên ngoài — không `<image>`, không http', () => {
    // Avatar phải sinh bằng code: một `<image href="https://...">` là một request ra ngoài trên
    // mỗi hàng của bảng, và là rò rỉ `fp` sang bên thứ ba.
    // `xmlns` là namespace XML, không phải một địa chỉ được tải — bỏ nó ra trước khi soi.
    const withoutNamespace = svg.replace('http://www.w3.org/2000/svg', '')
    expect(withoutNamespace).not.toContain('<image')
    expect(withoutNamespace).not.toContain('http://')
    expect(withoutNamespace).not.toContain('https://')
  })
})
