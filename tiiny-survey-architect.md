# Khảo sát tiiny.host (trang công khai) — đối chiếu với Artifact của li2-app

Ngày: 2026-09-29. Phạm vi: **chỉ trang công khai** của tiiny.host (pricing, helpdesk, api-docs, site mẫu `*.tiiny.site`) + header thật đo bằng `curl`. Không đăng nhập, không upload. Phía li2: đọc `log.md`, `arch-rootcause-report.md`, `src/app/(artifact)/a/[token]/route.ts`, `database.types.ts`.

Ký hiệu: **[XM]** = đã xác minh bằng header/text thật (kèm URL); **[SL]** = suy luận của tôi; **[MK]** = marketing copy, không coi là bằng chứng.

---

## 0. Ba kết luận quan trọng nhất

1. **Tiiny cách ly nội dung người dùng hoàn toàn bằng origin (`<name>.tiiny.site`), và không dùng CSP nào cả** [XM]. Họ trả giá cho mô hình ấy bằng việc **domain dùng chung bị LinkedIn/Facebook/Outlook đánh dấu spam** [XM helpdesk] — và họ bán "alternate domain .tiiny.co" + "social sharing link" như tính năng trả phí để vá. Với li2, rủi ro tương đương còn nặng hơn: HTML người dùng đang nằm trên **chính domain dashboard** (`app.li2.ai/a/*`). Một lần Safe Browsing đánh dấu `app.li2.ai` là toàn bộ nhân viên và khách hàng bị chặn đăng nhập. **Đây là lý do mạnh nhất để tách origin — mạnh hơn cả lý do cookie.**

2. **Luận điểm "artifact thừa hưởng miễn phí QR + short link + analytics" đúng về giá trị, sai về cơ chế đếm.** Tiiny **bán** QR và analytics ở bậc $5/tháng [XM pricing] — thị trường xác nhận chúng đáng tiền, li2 có sẵn là lợi thế thật. Nhưng li2 chỉ đếm ở bước 302 của short link; **mọi lượt mở thẳng `/a/<token>`** (URL hiện trên thanh địa chỉ sau redirect, người ta copy và gửi tiếp) **không được ghi vào `visits`**. Tiiny đếm bằng script nhúng vào trang nên đếm mọi lượt bất kể đường vào [XM]. Cần sửa rẻ: ghi visit server-side ngay trong route handler `/a/<token>`.

3. **Mọi kiểm soát cấp link của li2 (password, targeting, redirect_setting) không bảo vệ artifact** [SL — cần kiểm li2-be]: li2-be quyết định ở bước resolve short link, rồi 302 sang `/a/<token>` — ai có `/a/<token>` là bỏ qua tất cả. Tiiny đặt password gate ở **tầng phục vụ** nên không bypass được. Nếu li2 muốn nói "artifact thừa hưởng access control của touch point", route `/a/<token>` phải tự kiểm `access_control` của touch point liên kết, nếu không thì đừng nói.

---

## 1. Bản đồ năng lực

### 1.1 Tiiny có, li2 chưa có

