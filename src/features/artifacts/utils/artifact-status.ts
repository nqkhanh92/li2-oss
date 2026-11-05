import { isArtifactStatus, type ArtifactStatus } from '@/core/types/artifact.type'

/**
 * Mã hành động, không phải hàm gọi API: prototype mới chỉ có endpoint publish, nên
 * ba mã còn lại được component render ở dạng nút khoá. Trả về mã thay vì callback
 * giữ hàm này thuần và test được mà không cần dựng mutation giả.
 */
export type ArtifactActionKind = 'publish' | 'reupload' | 'appeal' | 'republish' | 'replace'

export type ArtifactBadgeTone = 'neutral' | 'info' | 'success' | 'error' | 'warning'

export interface ArtifactStatusView {
  badge: { tone: ArtifactBadgeTone; labelKey: string }
  /** Dòng phụ nói hệ quả — link còn sống không, QR đã in còn quét được không. */
  noteKey: string | null
  /** `null` ở `scanning` (hệ thống đang làm) và `removed` (không có khôi phục). */
  action: { kind: ArtifactActionKind; labelKey: string } | null
}

/**
 * Phủ đủ 7 giá trị của DB CHECK dù API prototype chỉ sinh ra `draft`, `live` và `removed`.
 * `switch` không có `default` để TypeScript báo lỗi ngay khi union nở thêm nhánh,
 * thay vì để nhánh mới lặng lẽ rơi vào trạng thái mặc định sai.
 *
 * Tiêu chí tách nhánh là nút chính khác nhau: `blocked` chưa từng có link nên phải
 * tải file khác; `quarantined` từng live rồi bị gỡ nên QR đã in nay chết, việc cần
 * làm là kháng nghị.
 */
/**
 * Hàng có `status` ngoài union. `ArtifactDTO.status` nới thành `ArtifactStatus | (string & {})`
 * (spec A6b) vì `database.types.ts` khai cột là `string` và `toDTO` giữ nguyên giá trị lạ thay vì
 * ép nó về một giá trị hợp lệ — ép là vô hiệu hoá chính fallback này và mời người dùng bấm một
 * nút trên hàng ta không hiểu.
 */
const UNKNOWN_STATUS_VIEW: ArtifactStatusView = {
  badge: { tone: 'neutral', labelKey: 'status.draft.badge' },
  noteKey: null,
  action: null,
}

/**
 * Nhận kiểu rộng, nhưng **thu hẹp bằng type guard lúc chạy rồi mới vào `switch`**, chứ không nới
 * tham số của `statusViewFor`. Khác biệt không phải chuyện phong cách: nếu `switch` nhận thẳng
 * `ArtifactStatus | (string & {})` thì sau 6 nhánh nó không còn thu về `never`, và TypeScript
 * **thôi báo lỗi** khi ai đó thêm status thứ bảy vào union mà quên viết nhánh — đúng cái bẫy mà
 * hàm này cố ý dựng `switch` không `default` để tránh. Tách hai tầng giữ được cả hai: kiểu rộng
 * ở cổng vào, kiểm tra đủ nhánh ở bên trong.
 */
export function getArtifactStatusView(status: ArtifactStatus | (string & {})): ArtifactStatusView {
  return isArtifactStatus(status) ? statusViewFor(status) : UNKNOWN_STATUS_VIEW
}

