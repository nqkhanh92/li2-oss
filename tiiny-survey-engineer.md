# Khảo sát tiiny.host — góc nhìn kỹ thuật

Ngày khảo sát: 2026-09-29. Tài khoản khảo sát: gói **Free**, đang có 1 site
(`black-olia-65.tiiny.site`). **Không** upload/publish/xoá/sửa bất cứ thứ gì —
toàn bộ là quan sát chỉ-đọc.

Ảnh chụp: `/tmp/tiiny-survey/01-manage.png`, `02-overflow.png`. Các ảnh còn lại
thất bại (`CdpRequestTimeoutError: Page.captureScreenshot`) nên bỏ qua; bằng
chứng thay thế là text DOM và HTTP header trích trong báo cáo.

---

## A. Luồng tạo site

### Các cách đưa nội dung lên

Nút chính trên `/manage` là một split-button `Upload file` + mũi tên. Menu của
mũi tên (đọc từ DOM, `.UploadDropDown_button__bcxKq .dropdown-menu`):

```
Paste HTML
Write text
Deploy from GitHub
Add Dropbox file
Create Shared Project
```

Ngoài ra có nút riêng **"Create with AI"**.

### Định dạng nhận

`input[type=file]` trên `/manage` có `multiple` và thuộc tính `accept` dài
~7 KB. Các nhóm chính: `text/html`, `application/zip`, `application/pdf`,
`.php`, toàn bộ ảnh (kể cả RAW, PSD, EXR, DICOM), Office (doc/xls/ppt/odt…),
audio, **video** (mp4, mov, braw, r3d, mxf…), và file code
(`.js .ts .jsx .tsx .py .md .json .css .scss .yaml .sql`).

FAQ trên trang pricing xác nhận:

> "We currently support HTML, ZIP, PHP, PDF files, and almost all popular image,
> raw image, document, powerpoint and excel file formats… If you're uploading a
> website, we support static sites… These files should be uploaded as a zip file."

> "Do you support PHP? — Yes, we host PHP files and PHP app zip files."

Tức là: **1 file HTML đơn** hoặc **zip cả site**. Nhiều file rời chỉ đi được
bằng zip.

### Modal "Paste HTML"

Mở được, nội dung nguyên văn:

```
Paste HTML
Paste or write HTML below to publish it as a link.
[textarea] Paste your HTML code here…
▸ Advanced options
    Page title                          (input text, placeholder "Page title")
    Head HTML (e.g. analytic tags & scripts)
    Enter HTML for the <head> section
Close
```

Đáng chú ý: cho người dùng **chèn HTML tuỳ ý vào `<head>`**, quảng cáo thẳng là
để gắn analytic tag & script. Đây là lựa chọn kiến trúc ngược hẳn với hướng
CSP-sandbox của li2.

**Chưa kiểm được:** ô nhập subdomain và nút publish chỉ hiện sau khi có nội
dung/file. Tôi không gõ nội dung vào (thao tác bị permission-classifier chặn, và
cũng nằm trong vùng "cần upload mới biết"). Vậy nên **có preview trước khi
publish hay không — chưa kiểm được**.

### Subdomain

Trang marketing `https://tiiny.host/host-html-file/` mô tả 3 bước:

> "1. Enter a subdomain — Enter a subdomain for your hosted HTML file
>  2. Upload your HTML File
>  3. Launch & share — Click launch & share your unique link!"

và: "the page is served over HTTPS at a tiiny.site address **you pick**".

Site sẵn có của tài khoản tên `black-olia-65` (dạng sinh ngẫu nhiên), nên
nhiều khả năng có cả đường sinh tự động lẫn đường tự đặt tên.

### Ràng buộc dung lượng / số site (từ bảng so sánh trên /pricing)

| | Free | Tiny $5 | Solo $13 | Pro $31 |
|---|---|---|---|---|
| Active Projects | **1** | 1 | 5 | 15 |
| File Uploads | **3 MB (0.5 MB với PDF)** | 25 MB | 75 MB | 10 000 MB |
| Visits /mo | **5 000** | 10 000 | 100 000 | 500 000 |
| Bandwidth /mo | **5 GB** | 10 GB | 50 GB | 100 GB |

UI xác nhận giới hạn 1 site: trên `/manage` hiện **"1 / 1 live"** và tab
**"All 1/1"**.