| Năng lực | Cốt lõi / tiện ích | Bằng chứng | Ghi chú cho li2 |
|---|---|---|---|
| Nhiều định dạng: HTML, ZIP (site tĩnh nhiều file), PDF, DOC/PPT/XLS, ảnh, PHP | **Cốt lõi** — PDF là loại có giới hạn riêng (0.5 MB free) ⇒ PDF là luồng lớn nhất/bị lạm dụng nhất [SL] | pricing FAQ "We currently support HTML, ZIP, PHP, PDF files..." [XM]; helpdesk 50+ bài về PDF (menu, brochure, pitch deck) [XM] | li2 chỉ `kind='html'`. Với khách proximity-marketing (menu QR, brochure) **PDF là khoảng trống lớn hơn ZIP**. |
| Tên link do người dùng chọn (`yourname.tiiny.site`) | Cốt lõi | helpdesk `how-to-change-your-link-name` [XM] | li2 có slug ở short link; token 16 ký tự ở URL phục vụ là chấp nhận được vì người dùng chia sẻ short link. |
| Cập nhật nội dung **giữ nguyên link và QR** + **version history 5 bản, rollback** (Tiny+, ra mắt 09/2026) | **Cốt lõi** với QR đã in | helpdesk `if-i-update-a-project-does-the-link-change`, `how-to-restore-a-previous-version` [XM] | li2 chưa có replace/versioning — nợ đã ghi. Token li2 vốn ổn định nên thêm "replace content" là rẻ. |
| Password gate ở tầng phục vụ; "Hide from search engines"; email capture (Pro) | Cốt lõi của bậc Solo/Pro | helpdesk `how-to-password-protect-your-project`, `are-my-links-publicly-accessible` [XM] | li2 có password ở touch point nhưng bị bypass qua `/a/<token>` [SL, xem mục 0.3]. |
| Quét nội dung tự động + review tay; giữ ở "preview" nếu có **ô nhập password hoặc script redirect** | Cốt lõi vận hành | helpdesk `why-is-my-project-showing-as-a-preview` mục 5, `were-unable-to-host-this-type-of-content` [XM] | Đây chính là đường sinh ra `scanning`/`quarantined`/`blocked` mà li2 còn thiếu. |
| Preview link tạm 1 giờ khi vượt hạn mức | Tiện ích (funnel upsell) | helpdesk `why-has-my-project-been-deleted` [XM] | Không cần bắt chước. |
| Backup 60 ngày sau xoá; archive; xoá tài khoản free không đăng nhập 3 tháng | Vận hành | cùng bài [XM] | li2 chưa có GC job — nợ đã ghi. |
| Analytics cookieless (Plausible self-host `analytics.tiiny.net`): unique visitors, pageviews, bounce, sources, locations, devices, entry/exit pages, current visitors | Cốt lõi (trả phí) | script nhúng trong `demo.tiiny.site` và `black-olia-65.tiiny.site` [XM]; helpdesk `how-does-analytics-tracking-work` [XM] | Đếm **mọi** lượt xem trang, kể cả nhiều trang trong một ZIP. li2 đếm ở hop redirect. |
| Tracked links (một link riêng cho từng người nhận/kênh) — Solo+ | Tiện ích, nhưng họ **bán** nó | helpdesk `how-to-create-a-tracked-link` [XM] | li2 có UTM + `variants_content` + campaign ⇒ vốn mạnh hơn ở đây. |
| Custom domain (5/tài khoản, Solo+) + SSL; alternate domain `.tiiny.co` | Cốt lõi bậc Solo | pricing table [XM]; helpdesk `how-to-connect-a-domain-you-already-own` [XM] | li2 đã có domain riêng cho short link (`domain_id`). |
| Online editor, "Paste HTML", Create with AI (mọi gói) | Tiện ích/khác biệt hoá | helpdesk `create-with-ai-...` [XM] | **Không nên** bắt chước AI builder — tiêu token đổi mới sai chỗ. |
| API `/v1/upload` (multipart, `siteSettings` JSON, `domain`), MCP server `mcp.tiiny.host` — Solo+ | Cốt lõi cho phân khúc dev/AI | api-docs.tiiny.host [XM]; helpdesk `how-to-connect-tiiny-host-to-claude-with-mcp` [XM] | li2 đã có `li2-shortlink-mcp`; thêm tool `publish_artifact` là rẻ. |
| Tuỳ chỉnh OG title/description/image (họ **rewrite `<head>`**, đánh dấu `data-id="th-modified"`) | Tiện ích | body `demo.tiiny.site` dòng 55 [XM] | li2 có `meta_tags` trên touch point. |
| Embed iframe sẵn code; CORS `*`; không X-Frame-Options | Tiện ích | header `access-control-allow-origin: *`, không có XFO [XM] | li2 dùng `frame-ancestors 'self'`. |
| Comments/Feedback mode, custom 404, Spaces, team members, priority support | Tiện ích | pricing table [XM] | — |
| CDN (CloudFront, POP SGN) + S3 versioned; `server: Tiiny Host` (proxy rewrite) | Hạ tầng | header `via: cloudfront`, `x-amz-version-id` [XM] | li2 phục vụ từ Supabase storage qua Node, `Cache-Control: no-store`. |

### 1.2 li2 có, tiiny không có

