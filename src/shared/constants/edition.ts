/**
 * Phiên bản đang build: `oss` hay `cloud`.
 *
 * Một kho, hai bản phát hành — mô hình Dub.co. Mã của bản thương mại nằm ở `src/ee/` với giấy
 * phép riêng; cờ này quyết định bản build **hiện** hay **ẩn** những phần đó.
 *
 * ## Vì sao không dùng `disabled-features.ts`
 *
 * File đó có 21 cờ `NEXT_PUBLIC_DISABLE_*`, và chúng là cờ **vận hành**: một người tự host tắt
 * Heatmap vì không cần. `EDITION` là chuyện khác hẳn — nó nói **bản build này là bản nào**, và
 * nó quyết định ranh giới giấy phép. Trộn hai thứ vào một chỗ thì ngày nào đó sẽ có người tắt
 * một cờ vận hành và vô tình bật mã `ee/`.
 *
 * ## ⚠ Cờ chặn *chạy*, không chặn *ship*
 *
 * Bài học đắt của đợt đánh giá open-source: **không một cờ `NEXT_PUBLIC_*` nào loại file khỏi
 * bundle.** Ví dụ sống trong chính kho này — `shared/providers/chat-woot.tsx:15` có
 * `if (disabledFeatures.SUPPORT_CHAT) return` nhưng `:26` vẫn có token dạng literal nằm trong
 * source của một client component.
 *
 * Nên `EDITION` **không phải** cơ chế bảo mật và không phải cơ chế giấy phép. Nó là cơ chế
 * **giao diện**: ẩn thứ bản OSS không dùng được. Ranh giới giấy phép do `src/ee/LICENSE` giữ,
 * còn việc bản phát hành có mang theo `src/ee/` hay không là quyết định của quy trình đóng gói.
 *
 * Viết `isCloud`/`isOss` dạng hằng so sánh trực tiếp để bundler có **cơ hội** loại nhánh chết —
 * nhưng đừng coi đó là bảo đảm; chưa đo.
 *
 * ## Dùng thế nào
 *
 * ```tsx
 * import { isCloud } from '@/shared/constants/edition'
 * {isCloud && <ImportFromSheetsButton />}
 * ```
 *
 * Mặc định là `cloud`: kho này LÀ bản thương mại, nên không đặt gì thì không đổi hành vi.
 * Bản OSS build với `NEXT_PUBLIC_EDITION=oss`.
 */

export type Edition = 'oss' | 'cloud'

export const EDITION: Edition = process.env.NEXT_PUBLIC_EDITION === 'oss' ? 'oss' : 'cloud'

/** Bản thương mại — hiện các tính năng có mã ở `src/ee/`. */
export const isCloud = process.env.NEXT_PUBLIC_EDITION !== 'oss'

/** Bản open-source — ẩn mọi thứ phụ thuộc `src/ee/`. */
export const isOss = process.env.NEXT_PUBLIC_EDITION === 'oss'

/**
 * Số tín dụng AI báo về khi bản build KHÔNG đo tín dụng.
 *
 * Bản tự host dùng **khoá LLM của chính họ** (`LI2_AI_GATEWAY_URL` +
 * `LI2_AI_GATEWAY_KEY` — xem `core/agent/gateway.ts:120`), nên "tín dụng AI của Li2" không có
 * nghĩa ở đó. Giới hạn thật của họ là hoá đơn với nhà cung cấp LLM.
 *
 * Vì sao một hằng số thay vì đổi kiểu thành `number | null`: `credits_remaining` là `number`
 * trong hợp đồng công khai (`features/smart-setup/types.ts:16`) và UI so sánh `> 0` / `<= 0`
 * ở 6 chỗ. Đổi kiểu là sửa lan sang UI — tức viết mã mới, trái luật của đợt tách này.
 *
 * ⚠ Giá trị này **không bao giờ nên hiện ra màn hình**. UI tín dụng cũng là thứ chỉ có ở bản
 * cloud và sẽ được gate riêng; nếu bạn thấy "9007199254740991 suggestions left" thì nghĩa là
 * một chỗ UI còn thiếu gate.
 */
export const UNMETERED_AI_CREDITS = Number.MAX_SAFE_INTEGER
