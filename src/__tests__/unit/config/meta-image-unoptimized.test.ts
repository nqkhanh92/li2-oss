import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Ảnh meta (Open Graph) của bên thứ ba PHẢI render với `unoptimized`.
 *
 * Vì sao cần test giữ: lớp lỗi này **không tự lộ ra ở đâu cả**.
 * - `next/image` có kiểm hostname theo `remotePatterns`, nhưng nó nằm trong
 *   `if (process.env.NODE_ENV !== "production")` (`next/dist/shared/lib/image-loader.js`), nên
 *   **production không ném lỗi nào** — `/_next/image` chỉ trả 400 và khách thấy ảnh vỡ.
 * - `yarn build` qua, `tsc` qua, mọi test render cũng qua: jsdom không gọi tới optimizer.
 *
 * Và tập host thì KHÔNG thể liệt kê. Đo trên prod 2026-10-25: 1.794 link có `meta_tags->>'image'`,
 * đến từ **174 host khác nhau** (supa.li2.ai 517, example.com 312, hi-static.fpt.vn 173,
 * Shopee, Canva, fbcdn, ytimg…), và còn phình mỗi khi có link mới. Nếu bắt chúng qua
 * `/_next/image` thì `remotePatterns` buộc phải mở lại `hostname: '**'` — đúng cái lỗ proxy mở mà
 * `9cc16ca2` vừa bịt, và `next-image-hosts.test.ts` đang canh.
 *
 * Nên hai test này là một cặp: cái kia giữ danh sách trắng CHẶT cho ảnh nội bộ, cái này giữ ảnh
 * bên thứ ba ĐỨNG NGOÀI danh sách đó.
 *
 * Đọc nguồn thay vì render: 16 chỗ nằm rải trong 7 component, mỗi cái kéo theo hàng chục hook
 * mạng khi render trong test — đắt hơn giá trị thu lại, và render cũng không chứng minh được điều
 * đang cần (jsdom không bao giờ gọi optimizer).
 */

/** Các file render ảnh meta lấy từ URL đích khách nhập. */
const FILES = [
  'src/features/touch-points/components/forms/create-new/touch-point-meta-preview-panel.tsx',
  'src/features/touch-points/components/forms/create-new/touch-point-meta-data-form-v2.tsx',
  'src/features/touch-points/components/forms/touch-point-meta-data-form.tsx',
  'src/features/short-links/components/short-link-form/meta-preview-card.tsx',
  'src/features/touch-points/components/touch-point-details/meta-tags-preview.tsx',
  // Hai component upload: caller DUY NHẤT của mỗi cái là một form meta ở trên, và nó truyền
  // `defaultValue={field.value}` — tức chính URL ảnh meta. Dễ sót vì tên file không nói gì về meta.
  'src/shared/components/customize/upload-file.tsx',
  'src/shared/components/customize/upload-file-no-array.tsx',
]

/** Biến mang URL ảnh meta trong các file trên. */
const META_SRC = ['imageSrc', 'watchMetadata.image', 'src={image}', 'getImageSrc(']

/**
 * `<Image ... />` không lồng nhau, nên một regex không tham là đủ.
 * Không dùng cờ `s`: `target` của repo dưới es2018 nên tsc từ chối nó (TS1501), và ở đây cũng
 * không cần — `[^>]` đã khớp cả newline, khác với `.`.
 */
const IMAGE_BLOCK = /<(?:Next)?Image\s[^>]*?\/>/g

const repoRoot = resolve(__dirname, '../../../..')

type Site = { file: string; line: number; block: string }

const metaImageSites = (): Site[] => {
  const sites: Site[] = []
  for (const file of FILES) {
    const source = readFileSync(resolve(repoRoot, file), 'utf8')
    for (const match of source.matchAll(IMAGE_BLOCK)) {
      const block = match[0]
      if (!META_SRC.some((key) => block.includes(key))) continue
      sites.push({
        file,
        line: source.slice(0, match.index).split('\n').length,
        block,
      })
    }
  }
  return sites
}

describe('ảnh meta bên thứ ba không đi qua image optimizer', () => {
  it('tìm được đủ 16 chỗ render — nếu số này đổi thì danh sách FILES đã lạc hậu', () => {
    // Trần dưới là điều thực sự cần: thiếu chỗ nào thì vòng lặp dưới không soi tới nó.
    expect(metaImageSites().length).toBe(16)
  })

  it('mọi chỗ đều có `unoptimized`', () => {
    const missing = metaImageSites()
      .filter((site) => !site.block.includes('unoptimized'))
      .map((site) => `${site.file}:${site.line}`)

    expect(
      missing,
      `thiếu \`unoptimized\` ở:\n  ${missing.join('\n  ')}\n` +
        'Ảnh meta đến từ URL khách nhập (174 host trên prod). Qua /_next/image là trả 400 ' +
        'trên production, KHÔNG có lỗi nào ở build hay test.'
    ).toEqual([])
  })

  it('mỗi file được liệt kê thật sự có ít nhất một chỗ — bắt file bị đổi tên', () => {
    for (const file of FILES) {
      const count = metaImageSites().filter((site) => site.file === file).length
      expect(count, `${file} không còn chỗ render ảnh meta nào`).toBeGreaterThan(0)
    }
  })
})
