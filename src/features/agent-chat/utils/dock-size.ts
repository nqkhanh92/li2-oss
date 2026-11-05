/**
 * Kích thước của dock chat — khai MỘT chỗ.
 *
 * ★ Trước đây chiều cao lúc thu gọn nằm ở hai nơi: `h-[150px]` trong `agent-chat-panel.tsx` và
 * `COLLAPSED_HEIGHT_PX = 150` trong `agent-chat-dock-gate.tsx`, kèm một dòng chú thích dặn nhau
 * "phải khớp". Một lời dặn không phải một ràng buộc — và lần sửa này đổi đúng con số đó, nên
 * giữ nguyên cách cũ là để lại một cái bẫy đã bung một lần.
 */

/**
 * Lúc THU GỌN: vừa đủ hàng tiêu đề + ô soạn.
 *
 * Chủ sản phẩm chốt 2026-11-02 — *"khung khoảng nhiêu đây thôi, bao gồm hình AI Assistant, chỗ
 * chọn file, khung chat → enter và reopen"*. Ba hàng gợi ý bị ẩn ở trạng thái này: chúng chỉ có
 * nghĩa khi người dùng đang nhìn vào hội thoại, mà lúc thu gọn thì họ đang nhìn cái bảng.
 */
export const DOCK_COLLAPSED_PX = 104

/** Lúc MỞ, nếu người dùng chưa tự kéo. `min(720, 70vh)` như trước. */
export const DOCK_DEFAULT_OPEN_PX = 720

/**
 * Trần dưới khi kéo. Thấp hơn mức này thì vùng tin nhắn còn vài chục pixel — cuộn được nhưng
 * không đọc được, và lúc đó thu gọn hẳn là lựa chọn đúng hơn.
 */
export const DOCK_MIN_OPEN_PX = 260

/** Phần màn hình tối đa dock được chiếm khi kéo. Chừa lại một dải bảng để còn thấy ngữ cảnh. */
export const DOCK_MAX_VH = 0.9

/** Nhớ chiều cao người dùng đã kéo, qua các lần tải trang. */
export const DOCK_HEIGHT_STORAGE_KEY = 'li2.agent-dock.height'

/** Kẹp chiều cao vào khoảng dùng được. `viewportPx` truyền vào để test không cần `window`. */
export function clampDockHeight(px: number, viewportPx: number): number {
  const max = Math.round(viewportPx * DOCK_MAX_VH)
  // `Math.max` trước `Math.min`: màn hình thấp hơn `DOCK_MIN_OPEN_PX / 0.9` thì hai trần đảo
  // chiều, và thứ tự này cho ra trần TRÊN — dock cao bằng màn hình còn hơn dock cao hơn màn hình.
  return Math.min(Math.max(px, DOCK_MIN_OPEN_PX), Math.max(max, DOCK_MIN_OPEN_PX))
}

/** Chiều cao mở mặc định cho một khung nhìn cụ thể. */
export function defaultOpenHeight(viewportPx: number): number {
  return clampDockHeight(Math.min(DOCK_DEFAULT_OPEN_PX, Math.round(viewportPx * 0.7)), viewportPx)
}
