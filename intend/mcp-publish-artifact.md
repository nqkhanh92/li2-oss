# Intent: MCP tool publish artifact từ Claude / ChatGPT
Author: Claude (intent-writer), từ prototype 2026-10-04. Status: draft. **Phụ thuộc cứng**: `intend/artifact-replace-file.md`.

Nguồn sự thật về hành vi và UI: `artifact-wave3-proto-mcp.html` (consent 2 trạng thái, transcript publish 7 lượt + update
5 lượt, dashboard, 9 lỗi) và `artifact-wave3-walkthrough.html` (cột transcript dùng chung state với dashboard và điện thoại).
Bằng chứng chi tiết: `mcp-publish-artifact.answers.md`. Nhãn: **đo được** / **đọc được** / **suy ra**.

## Problem
Người dùng nhờ Claude/ChatGPT sinh một trang HTML (landing, bảng giá, lời mời…) rồi muốn in QR dán lên vật lý. Hôm nay
phải làm **năm bước tay**: lưu file từ chat → mở li2 → Tạo artifact → upload → Xuất bản → copy QR. Mỗi lần sửa nội dung lại
lặp từ đầu — và nếu "lặp" là tạo artifact mới thì QR đã in thành rác.

Thị trường: Tiiny Host có MCP server chính thức trên mọi gói kể cả free, publish / update-in-place / delete, URL ổn định
qua các lần update (nguồn thứ cấp, answers Q1). Họ AI-artifact (v0, Bolt, Lovable) **không có** đường nhận nội dung đẩy vào.

li2-app **đã có** MCP server first-party `li2-mcp` (`src/app/api/mcp/route.ts`, OAuth + consent, PASETO 15 phút) với
**9 tool** (`src/core/mcp/tools.ts:323-412`, **đo được** grep) nhưng chưa tool nào cho artifact; tool ghi duy nhất là
`create_short_link` (`:389`, scope `write`, **đọc được**).

## Proposed outcome
**D1 — thêm connector một lần.** Dán URL MCP vào Claude.ai → đăng nhập Casdoor → trang consent của li2 (đã code,
`src/app/(protected)/mcp/consent/page.tsx`, **không sửa**) với ô `write` tick sẵn (`mcp-oauth.service.ts:1026`, **đọc được**)
→ **Allow access**. `publish_artifact`/`update_artifact` **chỉ hiện trong `tools/list` khi ô write được tick**
(`toolsVisibleTo`, `mcp/route.ts:245-247`, **đọc được**) — người bỏ tick không thấy tool, không phải thấy rồi bị từ chối.

**D2 — publish từ hội thoại** (transcript 7 lượt, copy đã duyệt):
1. Người dùng: *"Đăng cái này lên li2 đi."*
2. Claude, **trước khi gọi tool**: *"Mình đăng lên li2 nhé. Trang sẽ ở chế độ công khai, ai có link đều mở được."* — câu bắt buộc.
3. Tool call `publish_artifact { org_id, name, html }` (+ tuỳ chọn `slug`, `domain_id`).
4. Tool result: **một text block chứa JSON** `{artifact_id, status, short_url, serve_url, qr_url}`.
5. Claude: *"Đã đăng. Link ngắn: **li2.ai/{slug}**. Mã QR tải ở đây: {qr_url}. Trang đang ở chế độ công khai. Đổi nội dung sau mà vẫn
   giữ nguyên link và mã QR thì nói mình biết."* Ảnh QR là **link**, không phải image block (v1 nhánh a).
6. Dashboard: artifact mới hiện như mọi artifact khác — **không badge "tạo bởi agent"**, không cột `source`.

