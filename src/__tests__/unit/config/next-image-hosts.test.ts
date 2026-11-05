import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * `remotePatterns` từng có `{ protocol: 'https', hostname: '**' }` — mọi host HTTPS. Đo trên LiHi
 * 2026-10-25: `/_next/image?url=https://www.google.com/favicon.ico` trả 200, tức app là proxy tải
 * ảnh hộ bất kỳ ai, và là bề mặt cho CVE RCE ở Image Optimization API của Next 14.2.35.
 *
 * Kiểm bằng cách đọc nguồn: `next.config.mjs` không import được trong vitest (ESM + env lúc build).
 */
const source = readFileSync(resolve(__dirname, '../../../../next.config.mjs'), 'utf8')

/**
 * Bỏ comment trước khi dò wildcard: chính lời giải thích trong file có viết lại chuỗi
 * `hostname: '**'` để nói vì sao nó bị gỡ, và một phép dò ngây thơ sẽ coi đó là lỗi.
 */
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('next.config — image optimizer không được là proxy mở', () => {
  it('KHÔNG có hostname wildcard', () => {
    expect(code).not.toMatch(/hostname:\s*['"`]\*\*['"`]/)
    expect(code).not.toMatch(/hostname:\s*['"`]\*['"`]/)
  })

  it('host suy từ env, không viết cứng một môi trường', () => {
    // LiHi dùng app.example.com, prod dùng supa.li2.ai — viết cứng là cái kia vỡ ảnh.
    expect(source).toContain('envHost(process.env.SUPABASE_URL)')
    expect(source).toContain('envHost(process.env.NEXT_PUBLIC_SUPABASE_URL)')
  })

  it('giữ các host ảnh đọc được từ DB thật', () => {
    // profiles.avatar trên LiHi có hai host này; bỏ sót là avatar vỡ.
    for (const host of ['lh3.googleusercontent.com', 'cdn.casbin.org'])
      expect(source, `thiếu ${host}`).toContain(host)
  })

  it('dangerouslyAllowSVG còn bật thì phải có lời giải thích vì sao an toàn', () => {
    if (source.includes('dangerouslyAllowSVG: true'))
      expect(source).toMatch(/sandbox|script-src 'none'/)
  })
})
