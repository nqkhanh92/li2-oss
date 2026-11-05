/**
 * Đường "về danh sách" của mọi trang artifact.
 *
 * Trỏ về **danh sách gộp** `/short-links`, không phải `/artifacts`. Lý do: từ 2026-10-26 sidebar
 * chỉ còn một mục "Link & Artifact" và nó dẫn tới danh sách gộp (`menu-list.tsx`) — `/artifacts`
 * vẫn chạy nhưng **không còn đường nào dẫn vào**. Nút Back trả người dùng về đó là bỏ họ ở một
 * trang mồ côi: danh sách thì có, mà không có cách nào đi tiếp tới link.
 *
 * Một hàm chứ không phải chuỗi viết rải rác: trước đó 9 chỗ tự nối `/org/<id>/artifacts`, và một
 * chỗ sót lại thì người dùng vẫn rơi vào trang mồ côi mà không ai thấy trong diff.
 */
export const getArtifactBackPath = (orgId: string) => `/org/${orgId}/short-links`
