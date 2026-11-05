# Brief: viết lại 3 intent trong `intend/` cho khớp prototype wave 3

Bạn là agent `intent-writer`. Ngôn ngữ: tiếng Việt, giữ thuật ngữ kỹ thuật tiếng Anh. Làm việc trong `/Volumes/Data/Claude/Li2-new/li2-app`.

## Việc
Ba intent hiện có được viết TRƯỚC khi có prototype. Prototype (đã được chủ sản phẩm xem) giờ là nguồn sự thật về hành vi & UI. Viết lại ba file này cho khớp prototype:
- `intend/artifact-replace-file.md`
- `intend/artifact-access-control.md`
- `intend/mcp-publish-artifact.md`

Giữ ĐÚNG cấu trúc `intend/_intendtemplate.md` (Problem / Proposed outcome / Affected users and systems / Constraints / Open questions). Status vẫn `draft`. Author: ghi "Claude (intent-writer), từ prototype 2026-10-04".

## Nguồn (đọc hết, theo thứ tự)
1. `intend/_intendtemplate.md`
2. 3 intent hiện tại + 2 file `*.answers.md` (bằng chứng code, file:line — KHÔNG bỏ các bằng chứng này)
3. `docs/artifact-wave3-screens.md` (architect: màn hình A–E, mục "mâu thuẫn")
4. `artifact-wave3-proto-replace-file.html`, `artifact-wave3-proto-access-control.html`, `artifact-wave3-proto-mcp.html` — đọc copy, trạng thái, nút; grep các chuỗi hiển thị
5. `artifact-wave3-walkthrough.html` — bản toàn trình có state; đọc phần JS state machine để lấy hành vi đã ghép (token/short_url/qr_url bất biến qua update; `removed` thắng mọi cổng; quét khi bị chặn vẫn +1 visit, submit sai mật khẩu không +1)
6. `log.md` đoạn ngày 2026-10-04 (từ chuỗi "wave 3" trở đi) — các quyết định đã chốt của chủ sản phẩm

## Quyết định đã chốt — KHÔNG mở lại
- Free có mọi tính năng ngay. Phiên người xem 1 tuần, không hiện cho người xem.
- Private = thành viên tổ chức. SSO Gmail = người xem bất kỳ chứng minh có Google, ghi email vào `customer_profiles`. Google dùng OAuth client riêng (Casdoor tạo user ở lần OAuth đầu, `auth.go:1254`).
- MCP: chỉ HTML text, server li2-mcp first-party OAuth, scope `write`, luôn công khai ở v1, quota 30MB là byte cap, tool `publish` + `update`, update giữ QR (serve_token/touch point/short_url/QR/name bất biến).
- Thay file: bản cũ mất hẳn, báo trước; cho đổi kind kèm cảnh báo; quota tính delta; thứ tự ghi upload → update row → xoá file cũ.
- `removed`: `/a/` 410, `/file`,`/download` 404; bia mộ không ăn quota.
- CSP: `form-action 'none'` là CỐ Ý (`src/core/helpers/artifact-csp.ts:14,19,49`). Cổng mật khẩu cần `<form method="post">` → nới `'self'` RIÊNG cho trang cổng, giữ `'none'` cho kind `html`, review riêng. Viết đúng như vậy — không viết "thiếu form-action".

## Bốn chỗ ba proto lệch nhau — đưa vào Open questions (chưa ai chốt) hoặc Constraints (nếu đã rõ)
1. Trang 403 Private: copy "đăng nhập bằng tài khoản khác" nhưng không có nút → cần nút đổi tài khoản (ghi là yêu cầu, hỏi vị trí/copy).
2. Số lần thử mật khẩu: 3 hay 5 — OPEN, chủ sản phẩm chọn.
3. Số cứng trong copy (4.5 MB, 47 lượt, 2/3) → phải sinh từ state — Constraint.
4. Cổng mật khẩu = form POST thật → CSP như trên — Constraint.

## Quy tắc viết
- Mỗi claim về code ghi `file:line` và gắn nhãn provenance: **đo được** / **đọc được** / **suy ra**. Không chép nhãn từ file khác mà không kiểm lại bằng grep/Read.
- Không thêm tính năng ngoài prototype. Không viết plan triển khai (đó là bước sau).
- Ghi RÕ đoạn nào đổi so với bản cũ: cuối mỗi file thêm mục `## Thay đổi so với bản 2026-10-04 11:xx` liệt kê ngắn.
- GHI FILE SỚM: viết bản nháp từng file ngay sau khi đọc xong nguồn cho file đó, rồi mới chỉnh. Không giữ trong đầu tới cuối.
- KHÔNG sửa file nào khác ngoài 3 intent. Không git commit, không chạy lệnh có side effect. Không chạy `yarn gen:types`, không đụng LiHi.
- Xong: ghi `intend/_rewrite-report.md` (≤40 dòng): file nào đổi gì, mâu thuẫn nào tìm thêm giữa proto và answers.md, câu hỏi còn mở. Trả lời cuối cùng chỉ gồm đường dẫn file report.
