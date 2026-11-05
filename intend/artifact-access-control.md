# Intent: Quyền xem artifact — public / private / mật khẩu / đăng nhập Google
Author: Claude (intent-writer), từ prototype 2026-10-04. Status: draft.

Nguồn sự thật về hành vi và UI: `artifact-wave3-proto-access-control.html` (2 khung app, 13 mảnh dashboard,
4 hộp thoại, 17 trang cổng vi/en, 3 dark) và `artifact-wave3-walkthrough.html` (hàm `viewFor()` chạy đúng thứ tự
cổng). Bằng chứng chi tiết: `artifact-access-control.answers.md`. Nhãn: **đo được** / **đọc được** / **suy ra**.

## Problem
Hôm nay **mọi artifact đều công khai với bất kỳ ai có link**. Tình huống thật: file đầu tiên upload lên LiHi là tài
liệu giải pháp thanh toán của FPT — loại có NDA — nằm sau một short link ai cũng mở được (`log.md:650`, **đọc được**).

Short link của li2 **đã có** `password`, `expires_at`, `click_limit`; artifact không có, vì payload publish chỉ gửi
`name`/`content_type`/`content_value`/`slug`/`domain_id`/`variants_content` (`artifact.service.ts:373-385`, **đọc được**).

Bật lại ở short link **không đủ**: mật khẩu short link được li2-be kiểm lúc resolve, còn `/a/<token>` được li2-app
phục vụ thẳng — **không qua middleware** (`middleware.ts:38` loại `a/` có chủ ý, **đọc được**), không đọc cookie
(`route.ts:47-70`, **đọc được**). Token lộ trên thanh địa chỉ ngay sau lần redirect đầu; ai có nó đi vòng mọi lớp bảo
vệ của short link. Và mật khẩu short link hiện là **plaintext đầu-cuối**: li2-be so `!=` chuỗi thường
(`touch-point.service.go:399` nhánh `stag`, **đọc được** — kiểm lại qua `gh api` 2026-10-05), li2-app chỉ gate plan rồi
passthrough (`touch-point.service.ts:1644-1648,1658`, **đọc được**), `package.json` không có bcrypt/argon2/scrypt (**đo được**, grep).

## Proposed outcome
Người tạo chọn **một trong bốn** chế độ, lúc tạo (mục **Ai xem được** sau ô Tên và Đường dẫn, mặc định Công khai) hoặc
trong trang chi tiết (khối **Quyền xem** + nút **Đổi**):

| Chế độ | Nhãn / mô tả (copy đã duyệt) | Người quét gặp gì |
|---|---|---|
| **Công khai** (mặc định) | `Công khai` / *"Bất kỳ ai có link đều xem được."* | nội dung ngay, như hôm nay |
| **Riêng tư** | `Riêng tư` / *"Chỉ thành viên tổ chức của bạn, sau khi đăng nhập li2."* | trang mời đăng nhập li2 (401) → nội dung, hoặc trang từ chối (403) nếu không thuộc org |
| **Mật khẩu** | `Mật khẩu` / *"Ai biết mật khẩu đều xem được. Bạn tự gửi mật khẩu cho họ."* + ô mật khẩu + nút **Tạo ngẫu nhiên** | form một ô (401), có thương hiệu, đúng ngôn ngữ |
| **Đăng nhập Google** | `Đăng nhập Google` / *"Ai có tài khoản Google đều xem được. **Email của họ được ghi lại.**"* | trang một nút **Tiếp tục với Google** (401) → nội dung; email ghi lại |

**Dashboard** (M2.1–M2.4): chọn Mật khẩu mà ô trống → nút Xuất bản/Lưu khoá kèm *"Đặt mật khẩu trước đã"*; quá ngắn →
*"Mật khẩu cần ít nhất 8 ký tự."*. Khối Quyền xem trang chi tiết: Công khai = badge xám + Đổi; Riêng tư = *"Chỉ thành viên
{tên tổ chức}."*; Mật khẩu = *"Đặt lúc {thời điểm}. Mật khẩu đã băm nên không hiện lại được."* + nút **Đổi mật khẩu**;
Google = *"{n} người đã mở"* + link sang analytics; draft = thêm *"Chế độ này áp dụng ngay khi bạn xuất bản."*. Hộp thoại
đổi chế độ hiện khối xanh **Mã QR và link ngắn không đổi** / *"Đổi chế độ xem có hiệu lực ngay, không sinh link mới."*
(+ *"Mọi người đang xem bằng mật khẩu cũ sẽ phải xác thực lại."* khi rời Mật khẩu). Hộp thoại đổi mật khẩu: cảnh báo trước khi
lưu *"Mọi người đang xem sẽ phải nhập lại mật khẩu mới. Mã QR và link ngắn không đổi."*; sau khi lưu là **lần duy nhất**
thấy giá trị, có nút Sao chép. Thẻ danh sách: Công khai **không badge**; ba chế độ kia badge ổ khoá nhỏ cạnh badge kind.

