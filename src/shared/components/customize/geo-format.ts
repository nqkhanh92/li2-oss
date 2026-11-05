/**
 * Format số cho card vị trí, THEO LOCALE.
 *
 * Card cũ dùng `toFixed(2)` nên luôn in `27.40%` kể cả khi giao diện đang là tiếng Việt, mà tiếng
 * Việt dùng dấu phẩy thập phân: `27,4%`. App có i18n (`react-i18next`) nên dấu phân cách phải theo
 * ngôn ngữ đang chọn, không phải theo mặc định của JS.
 *
 * Để ở `shared/components/customize/` cùng chỗ với các bản đồ vì cả bản đồ (shared) và card
 * (features) đều dùng — shared không được import từ features.
 */

/**
 * Phần trăm từ payload. **Không chia lại gì cả** — `pct` đã được server tính trên đúng mẫu số
 * (`parent_total`). Mọi phép chia cho phần trăm ở UI là dấu hiệu lặp lại lỗi của card cũ, nơi hàng
 * cấp tỉnh lấy tổng toàn cầu làm mẫu số.
 *
 * Một chữ số thập phân: 92,2% đọc được, 92,21% chỉ làm dày con số mà không thêm thông tin.
 */
export const formatGeoPct = (pct: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(pct / 100)

/** Số lượt. Nghìn phân cách theo locale: `1.234` (vi) so với `1,234` (en). */
export const formatGeoCount = (count: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count)