### Thời hạn site ở bản free

FAQ, nguyên văn:

> "Links stay online indefinitely on our free plan as long as you log into your
> account once every 3 months. We do not remove your links after a period of
> time as long as your account remains active."

→ Không hết hạn theo thời gian, nhưng **phải đăng nhập ít nhất 3 tháng/lần**.

### Password / chặn index / custom domain — tất cả sau paywall

- **Password protection**: bấm "Learn more" ở card Project Tips → modal
  *"Upgrade for Password Protection — Make your link private by adding a layer
  of security"*. Bảng giá: có từ **Solo $13**.
- **Chặn search engine**: không thấy trên UI free. API docs có trường
  `disableIndexing` trong `siteSettings` (xem phần D), và API chỉ có từ Solo
  trở lên.
- **Custom domain**: panel "Custom Domains" trên dashboard hiện *"No custom
  domains"* + chào bán tên miền từ $1/mo; bảng giá cho thấy tính năng custom
  domain bắt đầu từ **Solo**.
- **Alternate domains** (miền khác ngoài `tiiny.site`): trong bảng so sánh, free
  **không** có, Tiny trở lên mới có.

---

## B. Dashboard và vòng đời site

Hàng site có 4 nút: `Update` (icon edit), icon `chart-bar` (analytics), icon
`qr-code`, và menu tràn. Menu tràn (`.MoreOptions_menu__YJ0Uv`) có đúng 14 mục:

```
Copy link | Share link | View QR code | Embed this link |
Publish to custom domain | View analytics | Integrations | Edit site |
Replace existing file | Analyze site | Versions | Download | Archive | Delete
```

Ngoài ra dashboard có tab **Trash** và **Archive** ở sidebar → xoá là xoá mềm.

### Cái gì free dùng được, cái gì không

| Chức năng | Trạng thái ở bản free (bằng chứng) |
|---|---|
| Đổi file / Replace existing file | có trong menu (không thử) |
| Đổi subdomain | chưa kiểm được (nằm trong flow Update) |
| Xoá / Archive / Trash | có |
| Download bản đã publish | có trong menu (không thử) |
| Số lượt xem | có — cột **Views** hiện `4` |
| **Analytics chi tiết** | **khoá**. Bấm icon chart → `/manage/analytics`: *"Web Analytics / Tracked Links — **Upgrade to unlock** / Project Analytics — Unlock More features / Get to know everything about your audience: Unique visitors, Views, Traffic sources, Countries, Visit duration / Unlock"* |
| **QR code** | **khoá**. Bấm icon QR → *"Upgrade for QR Codes — Easily share your link via a QR code that your visitors can scan with their phone. Download QR Code →"* |
| **Versioning / rollback** | **có tồn tại nhưng khoá**. Bấm "Versions" → *"See previous versions of your projects — Get a version history of your project and move to older versions. Upgrade now →"* |
| Edit site (code editor online) | khoá (bảng giá: từ Solo) |
| Integrations, Feedback mode, Capture emails | khoá ở free |

Backend versioning là **S3 object versioning** — mọi response từ `*.tiiny.site`
đều mang header `x-amz-version-id` (xem phần C). Đây chính là cơ sở kỹ thuật cho
tính năng "Versions".

Điểm đáng lưu ý cho li2: URL và QR **không đổi khi thay file**. Trang marketing
nói thẳng: *"Same address after edits — Uploading a new version replaces the page
without changing its link or QR code."*

---

## C. Trang được phục vụ — phần kỹ thuật

### Kiến trúc: subdomain riêng, KHÔNG phải path chung

Đây là khác biệt lớn nhất với li2. Mỗi project = **một subdomain riêng**
`<name>.tiiny.site`, tách origin hoàn toàn khỏi dashboard `tiiny.host`.

Bằng chứng gián tiếp về lưu trữ: gọi một subdomain không tồn tại trả về lỗi S3
lộ nguyên key:

```
$ curl -I https://zzz-nonexistent-9x7.tiiny.site/
HTTP/2 404
x-amz-error-code: NoSuchKey
x-amz-error-detail-key: zzz-nonexistent-9x7/index.html
server: AmazonS3
```

→ layout là `s3://<bucket>/<subdomain>/index.html`, sau CloudFront.

### Header thật

`curl -I https://demo.tiiny.site/` (2026-09-29):

