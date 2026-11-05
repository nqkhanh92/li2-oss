import { TouchPointContentType } from '@/features/touch-points/types'
import { formatBytes } from '@/features/artifacts/utils/format-bytes'
import type { TouchPointArtifactMeta } from '@/core/types/touch-point.type'
import { isArtifactContentType } from '@/core/helpers/merged-status'

/** Định nghĩa nằm ở core — service lọc và giao diện phải dùng chung một phép so khớp. */
export { isArtifactContentType }

/**
 * Ba họ màu của ô loại, lấy đúng từ `.tile.url / .file / .page` trong bản thiết kế trang 1.
 *
 * Chia theo *cách người ta mở nội dung*, không theo đuôi file: `page` là thứ Li2 render ra một
 * trang đọc được ngay (html, markdown), `file` là thứ phải tải về hoặc mở bằng trình xem (pdf,
 * ảnh, video, slide, tài liệu, bảng tính), `url` là link trỏ đi nơi khác.
 */
export type RowKindFamily = 'url' | 'file' | 'page'

/**
 * Tên biểu tượng cho ô tròn đầu hàng. Là **chuỗi**, không phải component React, vì file này là
 * utils thuần và được test ở môi trường `node` — nhập một component lucide vào đây là buộc cả
 * `getRowKind` phải chạy trong jsdom. Ánh xạ chuỗi → component nằm ở `row-avatar.tsx`.
 */
export type RowKindIcon =
  | 'link'
  | 'page'
  | 'site'
  | 'pdf'
  | 'slides'
  | 'document'
  | 'sheet'
  | 'image'
  | 'video'
  | 'file'

export interface RowKind {
  family: RowKindFamily
  /** Nhãn ngắn in trong ô loại. Viết hoa cho file, thường cho trang — theo mockup. */
  label: string
  /** Biểu tượng cho ô tròn đầu hàng (artifact). Hàng LINK dùng favicon, không dùng cái này. */
  icon: RowKindIcon
  /**
   * Nội dung đã bị gỡ: ô loại phải xám đi, không giữ màu họ.
   *
   * Nhãn vẫn là `PDF`/`page` chứ không đổi thành "GỠ" — nó TỪNG là một PDF, và badge "Đã gỡ" cạnh
   * tên mới là chỗ nói trạng thái. Hai chỗ cùng nói một điều thì chỗ thứ hai là nhiễu; việc của ô
   * loại ở đây chỉ là **thôi trông như hàng còn sống**.
   */
  muted?: boolean
}

/**
 * ⚠ Phải phủ **đủ 9** giá trị của `artifacts_kind_check`
 * (`20261024000001_artifacts__md_office_image.sql:57`). Bản trước thiếu `site` nên artifact kiểu
 * site rơi vào nhánh mặc định và hiện ra là `FILE` — sai họ màu, sai cả biểu tượng.
 *
 * Nhánh mặc định **vẫn giữ**: CHECK còn nới nữa, và một kind mới phải hiện ra được trước khi ai
 * kịp sửa file này.
 */
const ARTIFACT_KIND_TO_ROW_KIND: Record<string, RowKind> = {
  html: { family: 'page', label: 'page', icon: 'page' },
  markdown: { family: 'page', label: 'page', icon: 'page' },
  site: { family: 'page', label: 'site', icon: 'site' },
  pdf: { family: 'file', label: 'PDF', icon: 'pdf' },
  slides: { family: 'file', label: 'SLIDE', icon: 'slides' },
  document: { family: 'file', label: 'DOC', icon: 'document' },
  sheet: { family: 'file', label: 'SHEET', icon: 'sheet' },
  image: { family: 'file', label: 'IMG', icon: 'image' },
  video: { family: 'file', label: 'VIDEO', icon: 'video' },
}

const LINK_ROW_KIND: RowKind = { family: 'url', label: 'LINK', icon: 'link' }

/** Artifact có kind lạ vẫn phải hiện ra là artifact, chứ không được tụt về "LINK". */
const UNKNOWN_ARTIFACT_ROW_KIND: RowKind = { family: 'file', label: 'FILE', icon: 'file' }

/**
 * Loại của một hàng trong danh sách gộp.
 *
 * `content_type` là nguồn quyết định artifact hay link — KHÔNG phải sự có mặt của `artifact`.
 * Hai thứ đó lệch nhau được: FK `artifacts.touch_point_id` là `ON DELETE SET NULL`, nên một touch
 * point `ARTIFACT` có thể mất metadata mà vẫn là artifact. Lấy `artifact` làm chuẩn thì đúng hàng
 * đó sẽ hiện ra như một link thường trỏ tới `/a/<token>`, là điều vô nghĩa với người đọc.
 */

