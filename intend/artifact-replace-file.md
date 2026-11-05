# Intent: Thay file artifact mà giữ nguyên QR và short link
Author: Claude (intent-writer), từ prototype 2026-10-04. Status: draft. **Tiền đề** của `mcp-publish-artifact.md` (tool `update` dùng cùng endpoint).

Nguồn sự thật về hành vi và UI: `artifact-wave3-proto-replace-file.html` (9 màn khung app + 12 hộp thoại) và
`artifact-wave3-walkthrough.html` (máy trạng thái ghép ba cột). Nhãn bằng chứng: **đo được** / **đọc được** / **suy ra**.

## Problem
Nội dung đổi — bảng giá tháng mới, lịch sự kiện cập nhật — nhưng QR đã in lên standee, tờ rơi, bao bì. Hôm nay
cách duy nhất là **xoá artifact cũ, tạo mới** → short link mới, QR mới → mọi thứ đã in thành rác, link đã gửi
khách thành link chết. Google Drive làm được còn li2 chưa: 13/23 sản phẩm khảo sát có "thay file giữ link".

Chuỗi phục vụ `QR → short_url → li2-be 302 → /a/<serve_token> → storage_path` có **hai lớp gián tiếp**, và
`serve_token` thuộc **hàng artifact**, không thuộc file: sinh một lần lúc `create()`
(`artifact.service.ts:301`, **đọc được**), `publish()` chỉ đọc lại nó để dựng `serve_url` (`:365`, **đọc được**).
Thay nội dung chỉ cần ghi đè `storage_path` của đúng hàng đó — **không đụng** short link, touch point, QR.
Đây không phải versioning; là một endpoint PATCH ghi đè. Route `[artifact_id]` hiện chỉ có `GET` và `DELETE`
(`src/app/api/organizations/[org_id]/artifacts/[artifact_id]/route.ts:9,32`, **đọc được**) — PATCH **chưa có**.

## Proposed outcome
Người dùng vào hộp thoại **Cập nhật nội dung** từ hai chỗ (hành trình A1/A2 trong `docs/artifact-wave3-screens.md` §1.A):
- Trang chi tiết: nút chính ở đúng ô `ArtifactPrimaryAction` đang để trống khi `status='live'`
  (`artifact-primary-action.tsx:47` `if (!action) return null`, **đọc được**). Với `draft`: nút **Xuất bản** là
  chính, **Cập nhật nội dung** là phụ. **Xoá/Gỡ** rơi vào overflow `⋯`, không ngang hàng nút chính.
- Menu ⋮ của dòng danh sách: ba mục **Cập nhật nội dung / Sao chép link / Xoá** (Xoá tách bằng đường kẻ; với
  draft mục Sao chép link khoá kèm lý do *"Chưa xuất bản nên chưa có link."*).

Hộp thoại có **mười trạng thái** (proto vẽ đủ, walkthrough chạy S1→S4):