| Năng lực | Cốt lõi / tiện ích | Bằng chứng |
|---|---|---|
| Short link + QR **sinh tự động khi publish**, QR customize (`qr_customize_options`) | **Cốt lõi** — tiiny bán QR ở $5/tháng, và QR của tiiny chỉ là mã hoá URL | `database.types.ts` touch_points; pricing "QR Codes" chỉ từ Tiny [XM] |
| Bảng `visits` giàu chiều: ip, country/region/city, isp, asn, os, platform, fp, `is_bot`, referrer, utm_*, campaign, segment | Cốt lõi (analytics là sản phẩm) | `database.types.ts` visits [XM] |
| Bot detection (`is_bot`) | Cốt lõi | cùng bảng; tiiny không nêu gì về bot |
| Dynamic targeting, redirect_setting, variants A/B, conversion_tracking, UTM/campaign | Cốt lõi marketing | schema touch-points `targeting`, `redirect_setting`, `variants_content` [XM] — nhưng xem mục 0.3 về bypass |
| Multi-tenant tổ chức, permission scope, collections | Cốt lõi B2B | route `getPermissionScopeOrThrow` (log.md) |
| Domain riêng cho **short link** tách khỏi origin phục vụ | Kiến trúc | `domain_id`, mint theo domain mặc định của tổ chức (log.md) |
| CSP `sandbox` + `connect-src 'none'` + `X-Robots-Tag: noindex` mặc định | Bảo mật | `route.ts:17-25,42-45` [XM]; tiiny **không** có CSP, không noindex mặc định [XM] |
| Safe Browsing trên URL (`safety_status`) | Tiện ích — với artifact URL là của li2 nên **vô dụng cho nội dung** | `touch-point.service.ts:1357` |

**Đọc bảng này thế nào:** tiiny là **hosting** có analytics gắn thêm; li2 là **analytics/phân phối** có hosting gắn thêm. Phần trùng nhau (QR, analytics, link ổn định) là phần tiiny **thu tiền**, li2 **có sẵn**. Phần li2 thiếu và khách proximity-marketing chắc chắn cần: PDF, cập nhật giữ QR, quét nội dung, quota.

---

## 2. Origin phục vụ — đo thật và lập luận hai chiều

### 2.1 Tiiny phục vụ ở đâu, header ra sao [XM]

```
$ curl -D - https://black-olia-65.tiiny.site        (site free của đội, công khai)
HTTP/2 200
content-type: text/html
server: Tiiny Host                 ← proxy riêng, không phải S3 thẳng
x-hosted-by: Tiiny Host
cache-control: no-cache, must-revalidate
x-amz-version-id: pGlnq...         ← S3 versioning (nền của "5 versions")
via: 1.1 ...cloudfront.net (CloudFront), x-amz-cf-pop: SGN50-P4
vary: Origin, Access-Control-Request-Headers, Access-Control-Request-Method
access-control-allow-origin: *   access-control-allow-methods: GET, HEAD

KHÔNG CÓ: content-security-policy, x-frame-options, set-cookie, x-robots-tag,
          strict-transport-security, x-content-type-options
```
Trang marketing `tiiny.host` (S3 tĩnh) thì **có** `x-frame-options: SAMEORIGIN`, `nosniff`, HSTS [XM] — tức họ **cố ý** không đặt header nào lên site người dùng để "markup is left alone" [MK trang host-html-file]. Subdomain không tồn tại → 404 từ `AmazonS3` với favicon trỏ `s3-eu-west-1.amazonaws.com/deployed.tiiny.host/__404__/` ⇒ mọi site nằm chung một bucket, prefix theo tên [SL từ URL].

Họ **sửa HTML** trước khi phục vụ: chèn meta OG (`data-id="th-modified"`), `plausible.js` (mọi gói, kể cả free — "that's how we track usage against your plan limits" [XM helpdesk]) và `ad-script.js` (banner, gỡ khi trả phí). Người dùng **không thể** gỡ — "they'll be added again next time you upload" [XM].

```
Tiiny                                          li2 hiện tại
──────                                         ────────────
tiiny.host (dashboard)  ── cookie ──┐          app.li2.ai (dashboard) ── cookie casdoor sameSite:none ──┐
                                    │  origin                                                            │ CÙNG origin
<name>.tiiny.site  (không CSP)  ◄───┘  khác    app.li2.ai/a/<token>  (CSP sandbox, opaque origin)  ◄──┘
   └─ proxy "Tiiny Host" rewrite HTML             └─ route.ts, storage.get, no-store
   └─ S3 versioned + CloudFront                   └─ Supabase storage private, Node
Cách ly = ranh giới origin của trình duyệt      Cách ly = CSP sandbox (giới hạn thiệt hại, không phải an toàn)
```

### 2.2 Cái giá tiiny đang trả cho subdomain dùng chung [XM]