**D3 — sửa rồi đăng lại** (transcript 5 lượt):
1. *"Dòng thứ hai sai giá, sửa thành 4.5 triệu rồi đăng lại."*
2. Claude: *"Mình sửa rồi đăng lại lên **cùng** artifact đó, nên link ngắn và mã QR không đổi."*
3. `update_artifact { org_id, artifact_id, html }` → cùng endpoint PATCH mà UI dùng (nhận JSON).
4. Result: cùng shape + `size_bytes`, `previous_size_bytes` (proto giữ thêm trường này dù không có trong shape Q1 — là thứ duy nhất cho agent nói đúng phần chênh); `short_url` và `qr_url` **giống hệt lần trước**.
5. Claude: *"Đã thay nội dung. **li2.ai/{slug}** giờ mở ra bản mới — mã QR đã in vẫn đúng, lượt quét đã ghi vẫn còn. Bản cũ không giữ lại được."* — câu cuối bắt buộc vì không có hộp thoại nào nói hộ.

Đưa PDF: *"Đợt này mình chỉ đăng được trang HTML. PDF thì tải lên trong li2."*

**Chín thông điệp lỗi** (M3.5) là **text thuần tiếng Anh, không bọc JSON** — vì `McpToolError.toToolResult()` trả
`{isError: true, content: [{type: 'text', text: clientMessage}]}` (`src/core/mcp/errors.ts:65-95`, **đọc được**). Mỗi câu nói
**con số thật** và **việc tiếp theo**; Claude nói lại bằng tiếng Việt. Ví dụ đã duyệt:
- Hết 3/3: *"This organization already has 3 published artifacts, which is the maximum on its plan. Delete one in the li2 dashboard, then call this tool again. Nothing was created — there is no draft to clean up."*
- Quá 10 MB: *"The HTML is {size} after decoding; the limit is 10 MB per file. Nothing was uploaded."*
- Vượt 30 MB (publish): *"This organization has used {used} of 30 MB. This file needs {need}. Delete an artifact in the li2 dashboard to free space."* — lối ra là gỡ bớt, không phải nén.
- Vượt 30 MB (update): *"Replacing this file needs {delta} more than the file it replaces, and only {free} is free. The current content is unchanged."* — **phần chênh**, và nói rõ bản cũ không đổi.
- HTML rỗng: *"The html field is empty."* · `org_id` không có `MCP_ACCESS`: *"This organization does not include MCP access. Ask an admin to check the plan in li2."* · `artifact_id` lạ: *"No artifact with that id in this organization."* (không nói "thuộc org khác") · Đã `removed`: *"That artifact has been taken down and cannot be updated. Publish a new one."* · Rate limit: chữ có sẵn `errors.ts:158`.

## Affected users and systems
- **Người dùng**: thành viên org có `MCP_ACCESS`, dùng Claude.ai / Claude Code / Cursor…
- **`li2-mcp`**: `src/core/mcp/tools.ts` thêm hai descriptor `publish_artifact` / `update_artifact` (`requiredScope: 'write'`, `:107`);
  `call-tool.ts` gate `MCP_ACCESS` per-org per-call, mint PASETO với claim `surface: 'mcp'` (`:252-255`, **đọc được**); trang consent **không sửa**.
- **Back-hop**: hai route mới `/api/agent/tools/publish-artifact` và `/update-artifact` nhận JSON (thư mục hiện có 6 route, **đo được** ls);
  back-hop chỉ `JSON.stringify` body, timeout 30 s (`call-tool.ts:73,300-309`, **đọc được**). Re-gate plan mỗi call theo mẫu
  `create-short-link/route.ts:50` `ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])` (**đọc được**).
- **Zod schema** hai tool trong `src/shared/schemas/agent-tools.ts` — nơi validate **duy nhất** trên đường agent, `createTouchPoint` không parse lại
  (`:154-156`, **đọc được**). Mẫu shape trả: `createdLinkSchema` (`:203-208`).
- **Artifact service**: `create()` + `publish()` hiện có; quota 3 live / 30 MB (`artifact.type.ts:271-272`), `ARTIFACT_MAX_BYTES` 10 MB (`:18`);
  `publish()` dùng `touchPointFormCreateWithAdvanceSchema.safeParse` nên `slug`/`domain_id` thừa hưởng validation của UI (`artifact.service.ts:373-385`,
  **đọc được**); `createTouchPoint` kiểm `domain_id` theo `orgId` (`touch-point.service.ts:963-964`, **đọc được**) nên domain của org khác throw.
  Endpoint PATCH thay file: **chưa có**, tiền đề.
