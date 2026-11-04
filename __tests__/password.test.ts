import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
// `allowJs` cho TS suy luận type của script .mjs này, nên không cần khai báo thêm.
import { hashPasswordStandalone } from '@/scripts/db-seed.mjs'

describe('hashPassword', () => {
  it('cho hai chuỗi khác nhau với cùng một mật khẩu (có salt)', async () => {
    const a = await hashPassword('mat-khau-giong-nhau')
    const b = await hashPassword('mat-khau-giong-nhau')
    expect(a).not.toBe(b)
  })

  it('sinh đúng định dạng scrypt$N$r$p$salt$hash', async () => {
    const parts = (await hashPassword('abc123xyz')).split('$')
    expect(parts).toHaveLength(6)
    expect(parts[0]).toBe('scrypt')
    expect(parts[1]).toBe(String(2 ** 15))
    expect(parts[2]).toBe('8')
    expect(parts[3]).toBe('1')
    expect(Buffer.from(parts[4], 'base64')).toHaveLength(16)
    expect(Buffer.from(parts[5], 'base64')).toHaveLength(32)
  })

  it('từ chối mật khẩu rỗng', async () => {
    await expect(hashPassword('')).rejects.toThrow()
  })
})

describe('verifyPassword', () => {
  it('trả true với mật khẩu đúng', async () => {
    const stored = await hashPassword('đúng-mật-khẩu-có-dấu')
    expect(await verifyPassword('đúng-mật-khẩu-có-dấu', stored)).toBe(true)
  })

  it('trả false với mật khẩu sai', async () => {
    const stored = await hashPassword('mat-khau-dung')
    expect(await verifyPassword('mat-khau-sai', stored)).toBe(false)
  })

  it('phân biệt chữ hoa chữ thường', async () => {
    const stored = await hashPassword('MatKhau')
    expect(await verifyPassword('matkhau', stored)).toBe(false)
  })

  // Đường gọi là form đăng nhập. Một exception ở đây biến "chuỗi trong DB bị hỏng" thành một
  // thông điệp lỗi khác với "sai mật khẩu", và sự khác biệt đó là thông tin cho người dò.
  describe('chuỗi hỏng — trả false, KHÔNG throw', () => {
    const broken: Array<[string, string]> = [
      ['rỗng', ''],
      ['không có dấu $', 'khongcodaugi'],
      ['thiếu một phần', `scrypt$${2 ** 15}$8$1$c2FsdA==`],
      ['thừa một phần', `scrypt$${2 ** 15}$8$1$c2FsdA==$aGFzaA==$thua`],
      ['tiền tố sai', `bcrypt$${2 ** 15}$8$1$c2FsdA==$aGFzaA==`],
      ['N không phải số', 'scrypt$abc$8$1$c2FsdA==$aGFzaA=='],
      ['N là số thập phân', 'scrypt$32768.5$8$1$c2FsdA==$aGFzaA=='],
      ['r rỗng', `scrypt$${2 ** 15}$$1$c2FsdA==$aGFzaA==`],
      ['hash rỗng', `scrypt$${2 ** 15}$8$1$c2FsdA==$`],
      ['chỉ có dấu $', '$$$$$'],
      ['N = 0 (scrypt từ chối)', 'scrypt$0$8$1$c2FsdA==$aGFzaA=='],
      ['N không phải luỹ thừa của 2 (scrypt từ chối)', 'scrypt$1000$8$1$c2FsdA==$aGFzaA=='],
    ]

    for (const [name, stored] of broken) {
      it(name, async () => {
        await expect(verifyPassword('bất-kỳ', stored)).resolves.toBe(false)
      })
    }
  })

  // Chuỗi stored có thể đến từ một hàng DB bị ghi bởi kẻ tấn công. N khổng lồ biến một lần
  // đăng nhập thành một lần cấp phát vài GB — một DoS bằng một hàng dữ liệu.
  describe('tham số khổng lồ bị từ chối, không treo máy', () => {
    it('N = 2^30 bị từ chối', async () => {
      const stored = `scrypt$${2 ** 30}$8$1$c2FsdA==$aGFzaA==`
      const start = Date.now()
      expect(await verifyPassword('x', stored)).toBe(false)
      // Bị chặn bằng so sánh số, không phải bằng việc thực sự tính xong.
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('r = 1024 bị từ chối', async () => {
      expect(await verifyPassword('x', `scrypt$${2 ** 15}$1024$1$c2FsdA==$aGFzaA==`)).toBe(false)
    })

    it('p = 999 bị từ chối', async () => {
      expect(await verifyPassword('x', `scrypt$${2 ** 15}$8$999$c2FsdA==$aGFzaA==`)).toBe(false)
    })
  })
})

/**
 * `scripts/db-seed.mjs` nhân bản logic scrypt vì script .mjs không import được TypeScript
 * (lý do đầy đủ ghi trong chính file đó). Test này là thứ giữ hai bản khỏi lệch: nếu tham số
 * hay định dạng chuỗi ở một bên đổi mà bên kia không đổi, nó đỏ ở đây — thay vì đỏ dưới dạng
 * "tài khoản seed không đăng nhập được" sau khi người ta đã cài xong.
 */
describe('bản nhân bản trong scripts/db-seed.mjs', () => {
  it('sinh hash mà verifyPassword của lib chấp nhận', async () => {
    const stored = await hashPasswordStandalone('mat-khau-tu-script-seed')
    expect(await verifyPassword('mat-khau-tu-script-seed', stored)).toBe(true)
  })

  it('từ chối mật khẩu sai, giống bản lib', async () => {
    const stored = await hashPasswordStandalone('dung')
    expect(await verifyPassword('sai', stored)).toBe(false)
  })

  it('dùng đúng cùng tham số với lib', async () => {
    const fromLib = (await hashPassword('x')).split('$')
    const fromScript = (await hashPasswordStandalone('x')).split('$')
    // So 4 phần đầu (prefix + N + r + p). Salt và hash khác nhau là đúng.
    expect(fromScript.slice(0, 4)).toEqual(fromLib.slice(0, 4))
    expect(Buffer.from(fromScript[4], 'base64')).toHaveLength(
      Buffer.from(fromLib[4], 'base64').length
    )
    expect(Buffer.from(fromScript[5], 'base64')).toHaveLength(
      Buffer.from(fromLib[5], 'base64').length
    )
  })
})