**Trang cổng** (M2.5–M2.7, dựng bằng `landingShell()` cùng khuôn bia mộ 410, hai ngôn ngữ, dark mode):
- Mật khẩu: **Nội dung này cần mật khẩu** / *"Người gửi link đã đặt mật khẩu. Nhập mật khẩu để xem."* / label **Mật khẩu**
  (proto thêm `<label for>`, vì trang không có script nên placeholder mất là mất ngữ cảnh) / nút **Xem nội dung** → *"Đang kiểm tra…"*.
  Sai: *"Mật khẩu không đúng. Còn {n} lần thử."*. Quá số lần: **Đã thử quá nhiều lần** / *"Thử lại sau {m} phút, hoặc hỏi người
  gửi link mật khẩu đúng."* (429, **bỏ hẳn ô nhập**). Mật khẩu đã đổi: trang rỗng + *"Mật khẩu đã được đổi. Nhập mật khẩu mới."*
- Google: **Đăng nhập để xem nội dung này** / *"Người gửi link yêu cầu đăng nhập. Email của bạn được ghi lại cho người gửi."*
  (câu này **bắt buộc ở màn trước khi bấm**) / **Tiếp tục với Google** → *"Đang chuyển sang Google…"*. Huỷ ở Google: về trang rỗng +
  *"Bạn đã dừng việc đăng nhập…"*. Callback lỗi: **Chưa đăng nhập được** / *"Thử lại giúp nhé. Nếu vẫn vậy, hỏi người gửi link."*
- Riêng tư: **Nội dung này dành cho thành viên** / *"Đăng nhập li2 để xem. Nếu bạn không có tài khoản li2, hỏi người gửi link."* /
  **Đăng nhập li2**. Từ chối 403 (**chốt 2026-10-05**, thay nhánh "không hiện email" của proto): **Tài khoản của bạn không mở được nội
  dung này** / dòng phụ *"Đang đăng nhập: `<email>`"* (lấy từ session Casdoor, để người xem hiểu vì sao bị chặn) /
  *"Nội dung này chỉ dành cho thành viên của tổ chức đã đăng nó. Hỏi người gửi link, hoặc đăng nhập bằng tài khoản khác."* /
  nút **Đăng nhập bằng tài khoản khác** — đăng xuất Casdoor rồi quay về màn đăng nhập với `redirect` = `/a/<token>` của chính QR vừa
  quét. Không nêu tên artifact, không nêu tên tổ chức. Nếu session không có email (trường hợp hiếm) thì bỏ dòng phụ, vẫn giữ nút.
- Phiên hết hạn giữa lúc xem: không phải màn mới — tải lại gặp lại cổng của chế độ đó; chỉ Mật khẩu có thêm một dòng.

Đổi chế độ trên artifact đang `live` có hiệu lực **ngay**, **không đổi QR / short link**. Cổng áp cho cả ba đường
`/a/<token>`, `/file`, `/download` — hai đường sau trả 401 không body, không màn hình.

## Affected users and systems
- **Người dùng**: người tạo (chọn chế độ); người quét (gặp cổng); với Google — người xem là **khách lạ**, không phải user li2.
- **DB**: `artifacts` thêm `access_mode` + `password_hash`; `CHECK` hiện không có hai cột này
  (`supabase/migrations/20260928000001_artifacts__create.sql:44-47`, **đọc được**; `database.types.ts` chỉ có `access_mode` ở bảng
  `dashboards:1812`, không phải artifacts — **đo được**, grep). Email người xem → `customer_profiles` (có `email`, `is_anonymous`,
  `merged_into_id`; `database.types.ts:1584`, **đọc được**), đã nối visit qua `customer_email`
  (`supabase/migrations/20260616022745_analytics__get_raw_visit_data_v4_add_customer_external_id.sql:4,111`, **đọc được**) nên email
  hiện ngay ở analytics sẵn có — **không dựng màn danh sách email**.