/** Nội dung đã bị gỡ khỏi kho. Short link và QR thì KHÔNG — xem `getRowDestination`. */
export function isRemovedArtifact(row: {
  content_type?: string | null
  artifact?: TouchPointArtifactMeta | null
}) {
  return isArtifactContentType(row.content_type) && row.artifact?.status === 'removed'
}

export function getRowKind(row: {
  content_type?: string | null
  artifact?: TouchPointArtifactMeta | null
}): RowKind {
  if (!isArtifactContentType(row.content_type)) return LINK_ROW_KIND
  const kind = row.artifact?.kind
  const base = (kind && ARTIFACT_KIND_TO_ROW_KIND[kind]) || UNKNOWN_ARTIFACT_ROW_KIND
  return isRemovedArtifact(row) ? { ...base, muted: true } : base
}

/**
 * Lớp Tailwind cho ô loại, một họ một bộ. Giữ cạnh `getRowKind` để thêm họ mới là sửa một chỗ.
 */
export const ROW_KIND_TILE_CLASS: Record<RowKindFamily, string> = {
  url: 'bg-indigo-50 text-indigo-700',
  file: 'bg-red-50 text-red-700',
  page: 'bg-amber-50 text-amber-700',
}

/** Ô loại của hàng đã gỡ: xám, không mang màu họ. */
export const ROW_KIND_TILE_MUTED_CLASS = 'bg-slate-100 text-slate-400 line-through'

export function getRowKindTileClass(kind: RowKind) {
  return kind.muted ? ROW_KIND_TILE_MUTED_CLASS : ROW_KIND_TILE_CLASS[kind.family]
}

/**
 * Ô tròn đầu hàng của hàng đã gỡ: xám như ô chữ, nhưng **không** `line-through`.
 *
 * Gạch ngang là tín hiệu của chữ; vắt một đường qua giữa biểu tượng chỉ làm nó khó đọc chứ không
 * nói thêm điều gì. Tín hiệu "đã gỡ" vẫn còn đủ ba chỗ: ô chữ cạnh tên gạch ngang, badge trạng
 * thái, và cột đích nói "đã gỡ" thay cho dung lượng.
 */
export const ROW_AVATAR_MUTED_CLASS = 'bg-slate-100 text-slate-400'

export function getRowAvatarClass(kind: RowKind) {
  return kind.muted ? ROW_AVATAR_MUTED_CLASS : ROW_KIND_TILE_CLASS[kind.family]
}

/**
 * Cột "đích" nói hai nghĩa khác nhau, nên nó trả về kèm nhãn chứ không chỉ trả chuỗi.
 *
 * - link: đích là URL người dùng sẽ bị chuyển tới
 * - artifact: đích là *nội dung Li2 đang giữ* — mô tả file, không phải một URL
 *
 * Để một cột nói hai nghĩa mà không nhãn thì người đọc không có cách nào biết
 * `app.example.com/a/xxx` là "link này trỏ ra ngoài tới đó" hay "nội dung nằm ở đây" —
 * đúng cái nhầm mà danh sách hiện tại đang gây ra.
 *
 * Với artifact, giá trị là **dung lượng**, KHÔNG phải tên. Tên đã nằm ngay dòng trên trong cùng
 * một hàng; lặp lại nó làm cột đích tốn một dòng mà không thêm thông tin nào — điều này nhìn thấy
 * rõ trên trình duyệt khi bản đầu dùng tên. Dung lượng là thứ người dùng chưa biết và đang cần
 * (nó trừ vào hạn mức 30 MB ghi ngay trên header).
 */
export interface RowDestination {
  /** Khoá i18n cho nhãn đứng trước giá trị. */
  labelKey: string
  value: string
}

export function getRowDestination(row: {
  content_type?: string | null
  content_value?: string | null
  name?: string | null
  artifact?: TouchPointArtifactMeta | null
}): RowDestination {
  if (!isArtifactContentType(row.content_type)) {
    return {
      labelKey: 'touchpoint:merged_list.destination.redirects_to',
      value: stripProtocol(row.content_value ?? ''),
    }
  }

  /**
   * Hàng đã gỡ KHÔNG được nói "nội dung 23 KB" — nội dung không còn, con số đó là lời nói dối và
   * `size_bytes` chỉ còn là vết của thứ từng có.
   *
   * Thứ đang thật sự xảy ra, và là thứ chủ sở hữu cần nhất: **short link và QR vẫn sống**, người
   * quét vẫn tới nơi và thấy trang "đã gỡ" (410, không phải 404). Hôm nay không chỗ nào trong app
   * nói điều đó cho họ — ai in 500 tờ QR rồi xoá artifact sẽ không biết chuyện gì đang xảy ra với
   * chỗ giấy đó.
   */
  if (isRemovedArtifact(row)) {
    return { labelKey: 'touchpoint:merged_list.destination.removed', value: '' }
  }

  const sizeBytes = row.artifact?.size_bytes
  return {
    labelKey: 'touchpoint:merged_list.destination.content',
    // Artifact mất metadata thì lùi về URL phục vụ: xấu, nhưng vẫn hơn một ô trống.
    value: sizeBytes ? formatBytes(sizeBytes) : stripProtocol(row.content_value ?? ''),
  }
}

