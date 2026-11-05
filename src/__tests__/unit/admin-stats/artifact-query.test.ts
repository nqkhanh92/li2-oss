import { describe, it, expect } from 'vitest'
import {
  parseArtifactListQuery,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/core/helpers/admin-stats/artifact-query'

const q = (s: string) => parseArtifactListQuery(new URLSearchParams(s))

describe('parseArtifactListQuery', () => {
  it('mặc định khi không có tham số nào', () => {
    expect(q('')).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      organizationId: undefined,
      search: undefined,
      sortBy: 'created_at',
      sortOrder: 'desc',
      range: undefined,
      // Không gửi ngày thì không có gì bị từ chối — khác với gửi mà sai dạng.
      dateParamsRejected: false,
    })
  })

  it('đọc đủ tham số hợp lệ', () => {
    const p = q(
      'page=3&limit=50&sort_by=total_visits&sort_order=asc&organization_id=org-1&search=mcp'
    )
    expect(p).toMatchObject({
      page: 3,
      limit: 50,
      sortBy: 'total_visits',
      sortOrder: 'asc',
      organizationId: 'org-1',
      search: 'mcp',
    })
  })

  describe('chặn giá trị phá hoại mà không trả 400', () => {
    it('limit vượt trần bị kẹp, không kéo sập trang', () => {
      expect(q('limit=100000').limit).toBe(MAX_LIMIT)
    })

    it('page và limit âm hoặc 0 về giá trị nhỏ nhất hợp lệ', () => {
      expect(q('page=0&limit=0')).toMatchObject({ page: 1, limit: 1 })
      expect(q('page=-5&limit=-5')).toMatchObject({ page: 1, limit: 1 })
    })

    it('số không nguyên và chữ → mặc định', () => {
      expect(q('page=abc&limit=2.7')).toMatchObject({ page: 1, limit: DEFAULT_LIMIT })
    })

    it('sort_by lạ → created_at, KHÔNG đưa chuỗi của người gọi xuống SQL', () => {
      expect(q('sort_by=id; drop table artifacts').sortBy).toBe('created_at')
      expect(q('sort_by=organization_id').sortBy).toBe('created_at')
    })

    it('sort_order chỉ nhận asc, còn lại là desc', () => {
      expect(q('sort_order=asc').sortOrder).toBe('asc')
      expect(q('sort_order=ASC').sortOrder).toBe('desc')
      expect(q('sort_order=xyz').sortOrder).toBe('desc')
    })
  })

  describe('lọc ngày — chỉ khi CẢ HAI đầu hợp lệ', () => {
    it('hai đầu hợp lệ thì có khoảng, và biên phải là nửa mở', () => {
      expect(q('start_date=2026-10-01&end_date=2026-10-27').range).toEqual({
        from: '2026-10-01',
        to: '2026-10-27',
        toExclusive: '2026-10-28',
      })
    })

    /**
     * Một đầu rác mà vẫn lọc thì tập trả về bị cắt theo một khoảng người gọi không hề xin — và họ
     * đếm thiếu mà không biết. Thà không lọc.
     */
    it('một đầu rác → KHÔNG lọc ngày', () => {
      expect(q('start_date=2026-10-01&end_date=hom-qua').range).toBeUndefined()
      expect(q('start_date=hom-qua&end_date=2026-10-27').range).toBeUndefined()
    })

    it('chỉ có một đầu → KHÔNG lọc ngày', () => {
      expect(q('start_date=2026-10-01').range).toBeUndefined()
      expect(q('end_date=2026-10-27').range).toBeUndefined()
    })

    /**
     * Khác biểu đồ có chủ đích: biểu đồ thiếu ngày thì lùi về 30 ngày gần nhất (nó luôn cần một
     * trục thời gian). Danh sách mà tự ẩn bớt hàng thì người dùng đếm thiếu.
     */
    it('không ngày → không lọc, KHÔNG lùi về 30 ngày như biểu đồ', () => {
      expect(q('').range).toBeUndefined()
    })

    it('ngày không tồn tại → không lọc', () => {
      expect(q('start_date=2026-02-31&end_date=2026-10-27').range).toBeUndefined()
    })
  })

  it('chuỗi rỗng và khoảng trắng coi như không có', () => {
    expect(q('search=%20%20&organization_id=%20')).toMatchObject({
      search: undefined,
      organizationId: undefined,
    })
  })
})

