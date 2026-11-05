import 'server-only'

import OpenAI from 'openai'

/**
 * Đường ra model cho dock chat.
 *
 * ★ DÙNG NHÁNH TƯƠNG THÍCH OPENAI (`/v1/chat/completions`), KHÔNG dùng `/v1/messages` của
 * Anthropic — dù cổng nói được cả hai và dù `@anthropic-ai/sdk` đã nằm sẵn trong `package.json`.
 *
 * Lý do là một lỗi của cổng, đo được ngày 2026-10-29 bằng `curl` thẳng, với request sạch:
 *
 * | Đường | Tên tool nhận về |
 * |---|---|
 * | `/v1/messages` + stream | ❌ `get_top_links_ide` |
 * | `/v1/messages` không stream | ✅ `get_top_links` |
 * | `/v1/chat/completions` + stream | ✅ `get_top_links` |
 *
 * Tức nhánh stream kiểu Anthropic của cổng **làm méo tên tool**. Hậu quả lúc chạy: model gọi một
 * công cụ không tồn tại, vòng lặp trả "không có công cụ tên …", model thử lại, và lượt chat tiêu
 * 7 lần gọi model rồi xin lỗi người dùng. Không ca test tĩnh nào bắt được — chỉ một lượt thật.
 *
 * Nếu sau này cổng sửa lỗi đó, đổi về `/v1/messages` là chính đáng; nhưng **phải đo lại bằng đúng
 * bảng trên**, đừng tin là đã sửa.
 *
 * ⚠️⚠️ **`LI2_AI_GATEWAY_URL` KHÁC NHAU GIỮA MÁY LẬP TRÌNH VÀ SERVER.** Đã nổ 2026-10-29:
 *
 * | Nơi gọi | `http://203.0.113.10:20128` | `http://172.18.0.21:20128` |
 * |---|---|---|
 * | máy lập trình (ngoài LAN) | ✅ | ✗ không tới được |
 * | host LiHi | ✗ **treo tới hết giờ** | ✅ |
 * | trong container li2-app | ✗ `fetch failed` | ✅ |
 *
 * `203.0.113.10` là địa chỉ công khai của ROUTER; cổng model nằm ở một máy khác cùng LAN
 * (`172.18.0.21`), và LiHi cũng ở trong LAN đó (`172.18.0.24/24`). Từ bên trong, IP công khai
 * không vòng ngược lại — hairpin NAT.
 *
 * Triệu chứng rất dễ dẫn sai hướng: cấu hình "đúng" theo nghĩa `curl` từ máy lập trình chạy ngon,
 * nhưng trên server mọi lượt chat treo 180 giây rồi báo "Request timed out." — một câu không nhắc
 * gì tới mạng. Nên khi đổi chỗ chạy, **đo lại từ chính nơi sẽ chạy**, đừng đo từ máy mình.
 *
 * ⚠️ Khoá **không có tiền tố `NEXT_PUBLIC_`** và phải giữ như vậy. `NEXT_PUBLIC_*` bị nung thẳng
 * vào bundle trình duyệt lúc build, nên đổi tên biến thành `NEXT_PUBLIC_LI2_AI_GATEWAY_KEY` là
 * phát khoá cho mọi khách mở trang. File này nằm sau `import 'server-only'` để lỡ ai import nhầm
 * từ một component client thì vỡ lúc build chứ không vỡ khi đã lên mạng.
 */

/**
 * Model dùng cho MỌI lượt.
 *
 * Chủ sản phẩm chốt **2026-11-02: `cc/claude-sonnet-5-5`**, thay cho `cc/claude-opus-4-8` đã dùng
 * từ 2026-10-29. Đổi ngay sau phiên bàn về chi phí: link/QR sẽ miễn phí nên mỗi lượt chat là chi
 * phí biến đổi theo đầu người, và đó là thứ duy nhất trong sản phẩm tăng theo số người dùng.
 *
 * ⚠️ Danh sách `GET /v1/models` của cổng **không đầy đủ** — `cc/claude-opus-4-8` chưa bao giờ nằm
 * trong đó mà vẫn gọi được (đã đo hai lần, 2026-10-29 và 2026-11-02). Đừng dùng danh sách đó để
 * kết luận một tên model là sai.
 *
 * ⚠️ Và đừng đọc một lỗi 401 thành "model này chết". Sự cố 2026-11-02 trả
 * `503 [claude/...] [401] OAuth access token has expired` cho **mọi** model `cc/` cùng lúc —
 * token của chính cổng hết hạn, không liên quan tới tên model hay tới khoá của Li2. Phép thử rẻ
 * để phân biệt: gọi một model ngoài nhánh `cc/` (ví dụ `dc5/qwen/qwen3.8-27b`); nó chạy thì cổng
 * và khoá đều ổn, lỗi nằm ở nhánh kia.
 *
 * Nhánh `qwen` đã thử và **loại** làm model chính: `dc5/qwen/qwen3.6-27b` trả nội dung rỗng và
 * không gọi tool lần nào. Trợ lý này sống bằng tool-calling. Nhưng nó vẫn hữu ích làm **phép thử
 * sống của cổng** như trên.
 */