function statusViewFor(status: ArtifactStatus): ArtifactStatusView {
  switch (status) {
    case 'draft':
      return {
        badge: { tone: 'neutral', labelKey: 'status.draft.badge' },
        noteKey: 'status.draft.note',
        action: { kind: 'publish', labelKey: 'actions.publish' },
      }
    case 'scanning':
      return {
        badge: { tone: 'info', labelKey: 'status.scanning.badge' },
        noteKey: 'status.scanning.note',
        action: null,
      }
    /**
     * Wave 3: `live` có nút chính — thay nội dung mà giữ QR và short link. Trước đó ô này trống
     * (không có việc gì để bấm); giờ việc duy nhất người dùng muốn làm với một artifact đang chạy là
     * đổi nội dung đã in QR mà không in lại, và `replace` là đúng việc đó.
     */
    case 'live':
      return {
        badge: { tone: 'success', labelKey: 'status.live.badge' },
        noteKey: null,
        action: { kind: 'replace', labelKey: 'actions.update_content' },
      }
    case 'blocked':
      return {
        badge: { tone: 'error', labelKey: 'status.blocked.badge' },
        noteKey: 'status.blocked.note',
        action: { kind: 'reupload', labelKey: 'actions.reupload' },
      }
    case 'expired':
      return {
        badge: { tone: 'warning', labelKey: 'status.expired.badge' },
        noteKey: 'status.expired.note',
        action: { kind: 'republish', labelKey: 'actions.republish' },
      }
    case 'quarantined':
      return {
        badge: { tone: 'error', labelKey: 'status.quarantined.badge' },
        noteKey: 'status.quarantined.note',
        action: { kind: 'appeal', labelKey: 'actions.appeal' },
      }
    /**
     * Bia mộ — người dùng tự gỡ. Ba quyết định ở nhánh này:
     *
     * - `tone: 'neutral'`, không `error`/`warning`: không có gì sai cả. `error` dành cho
     *   `blocked`/`quarantined`, những thứ hệ thống làm *với* họ.
     * - `action: null`: không có khôi phục. File đã xoá thật khỏi kho và bia mộ không chứa dữ liệu,
     *   nên một nút "Khôi phục" ở đây là lời hứa không giữ được.
     * - `noteKey` khác `null`: mọi trạng thái không-live phải nói hệ quả, nếu không người dùng nhìn
     *   một hàng mà không hiểu. Ở đây hệ quả mới là điều đáng nói nhất — link và QR VẪN chạy.
     *
     * Danh sách artifact đã loại `removed` nên hôm nay nhánh này không có đường nào tới được từ UI.
     * Vẫn phải viết: `assertNever` dưới đây bắt buộc, và một badge trung tính là thứ duy nhất đúng
     * nếu một đường khác (export, màn Short Links sau này) chạm vào hàng đó.
     */
    case 'removed':
      return {
        badge: { tone: 'neutral', labelKey: 'status.removed.badge' },
        noteKey: 'status.removed.note',
        action: null,
      }
  }

  /**
   * Chỗ này ép TypeScript kiểm đủ nhánh: nếu `ARTIFACT_STATUSES` nở thêm một giá trị mà `switch`
   * trên chưa xử lý, `status` ở đây không còn thu về `never` và `assertNever` **đỏ ngay lúc
   * build**.
   *
   * Phải gọi hàm chứ không để một `return` trần như bản trước. Comment cũ ở đúng chỗ này khẳng
   * định "TypeScript vẫn báo lỗi khi union nở thêm nhánh" — tôi thêm status thứ bảy vào union
   * rồi chạy `tsc` để kiểm: **không lỗi nào**. Một `return` sau `switch` làm hàm hợp kiểu bất kể
   * còn thiếu nhánh nào, nên lời hứa đó chưa bao giờ có thật. Nhánh mới sẽ lặng lẽ hiện badge
   * `draft` — đúng thứ `switch` không `default` được dựng lên để ngăn.
   */
  return assertNever(status)
}

/**
 * Trả về view không-rõ thay vì ném: giá trị lạ đã bị chặn ở cổng vào, nên với tới đây nghĩa là
 * lập trình viên quên một nhánh — và lúc đó một badge trung tính vẫn tốt hơn một trang trắng.
 * Giá trị của hàm này nằm ở chữ ký `never`, không ở thân hàm.
 */
function assertNever(unhandled: never): ArtifactStatusView {
  // `void` chỉ để tham số được tính là đã dùng — giá trị của nó nằm ở kiểu `never`, không ở thân hàm.
  void unhandled
  return UNKNOWN_STATUS_VIEW
}

const BADGE_TONE_CLASS: Record<ArtifactBadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-semantic-info/10 text-semantic-info border-semantic-info/25',
  success: 'bg-semantic-success/10 text-semantic-success border-semantic-success/25',
  warning: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/25',
  error: 'bg-semantic-error/10 text-semantic-error border-semantic-error/25',
}

export function getArtifactBadgeClass(tone: ArtifactBadgeTone) {
  return BADGE_TONE_CLASS[tone]
}