helpdesk `why-your-link-gets-blocked-on-linkedin-facebook-or-outlook`: *"The .tiiny.site domain is shared by everyone who publishes with us. Because of the volume of spam historically uploaded to it — which we remove continuously — some platforms flag the whole domain as spam or phishing."* Giải pháp họ bán: social sharing link (paid), alternate domain `.tiiny.co` "on request once your account is verified", custom domain.

**Suy ra cho li2 [SL]:** vấn đề uy tín domain **không phụ thuộc** tách origin hay không — nó phụ thuộc domain nào xuất hiện trong URL người dùng gửi. Hiện tại đó là `app.li2.ai`. Nếu bị flag, hậu quả không phải "link marketing bị chặn" mà là **"dashboard bị chặn"**.

### 2.3 Lập luận hai chiều

**Giữ cùng origin + CSP sandbox (hiện tại)**

| Ủng hộ | Phản đối |
|---|---|
| Đã chạy, đã nghiệm thu 5/5 trên LiHi (log.md). Zero hạ tầng mới. | `sandbox` không `allow-same-origin` ⇒ artifact **không có `localStorage`, không `fetch`, không form submit** (`connect-src 'none'`, `form-action 'none'`). Artifact do AI sinh (Claude/ChatGPT) rất hay dùng localStorage/fetch ⇒ **hỏng âm thầm**, người dùng tưởng li2 lỗi. Đây là giới hạn *sản phẩm*, không chỉ bảo mật. |
| `frame-ancestors 'self'` ⇒ iframe xem trước ở trang chi tiết chạy ngay. | Không bao giờ **nới** được CSP cho gói trả phí ("cho phép gọi API của bạn") mà không mở lại XSS vào dashboard. Trần sản phẩm bị khoá bởi quyết định origin. |
| Không phải lo wildcard cert, DNS, cookie Domain. | Một lỗ CSP (trình duyệt cũ, bug sandbox, header bị strip bởi proxy/CDN phía trước) = session Casdoor của người xem đang đăng nhập. Blast radius là **toàn bộ dashboard**. |
| | Uy tín domain: nội dung người lạ upload nằm trên domain đăng nhập (mục 2.2). |
| | `Cache-Control: no-store` + Node đọc storage mỗi request ⇒ không CDN được; QR in trên bao bì có thể tạo đỉnh tải thẳng vào app server. |

**Tách origin (`{token}.art.li2.ai` hoặc `art.li2.ai/<token>`)**

| Ủng hộ | Phản đối / giá phải trả |
|---|---|
| Cách ly bằng ranh giới origin của trình duyệt — cơ chế "nhàm chán", 25 năm tuổi, không phụ thuộc header. Tiiny, Vercel, GitHub Pages, Netlify đều làm vậy. | **Wildcard cert**: cần DNS-01 (ACME) — rẻ nếu DNS provider có API; đắt nếu đội ops làm tay. `art.li2.ai/<token>` (path) **không cần wildcard**, chỉ 1 CNAME + 1 cert. |
| Có thể **bỏ sandbox** để localStorage/fetch chạy ⇒ artifact AI dùng được, và có thể bán "connect-src cho domain của bạn" theo gói. | Cookie Casdoor: `sameSite:'none'` chỉ nói cookie *được gửi* cross-site; nó có sang `*.art.li2.ai` hay không phụ thuộc thuộc tính **`Domain`** của cookie. Nếu cookie set `Domain=.li2.ai` thì tách subdomain **không cách ly cookie** — phải kiểm thật (`set-cookie` khi login). Nếu cần, dùng TLD khác (`li2.site`) như tiiny (`tiiny.host` vs `tiiny.site`) — khi đó chi phí là một domain mới + cert. |
| Domain dashboard sạch khỏi nội dung người lạ ⇒ Safe Browsing flag chỉ chặn `art.*`, không chặn đăng nhập. | iframe xem trước: `frame-ancestors 'self'` phải đổi thành `frame-ancestors https://app.li2.ai` (và host LiHi/dev) — 1 dòng, nhưng phải cấu hình theo env, chính chỗ arch-report 3.5 đã cảnh báo. |
| Có thể đặt CDN phía trước (cache theo token, purge khi publish/replace). | Next.js host-based routing thêm phức tạp; hoặc phục vụ bằng service riêng (li2-be Go đọc Supabase storage) — thêm một deploy. |
| Per-token subdomain còn cách ly **artifact với artifact** (localStorage của org A không đọc được của org B) — path-based thì không. | Per-token subdomain = wildcard cert bắt buộc + `Host` parsing; per-path = rẻ hơn nhưng artifact cùng origin với nhau. |

