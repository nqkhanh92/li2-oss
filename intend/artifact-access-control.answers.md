# Trả lời 8 câu hỏi mở — artifact-access-control

Soạn 2026-10-04 bởi agent researcher. **Chỉ đọc code + docs, không sửa gì.**
Mỗi câu: *Đáp án đề xuất* / *Bằng chứng* / *Mức chắc chắn* (đo được = chạy lệnh/thấy output; đọc được = đọc trực tiếp trong code/doc; suy ra = ghép từ nhiều nguồn) / *Còn mở gì*.

Đường dẫn không có tiền tố repo là tương đối `li2-app/`. Mã li2-be đọc qua `gh api repos/QQuik/li2-be/...?ref=stag`.

---

## Q2 — li2-be cưỡng chế password / expires_at / click_limit ở đâu? (ĐÃ XÁC MINH ĐƯỢC)

**Truy cập li2-be: ĐƯỢC.** `gh repo view QQuik/li2-be` trả về OK; đọc file bằng
`gh api "repos/QQuik/li2-be/contents/<path>?ref=stag" --jq .content | base64 -d`.

### Đáp án đề xuất
**Không nên** đặt `password` lên touch point song song như một lớp bảo vệ. Lý do không phải "hai nơi
lệch nhau" (đó là vấn đề nhỏ) mà là: **cơ chế mật khẩu của li2-be hiện tại không phải lớp bảo mật** —
mật khẩu lưu và so sánh **plaintext**, và được chuyển qua **cookie do JavaScript phía client tự ghi**.
Nếu vẫn muốn đặt cho mục đích "đỡ người tò mò", hãy coi nó là UX, không phải bảo mật, và **đừng dùng
chung giá trị** với `password_hash` của artifact.

### Bằng chứng

**1. Nơi cưỡng chế: `handleAccessControl` trong service, gọi từ `Redirect`.**
`internal/services/touch-point.service.go:371-404` — toàn bộ hàm:

```go
func (t *TouchPointService) handleAccessControl(touchPoint models.TouchPoint, password string) (int, error) {
	if touchPoint.AccessControl == nil { return 200, nil }
	// Valid From
	if touchPoint.AccessControl.ValidFrom != nil && touchPoint.AccessControl.ValidFrom.After(time.Now()) {
		return 406, errors.New("not available")
	}
	// Expires At
	if touchPoint.AccessControl.ExpiresAt != nil && touchPoint.AccessControl.ExpiresAt.Before(time.Now()) {
		return 404, errors.New("expired")
	}
	// Limit Access
	if touchPoint.AccessControl.Limit != nil && *touchPoint.AccessControl.Limit >= 0 {
		visitByTp, statusCode, err := t.visitByTpRepo.GetOne(touchPoint.Id)
		if err != nil || (statusCode != 404 && visitByTp.Total >= *touchPoint.AccessControl.Limit) {
			return 404, errors.New("limit access")
		}
	}
	// Password
	if touchPoint.AccessControl.Password != nil && *touchPoint.AccessControl.Password != "" {
		if password == "" { return 401, errors.New("password required") }
		if password != "" && *touchPoint.AccessControl.Password != password {
			return 401, errors.New("password not match")
		}
	}
	return 200, nil
}
```

**2. So sánh plaintext.** `*touchPoint.AccessControl.Password != password` là so sánh chuỗi thường
(`touch-point.service.go:399`). Model khai báo `Password *string` không có hậu tố hash
(`internal/models/touch-point.model.go:87-92`):
```go
type AccessControl struct {
	Limit     *int       `json:"limit"`
	ExpiresAt *time.Time `json:"expires_at"`
	Password  *string    `json:"password"`
	ValidFrom *time.Time `json:"valid_from"`
}
```
Không có bcrypt/argon2 ở đường này. Không dùng `subtle.ConstantTimeCompare` → về lý thuyết còn hở
timing, nhưng đó là lỗi thứ cấp so với việc lưu plaintext.

**3. Mật khẩu đến từ cookie `x-password`, do JS trong trang tự ghi.**
`internal/controllers/short-url.controller.go:443`:
```go
password, _ := ctx.Cookie("x-password")
```
rồi truyền thẳng vào `touchPointService.Redirect(ctx, slug, tracking, variantType, domain, password)`
(`short-url.controller.go:619`).

Cookie đó được **client** đặt trong `templates/authentication.html:628`:
```js
document.cookie = `x-password=${rawPassword}; path=/; max-age=5; secure; samesite=strict`;
```
Ngay trên nó, `templates/authentication.html:568-604` là một bản **đã bị comment** có băm SHA-256
(`crypto.subtle.digest("SHA-256", ...)`, cookie `max-age=60`). Bản đang chạy là bản **không băm**,
`max-age=5` giây, rồi `window.reloadWithReferrer()`.

→ Hệ quả: không có phiên người xem phía server. Mật khẩu thô đi trong cookie mỗi lần tải lại, sống 5
giây. Ai có mật khẩu có thể bỏ qua hẳn form bằng cách tự set cookie.

**4. Trả gì khi chặn:** HTML, không phải JSON, không phải 403 trần.
`responseTemplateHTML` (`short-url.controller.go:653-700`) chọn template theo status:
- `401` → `./templates/authentication.html` nếu cookie `x-password` rỗng, ngược lại
  `./templates/authentication-failed.html` (`short-url.controller.go:664-670`).