- **Route công khai**: `src/app/(artifact)/a/[token]/{route,file/route,download/route}.ts` — nơi cưỡng chế, cả ba. Thêm **POST** (nộp mật
  khẩu) và callback OAuth; route hiện chỉ có `GET` (`route.ts:47`, **đọc được**). **Ba đường tra token**: `getLiveContentByToken` (`:73`),
  `resolveTargetByToken` (`:110`), `getLiveTargetByToken` (`:148`) trong `artifact-serve.service.ts` (**đọc được**) — cổng đặt ở một hàm
  sẽ lọt hai hàm kia, và các hàm không nhận `request` nên không đọc được cookie: cổng là hàm riêng nhận `request` + `target`, gọi ở route.
- **Phiên người xem**: cơ chế **mới** — cookie ký riêng cho `/a/`, không phải cookie Casdoor (`sameSite: 'none'`,
  `casdoor/middleware.ts:43`, **đọc được**). Tiền lệ ký: `jose` HS256 ở `toolbar-session/route.ts:1-22` (`jose@6.0.8`, `package.json:90`, **đọc được**).
- **Copy**: `ARTIFACT_LANDING_COPY` (`artifact-landing.ts:18-52`) hiện chỉ có `download`, `office_*`, `video_unsupported`, `removed_*`; thêm
  `gate_password_*`, `gate_google_*`, `gate_private_*`, `denied_*` **cả hai ngôn ngữ cùng key set** (test canh, `:16`, **đọc được**).
  Không đặt vào `public/lang/` (route không chạy i18next). Mọi nội suy email/tên qua `escapeHtml` (`:101`, **đọc được**).
- **CSP**: xem Constraints — hai hằng khác nhau.
- **Dashboard**: form tạo + trang chi tiết + badge thẻ. Mẫu ô mật khẩu: `ShortLinkPasswordSection` — **chép hình, không chép logic**
  (`Math.random().toString(36)` + `setTimeout(700)` giả, `password-section.tsx:32-33`, **đọc được**).
- **Casdoor**: Riêng tư dùng `getSession` + `ensureOrgMember` (`permissions.ts:103-108`, **đọc được**) **trong route handler Node**. Google dùng
  OAuth client **riêng** qua `google-auth-library@^10.5.0` đã có (`package.json:82`; tiền lệ `google-sheets.service.ts:29-33`, **đọc được**),
  **không** dùng provider Google của Casdoor — Casdoor `AddUser` khi OAuth lần đầu (`casdoor/controllers/auth.go:1254`, **đọc được** — kiểm lại
  qua `gh api` 2026-10-05) biến mọi người quét thành user li2.

## Constraints
- **Cưỡng chế ở `/a/`, không chỉ ở li2-be.** Short link có thể đặt thêm `password` nhưng **không được coi là lớp bảo vệ** (plaintext, cookie
  `x-password` do JS client ghi — answers Q2).
- **`a/` phải tiếp tục nằm ngoài matcher middleware.** Không thêm `/a/` vào `publicPath` (`casdoor/middleware.ts:101` so `includes` trên
  toàn URL, **đọc được** — sẽ mở toang app).
- **Thứ tự ưu tiên, không được đổi**: hình dạng token → không có hàng (404) → `removed` (**410** ở `/a/<token>`, **404** ở `/file` và
  `/download` — cố ý, `artifact-serve.service.ts:144-146`) → status khác `live` (404) → `isArtifactUploadKind` → **rồi mới** cổng
  (`:111-127`, **đọc được**). `removed` thắng mọi cổng: walkthrough `viewFor()` xác nhận artifact Mật khẩu bị gỡ hiện bia mộ, không hiện form
  (**đo được** trên prototype). Không bắt nhập mật khẩu cho nội dung đã gỡ — mỗi lần nhập sai sẽ xác nhận "có gì đó ở đây".