**Khuyến nghị của tôi (có quan điểm):** đừng tách ngay, nhưng **đừng bán artifact hay nới CSP khi chưa tách**. Cụ thể:
1. Giữ nguyên cho prototype/nội bộ.
2. **Trước khi mở cho khách trả phí**: chuyển sang `art.li2.ai/<token>` (path, một cert, một CNAME, không wildcard), **vẫn giữ** CSP sandbox. Lợi: domain dashboard sạch; iframe preview đổi 1 dòng `frame-ancestors`. Đây là bước rẻ nhất mua được phần lớn giá trị.
3. Chỉ lên wildcard `{token}.art.li2.ai` + bỏ sandbox **khi có khách cần localStorage/fetch** — lúc đó có doanh thu để trả cho DNS-01 và routing.
4. Việc cần làm **ngay bây giờ**, rẻ, độc lập với quyết định trên: `curl -D -` trang login LiHi để đọc thuộc tính `Domain` của cookie Casdoor. Nếu là `.li2.ai` thì phương án 3 cần TLD khác; biết sớm rẻ hơn biết sau.

---

## 3. Mô hình kiếm tiền và giới hạn

Nguồn: bảng so sánh trên `tiiny.host/pricing` (đọc DOM, dấu ✓ là icon check) [XM] và helpdesk `plan-limits-explained` [XM]. Giá tháng trong helpdesk `pricing-plans`: Tiny $9, Solo $18, Pro $38, Pro Max $89; giá năm quy ra tháng $5/$13/$31/$74.

| | Free | Tiny $5 | Solo $13 | Pro $31 | Pro Max $74 |
|---|---|---|---|---|---|
| Project live | 1 | 1 | 5 | 15 | không giới hạn |
| Upload/project | 3 MB (PDF 0.5 MB) | 25 MB | 75 MB | 10 GB / tài khoản | 2 TB / tài khoản |
| Upload/ngày (tính cả update) | 3 | 3 | ∞ | ∞ | ∞ |
| Visits/tháng | 5.000 | 10.000 | 100.000 | 500.000 | 1.000.000 |
| Bandwidth/tháng | 5 GB | 10 GB | 50 GB | 100 GB | 200 GB |
| Gỡ banner tiiny | – | ✓ | ✓ | ✓ | ✓ |
| **QR code** | – | ✓ | ✓ | ✓ | ✓ |
| **Analytics dashboard** | – (script vẫn chạy để đo hạn mức) | ✓ | ✓ | ✓ | ✓ |
| Version history (5), Feedback mode, alternate domain, PHP | – | ✓ | ✓ | ✓ | ✓ |
| Custom domain (≤5), password, hide from search, editor, tracked links, custom 404, integrations, **API/MCP** | – | – | ✓ | ✓ | ✓ |
| Email capture, team members, priority support | – | – | – | ✓ | ✓ |

**Họ tin cái gì có giá trị (đọc từ paywall):**
1. **Thương hiệu của họ trên nội dung của bạn là thứ đầu tiên người ta trả tiền để gỡ** ($5).
2. **QR + analytics là "tiện ích $5"** — không phải cốt lõi của hosting, nhưng đủ giá trị để làm mồi chuyển đổi bậc đầu.
3. **Kiểm soát truy cập và danh tính (password, custom domain, API) là bậc $13** — đây là nơi có "khách làm việc": freelancer gửi bản nháp cho khách hàng.
4. **Dữ liệu người xem (email capture) và đội nhóm là bậc $31.**
5. Free được đo bằng **cả bốn trục** (project, MB, upload/ngày, visits+bandwidth) — và vi phạm trục nào cũng đẩy vào "preview 1 giờ" thay vì từ chối. Họ tối ưu funnel, không tối ưu công bằng.