```
HTTP/2 200
content-type: text/html
content-length: 44858
server: Tiiny Host
x-hosted-by: Tiiny Host
cache-control: no-cache, must-revalidate
last-modified: Mon, 28 Sep 2026 20:36:39 GMT
etag: "f2e116c58fbde8142155b31c96074ef5"
x-amz-version-id: 19lIKyafz1ovKetYgV1kwCUA3chcK8HS
x-amz-request-id / x-amz-id-2: ...
via: 1.1 ...cloudfront.net (CloudFront)
x-cache: Miss from cloudfront
x-amz-cf-pop: SGN50-P4
```

`curl -I https://example.tiiny.site/`: giống hệt, khác ở
`content-type: text/html; charset=utf-8` và **không có** `cache-control`.

Tổng kết header:

| Header | Giá trị |
|---|---|
| `content-type` | `text/html` (demo) / `text/html; charset=utf-8` (example) — **không nhất quán** |
| `content-security-policy` | **KHÔNG CÓ** |
| `x-frame-options` | **KHÔNG CÓ** → trang nhúng iframe được từ bất kỳ đâu |
| `cache-control` | `no-cache, must-revalidate` ở demo; **vắng mặt** ở example |
| `set-cookie` | **KHÔNG CÓ** |
| `x-robots-tag` | **KHÔNG CÓ** |
| CDN / server | CloudFront + S3, `server: Tiiny Host`, `x-hosted-by: Tiiny Host` |

`https://example.tiiny.site/robots.txt` trả về chính `index.html` (fallback SPA),
tức **không có robots.txt** riêng.

Không có CSP nghĩa là trang free chạy trong một origin riêng, **không bị sandbox
gì cả** — họ mua an toàn bằng cách tách origin, không bằng cách siết quyền.

### JavaScript chạy được — chạy đầy đủ

Mở `https://example.tiiny.site/` bằng trình duyệt thật:

```json
{ "title": "Carewell — Clinic & Family Healthcare",
  "jsRan": true, "doctorCount": 4 }
```

Trang là app đặt lịch có state, render DOM bằng JS, fetch ảnh từ
`randomuser.me` — chạy trọn vẹn, không hạn chế network, không sandbox.

### Có chèn thứ của tiiny vào trang free — ba lớp

**1. Ghi đè meta/OG tag.** Tiiny sửa HTML gốc, đánh dấu bằng
`data-id="th-modified"`:

```html
<title data-id="th-modified">Carewell — …</title>
<meta property="og:image" content="https://tiiny.host/assets/logo-purple-bg.png" data-id="th-modified">
<meta property="og:url" content="https://example.tiiny.site/" data-id="th-modified">
```

→ Mặc định ảnh share mạng xã hội là **logo tiiny.host**, không phải của người dùng.

**2. Analytics Plausible của tiiny, luôn bật:**

```html
<script defer data-domain="example.tiiny.site" src="https://analytics.tiiny.net/js/plausible.js"></script>
```

Đây là nguồn của cột "Views" — free thấy tổng số, phần chi tiết bị khoá.

**3. Banner quảng cáo:**

```html
<script type="text/javascript" src="https://tiiny.host/ad-script.js"></script>
```

Đọc `ad-script.js` (10 043 byte) thì banner được chèn làm **phần tử đầu tiên của
`<body>`**:

```
position: fixed !important; bottom: 0% !important; left: 0% !important;
right: 0% !important; width: 100% !important; height: 55px !important;
z-index: 9999 !important
```

link về `https://tiiny.host/fl?ref=free-site`, kèm `document.body.style.marginBottom = "55px"`
và một spacer div. Với PDF viewer còn đẩy `#viewerContainer { bottom: 55px }`.

Kiểm chứng trên trang thật: phần tử đầu `<body>` đúng là div fixed 55px chứa
link đó.