| # | Trạng thái | Người dùng thấy | Nút chính |
|---|---|---|---|
| S1 | Rỗng | Dropzone *"Thả file vào đây hoặc bấm để chọn"* / *"HTML, PDF, PowerPoint hoặc video — tối đa 10 MB"* | **Cập nhật** khoá, lý do tại chỗ *"Chọn một file trước đã"* |
| S2 | Đã chọn, cùng loại | Bốn khối theo thứ tự: file đã chọn → bảng *Đang phục vụ → Sẽ thay bằng* → dung lượng sau khi đổi (thanh hai lớp `fill` + `fill-add`, dòng *"File mới nặng hơn file cũ {delta} — chỉ phần chênh đó tính thêm. Số nội dung đã xuất bản không đổi: vẫn {live} / 3."*) → khối xanh **Mã QR và link ngắn giữ nguyên** (*"Standee, tờ rơi và bao bì đã in vẫn mở ra nội dung mới. {visits} lượt quét đã ghi vẫn còn."*) → khối xám **File cũ bị thay hẳn** (*"Sau khi bấm Cập nhật, {tên file cũ} không lấy lại được. Nếu còn cần, tải nó về trước."* + đúng một lối ra: link **Tải bản đang chạy về** mở `/a/<token>/download` tab mới) | **Cập nhật** bật |
| S3 | Đang tải lên | Phần trăm thật từ `onUploadProgress` (`use-artifacts.ts:65-67`, **đọc được**) + *"Đóng tab lúc này thì nội dung cũ vẫn đang chạy — không có gì hỏng."* | **Đang cập nhật…** có con quay, **không mờ** |
| S4 | Thành công | Dấu tích, **Đã thay nội dung**, khối **Đã đổi** (file, dung lượng) + khối **Không đổi** (link ngắn, mã QR, lượt quét, chế độ xem) | **Xong** + phụ **Mở link kiểm tra** (mở `short_url`) |
| S5 | File > 10 MB | Dòng lỗi nói con số thật và lối ra | khoá |
| S6 | Vượt 30 MB tổng | Nói **phần chênh cần thêm** và **chỗ còn lại** (*"Còn {free}. Hết chỗ thì gỡ bớt một nội dung, hoặc nâng gói."*) | khoá |
| S7 | Đuôi file không nhận | Nói định dạng nhận được | khoá |
| S8 | Đổi loại file | Ô vàng chen giữa bảng diff và dung lượng: **Loại nội dung đổi từ {A} sang {B}** / *"Người quét mã QR cũ sẽ thấy trình phát video thay vì PDF như trước."* Đổi sang PowerPoint nhắc lại `create.office_notice` (`public/lang/vi/artifact.json:76`, **đọc được**). Đổi sang HTML **không** nói gì về sandbox | **Cập nhật** bật — cho phép, không từ chối |
| S9 | PATCH fail sau khi đã gửi byte | Khối lỗi thay chỗ tiến trình, giữ bảng diff: **Chưa thay được nội dung** / *"Mã QR và link ngắn vẫn mở ra {tên file cũ} như trước — không có gì hỏng. Thử lại giúp nhé; nếu vẫn vậy thì liên hệ hỗ trợ."* | **Thử lại** |
| S10 | Artifact không còn (bị gỡ trong lúc hộp thoại mở) | **Nội dung này đã được gỡ** / *"Có ai đó đã gỡ nó xuống trong lúc bạn đang mở hộp thoại này. Mã QR đã in giờ dẫn tới trang thông báo đã gỡ. Tạo một artifact mới nếu bạn cần đăng lại."* Dấu hiệu màu xám, không đỏ | **Đóng** + phụ **Tạo artifact mới** (proto thêm so với đặc tả: copy đã nói "tạo artifact mới" mà không cho đường) |

Với artifact **draft** (hành trình A3): khối xanh thay bằng khối xám *"Chưa xuất bản nên chưa có link hay mã QR.
Thay file lúc này không ảnh hưởng gì ở bên ngoài."*, dòng lượt quét biến mất, link tải đổi chữ thành **Tải file hiện tại về**.

Sau S4: thẻ danh sách đổi badge kind, dung lượng, thời điểm; **không** đổi short link, QR, lượt quét. Trang
công khai `/a/<token>` **không có màn hình mới**: trước và trong lúc PATCH thấy bản cũ, ngay sau khi hàng đổi
thấy bản mới (route đã `fetchCache = 'force-no-store'`, `route.ts:322`, **đọc được**; hiệu quả thật phải **đo lại** trên LiHi sau khi code).

Cùng endpoint PATCH phục vụ tool `update_artifact` của MCP (nhận JSON thay vì multipart).