- `403` → `transition.html` / `transition-dev.html` (dùng cho tracking/cloaking, không phải password).
- `406` → trang "chưa tới hạn" (`ValidFrom`).
- `404` (expired / limit) → rơi vào nhánh `RedirectSetting.NotFoundUrl` nếu có, nếu không thì template
  not-found (`short-url.controller.go:619-631`).

Lưu ý lệch với trực giác: **hết hạn và vượt giới hạn trả `404`, không phải `410`**; chỉ `ValidFrom`
trả `406`.

**5. `content_type`: li2-be KHÔNG kiểm.** `ContentType` có trong model
(`internal/models/touch-point.model.go:11` và `:37`) nhưng `handleAccessControl` không đọc nó, và
`Redirect` (`touch-point.service.go:100-175`) không nhánh theo `content_type`. Không tìm thấy bất kỳ
so sánh `content_type == "artifact"` nào trong đường resolve.

**6. Thứ tự gate trong `Redirect`** (`touch-point.service.go:116-152`): `GetBySlug` → `!Enabled` →
`SafetyStatus == "flagged"` → `handleDomain` → `handleAccessControl` → `handleTracking` →
`handleVariant` → `handleFingerprint`. Password nằm **sau** kiểm tồn tại/enabled/domain, **trước**
tracking. Khớp với ràng buộc "removed → 410 trước mọi cổng" mà intent đặt ra cho li2-app.

**7. Route:** chỉ một entry công khai, `GET /short-urls/r/:slug`, qua rate-limit + NFC middleware
(`internal/routers/shortUrl/short-url.router.go:20-25`).

### Mức chắc chắn
**Đọc được** cho toàn bộ mục 1-7 (đọc trực tiếp mã nguồn nhánh `stag`). **Đo được** cho việc truy cập
repo (lệnh `gh` chạy thành công). **Chưa đo** hành vi runtime thật: chưa gửi request tới li2-be để xem
response thực tế.

### Còn mở gì
- Nhánh production thật của li2-be là `stag` — tôi tin theo chỉ dẫn task, **chưa tự xác minh** bằng
  cách so với deploy đang chạy.
- Không rõ ai ghi `access_control.password` vào DB (li2-app hay inside) và có băm trước khi ghi không —
  xem phần Q2b bên dưới sau khi kiểm phía li2-app.

---

## Q2b — li2-app có hash `password` của touch point không? KHÔNG.

### Bằng chứng
- Schema nhận **chuỗi thô**, chỉ chặn khoảng trắng và giới hạn 256 ký tự:
  `src/shared/schemas/touch-points/advanced.schema.ts:7-13`
  ```ts
  const linkPasswordSchema = z.string().max(256)
    .refine((val) => !/\s/.test(val), { params: { i18n: { key: 'errors.no_whitespace' } } })
    .or(z.literal(''))
  ```
  Gộp vào `accessControlSchema` qua `linkPasswordFormSchema` (`advanced.schema.ts:79-81`, `:98-102`).
- `parseAccessControl` (`src/core/services/touch-point.service.ts:1638-1670`) chỉ gate theo plan rồi
  trả về `pickDefinedAndNotNull({ ..._accessControl, expires_at: …, valid_from: … })` — **chỉ ngày
  tháng được biến đổi, `password` đi qua nguyên vẹn**. Không có bước băm nào.
- Không có thư viện băm mật khẩu trong repo: `grep -niE "bcrypt|argon2|scrypt|pbkdf2" package.json` →
  **không có kết quả**. Trong `src/` chỉ có `crypto.createHash('sha256')` dùng cho API key, MCP OAuth
  PKCE và hash email Facebook (ví dụ `src/core/services/api-key.service.ts:75`,
  `src/core/services/mcp-oauth.service.ts:263`), không dùng cho mật khẩu link.

→ **Chuỗi end-to-end hiện tại là plaintext**: form → zod → DB `access_control.password` → Go so sánh
`!=`. Khớp với Q2 mục 2. Ràng buộc "mật khẩu băm (argon2/bcrypt)" trong intent vì vậy là **phụ thuộc
mới**: sẽ phải thêm dependency, chưa có sẵn.

**Mức chắc chắn:** đọc được (schema + service + package.json).

**Còn mở:** `src/core/services/mcp-oauth.service.ts:270-271` có hàm so sánh hằng thời gian dựa trên
SHA-256 — có thể tái dùng ý tưởng, nhưng SHA-256 trần **không phù hợp** cho mật khẩu người dùng
(không có salt, không có work factor).

---

## Q1 — Gói nào được dùng mật khẩu và Google?

### Đáp án đề xuất (sự kiện để chủ sản phẩm quyết trong 30 giây)
**Có tiền lệ rõ ràng: li2 đã gate mật khẩu short link theo plan.** Nên mặc định hợp lý nhất là **tái
dùng đúng khoá `link_password`** cho chế độ Mật khẩu của artifact, và thêm một khoá mới cho Google.
Làm vậy thì không cần quyết chính sách mới: artifact thừa hưởng chính sách đang bán.

Ba lựa chọn, kèm hệ quả kỹ thuật:

| Lựa chọn | Việc phải làm | Rủi ro |
|---|---|---|
| **A. Tái dùng `link_password`** | không migration plan, chỉ gọi `ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_PASSWORD)` ở service artifact | gói nào đang có `link_password` thì tự động có mật khẩu artifact — **chưa xác minh được gói nào** (xem Còn mở) |
| **B. Khoá mới `artifact_password`** | thêm vào `ADVANCED_FEATURE_KEYS`, cột mới trong bảng `plans`, cập nhật dữ liệu từng gói | đụng bảng `plans` — ngoài phạm vi "không migration" của intent |
| **C. Cho free** | không gate gì | lệch thị trường (0/23 cho free theo research) và lệch chính sách nội bộ đang áp cho short link |

