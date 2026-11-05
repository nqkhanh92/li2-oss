/**
 * Năm bin TUYỆT ĐỐI cho mọi bản đồ vị trí — ngưỡng cố định, không phụ thuộc dữ liệu.
 *
 * Trước đây đây là thang PHÂN VỊ: ngưỡng tính lại theo phân bố của từng bộ dữ liệu, nên "xanh đậm"
 * nghĩa là một con số khác nhau mỗi lần đổi bộ lọc, và chú giải hiện 2 ô hay 5 ô tuỳ lúc. Bản
 * thiết kế gốc chốt ngược lại: **luôn 5 ô, nhãn cố định**, nên một màu luôn có đúng một nghĩa và
 * so được giữa hai lần xem.
 *
 * Đánh đổi đã biết và chấp nhận: với lưu lượng lệch nặng (TP.HCM 142, Hà Nội 12) thì hai tỉnh rơi
 * vào hai bin khác nhau nhưng 32 tỉnh còn lại không có bong bóng nào — việc đó nay không còn là
 * vấn đề như hồi tô kín vùng, vì nền bản đồ đã trung tính và vùng không có lượt thì đơn giản là
 * không vẽ bong bóng.
 */
export type GeoBin = {
  /** Giới hạn TRÊN của bin, tính cả chính nó */
  max: number
  color: string
  /** Nhãn chú giải, lấy nguyên từ thiết kế */
  label: string
}

export const GEO_BINS: GeoBin[] = [
  { max: 2, color: '#D7ECD3', label: '1–2' },
  { max: 5, color: '#A3D39C', label: '3–5' },
  { max: 15, color: '#64B261', label: '6–15' },
  { max: 40, color: '#2E8744', label: '16–40' },
  { max: 1e9, color: '#17592B', label: '41+' },
]

/**
 * Màu "chưa có lượt". Chỉ còn dùng cho nền bản đồ; bong bóng không bao giờ mang màu này vì vùng
 * 0 lượt không có bong bóng.
 */
export const GEO_EMPTY_FILL = '#E8EDF2'

/** Nền bản đồ trung tính — thiết kế bỏ hẳn việc tô kín vùng theo số lượt. */
export const GEO_LAND_FILL = '#E9EDF1'
export const GEO_LAND_STROKE = '#D3DAE1'

/** Màu của một số lượt. `n <= 0` không có bin — gọi hàm này với 0 là lỗi logic ở nơi gọi. */
export const binColorOf = (count: number): string =>
  (GEO_BINS.find((bin) => count <= bin.max) ?? GEO_BINS[GEO_BINS.length - 1]).color

/**
 * Đường kính bong bóng, px. Công thức lấy nguyên từ thiết kế.
 *
 * Căn bậc hai chứ không tuyến tính: mắt đọc DIỆN TÍCH đĩa, nên bán kính tỷ lệ căn bậc hai mới cho
 * diện tích tỷ lệ tuyến tính với số lượt. Tuyến tính sẽ làm TP.HCM 142 lượt to gấp ~12 lần Hà Nội
 * 12 lượt về bề ngang, tức gấp 140 lần về diện tích.
 *
 * Nền 12px để một vùng 1 lượt vẫn bấm được.
 */
export const bubbleDiameter = (count: number, max: number): number =>
  Math.round(12 + Math.sqrt(count / Math.max(max, 1)) * 40)