- **Touch point**: `createTouchPoint` với `content_type='ARTIFACT'` sinh short link + QR như hôm nay (`:398`).
- **Audit**: `artifact.service.ts` gọi `orgAuditLogService` **0 lần** (**đo được** grep); publish ghi gián tiếp dưới `module: 'touch_point'`,
  `action: 'create'`. Và `log.md:678-683` ghi audit log touch point **không tới queue** trên LiHi (`logEvent` fire-and-forget) — mọi thiết kế audit
  cho tool mới là vô nghĩa cho tới khi cái gốc được sửa.
- **Không chạm**: route công khai `/a/<token>` và import graph của nó (test `src/__tests__/unit/services/artifact-serve-import-graph.test.ts` đang canh, **đo được** ls).

## Constraints
- **Chỉ HTML dạng text** đợt này. Không base64, không PDF/video. Server li2-mcp first-party, OAuth, scope `write` có sẵn
  (`MCP_SCOPES = ['read','write']`, `mcp-oauth.service.ts:78`, **đọc được**) — không thêm scope.
- **Luôn công khai ở v1.** Tool không có tham số `access_mode`. Claude **phải nói** điều đó ở lượt trước khi gọi tool và trong câu trả lời.
- **Bảo mật**: `org_id` là tool argument **không tin cậy** (`mcp/route.ts:49-51`, **đọc được**) — gate per-call trong `call-tool.ts`, không ở
  lớp authenticate. PASETO TTL 15 phút giữ nguyên.
- **Kiểm slot live TRƯỚC khi nhận HTML; hết 3/3 → từ chối, không tạo draft.** Đây là lệch khỏi thiết kế hiện tại — `create()` cố ý không kiểm
  trục live-count (`artifact.service.ts:276-286`, **đọc được**) — đã chốt chấp nhận. Walkthrough `cmd('publish')` kiểm `liveCount() >= 3` trước khi
  tạo (**đo được** trên prototype). Thông điệp phải chứa *"Nothing was created"* để agent không đi tìm draft.
- **Kích thước**: HTML sau decode ≤ 10 MB; từ chối trước khi parse nếu body vượt. Back-hop JSON **không thừa hưởng** `artifactBodyExceedsLimit`
  (chỉ áp cho route multipart, `artifacts/route.ts:41`, ngưỡng 11 MB ở `artifact-upload-limit.ts:21-28`, **đọc được**) — tool phải tự thêm check
  trên `content-length`.
- **Quota 30 MB là byte cap**, không thêm giới hạn byte riêng; rate limit per-call đã có 60/phút + 1000/giờ, key `(user, client)`, tiêu thụ trước
  scope check (`rate-limit.ts:111-114`; `mcp/route.ts:317`, **đọc được**). Hệ quả chấp nhận: một agent đẩy tối đa 30 MB rồi bị chặn.
- **Update giữ nguyên `serve_token`, touch point, `short_url`, QR, `name`.** Chỉ `storage_path`, `size_bytes`, `content_type` đổi. Walkthrough so
  `token`/`short_url`/`qr_url` trước/sau update: **giống hệt** (**đo được** trên prototype). Quota tính **delta** — cổng hiện tại
  `usedBytes + buffer.byteLength` (`artifact.service.ts:273`) sai cho update. Bản cũ mất hẳn, agent phải nói ra.
- **Tool trả một text block chứa JSON** đúng khuôn `toToolResult` (`call-tool.ts:84-90`, **đọc được**); không `structuredContent` (v1 không có
  `outputSchema`, `tools.ts:38-39`). Lỗi là text thuần (xem trên). Ảnh QR base64 (`image` content, SDK 1.30.0 hỗ trợ) là **tuỳ chọn sau**, không v1.