Chế độ **Private** (thành viên cùng org) **không nên gate** — nó không phải tính năng cao cấp mà là
mặc định an toàn; gate nó nghĩa là bán quyền "không rò rỉ NDA".

### Bằng chứng
- `LINK_PASSWORD: 'link_password'` là một **advanced feature key đã tồn tại**:
  `src/shared/types/plan-permission.ts:34`, cùng nhóm với `LIMIT_ACCESS:33` và `LINK_EXPIRATION:35`.
  Cả ba hợp vào `PLAN_LIMIT_KEYS` (`plan-permission.ts:67-71`).
- **Cưỡng chế phía server** khi tạo/sửa touch point: `src/core/services/touch-point.service.ts:1644-1648`
  ```ts
  if (_accessControl.password) {
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.LINK_PASSWORD, {
      errorMessage: "This organization doesn't allow link password",
    })
  }
  ```
- **Gate phía UI** ở ba nơi:
  - `src/features/short-links/components/short-link-form/index.tsx:81` — `password_protection: ADVANCED_FEATURE_KEYS.LINK_PASSWORD`
  - `src/features/touch-points/components/touch-point-detail-advanced/menu.tsx:161` — `planKey: ADVANCED_FEATURE_KEYS.LINK_PASSWORD`
  - `src/features/touch-points/hooks/use-plan-features.ts:49` — `orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.LINK_PASSWORD)`
- Cơ chế so khớp: `advanced_features_allowed` là **mảng chuỗi** trên gói
  (`src/shared/lib/agent/paseto.ts:35` ghi rõ "list track (link_password, link_expiration, …)"), và
  `checkOrgLimitation` xử lý nhánh mảng tại `src/shared/lib/plan/check-plan.ts:57-63`.
- Có test hồi quy cho đúng đường này:
  `src/__tests__/integration/agent/create-short-link.test.ts:310` —
  *"bubbles a PlanError from createTouchPoint when the org lacks link_password"*.

**Mức chắc chắn:** đọc được cho sự tồn tại và cách cưỡng chế của `link_password`.

### Còn mở
- **Gói nào thực sự bật `link_password` thì KHÔNG tìm thấy trong repo.** Giá trị nằm ở dữ liệu bảng
  `plans` trong Supabase, không ở code: `grep -rln "link_password" supabase/ src/` chỉ trả về
  `src/shared/types/plan-permission.ts`, `src/shared/lib/agent/paseto.ts` và một file test — **không
  có migration hay seed nào gán giá trị**. Muốn biết Free có hay không phải truy vấn DB (ngoài phạm
  vi chỉ-đọc-code của tôi).
- Đây vẫn là **quyết định sản phẩm**: tôi không chọn thay.

---

## Q8 — `/download` có áp cùng cổng không? Ba route có dùng chung một hàm resolve không?

### Đáp án đề xuất
**Có, nên áp cùng cổng cho cả ba** — và về mặt kỹ thuật việc này dễ hơn tưởng vì **cả ba route đều đi
qua `resolveTargetByToken`**. Nhưng **đặt cổng bên trong `resolveTargetByToken` thì KHÔNG đủ**, vì hai
lý do cụ thể bên dưới. Cổng nên là một hàm riêng (nhận `request` + `target`) mà mỗi route gọi ngay sau
khi resolve.

Về "xem được nhưng không tải được": **không nên làm đợt này**. Nó là một trục quyền khác (`can_download`)
chứ không phải một `access_mode`, và `/a/<token>` cho `inline-binary` đã phục vụ nguyên byte — chặn
`/download` mà vẫn mở `/file` chỉ là cản trở hình thức, không phải kiểm soát.

### Bằng chứng

**1. Ba route, hai điểm vào, một hàm gốc.**
- `src/app/(artifact)/a/[token]/route.ts:48` → `artifactServeService.resolveTargetByToken(params.token)`
- `src/app/(artifact)/a/[token]/file/route.ts:18` → `artifactServeService.getLiveTargetByToken(params.token)`
- `src/app/(artifact)/a/[token]/download/route.ts:19` → `artifactServeService.getLiveTargetByToken(params.token)`

Và `getLiveTargetByToken` chỉ là lớp mỏng bọc hàm kia
(`src/core/services/artifact-serve.service.ts:148-151`):
```ts
async getLiveTargetByToken(token: string): Promise<ArtifactServeTarget | null> {
  const lookup = await this.resolveTargetByToken(token)
  return lookup.outcome === 'live' ? lookup.target : null
}
```
→ `resolveTargetByToken` (`artifact-serve.service.ts:110-139`) là **chokepoint duy nhất** cho việc tra
token của cả ba đường.

**2. Vướng thứ nhất — có một đường tra token thứ hai, song song.**
`getLiveContentByToken` (`artifact-serve.service.ts:73-90`) **tự** gọi `findByServeToken` và **tự**
kiểm `status !== 'live'`, **không** qua `resolveTargetByToken`:
```ts
if (!SERVE_TOKEN_PATTERN.test(token)) return null
const artifact = await this.deps.repo.findByServeToken(token)
if (!artifact || artifact.status !== 'live') return null
```
Nó được `/a/<token>` gọi ở `route.ts:80` cho nhánh HTML. Trong luồng hiện tại điều này vô hại vì
`route.ts:48` đã resolve trước đó, nhưng **nếu đặt cổng vào `resolveTargetByToken` thì đường này lọt**.

