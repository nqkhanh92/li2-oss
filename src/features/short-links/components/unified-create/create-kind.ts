/**
 * Hai loại tạo được từ trình tạo chung. Thứ tự là thứ tự hiện trên công tắc.
 */
export const CREATE_KINDS = ['link', 'artifact'] as const

export type CreateKind = (typeof CREATE_KINDS)[number]

/**
 * Đọc loại từ query param.
 *
 * Giá trị lạ hoặc thiếu đều về `link` — **không** ném và không để `undefined` chảy tiếp. Trình tạo
 * luôn phải vẽ ra được một cây form; một tham số gõ sai trên thanh địa chỉ không được làm trắng
 * trang.
 *
 * Không phân biệt chữ hoa thường, cùng lý do với `content_type` ở danh sách: dữ liệu thật trong
 * dự án này đã có sẵn một cột lẫn `URL` với `url`, và URL thì người ta gõ tay.
 */
export function parseCreateKind(raw?: string | string[] | null): CreateKind {
  const value = Array.isArray(raw) ? raw[0] : raw
  const normalized = value?.toLowerCase()
  return CREATE_KINDS.find((kind) => kind === normalized) ?? 'link'
}