- **Cổng mật khẩu là `<form method="post">` thật** (trang không có script). CSP landing đặt **`form-action 'none'` CỐ Ý** — lý do ở
  `artifact-csp.ts:14` (cookie Casdoor `sameSite: 'none'`, chặn mọi form để không bị lợi dụng), áp ở `:19` (kind `html`), `:49` (kind
  pdf/slides/video) và `ARTIFACT_LANDING_CSP:86` (trang không gắn kind — bia mộ, và là hằng trang cổng sẽ dùng) (**đọc được**). Phải nới thành
  **`form-action 'self'` RIÊNG cho trang cổng** (một hằng mới hoặc tham số), **giữ `'none'`** cho kind `html` và các landing kind. Nút Google
  cần cho redirect ra Google. Đây là **nới một lớp phòng thủ có chủ đích — review riêng**. Chú ý `:21-28`: hai CSP header trên một response
  cưỡng chế theo **giao**, không phải fallback.
- **Mọi con số trong copy sinh từ state**: `{n}` lần thử còn lại, `{m}` phút khoá, `{n} người đã mở`, `{tên tổ chức}`, `{thời điểm}`. Proto in
  `Còn 4 lần`, `10 phút` là minh hoạ.
- **Mật khẩu: tối đa 3 lần sai, khoá 10 phút, tính theo `serve_token`** (chốt 2026-10-05). Bộ đếm ghi ở Redis (tiền lệ
  `src/core/mcp/rate-limit.ts`), key theo token, TTL 10 phút; không theo IP. Hết 3 lần → 429 + trang "Đã thử quá nhiều lần" bỏ ô nhập.
  Walkthrough `MAX_TRIES = 5` và proto in "Còn 4 lần" phải sửa về 3 ("Còn 2 lần" sau lần sai đầu).
- **Mật khẩu một lớp** (chốt 2026-10-05): chỉ chặn ở `/a/<token>` của li2-app. **Không** đặt `password` lên touch point li2-be; short link vẫn
  302 thẳng như hôm nay.
- **Email khách Google ghi vào `customer_profiles` của org** (chốt 2026-10-05): chủ sản phẩm xác nhận đây là điều mong muốn — email người xem là
  dữ liệu khách hàng của org, cùng bảng với lead marketing. Chính sách xoá theo yêu cầu vẫn chưa có (chỉ `data_retention_days` + cron).
- **Mật khẩu băm** (argon2/bcrypt — **dependency mới**), không bao giờ ra `ArtifactDTO`, không log, không hiện lại sau khi lưu. Tối thiểu 8 ký tự.
- **Phiên người xem sống 1 tuần**, cookie ký riêng trên `/a/`, mang `password_version`; **đổi mật khẩu hoặc đổi chế độ huỷ mọi phiên cũ**
  (walkthrough `clearViewerSession` + `password_version += 1`). **Không hiện con số 1 tuần cho người quét** — van an toàn, không phải lời hứa.
- **Quét khi bị chặn vẫn +1 visit; submit sai mật khẩu không +1**: li2-be ghi visit lúc resolve short link, **trước** 302 sang `/a/`
  (thứ tự `handleAccessControl → handleTracking` trong `Redirect`, `touch-point.service.go:116-152`, **đọc được** theo answers Q2);
  form POST ở `/a/` không đi qua li2-be. Walkthrough `doScan()` +1 còn `submitPassword()` không (**đo được** trên prototype). Visit +1 khi quét
  đã **đo được** trên LiHi (`log.md:1089`).
- **Tối thiểu dữ liệu** chế độ Google: chỉ email + thời điểm; không token Google, không tên/ảnh. Scope `openid email`.
- **QR bất biến**: đổi chế độ không sinh touch point mới, không đổi `serve_token`. Màn đổi chế độ phải nói câu đó.
- **Hai ngôn ngữ** vi/en cho mọi trang cổng, chọn theo `Accept-Language`, mặc định `vi` (`artifact-landing.ts:58`), `<html lang>` khớp copy.
  **Không webfont** (CSP `default-src 'none'`, không `font-src`), logo `<svg>` nội tuyến, không khung app, dark mode.
- **Gói Free có đủ bốn chế độ** — không gate theo plan. Quyết định có chủ ý, ngược thị trường (0/23 cho mật khẩu ở free).
- **Riêng tư — trang từ chối dựng nhánh KHÔNG hiện email trước** (luôn đúng). Nhánh hiện email chỉ sau khi thử thật `getSession()` trong
  route `(artifact)`; tiền lệ sự cố `agent-permissions.test.ts:5-8` (không browser session → `ensurePolicy` DENIED → 403 toàn bộ, **đọc được**).
  Không dùng `/forbidden` của app (client component, tiếng Anh cứng, nút "Back to Home" — `src/app/forbidden/page.tsx:1,18,27-32`, **đọc được**).