Cùng script còn dựng một **sidebar chỉ chủ site thấy** ("Only visible to you —
Your website visitors will not see this section") để upsell Custom domains /
QR Code / Feedback.

Bảng giá liệt kê **"Remove Tiiny Host banner"** là tính năng trả phí từ Tiny $5.

---

## D. Giá và giới hạn

Từ `https://tiiny.host/pricing` (giá hiển thị là giá theo tháng khi trả năm):

| Gói | Giá | Trả năm | Nội dung chính |
|---|---|---|---|
| **Free** | $0 | — | 1 project, 3 MB/file (0.5 MB PDF), 5 000 visits/mo, 5 GB bandwidth |
| **Tiny** | $5/mo | $60/yr | 1 active project, 25 MB/project, 10 000 visits/mo, bỏ banner, QR code, analytics, feedback mode |
| **Solo** | $13/mo | $156/yr | 5 projects, 75 MB/project, 100 000 visits/mo, custom domain, editing, password protection, API |
| **Pro** | $31/mo | $372/yr | 15 projects, 10 GB account, 500 000 visits/mo, capture emails, team members, priority support |
| **Pro Max** | $74/mo | $888/yr | unlimited projects, 2 TB account, large file hosting |

Có gói tháng (đắt hơn) và "Yearly — 2 MONTHS FREE"; bảo hành hoàn tiền 7 ngày.

### Bản free **chính xác** bị chặn ở đâu

Theo bảng so sánh trên trang, cột Free **trống** (không có) ở toàn bộ các dòng:
Remove Tiiny Host banner · Alternate domains · **QR Codes** · Custom domains ·
**Built-in analytics** · Link Tracking · **Editing features** · **Password
protection** · Capture emails · Disable PDF download/printing · Custom 404
pages · Integrations · Feedback mode · API access · Add team members ·
Priority support.

Free chỉ còn: 1 site, ≤3 MB, 5 000 visits/tháng, 5 GB băng thông, có banner
quảng cáo, có đếm lượt xem tổng, link vĩnh viễn nếu đăng nhập 3 tháng/lần.

Huỷ gói: *"Your sites will remain live until the end of your billing period.
After this time, we'll completely remove them along with your account."*

### API (tham chiếu, chỉ Solo trở lên)

`https://api-docs.tiiny.host` — `POST https://ext.tiiny.host/v1/upload`, header
`x-api-key`, multipart. Trường `siteSettings` (JSON string) cho thấy toàn bộ mô
hình cấu hình một site:

```json
{ "password": "...", "passwordProtected": true, "disableIndexing": true,
  "enableEmailGate": true, "enableEmailWhitelist": true,
  "allowedEmails": ["you@example.com"], "feedbackMode": true,
  "pageTitle": "...", "metaDescription": "...",
  "leadCaptureMode": "Capture Emails", "leadCaptureTitle": "..." }
```

cùng `domain` (vd `my-project.tiiny.co`), `ogImageFile`, `logoImageFile`.
Response trả `links`, `quotaUsed`, `quotaLimit`.
Endpoint khác: `PUT` update, `DELETE` delete, `GET` profile. Docs còn có mục
**Agent Skill** và **MCP Connection Guide**.

---

## Những chỗ chưa kiểm được

- **Ô nhập subdomain, bước preview trước publish, thông báo lỗi khi vượt 3 MB**
  — chỉ hiện sau khi chọn file/nhập nội dung thật. **Cần upload mới biết.**
- **Đổi subdomain của site đã publish** — nằm trong flow `Update` /
  `Replace existing file`, không mở vì rủi ro đè site của người dùng.
- **Có đúng là chỉ site free mới bị chèn `ad-script.js` hay không** — suy ra từ
  việc bảng giá bán "Remove Tiiny Host banner", chưa đối chiếu được một site trả
  phí cụ thể.
- **Nội dung màn hình Versions thật** (số bản, thao tác rollback) — bị paywall
  chặn trước khi thấy.

---

## Đối chiếu nhanh với Artifact của li2-app

| | tiiny.host | li2-app (hiện tại) |
|---|---|---|
| Origin phục vụ | `<name>.tiiny.site` — **origin riêng từng site** | `/a/<token>` — **cùng origin với dashboard** |
| Cách cô lập | tách origin; **không CSP, không X-Frame-Options** | phải dùng **CSP sandbox** để bù |
| Hạ tầng | S3 + CloudFront, file tĩnh | route ứng dụng |
| Versioning | S3 object versioning (`x-amz-version-id`), UI "Versions" trả phí | — |
| QR | có, **trả phí** | có, miễn phí trong luồng |
| Analytics | Plausible chèn sẵn, chi tiết trả phí | visits table |
| `<head>` tuỳ ý | **cho phép** (ô "Head HTML") | bị CSP chặn |
| Link ổn định khi thay file | có — URL và QR không đổi | — |
