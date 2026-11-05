/**
 * Dock chat được phép hiện ở những đường dẫn nào.
 *
 * ★ Tách khỏi component có chủ ý. `agent-chat-dock-gate.tsx` là client component và nạp
 * `next/navigation`; một ca test chạy môi trường node sẽ phải kéo theo cả chuỗi đó chỉ để kiểm một
 * biểu thức chính quy. Chép hàm sang file test thì tệ hơn nữa — test xanh trong khi bản thật hỏng.
 */

/**
 * `short-links` là đường dẫn của trang **Link & Artifact**. Tên route giữ nguyên từ trước khi hai
 * danh sách được gộp, nên đừng đọc nó là "chỉ short link".
 *
 * ⚠ `(\/|$)` là phần dễ bỏ sót nhất và nó đang gánh việc thật: thiếu nó thì
 * `/org/<id>/short-links-archive` cũng khớp, và dock hiện ở một trang chưa ai thiết kế cho nó.
 */
const LINK_ARTIFACT_PATH = /^\/org\/[^/]+\/short-links(\/|$)/

export function isLinkArtifactPage(pathname: string | null): boolean {
  if (!pathname) return false
  return LINK_ARTIFACT_PATH.test(pathname)
}
