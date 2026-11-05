import type { GeoBreakdownRow } from '@/shared/constants/subdivisions'

export type { GeoBreakdownRow }

export type GeoLevel = 'country' | 'region'

export type GeoAnalyticsRow = {
  /** Mã nước ISO 3166-1 alpha-2 ở cấp `country`, mã ISO 3166-2 đủ tiền tố ở cấp `region` */
  code: string
  name: string
  count: number
  /**
   * Phần trăm trên thang **0–100**, là SỐ chứ không phải chuỗi đã format, và mẫu số là
   * `parent_total` chứ không phải tổng toàn cầu.
   *
   * Đây là chỗ sửa lỗi của card cũ: `analytic-map-chart.tsx:186` truyền tổng toàn cầu làm mẫu số
   * cho hàng cấp tỉnh, nên Hà Nội hiện 27,4% (60/219) thay vì 48% (60/125). Giữ đủ độ chính xác,
   * UI tự làm tròn theo locale.
   */
  pct: number
  /**
   * Toạ độ tâm. Cấp vùng lấy từ `states.json`, cấp nước lấy từ `countryMapping`.
   * null khi không có nguồn — không bịa, kể cả bằng cách lấy trung bình.
   */
  lat: number | null
  lng: number | null
}

export type GeoAnalyticsBucket = {
  count: number
  pct: number
}

/**
 * Ô gộp nhiều vùng, nên ngoài số lượt còn cần biết **gộp của bao nhiêu vùng**.
 *
 * Không có `units` thì UI chỉ nói được "4 lượt khác" chứ không nói được "4 lượt từ 3 vị trí khác"
 * — mà hai câu đó mang thông tin khác nhau. Dùng cho cả `other` và `suppressed` để hai ô cân nhau
 * về lượng thông tin; trước đây chỉ `suppressed` có, nên nhãn hai ô lệch hẳn nhau.
 */
export type GeoAnalyticsUnitBucket = GeoAnalyticsBucket & {
  /** Số VÙNG trong ô này, không phải số lượt */
  units: number
}

export type GeoAnalytics = {
  level: GeoLevel
  /** null ở cấp `country`; ở cấp `region` là nước đang xem */
  parent: { code: string; name: string } | null
  /**
   * MẪU SỐ của mọi `pct` trong payload này: tổng lượt truy cập trong phạm vi đang xem, đã gồm cả
   * `other`, `suppressed` và `unknown`.
   *
   * Bất biến: `sum(rows) + other + suppressed + unknown === parent_total`, và các `pct` tương ứng
   * cộng về đúng 100. Mọi ô đều phải có một chỗ đi — đó là lý do có bốn ô chứ không phải hai.
   */
  parent_total: number
  /**
   * Tổng lượt truy cập của **toàn bộ phạm vi truy vấn**, không bị giới hạn bởi `parent`.
   *
   * Bản thiết kế hiện **hai** phần trăm mỗi hàng: tỷ lệ trong nước đang xem (mẫu số
   * `parent_total`) và tỷ lệ trên tổng (mẫu số này), in nhỏ bên dưới. Đó là cách giải lỗi mẫu số
   * tốt hơn việc chọn một trong hai — người đọc thấy cả "Hà Nội chiếm 48% của Việt Nam" và
   * "27,4% của tất cả lượt truy cập", nên không còn cách nào hiểu lệch.
   *
   * Ở cấp `country` nó bằng `parent_total`.
   */
  grand_total: number
  /** false khi `states.json` không có bảng đơn vị cấp 1 cho nước này — khác hẳn "có bảng mà không lượt nào" */
  region_supported: boolean
  rows: GeoAnalyticsRow[]
  /**
   * Phần nằm ngoài `limit`, đã gộp. null khi không có hàng nào bị cắt. `units` là số vùng bị
   * gộp vào đây.
   *
   * ⚠ `other` và `unknown` là HAI thứ khác nhau và không được gộp: `other` là vị trí đã nhận ra
   * nhưng không vào top, `unknown` là GeoIP không cho biết gì. Card cũ trộn hai thứ này vào một
   * hàng (`analytic-map-chart.tsx:109`).
   */
  other: GeoAnalyticsUnitBucket | null
  /**
   * Vùng/nước bị ẩn vì có ít hơn `anonymity_threshold` lượt. Ô THỨ TƯ, cố ý không nhồi vào
   * `other` hay `unknown`: ba ô kia trả lời ba câu khác nhau ("ngoài top", "không nhận ra vị trí",
   * "nhận ra nhưng quá ít người để nêu tên"), và trộn chúng là làm mất chính cái phân biệt đó.
   *
   * `units` là SỐ VÙNG bị ẩn, không phải số lượt — UI cần nó để nói "4 tỉnh dưới ngưỡng" thay vì
   * chỉ hiện một con số lượt trơ trọi.
   */
  suppressed: GeoAnalyticsUnitBucket
  /** Lượt truy cập không suy ra được vị trí ở cấp đang xem */
  unknown: GeoAnalyticsBucket
  coverage: {
    /**
     * Số đơn vị có ít nhất một lượt — **đã gồm** vùng ngoài `limit` và vùng bị ẩn. Nó trả lời
     * "nhận ra được bao nhiêu vùng", không phải "đang hiện bao nhiêu".
     */
    resolved_units: number
    /** Số đơn vị tồn tại: cấp vùng lấy từ `states.json` (VN ra 34), cấp nước là số nước đã biết */
    total_units: number
  }
  /**
   * Ngưỡng ẩn danh đã áp. Vùng dưới ngưỡng nằm ở `suppressed`, không ở `rows`.
   * `0` nghĩa là tắt hẳn việc ẩn — dùng cho export/debug.
   */
  anonymity_threshold: number
}

export type GeoAnalyticsParams = {
  level?: GeoLevel
  country?: string
  limit?: number
  anonymity_threshold?: number
}
