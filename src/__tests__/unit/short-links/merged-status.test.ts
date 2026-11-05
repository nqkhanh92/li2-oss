import { describe, expect, it } from 'vitest'

import {
  ARTIFACT_STATUS_BY_BUCKET,
  getMergedStatus,
  MERGED_STATUSES,
  isArtifactContentType,
} from '@/core/helpers/merged-status'

const artifact = (status: string | null) => ({
  content_type: 'ARTIFACT',
  artifact: status === null ? null : ({ status } as any),
})
const link = (over: Record<string, unknown> = {}) => ({
  content_type: 'URL',
  enabled: true,
  safety_status: null,
  ...over,
})

describe('getMergedStatus — artifact', () => {
  it.each([
    ['live', 'live'],
    ['draft', 'pending'],
    ['scanning', 'pending'],
    ['blocked', 'blocked'],
    ['quarantined', 'blocked'],
    ['expired', 'expired'],
    ['removed', 'removed'],
  ])('%s → ô %s', (status, bucket) => {
    expect(getMergedStatus(artifact(status))).toBe(bucket)
  })

  it('cả 7 giá trị DB đều có ô, không giá trị nào lọt khe', () => {
    const covered = Object.values(ARTIFACT_STATUS_BY_BUCKET).flat()

    expect(new Set(covered)).toEqual(
      new Set(['live', 'draft', 'scanning', 'blocked', 'quarantined', 'expired', 'removed'])
    )
  })

  /**
   * Ca này tìm ra bằng kiểm nghịch: cho `removed` nuốt thêm `draft` thì **28/28 test vẫn xanh**.
   * `getMergedStatus` dùng `.find()` nên vẫn trả về một ô, che mất chuyện taxonomy đã chồng nhau.
   *
   * Nhưng bộ lọc phía server đọc thẳng `ARTIFACT_STATUS_BY_BUCKET`, nên một status nằm ở hai ô
   * sẽ làm một hàng đếm vào cả hai → **tổng các ô > tổng danh sách**, đúng bất biến phải giữ.
   * Hỏng ở chỗ không test nào nhìn.
   */
  it('các ô KHÔNG chồng nhau — một status chỉ thuộc đúng một ô', () => {
    const covered = Object.values(ARTIFACT_STATUS_BY_BUCKET).flat()

    expect(covered.length).toBe(new Set(covered).size)
  })

  // Đoán một hàng ta không hiểu là "đang phục vụ" là đoán theo hướng trấn an.
  it('artifact mất metadata hoặc status lạ KHÔNG rơi về live', () => {
    expect(getMergedStatus(artifact(null))).not.toBe('live')
    expect(getMergedStatus(artifact('hologram'))).not.toBe('live')
    expect(getMergedStatus(artifact('hologram'))).toBe('pending')
  })

  // Trên LiHi cả 35 hàng artifact đã gỡ vẫn `enabled = true`.
  it('enabled của hàng artifact KHÔNG được xét — nó không nói gì về nội dung', () => {
    expect(getMergedStatus({ ...artifact('removed'), enabled: true })).toBe('removed')
    expect(getMergedStatus({ ...artifact('live'), enabled: false })).toBe('live')
  })

  it('không phân biệt chữ hoa thường của content_type', () => {
    expect(
      getMergedStatus({ content_type: 'artifact', artifact: { status: 'removed' } as any })
    ).toBe('removed')
  })
})

describe('getMergedStatus — link', () => {
  it('link lành → live', () => {
    expect(getMergedStatus(link())).toBe('live')
  })

  it('link tắt → disabled', () => {
    expect(getMergedStatus(link({ enabled: false }))).toBe('disabled')
  })

  it('link gắn cờ → flagged', () => {
    expect(getMergedStatus(link({ safety_status: 'flagged' }))).toBe('flagged')
  })

  it('vừa tắt vừa gắn cờ → flagged THẮNG, không đếm vào hai ô', () => {
    expect(getMergedStatus(link({ enabled: false, safety_status: 'flagged' }))).toBe('flagged')
  })

  it('enabled thiếu (undefined) coi như tắt, không coi như live', () => {
    expect(getMergedStatus({ content_type: 'URL' })).toBe('disabled')
  })

  /**
   * Ràng buộc của chủ sản phẩm: "link đã tắt" và "artifact đã gỡ" là HAI ô. Một cái bật lại được,
   * một cái nội dung đã mất. Trộn là nói sai với người đang tìm xem mình gỡ nhầm cái gì.
   */
  it('disabled và removed là hai ô KHÁC nhau', () => {
    expect(getMergedStatus(link({ enabled: false }))).not.toBe(getMergedStatus(artifact('removed')))
  })
})

describe('bất biến: mỗi hàng đúng MỘT ô, tổng các ô = tổng danh sách', () => {
  // Mẫu phủ mọi hình dạng hàng gặp được, kể cả hàng dị.
  const rows = [
    ...['live', 'draft', 'scanning', 'blocked', 'quarantined', 'expired', 'removed'].map(artifact),
    artifact(null),
    artifact('hologram'),
    link(),
    link({ enabled: false }),
    link({ safety_status: 'flagged' }),
    link({ enabled: false, safety_status: 'flagged' }),
    { content_type: 'url', enabled: true, safety_status: null },
    { content_type: null },
  ]

  it('mọi hàng đều ra một ô HỢP LỆ', () => {
    for (const row of rows) {
      expect(MERGED_STATUSES).toContain(getMergedStatus(row as any))
    }
  })

  it('tổng số hàng trong các ô bằng đúng tổng số hàng', () => {
    const tally = new Map<string, number>()
    for (const row of rows) {
      const bucket = getMergedStatus(row as any)
      tally.set(bucket, (tally.get(bucket) ?? 0) + 1)
    }

    const total = [...tally.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(rows.length)
  })

  it('hàm là xác định: cùng một hàng luôn ra cùng một ô', () => {
    for (const row of rows) {
      expect(getMergedStatus(row as any)).toBe(getMergedStatus(row as any))
    }
  })
})

describe('isArtifactContentType', () => {
  it.each(['ARTIFACT', 'artifact', 'Artifact'])('%s → true', (v) => {
    expect(isArtifactContentType(v)).toBe(true)
  })

  it.each(['URL', 'url', '', null, undefined])('%s → false', (v) => {
    expect(isArtifactContentType(v as any)).toBe(false)
  })
})