export const CHAT_MODEL = process.env.LI2_AI_MODEL || 'cc/claude-sonnet-5-5'

/**
 * Trần số bước gọi tool trong MỘT lượt.
 *
 * ⚠️ Đây **không phải hạn mức người dùng** — chủ sản phẩm chốt không chặn lạm dụng, và điều đó
 * được tôn trọng: không giới hạn số lượt, không `withRateLimit`. Nhưng một vòng lặp agent bắt buộc
 * phải có điều kiện dừng: model trả `stop_reason: 'tool_use'` thì vòng chạy tiếp, nên không có
 * trần nghĩa là **không có lối ra** khi model kẹt ở một tool liên tục thất bại. Đó là tính đúng
 * đắn của code chứ không phải chính sách.
 *
 * 30 đủ rộng cho việc thật dài nhất thấy được (tạo hàng loạt rồi đọc lại từng cái).
 */
export const MAX_TOOL_STEPS = 30

/** Trần token sinh ra mỗi lượt gọi model. Rộng tay vì không có ngân sách phải giữ. */
export const MAX_OUTPUT_TOKENS = 8192

/**
 * Thêm `/v1` nếu thiếu, và bỏ dấu `/` thừa ở cuối.
 *
 * ★ ĐÃ NỔ MỘT LẦN, 2026-10-29. Hai SDK hiểu `baseURL` khác nhau:
 *   - `@anthropic-ai/sdk` nối `/v1/messages` → baseURL phải KHÔNG có `/v1`;
 *   - `openai` chỉ nối `/chat/completions` → baseURL phải CÓ `/v1`.
 *
 * Đổi SDK mà quên đổi biến môi trường thì request bay tới
 * `http://…:20128/chat/completions` và nhận 404 kèm một trang HTML — một thông báo không hề nhắc
 * tới `/v1`, nên người đọc sẽ đi tìm lỗi ở chỗ khác.
 *
 * Chuẩn hoá ở đây thay vì chỉ ghi chú trong tài liệu: biến này được gõ tay vào một file `.env`
 * trên server, nơi không có gì kiểm lại, và cái giá của một lần gõ thiếu là cả tính năng im lặng
 * hỏng sau khi deploy. Nhận cả hai dạng là rẻ hơn nhiều so với một đêm truy lỗi.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

let client: OpenAI | null = null

/**
 * Client dùng chung, dựng lười.
 *
 * Dựng lười chứ không dựng ở tầm module: Next nạp module này trong cả lúc gom route lẫn lúc build,
 * và một lần `throw` ở tầm module vì thiếu biến môi trường sẽ làm **hỏng cả bản build** thay vì
 * hỏng đúng cái lượt chat gọi tới nó. Thiếu cấu hình là lỗi vận hành của một tính năng, không phải
 * lỗi của cả ứng dụng.
 */
export function gatewayClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.LI2_AI_GATEWAY_KEY
  const baseURL = process.env.LI2_AI_GATEWAY_URL

  if (!apiKey || !baseURL) {
    throw new Error(
      '[agent/gateway] thiếu LI2_AI_GATEWAY_KEY hoặc LI2_AI_GATEWAY_URL — đặt trong .env.production trên server (không dùng tiền tố NEXT_PUBLIC_)'
    )
  }

  client = new OpenAI({
    apiKey,
    baseURL: normalizeBaseUrl(baseURL),
    // Cổng là một dịch vụ nội bộ sau proxy LAN; một lượt có thể chạy vài phút khi model gọi nhiều
    // tool. Mặc định 10 phút của SDK quá rộng, 60s quá hẹp.
    timeout: 180_000,
    // SDK tự thử lại 2 lần với 429/5xx. Giữ nguyên: lượt chat đã có nút Dừng ở phía người dùng, và
    // một lần thử lại rẻ hơn nhiều so với bắt họ gõ lại câu hỏi.
    maxRetries: 2,
  })

  return client
}

/** Cho test: quên client đã dựng để lần gọi sau đọc lại biến môi trường. */
export function resetGatewayClient(): void {
  client = null
}
