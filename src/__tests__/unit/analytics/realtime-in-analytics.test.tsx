import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Realtime gom từ trang riêng vào Analytics (2026-10-23), đặt NGAY DƯỚI bản đồ.
 *
 * Kiểm bằng cách đọc thứ tự trong nguồn thay vì render: `analytic-by-tag.tsx` kéo theo hàng chục
 * hook mạng, dựng được nó trong test đắt hơn giá trị thu lại rất nhiều. Vị trí tương đối giữa ba
 * khối là thứ dễ bị xê dịch khi ai đó chèn section mới, và đó đúng là thứ cần giữ.
 */
const source = readFileSync(
  resolve(__dirname, '../../../features/analytics/components/sections/analytic-by-tag.tsx'),
  'utf8'
)

describe('Realtime trong trang Analytics', () => {
  it('được dùng trong analytic-by-tag', () => {
    expect(source).toContain("import RealtimeData from '@/features/realtime-data/components'")
    expect(source).toContain('<RealtimeData')
  })

  it('đứng SAU bản đồ và TRƯỚC phần chi tiết tương tác', () => {
    const map = source.indexOf('<AnalyticMapChart')
    const realtime = source.indexOf('<RealtimeData')
    const detail = source.indexOf('<DetailEngagement')

    expect(map).toBeGreaterThan(0)
    expect(realtime).toBeGreaterThan(0)
    expect(detail).toBeGreaterThan(0)
    expect(realtime).toBeGreaterThan(map)
    expect(realtime).toBeLessThan(detail)
  })

  it('ẩn dải thẻ tổng — Overview phía trên đã có các số đó', () => {
    expect(source).toContain('showSummary={false}')
  })
})