**Đối chiếu li2 [SL]:**
- li2 **không nên** tính tiền theo visits/bandwidth của artifact — visits là chính thứ li2 bán (analytics). Tính tiền trên lượt xem là tự chặn giá trị cốt lõi.
- Trục hợp lý cho quota li2: **số artifact live/tổ chức** + **tổng byte lưu trữ/tổ chức** + (có thể) **số lần replace/ngày** để chặn lạm dụng storage. Đây là 3 con số đếm được bằng một `count/sum` trên bảng `artifacts` theo `organization_id`, không cần meter mới.
- QR, analytics, targeting **phải** nằm trong mọi gói li2 kể cả free — vì chúng là lý do khách chọn li2 thay tiiny. Khoá chúng là bắt chước sai mô hình.
- Cái li2 có thể khoá theo gói giống tiiny một cách hợp lý: dung lượng/artifact (5 MB free → cao hơn), số artifact, versioning, và (sau khi tách origin) mức nới CSP.

---

## 4. Nên học gì, không nên bắt chước gì

### Nên học — rẻ (≤ 1–2 ngày mỗi mục)

| Học | Vì sao | Bằng chứng tiiny | Chi phí li2 |
|---|---|---|---|
| **Đếm lượt mở thẳng `/a/<token>`** | Hiện li2 chỉ đếm ở 302. URL sau redirect bị copy/gửi tiếp là mất số | Tiiny nhúng plausible ⇒ đếm mọi lượt [XM] | Ghi `visits` server-side trong route handler (đã có `tp_id`, IP, UA); **không** nhúng script vì `connect-src 'none'` chặn beacon và vì đừng sửa HTML khách. Cẩn thận đếm đôi khi đến từ 302 (đã có `?uid=`) — dùng `uid` làm cờ "đã đếm". |
| **Replace nội dung giữ token + version tối thiểu** | "link và QR không đổi khi update" là lời hứa số một với QR đã in | helpdesk `if-i-update-a-project...`, `will-my-qr-code-change` [XM]; version 5 bản, rollback [XM] | Token đã ổn định; thêm `artifact_versions` (hoặc cột `storage_path` mới + giữ file cũ) và endpoint `PUT content`. |
| **Heuristic giữ lại để review: ô `<input type=password>` và script redirect** | Hai dấu hiệu phishing rẻ nhất, tiiny dùng ngay cả khi có scanner | helpdesk `why-is-my-project-showing-as-a-preview` mục 5 [XM] | Regex trên byte lúc upload → `status='scanning'`/`quarantined`; đây là đường **đầu tiên** tạo ra 4 trạng thái đang chết. |
| **Quota theo gói bằng đếm bảng `artifacts`** | Nợ đã ghi | mô hình 4 trục của tiiny [XM] | `count(*) where org and status='live'`, `sum(size_bytes)`; trả 402/409 có i18n key thật. |
| **Soft-delete + GC 60 ngày** | Nợ đã ghi; tiiny giữ backup 60 ngày | helpdesk `why-has-my-project-been-deleted` [XM] | `deleted_at` + cron xoá storage. |
| **Ghi rõ "public by default + noindex" trong UI** | Tiiny nói thẳng "Yes, all content you upload is publicly available" [XM] | FAQ pricing [XM] | Một dòng copy ở form tạo. li2 đã có `X-Robots-Tag: noindex` mặc định — tốt hơn tiiny, nên nói ra. |

### Nên học — đắt (nhưng đúng hướng)

| Học | Vì sao | Chi phí |
|---|---|---|
| **Tách origin** (mục 2.3) | Uy tín domain + trần sản phẩm | Path-based: 1–2 ngày. Wildcard: DNS-01 + routing + kiểm cookie Domain. |
| **PDF làm `kind` thứ hai** | Menu/brochure/bảng giá là ca dùng QR phổ biến nhất; tiiny có riêng giới hạn PDF ⇒ đây là luồng lớn nhất của họ [SL] | Phục vụ PDF an toàn: `Content-Disposition: inline`, CSP `sandbox` vẫn áp dụng cho PDF viewer? — cần kiểm; hoặc bọc bằng viewer riêng (tiiny dùng `pdf-ui` riêng [XM header black-olia]). |
| **ZIP nhiều file** | Site tĩnh xuất từ builder | Path routing dưới token, index.html, MIME theo đuôi, giới hạn số file — gấp 3 độ phức tạp phục vụ. Chỉ làm khi có nhu cầu thật. |
| **Tool MCP `publish_artifact`** | Tiiny bán MCP ở Solo; li2 đã có MCP server | Rẻ về code (`li2-shortlink-mcp` gọi REST có sẵn) nhưng mở thêm mặt tấn công upload qua API — làm sau quota + scanning. |

### KHÔNG nên bắt chước — vì khác mô hình kinh doanh