**3. Vướng thứ hai — chữ ký hàm không có request.**
`resolveTargetByToken(token: string)` chỉ nhận token. Cổng cần đọc cookie phiên người xem và cần nhận
mật khẩu POST → phải có `NextRequest`. Nên cổng **không thể** nằm trong hàm này mà không đổi chữ ký
(và kéo `next/headers` vào `src/core/`, phá ranh giới core/app mà `li2-app/CLAUDE.md` đặt ra).

**4. `removed` → 410 chỉ có ở route gốc; hai route còn lại cố ý trả 404.**
`route.ts:64-66` trả `410` với `removedPage(...)`. Comment tại
`artifact-serve.service.ts:141-147` giải thích vì sao `/file` và `/download` **phải** tiếp tục trả 404
cho artifact đã gỡ: *"the object is gone from the bucket, so there is not a byte to hand back. A 410
there would promise a body the route cannot produce."* Ràng buộc "removed → 410 trước mọi cổng" trong
intent vì vậy chỉ đúng cho `/a/<token>`; hai route kia giữ 404.

**5. Thứ tự kiểm hiện có trong `resolveTargetByToken`** (`:111-127`): hình dạng token (không chạm DB) →
không có hàng → `status === 'removed'` → status khác `live` → `isArtifactUploadKind`. Cổng mới phải
chèn **sau** toàn bộ chuỗi này, khớp ràng buộc ưu tiên trạng thái của intent.

**Mức chắc chắn:** đọc được toàn bộ. **Chưa đo** runtime.

### Còn mở
- `/a/<token>/file` xử lý Range (`file/route.ts` 40 dòng) — cần kiểm xem áp cổng có làm gãy video seek
  khi phiên hết hạn giữa lúc phát không. Tôi chưa thử nghiệm.

---

## Q3 — Phiên người xem sống bao lâu?

### Đáp án đề xuất
**Dùng cookie phiên (session cookie, không `maxAge`), ký bằng `jose` HS256, scope `path=/a/<token>`** —
và **không** đặt hạn 24 giờ hay 7 ngày. Lý do: cả hai tiền lệ mạnh nhất trên thị trường đều **không
dùng hạn theo thời gian**, mà dùng "một lần cho mỗi nội dung, hết hiệu lực khi đổi mật khẩu" (Vercel)
hoặc "sống theo phiên trình duyệt" (Dub). Thêm hạn 24h chỉ tạo một tham số phải giải thích cho người
quét QR mà không tăng bảo mật đáng kể, vì vector thật là **link bị chuyển tiếp**, không phải cookie bị
giữ quá lâu.

Nếu vẫn muốn một con số: **đặt `exp` trong JWT là 12 giờ** và coi nó là van an toàn, không phải tính
năng. Nói rõ trong copy rằng đổi mật khẩu sẽ cắt phiên (xem Q5).

### Bằng chứng — tiền lệ ngoài

**Vercel Password Protection** (https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection,
`last_updated: 2026-09-15`) — bảng "What to know before enabling", nguyên văn:
> **Password Persistence** — "Users only need to enter the password once per deployment, or when the
> password changes, due to cookie set by the feature being invalidated on password change"

> **Token Scope** — "JWT tokens set as cookies are valid only for the URL they were set for and can't
> be reused for different URLs, even if those URLs point to the same deployment"

→ Không có thời hạn nào được công bố. Cơ chế hết hiệu lực duy nhất là **đổi mật khẩu**. Và token được
**scope theo URL**, không dùng lại cho URL khác — đúng mô hình `path=/a/<token>` cho li2.

**Dub** — đọc mã nguồn, không phải doc:
`dubinc/dub` `apps/web/app/password/[linkId]/action.ts` (nhánh mặc định):
```ts
const validPassword = password === realPassword;
if (validPassword) {
  (await cookies()).set(`dub_password_${link.id}`, password, {
    path: `/${link.key}`,
    httpOnly: true,
    secure: true,
  });
  return true;
}
```
→ **Không có `maxAge` và không có `expires`** ⇒ đây là **session cookie**, chết khi đóng trình duyệt.
`path` scope theo từng link. Rate limit `ratelimit(30, "10 m")` chỉ chạy ở **nhánh sai mật khẩu**.