- **Mọi con số trong lỗi sinh từ state** (`{size}`, `{used}`, `{need}`, `{delta}`, `{free}`); proto in `12.4 MB`, `28.1`, `4.2`, `1.9` là minh hoạ.
- **Dữ liệu**: artifact từ MCP không khác artifact tay về schema — không cột `source`, không badge. Nếu cần phân biệt trong log, dùng claim `surface`.
- **`slug` và `domain_id` cho phép**; `slugSchema` 6–64 ký tự, regex, blacklist `f-` (`src/shared/schemas/slug.ts:4-42`, **đọc được** theo answers); chuỗi rỗng → `undefined`.
- **Không làm**: kind khác HTML; mở rộng `li2-shortlink-mcp` (cookie, chỉ chạy local); versioning; tham số `access_mode`.
- **Quy trình**: không `yarn gen:types`, không `yarn migration:push`; nghiệm thu LiHi qua skill `verify-artifact-lihi` + một lượt gọi thật từ Claude.ai,
  rồi quét QR **cũ** sau update → thấy bản mới.

## Open questions
1. **`qr_url` có thể là link chết.** Chưa ai kiểm `path_qr_code` là path hay URL tuyệt đối, bucket có public-readable không. Proto vẽ cả nhánh 403.
   Nếu private: mở bucket, trả URL đã ký, hoặc đổi câu tool thành "tải QR trong li2" — **không** bỏ `qr_url` khỏi JSON. **Phải đo trước khi viết câu trả lời của tool.**
2. **Chữ ô consent "Create short links"** không còn đúng khi `publish_artifact` vào scope `write` — một tick cho phép xuất bản nội dung công khai ra web,
   hai mức rủi ro dưới một ô. Sửa chữ (rẻ) hay thêm ô riêng (8 chỗ, answers Q5)? Quyết định sản phẩm.
3. **"HTML sai" nghĩa là gì.** `kind: 'html'` có `magic: []` (`artifact.type.ts:113-122`, **đọc được**) — không có magic bytes; đường MCP không có đuôi file.
   Proto theo nhánh a: lỗi duy nhất là chuỗi rỗng. Nhánh b (kiểm tối thiểu) là validate chỉ có trên đường agent — drift.
4. **Body limit back-hop chưa đo.** Repo không có giới hạn nào, Traefik không buffering; `request.json()` buffer toàn bộ. Cần một phép đo thật trên LiHi (cần chủ sản phẩm cho phép).
5. **Audit**: có cần event riêng cho publish artifact (cả hai đường) không, và audit log trên LiHi vì sao không ghi — đo cái gốc trước.
6. **Agent đặt chế độ xem** — chưa ai quyết; v1 luôn công khai, lượt 4 nói ra điều đó. Nếu cho, lượt 4 thành câu hỏi và nối sang intent quyền xem.
7. **Trang consent chỉ có tiếng Anh** — người dùng Việt gặp đúng một màn tiếng Anh ở bước phải đọc kỹ nhất. Ngoài phạm vi hai tool, ghi để nhớ.

## Thay đổi so với bản 2026-10-04 11:xx (mtime 15:43)
- Author đổi theo brief; gộp "Constraints bổ sung", "Đã chốt update-in-place" và bảng Q1–Q7 cũ vào năm mục template; nguồn sự thật là hai prototype.
- Proposed outcome viết lại thành hành trình D1/D2/D3 với transcript và copy đã duyệt, tên tool `publish_artifact`/`update_artifact`, câu bắt buộc
  về công khai và về bản cũ mất hẳn; thêm chín thông điệp lỗi.
- Sửa sự thật: lỗi MCP là **text thuần**, không phải JSON (`errors.ts:65-95`) — bản cũ ngầm định JSON; `previous_size_bytes` thêm vào shape update.
- Constraints mới: kiểm slot trước khi nhận HTML (đo trên walkthrough); back-hop JSON phải tự thêm check content-length; con số sinh từ state;
  update giữ cả `name`.
- Affected systems thêm: `artifact.service.ts` 0 call audit + `log.md:678-683` audit không tới queue trên LiHi; test import graph đúng đường dẫn
  `src/__tests__/unit/services/`; thư mục back-hop hiện 6 route.
- Open questions mới: chữ ô consent, HTML sai, consent tiếng Anh; Q1–Q5 cũ đã chốt → Constraints. Mọi nhãn provenance kiểm lại ngày 2026-10-05.