| Không làm | Lý do |
|---|---|
| **Chèn script/banner/meta vào HTML của khách** | Tiiny bán hosting cho cá nhân ⇒ banner là kênh growth. li2 bán cho tổ chức có thương hiệu riêng; chèn banner phá "white-label" mà li2 đang bán qua custom domain. Về kỹ thuật, li2 đã chọn **không sửa byte** ("markup left alone" mà tiiny chỉ hứa ở marketing [MK] nhưng thực tế vi phạm [XM]) — giữ nguyên, nó cũng là điều làm sandbox CSP kiểm chứng được. |
| **Meter visits/bandwidth làm paywall** | Mục 3. li2 bán analytics; đếm visits để phạt là mâu thuẫn định vị. |
| **Không đặt CSP / không noindex trên nội dung người dùng** | Tiiny làm được vì origin tách; li2 chưa tách. Và cả khi tách, `X-Robots-Tag: noindex` mặc định vẫn đúng cho proximity marketing (đích QR không cần SEO). |
| **PHP, "Create with AI", online editor** | Tiêu token đổi mới vào thứ không phải cốt lõi. li2 đã có một token đổi mới đang dùng (bot detection/analytics). Khách li2 tạo HTML bằng công cụ ngoài rồi mang tới. |
| **Preview link 1 giờ khi vượt hạn mức** | Funnel B2C. Với B2B, trả lỗi rõ + i18n là đủ. |
| **Email capture gate** | Có thể hấp dẫn, nhưng đó là sản phẩm lead-gen riêng; li2 làm sau khi access control cấp phục vụ đã đúng (mục 0.3). |

---

## 5. Kiểm lại luận điểm cốt lõi

Luận điểm: *"artifact chỉ là một `content_type` mới của touch point, nên thừa hưởng miễn phí short link, QR và toàn bộ analytics."*

### 5.1 Có phải lợi thế thật, hay tiện lợi cho dev?

**Cả hai, và phần "tiện lợi cho dev" đã lộ mặt trái.** Bằng chứng ủng hộ giá trị:
- Tiiny **thu $5/tháng** cho QR + analytics, **$13** cho tracked links [XM]. Thị trường trả tiền cho đúng thứ li2 nhận "miễn phí".
- Ca dùng tiiny quảng bá (PDF menu → QR, brochure, pitch deck, resume link) [XM helpdesk] **trùng khít** với ca dùng proximity marketing của li2. Tức "nội dung được host + QR + đo" là gói mà người dùng thật sự tìm — tiiny đi từ hosting tới QR, li2 đi từ QR tới hosting, gặp nhau ở giữa.

Bằng chứng phản đối / giới hạn:
- "Miễn phí" ở đây là **kế thừa hợp đồng ngầm** (slug 6..64, name ≤64, tldts từ chối localhost, i18n key, axios JSON) — `arch-rootcause-report.md` đã liệt kê 8 lỗi từ chính sự kế thừa này. Chi phí không bằng 0, nó **được trả sau**.
- Touch point mang theo **UI và ngữ nghĩa của URL ngoài**: collections hiện nhãn "QR" sai, `content_value` có thể bị sửa qua route short-link (arch-report 3.7). Kế thừa cả thứ không muốn.
- `safety_status`/Safe Browsing kế thừa nhưng **vô nghĩa** với artifact (URL là của li2). Quét phải làm trên byte, tức phần "15% mới" thật ra to hơn 15%.

### 5.2 Người dùng có cần analytics trên HTML tĩnh không?

**Có, và tiiny chứng minh điều đó bằng tiền** — nhưng cần đúng loại analytics:
- Tiiny thấy đáng để **tự host Plausible** và nhúng vào **mọi** site kể cả free [XM]. Không ai làm thế nếu người dùng chỉ cần "link chạy được".
- Nhưng analytics của tiiny là **analytics trang** (pageviews, bounce, entry/exit) — phù hợp site nhiều trang. Analytics của li2 là **analytics lượt quét/lượt bấm** (ai, ở đâu, thiết bị gì, bot hay người, từ chiến dịch nào). Với đích QR một trang, analytics của li2 **đúng câu hỏi hơn** ("bao nhiêu người quét tờ rơi ở quận 1"), tiiny trả lời câu ít giá trị hơn ("bounce rate của trang một trang").
- **Chỗ luận điểm sai về cơ chế:** li2 đếm ở 302, nên (a) lượt mở thẳng `/a/<token>` không đếm, (b) mọi kiểm soát cấp link bị bypass ở `/a/<token>`, (c) nếu artifact là ZIP nhiều trang sau này, li2 mù hoàn toàn bên trong. Tiiny không có (a)(b)(c) vì gate và đếm nằm **ở tầng phục vụ**.

