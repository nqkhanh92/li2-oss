import { describe, expect, it } from 'vitest'

import { attachArtifactMeta, normalizeArtifactEmbed } from '@/core/helpers/touch-point-artifact'

const META = {
  id: 'a1',
  kind: 'pdf',
  status: 'live',
  access_mode: 'public',
  size_bytes: 1024,
  serve_token: 'tok',
}

describe('normalizeArtifactEmbed', () => {
  it('trả về chính đối tượng khi PostgREST nhận ra quan hệ một-một', () => {
    expect(normalizeArtifactEmbed(META)).toEqual(META)
  })

  it('lấy phần tử đầu khi PostgREST trả về mảng', () => {
    expect(normalizeArtifactEmbed([META])).toEqual(META)
  })

  it('mảng rỗng → null, không phải undefined', () => {
    expect(normalizeArtifactEmbed([])).toBeNull()
  })

  it('null và undefined đều → null', () => {
    expect(normalizeArtifactEmbed(null)).toBeNull()
    expect(normalizeArtifactEmbed(undefined)).toBeNull()
  })
})

describe('attachArtifactMeta', () => {
  it('gắn artifact đã chuẩn hoá và BỎ khoá artifacts thô', () => {
    const rows = [{ id: 'tp1', name: 'x', artifacts: [META] }]
    const out = attachArtifactMeta(rows)

    expect(out[0].artifact).toEqual(META)
    expect('artifacts' in out[0]).toBe(false)
  })

  it('link thường (không có embed) vẫn ra hàng, artifact = null', () => {
    const out = attachArtifactMeta([{ id: 'tp2', name: 'link', artifacts: null }])

    expect(out).toHaveLength(1)
    expect(out[0].artifact).toBeNull()
    expect(out[0].id).toBe('tp2')
  })

  it('giữ nguyên mọi trường khác của hàng', () => {
    const out = attachArtifactMeta([
      { id: 'tp3', name: 'n', short_url: 'https://a/b', visits: [{ count: 7 }], artifacts: META },
    ])

    expect(out[0]).toMatchObject({ id: 'tp3', name: 'n', short_url: 'https://a/b' })
    expect(out[0].visits).toEqual([{ count: 7 }])
  })

  it('không làm rụng hàng nào: vào bao nhiêu ra bấy nhiêu, đúng thứ tự', () => {
    const rows = [
      { id: 'a', artifacts: META },
      { id: 'b', artifacts: null },
      { id: 'c', artifacts: [] },
    ]

    expect(attachArtifactMeta(rows).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})
