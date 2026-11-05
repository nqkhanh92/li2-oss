/**
 * Danh sách đang ở trạng thái nào. Một giá trị, bốn khả năng loại trừ nhau.
 *
 * Tách khỏi component vì đây mới là chỗ dễ sai: trước đây `rows.length === 0` được dùng làm
 * "org này chưa có gì", và ba tình huống hoàn toàn khác nhau cùng rơi vào một màn hình. Lỗi 500
 * kéo dài làm một org 61 hàng hiện ra "Chưa có link rút gọn nào" kèm lời mời tạo cái đầu tiên.
 */
export type ShortLinkListState = 'loading' | 'error' | 'rows' | 'no_match' | 'empty'

/**
 * Một bộ lọc được coi là ĐANG ÁP khi nó thật sự thu hẹp kết quả.
 *
 * `null`, `undefined`, chuỗi rỗng và **mảng rỗng** đều không áp. Mảng rỗng là ca dễ sót nhất:
 * bỏ chọn hết tag để lại `tag_ids: []`, và nếu tính đó là "đang lọc" thì một org rỗng thật sẽ
 * hiện "không có hàng nào khớp" kèm nút xoá bộ lọc không có gì để xoá.
 *
 * `created_at` là object khoảng ngày; `{}` sau khi xoá cũng không áp.
 */
export function hasActiveQuery(search?: string | null, filters?: Record<string, unknown> | null) {
  if (search?.trim()) return true
  if (!filters) return false

  return Object.values(filters).some((value) => {
    if (value === null || value === undefined || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value as object).length > 0
    return true
  })
}

/**
 * Thứ tự xét là một phần của ý nghĩa, không phải tuỳ tiện:
 *
 * 1. `isLoading` trước — lần tải đầu chưa biết gì, nói "lỗi" hay "rỗng" lúc đó đều là đoán.
 * 2. `isError` **trước** cả việc xét số hàng. Khi truy vấn hỏng thì `rows` rỗng là *hệ quả của
 *    lỗi*, không phải sự thật về dữ liệu — đây đúng là chỗ bản cũ sai.
 *    Và `isError` xét trước cả `rowCount > 0`: khi refetch nền hỏng, TanStack Query giữ lại dữ
 *    liệu của lần trước, nên có thể vừa có hàng vừa có lỗi. Chọn hiện lỗi là **đánh đổi có chủ
 *    đích** — hàng cũ còn đó trông y như hàng mới, và lặng lẽ hiện dữ liệu cũ trong lúc máy chủ
 *    hỏng là đúng loại "nói với người dùng một điều không thật" mà cả hàm này sinh ra để chặn.
 *    Người dùng mất tạm danh sách nhưng có nút thử lại, thay vì tin vào một bản chụp đã cũ.
 * 3. Có hàng → hiện hàng.
 * 4. Rỗng mà đang lọc/tìm → "không khớp", khác hẳn "chưa có gì".
 *
 * ⚠ `isError` ở đây là lỗi **sau khi TanStack Query đã thử lại hết lượt**, không phải lần hỏng
 * đầu. Lỗi thoáng qua thì retry tự lo và danh sách hiện đủ — đo được. Đừng đổi retry để chữa chỗ
 * này; việc cần làm chỉ là có một nhánh cho lúc retry đã cạn.
 */
export function getShortLinkListState(input: {
  isLoading: boolean
  isError: boolean
  rowCount: number
  search?: string | null
  filters?: Record<string, unknown> | null
}): ShortLinkListState {
  if (input.isLoading) return 'loading'
  if (input.isError) return 'error'
  if (input.rowCount > 0) return 'rows'
  return hasActiveQuery(input.search, input.filters) ? 'no_match' : 'empty'
}