- **Thay file không bắt nhập lại mật khẩu** — `password_hash` không đổi khi thay file.
- **Không làm đợt này**: hết hạn theo ngày, giới hạn lượt mở, danh sách email được mời, domain allowlist, "xem được nhưng không tải được".
- **Quy trình**: không `yarn gen:types`, không `yarn migration:push`; nghiệm thu LiHi bằng quét QR thật cho **từng** chế độ.

## Open questions
1. ~~Trang 403 Riêng tư cần nút đổi tài khoản~~ — **ĐÃ CHỐT 2026-10-05** (chủ sản phẩm đồng ý cả ba): có nút *"Đăng nhập bằng tài khoản
   khác"*; nút đăng xuất Casdoor rồi về màn đăng nhập và quay lại đúng `/a/<token>`; trang hiện email đang đăng nhập. Chuyển lên Proposed
   outcome. Còn lại cho bước plan: đăng xuất Casdoor từ origin `/a/` cần kiểm cookie `sameSite:'none'` và CSP `form-action` của trang cổng.
2. ~~Số lần thử mật khẩu: 3 hay 5?~~ **ĐÃ CHỐT 2026-10-05: 3 lần, khoá 10 phút, theo token.** Chuyển lên Constraints. Proto/walkthrough còn in 5 —
   cần sửa khi dùng lại.
3. ~~Hai lớp hay một lớp~~ **ĐÃ CHỐT 2026-10-05: một lớp** (chỉ `/a/`). Chuyển lên Constraints.
4. **Độ dài tối thiểu 8** — proto ghi "con số 8 chưa chốt"; repo không có schema nào đặt mức này cho artifact.
5. **`/file` Range khi phiên hết hạn giữa lúc phát video** — chưa ai thử; nếu ra khung đen im lặng thì trang không script không báo được.
6. ~~Email khách thuộc org~~ **ĐÃ CHỐT 2026-10-05: ghi vào `customer_profiles`.** Chuyển lên Constraints. Việc xoá theo yêu cầu vẫn chưa có cơ chế.
7. **Claim `mode` trong cookie**: chuyển Google → Mật khẩu thì phiên Google phải chết; `password_version` không bao được, cần thêm `mode`.
   Walkthrough đã làm (`u.mode === 'password'`); xác nhận.

## Thay đổi so với bản 2026-10-04 11:xx (mtime 22:43)
- Author đổi theo brief; gộp "Constraints bổ sung" và bảng Q1–Q8 cũ vào đúng năm mục template; nguồn sự thật là hai prototype.
- Proposed outcome viết lại theo copy đã duyệt trong proto (nhãn chế độ, hộp thoại, 17 trang cổng, mã HTTP 401/403/429), thêm hành vi
  "phiên hết hạn không phải màn mới" và tiêu đề nhánh không-email đổi "Email của bạn" → "Tài khoản của bạn".
- CSP: sửa bằng chứng — ngoài `:14,19,49` còn `ARTIFACT_LANDING_CSP:86` là hằng trang cổng sẽ dùng; viết đúng là "cố ý, nới `'self'` riêng
  cho trang cổng, review riêng".
- Constraints mới: con số sinh từ state; quét bị chặn vẫn +1 còn submit sai không +1; `removed` thắng mọi cổng (đo trên walkthrough);
  đổi chế độ huỷ phiên; ba đường tra token chuyển từ "bổ sung" vào Affected systems.
- Open questions mới: nút đổi tài khoản ở trang 403 (yêu cầu), 3 hay 5 lần thử, claim `mode`; Q1/Q3/Q4/Q5/Q6 cũ đã chốt → chuyển lên Constraints.
- Thêm bằng chứng mới kiểm: `database.types.ts` chưa có `access_mode` cho artifacts; `password-section.tsx:32-33`; `log.md:650,1089`;
  li2-be `:399` và Casdoor `:1254` kiểm lại qua `gh api`. Mọi nhãn provenance kiểm lại ngày 2026-10-05.