/**
 * ⭐ Bộ lọc ngày bị bỏ qua thì phải để lại dấu vết.
 *
 * ★ LỖI THẬT, 2026-11-02. Trang Artifact Performance gửi ISO đầy đủ
 * (`2026-10-26T17:00:00.000Z`) thay vì `YYYY-MM-DD`. `parseDateOnly` từ chối, `range` thành
 * `undefined`, và endpoint **lặng lẽ trả về toàn bộ thời gian**. Nút "Best Performance (7 days)"
 * chạy nhiều ngày mà không ai biết nó không lọc gì.
 *
 * Cờ này chưa làm request đỏ (prod còn chạy bản Inside cũ vẫn gửi ISO — siết ngay là đổi một lỗi
 * âm thầm thành một trang vỡ). Nó biến "không ai biết" thành "tra được trong log", và là bước đệm
 * trước khi trả 400.
 */
describe('⭐ cờ báo bộ lọc ngày bị bỏ qua', () => {
  it('⭐ ISO đầy đủ → không lọc ngày, VÀ bật cờ', () => {
    const p = parseArtifactListQuery(
      new URLSearchParams('start_date=2026-10-26T17:00:00.000Z&end_date=2026-11-02T16:59:59.999Z')
    )

    expect(p.range).toBeUndefined()
    expect(p.dateParamsRejected).toBe(true)
  })

  it('ngày hợp lệ → có lọc, cờ tắt', () => {
    const p = parseArtifactListQuery(
      new URLSearchParams('start_date=2026-10-26&end_date=2026-11-02')
    )

    expect(p.range).toBeDefined()
    expect(p.dateParamsRejected).toBe(false)
  })

  /** Không gửi ngày là chuyện bình thường — đừng làm ồn vì một người gọi không hề yêu cầu lọc. */
  it('không gửi ngày → cờ tắt, không phải lỗi', () => {
    const p = parseArtifactListQuery(new URLSearchParams('page=1'))

    expect(p.dateParamsRejected).toBe(false)
  })

  /**
   * Một đầu hợp lệ, đầu kia rác — vẫn phải kêu. Đây là ca dễ lọt nhất: người gọi tưởng mình đã
   * lọc vì "có gửi ngày mà".
   */
  it('⭐ chỉ một đầu hợp lệ → vẫn bật cờ', () => {
    const p = parseArtifactListQuery(new URLSearchParams('start_date=2026-10-26&end_date=rác'))

    expect(p.range).toBeUndefined()
    expect(p.dateParamsRejected).toBe(true)
  })

  /**
   * ⚠️ KHÔNG tự nhận ISO rồi cắt 10 ký tự đầu. `2026-11-02T00:00+07:00` là `2026-11-01T17:00Z`,
   * cắt ra thành ngày HÔM TRƯỚC — ở múi +7 thì MỌI ngày bắt đầu lúc nửa đêm đều lùi một ngày.
   * Server không biết múi giờ người gọi, nên chỉ `YYYY-MM-DD` mới nói đúng ý họ.
   */
  it('⭐ KHÔNG đoán ngày từ ISO — server không biết múi giờ người gọi', () => {
    const p = parseArtifactListQuery(
      new URLSearchParams('start_date=2026-11-01T17:00:00.000Z&end_date=2026-11-02T17:00:00.000Z')
    )

    expect(p.range).toBeUndefined()
  })
})