### 5.3 Kết luận

Luận điểm **đúng về sản phẩm, đúng một nửa về kỹ thuật**. Phần đúng: QR + short link + analytics lượt quét là lợi thế cạnh tranh thật, được thị trường định giá $5–13/tháng, và trùng ca dùng. Phần cần sửa để luận điểm không thành lời nói dối:

```
Hiện tại                                   Cần
────────                                   ───
short link ──li2-be: gate+count──302──►    short link ──li2-be: gate+count──302──►
/a/<token> ── không gate, không count       /a/<token> ── kiểm access_control của tp ─► count nếu chưa có uid ─► phục vụ
```
Nếu không sửa, câu đúng phải là: *"artifact thừa hưởng short link và QR; analytics và access control chỉ đúng với lượt đi qua short link."*

---

## 6. Giả định của tôi (phiên chính nên hỏi người dùng)

1. **Cookie Casdoor có `Domain=.li2.ai` không?** Tôi chưa đo (không đăng nhập). Nếu có, tách sang `*.art.li2.ai` không cách ly cookie ⇒ cần TLD khác, chi phí phương án 3 tăng.
2. **li2-be có áp `access_control`/targeting cho `content_type='ARTIFACT'` ở bước resolve không?** Tôi giả định có (nó gate trên `ContentValue == ""` theo log.md). Dù có hay không, bypass qua `/a/<token>` vẫn tồn tại.
3. **Khách li2 mang HTML từ đâu tới?** Tôi giả định phần lớn là HTML do AI sinh (Claude/ChatGPT/Bolt) — tiiny có hẳn helpdesk cho Bolt/Cursor/Replit/ChatGPT [XM]. Nếu đúng, giới hạn `localStorage`/`fetch` của sandbox sẽ là khiếu nại số một, đẩy quyết định tách origin lên sớm hơn. Nếu khách chủ yếu upload PDF menu/brochure, thì **PDF quan trọng hơn tách origin**.
4. **Domain phục vụ có được coi là tài sản uy tín không?** Tôi giả định có (li2 bán custom domain). Nếu đội chấp nhận rủi ro `app.li2.ai` bị flag, lập luận tách origin yếu đi một nửa.
5. **`ARTIFACT_MAX_BYTES = 5 MB`** — tôi giả định giữ cho free. Tiiny free là 3 MB, Tiny 25 MB; 5 MB đứng giữa là hợp lý, không cần đổi.

---

### Phụ lục — URL đã dùng làm bằng chứng
- https://tiiny.host/pricing (bảng so sánh, FAQ) · https://tiiny.host/host-html-file/
- https://helpdesk.tiiny.host/en/article/{why-is-there-code-in-my-project-i-didnt-add-15s4lyi, why-your-link-gets-blocked-on-linkedin-facebook-or-outlook-19nndl6, plan-limits-explained-projects-uploads-visits-and-bandwidth-1ihflbr, how-does-analytics-tracking-work-1aozeja, analytics-on-tiiny-host-ju9he7, how-to-create-a-tracked-link-ohfac3, how-to-restore-a-previous-version-of-your-project-1f8l9bp, if-i-update-a-project-does-the-link-change-73eo93, why-is-my-project-showing-as-a-preview-rwsqvq, why-has-my-project-been-deleted-1pjvdkr, what-content-is-prohibited-5usizt, are-my-links-publicly-accessible-128hhuj, how-to-password-protect-your-project-1kascwp, how-to-connect-tiiny-host-to-claude-with-mcp-14z1okp, what-does-a-tiiny-host-account-offer-me-qevduq, pricing-plans-1i3vkky}
- https://api-docs.tiiny.host/ (POST /v1/upload, PUT, DELETE, GET /v1/profile; "only available on our Solo plans and above")
- `curl -D -` trên https://black-olia-65.tiiny.site, https://demo.tiiny.site, https://zzz-khong-ton-tai-98765.tiiny.site, https://tiiny.host, https://tiiny.host/ad-script.js
- li2: `src/app/(artifact)/a/[token]/route.ts`, `src/shared/types/database.types.ts` (visits, touch_points), `log.md`, `arch-rootcause-report.md`