Lưu ý: Dub cũng **lưu và so sánh plaintext** (`password === realPassword`) và **ghi chính mật khẩu thô
vào cookie**. Phía middleware: `apps/web/lib/middleware/link.ts:237-244` đọc
`req.cookies.get(\`dub_password_${linkId}\`)` rồi so `getLinkViaEdge(...)?.password !== pw`. Dub còn
cho **bỏ qua form bằng query param** `?pw=` (ghi trong help article
https://dub.co/help/article/password-protected-links). Tức là mô hình li2-be hiện tại không lệch chuẩn
ngành bằng mức tôi tưởng — nhưng cả hai đều yếu, và đó không phải lý do để sao chép.

### Bằng chứng — li2-app đã có đủ công cụ, không cần phụ thuộc mới
- `jose@6.0.8` có trong `package.json:90`.
- **Tiền lệ sẵn trong repo**: `src/app/api/organizations/[org_id]/toolbar-session/route.ts:1-27` ký
  JWT HS256 bằng secret từ env, hạn 2 giờ:
  ```ts
  const secret = new TextEncoder().encode(process.env.TOOLBAR_SESSION_SECRET!)
  const token = await new SignJWT({ org_id, user_id: context.userId, purpose: 'toolbar' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(secret)
  ```
  Đây là khuôn mẫu gần nhất để copy cho phiên người xem: cùng thư viện, cùng thuật toán, cùng kiểu
  secret-trong-env, cùng trường `purpose` để không lẫn loại token.
- `jose` còn dùng ở `src/app/(public)/auth/sso/canny/route.ts:7` và `src/shared/lib/auth/session.ts:3`.

**Mức chắc chắn:** đọc được (mã Dub, mã li2-app) và đọc được từ doc chính thức (Vercel). **Không đo**
hành vi runtime của Vercel/Dub.

### Còn mở
- Không tìm thấy tài liệu Dub nào công bố thời hạn cookie — kết luận "session cookie" là **suy ra từ
  việc thiếu `maxAge`** trong mã, đúng theo đặc tả cookie, nhưng không phải lời khẳng định của Dub.
- Chưa kiểm Notion/Google Drive.

---

## Q4 — Google cho khách: dùng gì? → **Phương án (a), và nghi ngại về Casdoor là CHÍNH XÁC.**

### Đáp án đề xuất
**(a) OAuth client Google riêng.** Nghi ngại trong intent ("Casdoor tạo *user li2* cho mỗi người đăng
nhập, biến khách thành thành viên") **đã được xác minh trên mã nguồn Casdoor**. Và li2-app đã có sẵn
`google-auth-library` cùng tiền lệ dùng `OAuth2Client`, nên (a) không thêm phụ thuộc nào.

### Bằng chứng

**1. Casdoor THẬT SỰ tạo user khi đăng nhập OAuth lần đầu.**
`casdoor/casdoor` `controllers/auth.go`, khối có comment `// Sign up via OAuth`:
- `auth.go:1116` — `user, err = getExistUserByBindingRule(providerItem, application, userInfo)`
- `auth.go:1122-1133` — nếu `user == nil` thì kiểm hai cổng:
  ```go
  if !application.EnableSignUp || !application.IsSignupAllowedFor(application.Organization) {
      c.ResponseError(... "does not exist and is not allowed to sign up as new account, please contact your IT support")
      return
  }
  if !providerItem.CanSignUp {
      c.ResponseError(... "is not allowed to sign up as new account via %s, please use another way to sign up")
      return
  }
  ```
- `auth.go:1254` — nếu qua được hai cổng: `affected, err = object.AddUser(user, c.GetAcceptLanguage())`
- `auth.go:1240-1248` — user mới còn được gán `Groups` theo `providerItem.SignupGroup` hoặc
  `application.DefaultGroup`, và `Tag` theo `application.DefaultTag`.

→ Hai kết cục, **cả hai đều sai** cho mục đích "cổng xem artifact":
- `EnableSignUp = true` → mỗi khách quét QR trở thành **một user Casdoor trong tổ chức li2**, có group
  mặc định. Đúng như intent lo.
- `EnableSignUp = false` → khách **bị chặn bằng một thông báo lỗi** ("please contact your IT support"),
  không xem được. Không phải cổng, mà là tường.

Ngoài ra `auth.go:599` và `:1150` cho thấy Casdoor **tự liên kết theo email**
(`GetUserByField(application.Organization, "email", userInfo.Email)`). Doc chính thức gọi là
"Automatic account linking": *"Casdoor can link OAuth logins to existing users by OAuth identity,
email/phone (if enabled), or username (case-insensitive)"*
(https://casdoor.ai/docs/provider/oauth/overview/). Với cổng xem artifact, auto-link theo email là
**rủi ro thêm**: một khách dùng email trùng với một user li2 có thể bị gắn vào tài khoản đó.

**2. Phương án (a) không cần phụ thuộc mới.**
- `"google-auth-library": "^10.5.0"` — `package.json:82`.
- Tiền lệ dùng: `src/infrastructure/external/integrations/google-sheets.service.ts:5,29-32`
  ```ts
  import { Credentials, OAuth2Client } from 'google-auth-library'
  this.client = new OAuth2Client({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    redirectUri: process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000',
  })
  ```
  → Khuôn mẫu env + client đã có. Cần **client ID/secret riêng** cho cổng artifact (đừng tái dùng
  client của Google Sheets: scope khác, redirect URI khác, và trộn vào nhau làm rò quyền Drive).

- Cấu hình Casdoor của li2-app nằm ở `src/shared/lib/casdoor/` (`index.ts`, `server.ts`,
  `middleware.ts`) — chỉ ba file, không có nhánh nào cho "guest provider".

**Mức chắc chắn:** đọc được (mã Casdoor upstream + mã li2-app + doc Casdoor).

### Còn mở
- Tôi đọc `controllers/auth.go` ở **nhánh mặc định** của `casdoor/casdoor`, **chưa xác minh** phiên bản
  Casdoor mà li2 đang chạy. Nếu li2 dùng bản cũ hơn, dòng số sẽ lệch (logic thì rất khó đã đổi).
- Chỉ cần scope `openid email` cho phương án (a) — chưa kiểm xem Google có yêu cầu app verification
  cho scope đó khi dùng ngoài tổ chức không.

---

## Q5 — Đổi mật khẩu / đổi chế độ có huỷ mọi phiên người xem không?

### Đáp án đề xuất
**Có, và nên làm bằng cách rẻ nhất: nhúng một dấu vân tay của mật khẩu hiện tại vào claim của JWT
phiên.** Không cần bảng phiên, không cần Redis. Khi `password_hash` đổi, dấu vân tay trong cookie cũ
không khớp nữa → mọi phiên tự chết, không phải đi thu hồi.

Đổi `access_mode` cũng nên huỷ phiên, vì phiên vốn gắn với một chế độ cụ thể.

### Bằng chứng — tiền lệ ngoài
**Vercel làm đúng việc này**, nguyên văn từ doc đã dẫn ở Q3:
> "Users only need to enter the password once per deployment, **or when the password changes, due to
> cookie set by the feature being invalidated on password change**"

và một hàng riêng:
> **Password Changes** — "Users must re-enter a new password if you change the existing one"

→ Đây là **hành vi được công bố**, không phải suy diễn. Vercel không nói họ thực hiện bằng cách nào,
nhưng việc cookie "bị vô hiệu khi đổi mật khẩu" mà không có hệ thống thu hồi ⇒ gần như chắc là
mật khẩu (hoặc dẫn xuất của nó) nằm trong chính token.

**Dub**: cookie chứa **chính mật khẩu thô** (`action.ts`, dẫn ở Q3) và middleware so cookie với mật
khẩu hiện tại ở mỗi request (`lib/middleware/link.ts:243`:
`(await getLinkViaEdge({ domain, key }))?.password !== pw`). Hệ quả: đổi mật khẩu **tự động** làm mọi
cookie cũ vô hiệu. Cùng tính chất Vercel, đạt được bằng cách thô sơ hơn.

### Phương án kỹ thuật cho li2 (KHÔNG phải quyết định của tôi)
Hai cách, cả hai đều tự huỷ, không cần thu hồi:
1. **Claim `pv` (password version)**: thêm cột `access_password_version int` tăng mỗi lần đổi; JWT chứa
   `pv`; route so `pv` trong token với cột. Rõ ràng nhất, nhưng tốn một cột.
2. **Claim `pf` (password fingerprint)**: `createHash('sha256').update(password_hash).digest('hex')`
   cắt 16 ký tự, nhúng vào token. **Không cần cột mới** — `password_hash` đổi thì `pf` đổi. Tái dùng
   `createHash` đã dùng khắp repo (ví dụ `src/core/services/api-key.service.ts:75`).

Khuyến nghị kỹ thuật: **(2)**, vì intent đã nói "không `yarn migration:push`" nhiều lần và cách này
không thêm cột nào ngoài hai cột đã dự kiến (`access_mode`, `password_hash`).

**Mức chắc chắn:** đọc được (doc Vercel, mã Dub). Phần phương án cho li2 là **suy ra** — chưa có mã.

### Còn mở
- Với chế độ **Google**, "đổi chế độ" nghĩa là gì cho một phiên đã xác thực email? Nếu chuyển Google →
  Mật khẩu thì phiên Google phải chết; claim `pf` không bao được việc đó. Cần một claim `mode` nữa
  trong token. Tôi nêu ra, không giải.

---

## Q6 — Email người xem lưu ở đâu và hiện ở đâu?

### Đáp án đề xuất
**Đừng tạo `artifact_viewers` ngay.** li2 **đã có** một bảng danh tính khách với cột `email`, đã gắn
vào `visits`, đã có sẵn logic hợp nhất danh tính và đã nằm trong cơ chế xoá theo hạn lưu trữ của plan:
bảng **`customer_profiles`**. Dùng nó thì câu "có tính là một visit không" tự được trả lời là **có**,
và câu "cần chính sách xoá" tự được trả lời bằng `data_retention_days` đang chạy.

Chỉ tạo bảng mới nếu chủ sản phẩm muốn danh sách email **tách khỏi** CRM/conversion — vì đưa email
khách xem NDA vào cùng bảng với lead marketing là một quyết định sản phẩm, không phải kỹ thuật.

### Bằng chứng

**1. `customer_profiles` tồn tại và có `email`.** Khai báo gốc ở
`supabase/backups/migrations_old/20251231150852_create_conversion_tracking.sql:43-61`:
```sql
CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL,
    "email" text,
    "phone" text,
    "name" text,
    "external_id" text,
    ...
);
```
Schema **hiện tại** (sinh từ DB thật) giàu hơn nhiều —
`src/shared/types/database.types.ts:1584-1605` cho thấy đã thêm `is_anonymous`, `last_visit_at`,
`merged_at`, `merged_from_ids`, `merged_into_id`. Tức là bảng này **đã là hệ thống nhận dạng khách**
có hợp nhất danh tính, không chỉ là bảng lead.

**2. Đã gắn vào `visits`.** Hàm phân tích trả về `customer_profile_id` và `customer_email` cùng hàng
với dữ liệu visit:
`supabase/migrations/20260616022745_analytics__get_raw_visit_data_v4_add_customer_external_id.sql:4`
(chữ ký `RETURNS TABLE(... visitor_id, customer_profile_id, customer_name, customer_email, customer_external_id)`)
và `:111` (`cp.email as customer_email`). Tương tự cho realtime:
`supabase/migrations/20260616024814_realtime__get_realtime_data_v4_add_customer_external_id.sql:4,69`.

→ Nếu ghi email người xem vào `customer_profiles` và gắn `customer_profile_id` lên visit, thì email
**hiện ngay** trong các trang analytics đang có, không phải dựng UI mới. Đây là sự kiện quan trọng
nhất của câu này.

**3. Chính sách xoá: đã có cơ chế, chưa có chính sách riêng cho dữ liệu cá nhân.**
- `data_retention_days` là một limit theo gói: `src/shared/types/plan-permission.ts:9`, hiển thị cho
  người dùng ở `src/features/billing/components/billing-page.tsx:49`
  (`t('feature.retention', { days: plan.data_retention_days })`).
- Có cronjob dọn theo hạn: `supabase/migrations/20260623000002_retention__update_system_cronjobs.sql:1-13`
  — job `task:partition:cleanup`, comment nguyên văn *"per-org retention cleanup + drop empty
  partitions"*, crontab `0 2 * * *`.
- **KHÔNG tìm thấy** chính sách xoá dữ liệu cá nhân theo yêu cầu (right to erasure):
  `grep -rln "GDPR|right to erasure|delete_account|anonymize" src/ supabase/migrations/` chỉ trả về
  `src/features/touch-points/components/touch-point-detail-advanced/menu.tsx:271`
  (`{ key: 'gdpr_privacy', label: 'GDPR Privacy', Component: UtmSection }` — một mục trong menu nâng
  cao của touch point, **không phải** chính sách xoá) và một migration deep-link không liên quan.

→ Ràng buộc "cần chính sách xoá" trong intent là **việc chưa có ai làm**, không phải việc cần nối vào
cái sẵn có.

**4. Bảng `artifacts` hiện không có cột nào cho việc này.** `CHECK` của bảng:
`supabase/migrations/20260928000001_artifacts__create.sql:44-47` (`kind` ∈ html/markdown/pdf/site;
`status` ∈ draft/scanning/live/blocked/expired/quarantined), nới thêm `removed` ở
`supabase/migrations/20261001000001_artifacts__removed_status.sql`. Không có `access_mode`,
không có `password_hash` — đúng như intent nói.

**Mức chắc chắn:** đọc được cho mục 1, 2, 4. Mục 3 là **đọc được** cho cái đang có và **"không tìm
thấy"** (đã chạy grep, không có kết quả) cho chính sách xoá.

### Còn mở
- `customer_profiles` có `organization_id NOT NULL`. Khách xem artifact thuộc org của người tạo — hợp
  lý, nhưng nghĩa là **email khách trở thành dữ liệu của org đó**, kể cả khi họ chỉ xem một file. Cần
  chủ sản phẩm xác nhận đây là điều mong muốn.
- Khai báo bảng tôi dẫn nằm trong `supabase/backups/migrations_old/` — tôi **không** dùng nó làm nguồn
  cho schema hiện tại, chỉ để chứng minh nguồn gốc; schema hiện tại tôi lấy từ `database.types.ts`
  (sinh từ DB). Nhưng `database.types.ts` có thể lỗi thời nếu chưa `yarn gen:types`.

---

## Q7 — Private với người không thuộc org: trang từ chối nói gì?

### Đáp án đề xuất
**Không dùng `/forbidden` của app.** Người quét QR không ở trong vỏ dashboard, không có router
client-side, và trang `/forbidden` hiện tại là một React client component chỉ có tiếng Anh với nút
"Back to Home" — ba điều đều sai cho bối cảnh này. Dựng một trang từ chối riêng bằng `landingShell()`,
cùng khuôn với trang bia mộ 410, hai ngôn ngữ.

Nội dung nên nói **ba điều và không hơn**: (1) nội dung này chỉ dành cho thành viên của tổ chức sở
hữu; (2) bạn đã đăng nhập với email `<email>` nhưng email đó không thuộc tổ chức đó; (3) cách thoát:
liên hệ người gửi link, hoặc đổi tài khoản. **Không** nêu tên artifact, **không** nêu tên tổ chức — 
cùng nguyên tắc mà trang bia mộ đã tự áp cho mình.

### Bằng chứng

**1. Trang `/forbidden` hiện có không dùng được ở đây.** `src/app/forbidden/page.tsx` — toàn bộ file:
- dòng 1: `'use client'`
- dòng 4 + 7: `import { useRouter } from 'next/navigation'`, `const router = useRouter()`
- dòng 18: `<h1 ...>Access Forbidden</h1>` — **hard-code tiếng Anh**, không qua i18next
- dòng 20-22: `"Sorry, you don't have permission to access this page."`
- dòng 24: `Error code: 403`
- dòng 27-32: nút `onClick={() => router.push('/')}` — **"Back to Home"**, đưa khách lạ vào dashboard
- dòng 38-41: footer `© ... Li2.ai. All rights reserved.`

Ràng buộc của intent nói rõ copy cổng artifact **không** đặt vào `public/lang/` vì route không chạy
i18next; trang này cũng không chạy i18next, nhưng nó là client component — không khớp với route
handler trả HTML thô.

**2. Lỗi mà `ensureOrgMember` ném là `PermissionError`, HTTP 403.**
- `src/shared/lib/permission/permissions.ts:103-108`:
  ```ts
  export async function ensureOrgMember(org_id: string): Promise<void> {
    const result = await getUserOrgPermissions(org_id)
    if (!result) {
      throw new PermissionError('You are not a member of this organization')
    }
  }
  ```
- `PermissionError` → `src/infrastructure/response/errors/domain.errors.ts:6-19`:
  `super(message, 403, 'PERMISSION_ERROR', { key: 'common:messages.error.permission_error', ... })`.
  Mã lỗi `PERMISSION_ERROR`, khoá i18n `common:messages.error.permission_error`.
- Có một lớp lỗi 403 thứ hai, `ForbiddenError` (`domain.errors.ts:115-126`, mã `FORBIDDEN`, khoá
  `common:messages.error.forbidden`). **Hai lớp cùng trả 403** — nếu route artifact ném lỗi, cần chọn
  một cách có chủ ý thay vì chọn bừa.
- `getPermissionScopeOrThrow` và `ensurePolicy` **tồn tại** trong
  `src/shared/lib/permission/permissions.ts` (được import ở
  `src/__tests__/unit/permission/agent-permissions.test.ts:32-34`), nhưng chúng dành cho RBAC chi tiết
  theo policy, không cần cho chế độ Private — `ensureOrgMember` là đúng độ hạt.

**3. Có cảnh báo lịch sử rất đáng đọc trước khi dùng `ensurePolicy` ở route công khai.**
`src/__tests__/unit/permission/agent-permissions.test.ts:6-8` ghi lại một sự cố thật: hàm
`getUserOrgPermissions` *"...so it returned undefined -> ensurePolicy DENIED -> every write 403'd in
prod"* khi không có browser session. Chế độ Private của artifact **chính là** bối cảnh "không có
browser session thông thường" (route nằm ngoài middleware). Phải kiểm `getSession()` trong route
handler Node trước, rồi mới gọi `ensureOrgMember`.

**4. Các trang lỗi khác của app**: `src/app/error.tsx`, `src/app/not-found.tsx`,
`src/app/(protected)/org/[org_id]/error.tsx`. Không có trang nào thuộc nhóm route `(artifact)`.

**Mức chắc chắn:** đọc được toàn bộ. Nội dung copy đề xuất là **ý kiến**, không phải bằng chứng.

### Còn mở
- Để nói được "bạn đã đăng nhập với email X", route phải đọc được email từ session Casdoor. Cookie
  Casdoor là `sameSite: 'none'` và `/a/` **cố ý không đọc nó** (theo intent, `middleware.ts:38`). Tôi
  **chưa xác minh** `getSession()` gọi trong route handler `(artifact)` có đọc được cookie đó hay
  không — đây là điểm cần thử nghiệm thật trước khi hứa hiển thị email. `getSession` ở
  `src/shared/lib/auth/session.ts`, token đọc từ cookie `casdoor_access_token`
  (`src/infrastructure/database/supabase/jwt.ts:15`).

---

## Tổng kết độ chắc chắn

| Câu | Trạng thái | Nguồn mạnh nhất |
|---|---|---|
| Q1 gói nào | **Sự kiện đủ, quyết định để ngỏ** | `plan-permission.ts:34`, `touch-point.service.ts:1644` |
| Q2 li2-be | **Xác minh được, đọc được mã** | `touch-point.service.go:371-404`, `authentication.html:628` |
| Q3 phiên | **Trả lời được** | doc Vercel + mã Dub + `toolbar-session/route.ts` |
| Q4 Google | **Trả lời được, nghi ngại đúng** | `casdoor/controllers/auth.go:1122-1254` |
| Q5 huỷ phiên | **Trả lời được (tiền lệ), phương án là suy ra** | doc Vercel (công bố rõ) |
| Q6 email | **Trả lời được, có phát hiện bất ngờ** | `database.types.ts:1584-1605`, migration analytics v4 |
| Q7 trang từ chối | **Trả lời được, còn một ẩn số** | `src/app/forbidden/page.tsx`, `permissions.ts:103-108` |
| Q8 download | **Trả lời được, có hai vướng** | `artifact-serve.service.ts:73-151` |

**Việc chưa làm:** không chạy app, không gọi li2-be thật, không truy vấn Supabase. Mọi kết luận là từ
đọc mã nguồn và tài liệu chính thức. Ba chỗ cần nghiệm thu thật trước khi code:
`getSession()` trong route `(artifact)` (Q7), Range request khi phiên hết hạn (Q8), và gói nào bật
`link_password` (Q1).

---

## Phụ lục Q1 — hai số liệu thị trường từ nguồn sơ cấp

Research nói "0/23 ở gói free". Tôi xác minh được hai trường hợp cụ thể, từ doc chính thức:

- **Vercel Password Protection**: *"Availability: Password Protection is available on Enterprise and
  Pro plans"*. Bảng giá cùng trang: **Hobby — "Not available", "Upgrade to Pro to enable Password
  Protection"**; Pro **$20/tháng cho mỗi project được bảo vệ**; Enterprise bao gồm sẵn.
  (https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection)
  → Đáng chú ý: Vercel tính tiền **theo từng project được bật**, không phải một lần cho cả gói. Nếu
  li2 muốn mô hình đó cho artifact, nó sẽ là tính tiền theo từng artifact — gần như chắc là quá nặng
  cho một tính năng mà lý do tồn tại là "đừng rò tài liệu NDA".

- **Dub**: *"Password protection is only available on Pro plans and above"*
  (https://dub.co/help/article/password-protected-links)

→ Cả hai khớp với kết luận "không ai cho free". Nhưng cả hai cũng là **công cụ cho developer/
marketer**, nơi người trả tiền là người tạo link. Trường hợp FPT trong phần Problem là **người trả
tiền tự bảo vệ tài liệu của chính mình** — nếu gate mật khẩu sau Pro, tình huống đã xảy ra hôm nay sẽ
vẫn xảy ra với mọi org đang ở gói thấp hơn. Đó là sự căng thẳng mà chủ sản phẩm cần cân, không phải
tôi.
