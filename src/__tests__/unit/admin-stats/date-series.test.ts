import { describe, it, expect } from 'vitest'
import {
  resolveDateRange,
  eachDay,
  buildSeries,
  parseDateOnly,
  DEFAULT_RANGE_DAYS,
} from '@/core/helpers/admin-stats/date-series'

/**
 * Hợp đồng do `li2-23` nêu: đủ MỌI ngày trong `[from, to]` kể cả ngày 0, tăng dần, inclusive hai
 * đầu, mặc định 30 ngày khi thiếu tham số.
 */

describe('resolveDateRange', () => {
  it('giữ nguyên khoảng hợp lệ và mở biên phải thêm một ngày', () => {
    const r = resolveDateRange('2026-10-01', '2026-10-27')
    expect(r).toEqual({ from: '2026-10-01', to: '2026-10-27', toExclusive: '2026-10-28' })
  })

  /**
   * Đây là lỗi trong đặc tả gốc. `BETWEEN from AND to` với `to` là ngày trần = tới nửa đêm ngày
   * đó, nên mất gần trọn ngày cuối. Đo trên LiHi: `BETWEEN` cho 60 hàng, nửa mở cho 63.
   */
  it('toExclusive là to + 1 ngày — không có nó thì mất cả ngày cuối', () => {
    expect(resolveDateRange('2026-10-27', '2026-10-27').toExclusive).toBe('2026-10-28')
  })

  it('mặc định 30 ngày gần nhất khi thiếu cả hai tham số', () => {
    const r = resolveDateRange(null, null, new Date('2026-10-27T13:45:00Z'))
    expect(r.to).toBe('2026-10-27')
    expect(r.from).toBe('2026-09-28')
    expect(eachDay(r)).toHaveLength(DEFAULT_RANGE_DAYS)
  })

  it('tham số gõ sai thì lùi về mặc định, KHÔNG ném lỗi', () => {
    const today = new Date('2026-10-27T00:00:00Z')
    for (const bad of ['hôm qua', '27-10-2026', '2026/10/27', '']) {
      expect(() => resolveDateRange(bad, bad, today)).not.toThrow()
      expect(eachDay(resolveDateRange(bad, bad, today))).toHaveLength(DEFAULT_RANGE_DAYS)
    }
  })

  it('ngày không tồn tại bị từ chối chứ không cuộn sang tháng sau', () => {
    expect(parseDateOnly('2026-02-31')).toBeNull()
    expect(parseDateOnly('2026-13-01')).toBeNull()
    expect(parseDateOnly('2026-02-28')).not.toBeNull()
  })

  it('from > to thì đảo lại, không trả rỗng', () => {
    const r = resolveDateRange('2026-10-27', '2026-10-01')
    expect(r.from).toBe('2026-10-01')
    expect(r.to).toBe('2026-10-27')
  })

  it('qua ranh giới tháng và năm vẫn đúng', () => {
    expect(eachDay(resolveDateRange('2026-12-30', '2027-01-02'))).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })
})

describe('eachDay', () => {
  it('inclusive hai đầu — một ngày cho đúng một phần tử', () => {
    expect(eachDay(resolveDateRange('2026-10-27', '2026-10-27'))).toEqual(['2026-10-27'])
  })

  it('tăng dần, không trùng, không hụt', () => {
    const days = eachDay(resolveDateRange('2026-10-01', '2026-10-31'))
    expect(days).toHaveLength(31)
    expect(days).toEqual([...days].sort())
    expect(new Set(days).size).toBe(31)
  })
})

describe('buildSeries', () => {
  const range = resolveDateRange('2026-10-25', '2026-10-27')

  it('ngày không có dữ liệu vẫn có mặt với số 0', () => {
    const series = buildSeries(range, {
      logins: new Map([['2026-10-26', 3]]),
      shortLinks: new Map(),
      artifacts: new Map(),
    })

    expect(series).toEqual([
      { date: '2026-10-25', logins: 0, short_links_created: 0, artifacts_created: 0 },
      { date: '2026-10-26', logins: 3, short_links_created: 0, artifacts_created: 0 },
      { date: '2026-10-27', logins: 0, short_links_created: 0, artifacts_created: 0 },
    ])
  })

  it('ba nguồn ghép độc lập vào cùng một ngày', () => {
    const series = buildSeries(range, {
      logins: new Map([['2026-10-27', 12]]),
      shortLinks: new Map([['2026-10-27', 5]]),
      artifacts: new Map([['2026-10-27', 3]]),
    })
    expect(series.at(-1)).toEqual({
      date: '2026-10-27',
      logins: 12,
      short_links_created: 5,
      artifacts_created: 3,
    })
  })

  /** Một bản ghi lạc ngày nhồi vào hai đầu dải sẽ trông như một đỉnh có thật. */
  it('ngày NGOÀI khoảng bị bỏ, không dồn vào biên', () => {
    const series = buildSeries(range, {
      logins: new Map([
        ['2026-01-01', 999],
        ['2026-12-31', 999],
      ]),
      shortLinks: new Map(),
      artifacts: new Map(),
    })
    expect(series).toHaveLength(3)
    expect(series.every((d) => d.logins === 0)).toBe(true)
  })
})