## Affected users and systems
- Người tạo artifact (UI) và agent qua MCP (cùng endpoint, cùng cổng quota).
- `PATCH /api/organizations/{org}/artifacts/{id}` **mới** — nhận multipart (UI) và JSON (MCP back-hop).
- `artifact.service.ts`: hàm thay nội dung mới — upload object mới, đổi `storage_path`/`size_bytes`/`content_type`/`kind`,
  xoá object cũ **sau khi** hàng đã trỏ sang mới. Tái dùng `removeUploadedObject` (`:521`, **đọc được**).
- Cổng quota: TypeScript `usedBytes + buffer.byteLength > ARTIFACT_QUOTA_FREE_BYTES` (`artifact.service.ts:273`, **đọc được**)
  cộng thẳng — **sai cho thay file**; cần biến thể tính delta. Hàm SQL `artifact_publish_if_within_quota` giữ advisory
  lock per-org (`:405`, **đọc được**) — cần hàm tương đương cho thay file hoặc chấp nhận trục byte không nguyên tử.
- FE: `ArtifactDropzone`, `LoadingButton`, `formatBytes`, bản đồ icon theo kind, mô thức "nút khoá tự nói vì sao"
  (`artifact-primary-action.tsx:60` `aria-describedby`, **đọc được**). Mới: component bảng diff, thanh dung lượng hai lớp,
  nhóm khoá i18n `update.*` trong `artifact.json`, mục menu ⋮ (mẫu `DataTableRowActions` của short link).
- Trang chi tiết: `ContentLayout.extra` hiện đặt Xoá ngang Xuất bản — thêm nút thứ ba thì Xoá phải vào overflow.

## Constraints
- **Bất biến qua update**: `serve_token`, `touch_point_id`, `short_url`, QR, `name` không đổi. Walkthrough so chuỗi
  `token`/`short_url`/`qr_url` trước/sau thay file: **giống hệt** (**đo được** trên prototype, chưa đo trên code thật).
  Đổi `name` là việc khác. `access_mode`/`expires_at` **giữ nguyên** — hộp thoại không có ô chọn chế độ xem.
- **Quota tính delta**: thay 3.3 MB bằng 7.8 MB tốn thêm 4.5 MB, không phải 7.8 MB. Thông báo S6 nói **con số chênh**,
  nếu không người dùng sẽ xoá thừa một artifact. File mới nhẹ hơn → *"phần chênh đó được trả lại"*.
- **Mọi con số trong copy sinh từ state**, không hard-code: `{delta}`, `{visits}`, `{live}/3`, `{free}`, `{tên file cũ}`.
  Ba proto tĩnh in `4.5 MB`, `47 lượt`, `2 / 3` chỉ đúng cho một artifact mẫu; walkthrough đã chuyển sang biến.
- **Thứ tự ghi**: upload object mới → cập nhật hàng → xoá object cũ. Hỏng giữa chừng để lại object mồ côi (chấp nhận,
  cùng họ với DELETE), **không bao giờ** để hàng trỏ vào object không tồn tại. Đây là lý do copy S9 được phép nói
  "vẫn mở ra file cũ" như một sự thật.
- **Bản cũ mất hẳn** — đã chốt. Hộp thoại nói thẳng trong khối xám và cho tải về trước. Không có nhánh "giữ 30 ngày".
- **Cho đổi loại file** kèm cảnh báo bằng ngôn ngữ người dùng ("thấy trình phát video thay vì trang xem PDF"), không nói "CSP".
  `kind` đổi kéo theo `serveMode` + CSP đổi — đã có sẵn theo kind (`artifactCsp(kind)`, `artifact-csp.ts:42`, **đọc được**).
- **Nút chính đang chạy có con quay và không mờ** — mờ nghĩa là "bấm không được".
- Chỉ cho `status='live'` hoặc `draft`; `removed` → PATCH trả **404** như mọi thao tác quản trị trên bia mộ, FE map sang S10
  (riêng trang công khai `/a/<token>` là 410; `/file`, `/download` là 404 — `artifact-serve.service.ts:144-146`, **đọc được**).
  Bia mộ không ăn quota.
