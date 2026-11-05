# Báo cáo viết lại 3 intent theo prototype wave 3 — 2026-10-05

Agent `intent-writer`. Chỉ sửa 3 file intent + file này. Không commit, không lệnh side effect. Mọi `file:line` kiểm lại bằng grep/Read trên `feat/artifact`; li2-be `:399` và Casdoor `:1254` kiểm lại qua `gh api`.

## File nào đổi gì
- `intend/artifact-replace-file.md` (105 dòng): 8 → **10 trạng thái** hộp thoại (S9 lỗi giữa đường, S10 artifact không còn + nút phụ "Tạo artifact mới" proto thêm), hành trình draft, vị trí nút ở 2 điểm vào. Constraints mới: con số sinh từ state, `access_mode` giữ nguyên, không bắt nhập lại mật khẩu, nút chạy không mờ, S6 chỉ xảy ra khi có nháp. Sửa bằng chứng `serve_token` (`:301`, `:365` thay cho `:365,376`), PATCH chưa có (`[artifact_id]/route.ts` chỉ GET/DELETE). Open: cảnh báo lần hai, stream bị cắt, cắt tên file dài, nguyên tử trục byte.
- `intend/artifact-access-control.md` (146 dòng): gộp "Constraints bổ sung" + bảng Q1–Q8 vào template; viết lại outcome theo copy đã duyệt (17 trang cổng, 401/403/429, tiêu đề nhánh không-email "Tài khoản của bạn"). CSP ghi đúng "cố ý — nới `'self'` riêng cho trang cổng, review riêng" và thêm hằng `ARTIFACT_LANDING_CSP:86`. Constraints mới: quét bị chặn +1 / submit sai không +1, `removed` thắng mọi cổng, đổi chế độ huỷ phiên. Open: nút đổi tài khoản ở 403, 3 hay 5 lần thử, hai lớp, min 8 ký tự, Range video, email khách thuộc org, claim `mode`.
- `intend/mcp-publish-artifact.md` (119 dòng): hành trình D1/D2/D3 với transcript + 9 thông điệp lỗi; sửa sự thật **lỗi MCP là text thuần, không JSON** (`errors.ts:65-95`); thêm `previous_size_bytes`; kiểm slot trước khi nhận HTML; back-hop JSON phải tự thêm check content-length. Open: `qr_url` link chết, chữ ô consent, HTML sai, body limit, audit, agent đặt chế độ, consent tiếng Anh.

## Mâu thuẫn tìm thêm giữa proto và answers.md / code
1. **CSP sai hằng**: brief, answers Q8 và proto đều trỏ `artifact-csp.ts:49` cho trang cổng, nhưng `:49` nằm trong `artifactCsp(kind)` (pdf/slides/video). Trang bia mộ — và trang cổng sẽ cùng khuôn — dùng `ARTIFACT_LANDING_CSP` ở `:82-88` (`form-action 'none'` tại `:86`). Nới phải làm ở hằng này, không phải `:49`.
2. **"Lượt quét chưa bao giờ được đo trên LiHi"** (proto replace-file, 2 chỗ) **sai**: `log.md:1089,1156` ghi iPhone thật, `visits` 2→3. Con số 47 vẫn là minh hoạ, nhưng cơ chế +1 đã đo được.
3. **Test import graph**: intent MCP cũ ghi `artifact-serve-import-graph.test.ts` không kèm đường dẫn; file thật ở `src/__tests__/unit/services/`, không ở `unit/artifacts/`.
4. **`previous_size_bytes`**: proto mcp trả thêm trường này, answers Q1 / intent cũ chốt shape 4-5 trường. Giữ theo proto (cần cho câu nói phần chênh) — ghi là lệch cố ý.
5. **Tiêu đề 403 nhánh không-email**: đặc tả viết "Email của bạn…", proto đổi "Tài khoản của bạn…" để khớp bản en `Your account`. Lấy theo proto.
6. **`database.types.ts` có `access_mode`** nhưng ở bảng `dashboards:1812`, không phải `artifacts` — dễ grep nhầm thành "đã có cột".
7. **Audit**: answers Q7 nêu giả thuyết fire-and-forget; `log.md:678-683` đã đo trên LiHi: event không tới queue. Intent MCP cũ chưa dẫn số đo này.
8. Walkthrough `MAX_TRIES = 5` còn brief gốc nói 3 — không ai chốt, đưa vào Open.

## Câu hỏi còn mở (cần chủ sản phẩm)
- Trang 403 Riêng tư: vị trí và copy của nút đổi tài khoản.
- Số lần thử mật khẩu 3 hay 5; khoá bao nhiêu phút; theo token hay IP.
- Hai lớp (thêm password lên touch point) hay một lớp.
- `qr_url`: phải đo bucket `path_qr_code` public hay private trước khi viết câu trả lời của tool.
- Chữ ô consent "Create short links" khi `write` bao luôn publish artifact.
- Body limit back-hop trên LiHi — cần cho phép đo.
- Email khách Google ghi vào `customer_profiles` của org: xác nhận đây là điều mong muốn.