/**
 * Trạng thái cần hiện badge trên hàng, hoặc `null` nếu không cần.
 *
 * Chỉ hiện khi KHÁC `live`. `live` là mặc định của gần như mọi hàng; một badge "Live" trên 23/26
 * hàng là badge không ai đọc, và nó làm chìm đúng hàng cần nhìn thấy. Cùng lập luận với
 * `ArtifactAccessBadge` khi bỏ qua `public`.
 *
 * Vì sao hàng "đã gỡ" PHẢI nhìn ra được: LiHi có 35 touch point mà artifact đã `removed`, nhưng
 * short link và QR **vẫn phục vụ** — chúng trả 410 kèm trang "đã gỡ", không phải 404. Chúng là đầu
 * nhận của QR đã in ra giấy, nên lọc chúng khỏi danh sách là che 35 điểm phục vụ khỏi mắt chủ sở
 * hữu. Nhưng giữ chúng mà để trông y hệt hàng live cũng sai không kém: chủ sở hữu đếm ra 58
 * artifact và tưởng cả 58 còn phục vụ nội dung.
 */
export function getRowStatusBadge(row: {
  artifact?: TouchPointArtifactMeta | null
}): { status: string } | null {
  const status = row.artifact?.status
  if (!status || status === 'live') return null
  return { status }
}

/**
 * Đường tới chỗ **sửa** một hàng, tương đối theo org (`orgRouterPush` tự thêm `/org/<id>`).
 *
 * Danh sách gộp hai loại, mà hai loại sửa ở hai trang khác nhau: short link sửa ở
 * `/short-links/<touch_point_id>`, artifact sửa ở `/artifacts/<artifact_id>`. Trước đây mọi hàng
 * đều đi về trang short link, nên bấm "Sửa" trên một artifact mở ra một trang nói về đích chuyển
 * hướng và cấu hình QR — không có chỗ nào thay được file hay đổi quyền truy cập.
 *
 * ⚠ Hai **id khác nhau**, và đây là chỗ dễ lẫn nhất: hàng trong danh sách là một `touch_point`,
 * còn trang artifact cần `artifacts.id`. Dùng `row.id` cho cả hai sẽ ra một URL trông đúng và trả
 * 404.
 *
 * Artifact mất metadata (FK `artifacts.touch_point_id` là `ON DELETE SET NULL`) thì không có
 * `artifact.id` để đi tới — lúc đó lùi về trang short link, vì touch point vẫn còn và vẫn phục vụ.
 */
export function getRowEditPath(row: {
  id: string
  content_type?: string | null
  artifact?: TouchPointArtifactMeta | null
}): string {
  if (isArtifactContentType(row.content_type) && row.artifact?.id) {
    return `/artifacts/${row.artifact.id}`
  }
  return `/short-links/${row.id}?tab=detail`
}

/**
 * Nhận `null`/`undefined` chứ không chỉ `string`.
 *
 * ⚠ Đính chính một lời khai sai của chính tôi: bản đầu ghi rằng LiHi có một hàng `short_url` null
 * và mở danh sách org đó là mất cả trang. **Không đúng.** Truy vấn phân biệt được hai ca cho thấy
 * hàng `00000000-…-bb` có `short_url = ''` chứ không phải `NULL`, và `''.replace(…)` không ném gì.
 * Hơn nữa `touch_points.short_url` là **NOT NULL** ở tầng DB, nên null không bao giờ tới từ dữ
 * liệu. Truy vấn gốc của tôi dùng `is null OR = ''` nên đã gộp hai ca lại và tôi đọc nhầm kết quả.
 *
 * Vậy hàm vẫn nhận null để làm gì? Vì nó **cũng được gọi trên `content_value`**, và cột đó *thật
 * sự* nullable. Đây là phòng vệ rẻ cho một ca có thật, không phải bản vá cho một lỗi có thật.
 */
export function stripProtocol(url?: string | null) {
  return (url ?? '').replace(/^https?:\/\//, '')
}