- **Thay file không bắt người xem nhập lại mật khẩu**: `password_hash` không đổi nên cookie phiên còn hiệu lực. Hộp thoại không nhắc gì về quyền xem.
- S6 trên gói Free chỉ xảy ra khi org có **bản nháp** (nháp tính byte, không tính slot — `artifact.service.ts:276-286`, **đọc được**).
  Ví dụ dựng/test phải là 3 đã xuất bản + 2 nháp.
- Không `yarn gen:types`, không `yarn migration:push`; nghiệm thu LiHi: quét QR **cũ** bằng điện thoại sau khi thay → thấy nội dung
  **mới**, `visits` vẫn +1 cùng `tp_id` (cơ chế +1 khi quét đã **đo được** trên LiHi: `log.md:1089` iPhone thật, visits 2→3).

## Open questions
1. Đổi loại file → badge và icon trên dashboard đổi theo; có cần cảnh báo lần hai ở danh sách không? Proto dựng nhánh a
   (**không** cảnh báo). Nhánh b (dấu chấm 24 giờ + tooltip) cần cột thời điểm đổi loại mà DB không có
   (`supabase/migrations/20260928000001_artifacts__create.sql:44-47`, **đọc được**).
2. Trang `/a/` đang mở trên điện thoại ai đó đúng lúc thay — stream video cũ bị cắt. Proto theo nhánh a (xoá ngay, chấp nhận
   cắt, tải lại là ra bản mới). Nhánh b giữ object cũ thêm N phút chỉ là job dọn trễ. Chưa chốt.
3. Tên file dài trong bảng diff: `.diff-v` cắt đuôi làm mất đúng phần phân biệt (`q3-2026` vs `q4-2026`). Proto đề xuất **cắt giữa**
   (16 ký tự đầu + … + 16 cuối) hoặc xuống hai dòng. Chủ sản phẩm chọn.
4. Trục byte khi thay file có cần nguyên tử (hàm SQL mới giữ advisory lock) hay chấp nhận pre-check TypeScript tính delta là đủ?
   Publish đã có hai tầng (pre-check + SQL guarantee); thay file hiện không có tầng nào.

## Thay đổi so với bản 2026-10-04 11:xx (mtime 12:34)
- Author đổi theo brief; thêm nguồn sự thật là hai prototype wave 3.
- Bằng chứng `serve_token` sửa từ `artifact.service.ts:365,376` thành `:301` (sinh lúc create) và `:365` (đọc lúc publish); thêm bằng chứng route `[artifact_id]` chỉ có GET/DELETE.
- Proposed outcome mở rộng từ "tám trạng thái wave 2" thành **mười** (thêm S9 lỗi giữa đường, S10 artifact không còn) kèm copy đã duyệt; thêm hành trình draft (A3) và vị trí nút ở hai điểm vào.
- Constraints thêm: mọi con số sinh từ state; `access_mode` giữ nguyên; thay file không bắt nhập lại mật khẩu; nút chạy không mờ; S6 chỉ xảy ra khi có nháp; bia mộ không ăn quota.
- Open questions: bỏ Q2 cũ (`access_mode` giữ nguyên — đã thành constraint); thêm Q3 cắt tên file dài và Q4 nguyên tử trục byte.
- Mọi nhãn provenance kiểm lại bằng grep/Read trên `feat/artifact` ngày 2026-10-05.

## Chốt sau spec (2026-10-05)
- Endpoint là `POST …/artifacts/{id}/replace` (không PATCH — back-hop MCP chỉ POST+JSON). Nhận multipart và JSON `{html}`.
- `{free}` lấy từ endpoint quota mới `GET …/artifacts/quota`; **`{visits}` bỏ khỏi copy v1**.
- Cột `updated_at` chưa có → migration thêm. Mã lỗi: 413 quá cỡ, 403 quota, 409 trạng thái không cho thay, 404 removed/không thuộc org.
- Spec: `docs/artifact-wave3-replace-file.md`.
