# Trả lời 7 câu hỏi mở — `mcp-publish-artifact.md`

Nguồn: đọc code `li2-app` nhánh `feat/artifact` (HEAD `65773790`), ngày 2026-10-04.
Mức chắc chắn dùng ba nhãn: **đọc được** (có file:line), **đo được** (đã chạy lệnh), **suy ra** (ghép
từ nhiều chỗ, không có một dòng nào nói thẳng).

---

## Q1. Tool trả về gì chính xác? Có trả ảnh QR base64 không?

**Đáp án đề xuất.** Trả **một text block chứa JSON**, đúng khuôn của 9 tool hiện có — không
`structuredContent`, không `image` content. Trường nên trả: `artifact_id`, `serve_url`, `short_url`,
`qr_url` (tức `path_qr_code`), `status`. **Không** base64 QR trong v1.

Lý do mạnh nhất: `ArtifactDTO` *đã có sẵn đủ cả bốn trường này* — không phải thiết kế mới, chỉ là
chọn chiếu ra tool.

**Bằng chứng.**
- Khuôn trả về duy nhất của mọi tool: `src/core/mcp/call-tool.ts:84-90`
  ```ts
  export type McpToolResult = {
    content: { type: 'text'; text: string }[]
  }
  function toToolResult(payload: unknown): McpToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(payload) }] }
  }
  ```
  Comment ngay trên đó (`:78-83`) nói rõ **không** có `structuredContent` vì v1 không publish
  `outputSchema`, và spec buộc hai thứ đi kèm nhau.
- Không có `outputSchema` cho bất kỳ tool nào: `src/core/mcp/tools.ts:38-39` ("NOT DONE IN v1:
  `outputSchema`").
- Tool ghi duy nhất hiện có (`create_short_link`) trả **4 trường phẳng, không ảnh**:
  `src/shared/schemas/agent-tools.ts:203-208` → `{ id, short_url, slug, name }`. Route xác nhận cùng
  shape: `src/app/api/agent/tools/create-short-link/route.ts:16-17, 34-40`.
- `ArtifactDTO` đã mang đủ thứ cần trả: `src/core/types/artifact.type.ts:287-320` →
  `id`, `serve_token`, `serve_url`, `download_url`, `short_url`, `path_qr_code`, `status`,
  `touch_point_id`, `size_bytes`.
  `short_url` + `path_qr_code` đến từ touch point nhúng: `src/core/services/artifact.service.ts:52`
  (`EmbeddedTouchPoint = Pick<Tables<'touch_points'>, 'short_url' | 'path_qr_code'>`).
- SDK **có** hỗ trợ `image` content type: `@modelcontextprotocol/sdk` bản cài là **1.30.0**
  (`node_modules/@modelcontextprotocol/sdk/package.json`, khai báo `^1.30.0` ở `package.json:29`);
  `ImageContentSchema` với `type: z.ZodLiteral<"image">` tại
  `node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts:1934-1935`, và `image` nằm trong union
  `content` của `CallToolResultSchema` (`:2501`, `:2527`).

**Mức chắc chắn.** Khuôn trả về và DTO: **đọc được**. SDK hỗ trợ `image`: **đọc được**
(schema có thật, phiên bản đã xác minh bằng `node -e` đọc `package.json` của SDK).

**Còn mở.**
- Trả `image` là **khả thi về kỹ thuật** nhưng sẽ là tool đầu tiên phá khuôn `toToolResult` —
  cần một hàm riêng, và `McpToolResult` phải nới union. Chi phí kiến trúc thật, không phải chi phí SDK.
- `path_qr_code` là path hay URL tuyệt đối, và nó có public-readable không (nếu bucket private thì
  agent nhận về một link chết) — **chưa xác minh**.

**Tiiny Host trả gì — tra được một phần, nguồn thứ cấp.**
- `https://api-docs.tiiny.host/` đã fetch: **không** nói gì về MCP server. Chỉ là getting-started của
  REST API (API key, pricing tier). Không có response schema.
- Qua web search: MCP server `https://mcp.tiiny.host` (OAuth qua tài khoản, mọi gói kể cả free), tool
  publish/update/delete, và **trả về một live URL** — không có bằng chứng nào nói nó trả ảnh hay QR.
  URL **ổn định qua các lần update** (update in-place, không sinh địa chỉ mới) — khác li2 ở chỗ này.
- REST tương đương: `POST https://ext.tiiny.host/v1/upload` với `x-api-key` + `files=@dist.zip` +
  `domain=...` trả URL `.tiiny.site`; `PUT` cùng domain để thay.
- ⚠ **Hai nguồn mâu thuẫn, báo cả hai:** một trang so sánh của đối thủ
  (`dropthis.app/blog/tiiny-host-alternatives/`) khẳng định các gói trả phí của Tiiny Host "không
  expose API hay MCP server có tài liệu" — trái với chính tài liệu và thông cáo ra mắt của Tiiny Host.
- ⚠ **Đừng lẫn với `thinhost-mcp`** — một project KHÁC, cũng xuất hiện trong kết quả tìm, có tool
  `publish_website` với return shape ghi rõ (`url`, `id`, `slug`, `title`, số page/asset). Không phải
  Tiiny Host.
- Mức chắc chắn: **suy ra từ nguồn thứ cấp** (press release + trang use-case + search snippet), không
  phải từ tài liệu kỹ thuật chính thức. Chưa ai gọi thật `mcp.tiiny.host` để xem payload.
  Nguồn: [api-docs.tiiny.host](https://api-docs.tiiny.host/),
  [host-claude-artifact](https://tiiny.host/use-case/host-claude-artifact/),
  [press release](https://www.recorderonline.com/online_features/press_releases/tiiny-host-launches-mcp-server-bringing-instant-web-publishing-to-claude-and-other-ai-assistants/article_cedf7781-03c2-56f7-9b42-79ee7aae4c7d.html),
  [thinhost publish_website](https://glama.ai/mcp/servers/thinhost/thinhost-mcp/tools/publish_website).

**Một chênh lệch năng lực đáng ghi.** Tiiny Host có **update in-place giữ nguyên URL**; intent này
loại update-in-place khỏi phạm vi ("Không làm"). Nghĩa là với use case "sửa nội dung rồi đăng lại" —
chính use case nêu ở phần Problem ("Mỗi lần sửa nội dung lại lặp từ đầu") — li2 v1 sẽ **tạo artifact
mới + short link mới + QR mới**, trong khi QR đã dán lên vật lý. Đây là một mâu thuẫn giữa Problem và
Phạm vi, không phải một câu hỏi mở đã nêu.

---

## Q2. Có cho agent truyền `slug` / `domain_id` không?

**Đáp án đề xuất.** **Có, cả hai** — vì cả hai đã là tham số của `publish()` hôm nay, và `slug` đã
được tool ghi hiện có mở cho agent. Không mở ra cái gì mới.

**Bằng chứng.**
- `publish()` đã nhận đúng hai trường này: `src/core/services/artifact.service.ts:47-50`
  ```ts
  export type PublishArtifactInput = {
    slug?: string
    domain_id?: string
  }
  ```
  Dùng ở `:331-336` (`input: PublishArtifactInput = {}`).
- Tool ghi hiện có **đã** cho agent truyền `slug`: `src/shared/schemas/agent-tools.ts:151`
  (`slug: slugSchema.optional()`), mô tả cho model ở `src/core/mcp/tools.ts:241`.
- Validation slug nằm ở **`src/shared/schemas/slug.ts`**, không phải trong
  `touchPointFormCreateWithAdvanceSchema`: 6–64 ký tự (`:4-5`), regex
  `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (`:13`), blacklist prefix `['f-']` (`:6`, `:20-42`).
  `touchPointFormCreateWithAdvanceSchema` ở `src/shared/schemas/touch-points/index.ts`, và
  `domain_id` ở đó là `z.string().optional()` (`:165`, `:206`) — **không** validate là UUID, **không**
  kiểm quyền sở hữu domain ở tầng schema.
- Lưu ý drift-trap đã ghi sẵn trong code: schema tool là **nơi validate duy nhất** trên đường agent,
  `createTouchPoint` **không** parse lại — `src/shared/schemas/agent-tools.ts:154-156`.

**Mức chắc chắn.** **Đọc được** toàn bộ.

**`domain_id` KHÔNG phải cross-tenant risk — đã xác minh.** Schema để lỏng (`z.string().optional()`),
nhưng `createTouchPoint` kiểm quyền sở hữu, **scope theo `orgId`**:
`src/core/services/touch-point.service.ts:963-970`
```ts
if (validatedData.domain_id) {
  const result = await domainService.findActiveDomainOrThrow(orgId, validatedData.domain_id)
  ...
  validatedData.domain_id = defaultDomain.id
}
```
Agent truyền `domain_id` của org khác thì throw. Mức chắc chắn: **đọc được**.

**`publish()` DÙNG `touchPointFormCreateWithAdvanceSchema` — nên validation slug/domain là dùng chung
với UI, không phải đường riêng.** `src/core/services/artifact.service.ts:373-385`: safeParse với
`content_type: ARTIFACT`, `content_value: serveUrl`, rồi spread `input.slug` / `input.domain_id` chỉ
khi có. Comment `:365-370` (tiếng Việt) giải thích vì sao dùng `safeParse` chứ không `.parse`: ZodError
không phải BaseError nên `with-auth` bọc thành AppError 500 — slug sai định dạng mà người dùng nhận
"lỗi hệ thống". Đổi sang 400 tại chỗ thay vì sửa `with-auth` (chạy cho mọi route).
→ **Tool mới không cần validation slug riêng.** Đi qua `publish()` là thừa hưởng nguyên bộ.

**Còn mở.**
- `slugSchema` kết thúc bằng `.or(z.literal('')).transform(...)` (`:43-44`) → chuỗi rỗng thành
  `undefined`. Với agent thì đây là hành vi tốt (coi như không truyền), nhưng cần biết trước.

---

## Q3. Khi org đã 3/3 live: từ chối thẳng, hay tạo draft?

**Sự kiện (không phải phán quyết).** Hành vi hiện tại **không phải** "create cho tạo draft khi hết
slot" theo nghĩa `create` biết về slot rồi quyết định. Thực tế là: **`create` không kiểm trục
live-count chút nào**; trục đó chỉ tồn tại trong `publish()`.

**Bằng chứng.**
- `create()` kiểm **trục byte, không kiểm trục live-count**, và comment nói rõ đó là cố ý:
  `src/core/services/artifact.service.ts:271-285`
  ```
  const usedBytes = await this.deps.repo.sumSizeBytesByOrg(orgId)
  if (usedBytes + buffer.byteLength > ARTIFACT_QUOTA_FREE_BYTES) throw storageQuotaExceeded()
  ```
  rồi `:274-285`: "The live-count axis is deliberately NOT checked here — only in `publish()`" —
  lý do là để giữ workflow thay thế an toàn (upload bản mới, xem, rồi mới hạ bản cũ). Cái giá được
  nhận biết: org hết slot tích luỹ draft, bị chặn bởi trục byte.
- `publish()` mới là chỗ refuse: `:347-361`, dùng `>=` vì publish này sắp thêm một slot, và
  `publishIfWithinQuota` là guarantee thật (check trước đó không đáng tin vì race qua li2-be).
- `publish()` còn một guard đứng trước quota: artifact đã `live` thì `ConflictError`
  (`:342-345`).
- Hằng số: `ARTIFACT_QUOTA_FREE_LIVE = 3` (`src/core/types/artifact.type.ts:271`),
  `ARTIFACT_QUOTA_FREE_BYTES = 30MB` (`:272`), `ARTIFACT_MAX_BYTES = 10MB` (`:18`).
  Comment `:264-270`: 30MB / 10MB = 3 đúng bằng live count, nên hai trục hết cùng lúc — và một test
  pin `BYTES / MAX_BYTES >= LIVE`.

**Hai phương án.**
1. **Từ chối thẳng, không để lại gì.** Tool làm create + publish trong một lời gọi; nếu publish fail
   vì quota thì rollback artifact vừa tạo (hoặc không tạo trước khi biết còn slot). Agent nhận lỗi
   đọc được: "3/3 live, cần xoá một cái". Giá: một pre-check live-count mới trên đường MCP — thứ mà
   `create()` cố tình không có, nên là **lệch khỏi** thiết kế hiện tại.
2. **Để nguyên hành vi: tạo rồi publish fail → còn lại draft.** Không thêm dòng code gate nào, dùng
   đúng `create` + `publish`. Giá: đúng như intent lo — agent không có UI để publish sau, và draft
   ăn vào 30MB. Nhưng draft **không** vô hình: nó hiện trong dashboard như mọi artifact
   (`listForOrg` ở `src/app/api/organizations/[org_id]/artifacts/route.ts:18-29`), và DELETE tồn tại
   (comment `:284` nói "recoverable, because DELETE exists"). Người dùng mở li2 xoá một cái rồi
   publish tay — tức draft là *degraded*, không phải *dead*.

**Hành vi khi publish fail — đã xác minh, và nó trả lời luôn câu "rollback".**
`src/core/services/artifact.service.ts:396-397` nói thẳng:
```
// If this throws (plan limit, blacklisted url, slug taken) the artifact stays `draft` and the
// error propagates — nothing to roll back, and a retry is a plain second publish.
```
Tức **phương án 2 là hành vi hiện tại, đã được thiết kế có ý thức**, không phải tai nạn. Retry chỉ là
publish lần hai, idempotent ở mức "artifact vẫn còn, thử lại được".

Hai tầng refuse của trục live-count:
- Pre-check rẻ: `:362-363` → `countLiveByOrg` >= 3 → `liveQuotaExceeded()`, **chưa mint touch point**.
- Guarantee: `:402-407` `publishIfWithinQuota` — đếm và ghi trong **một Postgres function giữ advisory
  lock per-org**, nên hai publish song song không cùng thấy một count.
- Nếu pre-check pass mà `publishIfWithinQuota` vẫn refuse (race): `:415-418`
  `discardMintedTouchPoint` **xoá touch point vừa mint** rồi mới throw — vì để lại sẽ có short link +
  QR trong danh sách org trả 404, và không gì nối lại được với artifact nên DELETE cũng không chạm tới.
  (Liên quan trực tiếp memory `short-link-chet-khong-tra-404`.)

**Mức chắc chắn.** Hành vi hiện tại và cơ chế refuse: **đọc được**. Hai phương án: **suy ra**.

**Còn mở.** Phương án 1 (từ chối thẳng, không để lại draft) cần một đường xoá artifact khi publish
fail. `discardMintedTouchPoint` xoá *touch point*, không xoá *artifact* — nên vẫn phải viết mới, hoặc
đảo thứ tự thành "pre-check live-count trước khi upload", thứ mà `create()` cố tình không làm (`:274`).

---

## Q4. Rate limit riêng cho tool này?

**Đáp án đề xuất.** **Không cần thêm gì.** Rate limit per-call đã có sẵn và chạy cho **mọi** tool,
kể cả tool mới, không cần một dòng code nào.

Đây là sự kiện bất ngờ nhất trong cả bảy câu: intent viết "Rate limit riêng cho tool này?" như thể
chưa có gì, nhưng `src/core/mcp/rate-limit.ts` dài **499 dòng** và đã được gọi trong đường
`tools/call`.

**Bằng chứng.**
- File tồn tại: `src/core/mcp/rate-limit.ts` (499 dòng).
- Hai cửa sổ fixed-window trên Redis: `:111-114`
  ```ts
  export const MCP_RATE_LIMIT_WINDOWS: readonly McpRateLimitWindow[] = [
    { name: 'burst', seconds: 60, maxCalls: 60 },
    { name: 'sustained', seconds: 3600, maxCalls: 1000 },
  ]
  ```
- Được **consume trên mỗi tool call**, và **trước** cả scope check:
  `src/app/api/mcp/route.ts:317` (`const verdict = await consumeMcpRateLimit(identity)`), với comment
  `:314-316` nói rõ đặt trước scope check là cố ý.
- Key là **(user, client)**, cố tình **không** có `orgId`: `:118-121` + header `:22-31` — vì `org_id`
  là tool argument, key theo org thì client chỉ cần đổi `org_id` để có counter mới, và `list_orgs`
  đưa luôn danh sách.
- Redis chết → **fail open**, có deadline + circuit breaker: header `:32-66`,
  `MCP_BREAKER_FAILURE_THRESHOLD = 5` (`:241`), `MCP_BREAKER_COOLDOWN_MS = 5_000` (`:251`).
  Có một phép đo thật ghi trong comment: lần chạy Phase 5 đầu với Redis không tới được cho
  `POST /api/mcp 200 in 60135ms` vì ioredis buffer offline queue.
- Header `:9-15` cũng nói thẳng cái quota hiện có **không** chặn volume: "`MAX_TPS_PER_MONTH` comes
  closest and it caps link CREATION only".

**Mức chắc chắn.** **Đọc được**. (60135ms là số **đo được** nhưng do tác giả code đo, không phải tôi.)

**Còn mở.** Artifact tốn **storage** chứ không chỉ DB query — 60 call/phút × 10MB là 600MB/phút đi
vào Supabase storage trước khi quota 30MB/org chặn được (vì quota kiểm *trước* khi put, nhưng body
đã nhận rồi). Rate limit hiện có đếm *số call*, không đếm *bytes*. Có cần một trục byte không —
**câu hỏi mới, chưa có đáp án trong code.**

---

## Q5. Có cần scope OAuth mới (`artifact:write`)?

**Đáp án đề xuất.** **Không.** Dùng `write` có sẵn. Thêm scope mới là thay đổi tốn kém bất thường ở
repo này vì scope list là hằng số hai phần tử bị nhiều chỗ đọc.

**Bằng chứng.**
- Scope hiện có đúng **hai** cái, liệt kê ở một chỗ: `src/core/services/mcp-oauth.service.ts:78-79`
  ```ts
  export const MCP_SCOPES = ['read', 'write'] as const
  export type McpScope = (typeof MCP_SCOPES)[number]
  ```
  Mirror ở PASETO: `src/shared/lib/agent/paseto.ts:28` (`export type AgentScope = 'read' | 'write'`).
- Mỗi tool khai `requiredScope: 'read' | 'write'`: `src/core/mcp/tools.ts:107`. `create_short_link`
  là `'write'` (`:392`); tám tool còn lại `'read'`.
- Scope **ẩn tool**, không chỉ chặn call: `src/app/api/mcp/route.ts:245-246`
  (`toolsVisibleTo`) → `tools/list` chỉ trả tool mà grant có scope; comment `:239-243` nói scope
  **không** phân cấp, và `:44` nói "a read-only connection never even [sees it]".
- Chặn khi call: `route.ts:324-329` → `insufficientScope(name, tool.requiredScope)`.
- Chữ trên trang consent, `src/app/(protected)/mcp/consent/page.tsx`:
  - `read` hiện có điều kiện (`:220`), chữ: "In any organization you belong to, limited to what your
    role already lets you [read]" (`:226`).
  - `write` là **một checkbox `name="grant_write"`** (`:248-249`), mặc định **ticked**
    (`mcp-oauth.service.ts:1026`), chữ "…one, until you disconnect. Untick for read-only access."
    (`:262`).
  - Comment `:237-245` là lý do thiết kế đáng đọc trước khi đổi: "MCP writes have NO per-action
    approval anywhere downstream, so this box is the [only control]".
  - Trang có header chống clickjacking riêng ở `next.config.mjs` (`frame-ancestors 'none'`,
    `X-Frame-Options: DENY`, `Cache-Control: no-store`, `Referrer-Policy: same-origin` — và comment
    cảnh báo `no-referrer` từng phá CSRF check, verified live 2026-07-29).

**Nếu vẫn muốn thêm scope, phải sửa những chỗ này.** `MCP_SCOPES` (`mcp-oauth.service.ts:78`),
`AgentScope` (`paseto.ts:28`), `requiredScope` của `McpToolDescriptor` (`tools.ts:107`),
`toolsVisibleTo` (`route.ts:245`), `WWW-Authenticate` challenge (`route.ts:201-202`),
`scopes_supported` trong metadata, lọc scope lúc authorize (`mcp-oauth.service.ts:1195`), và UI
consent (thêm checkbox thứ hai). **Suy ra** từ danh sách call-site, không có doc nào liệt kê.

**Mức chắc chắn.** Scope hiện có + chữ consent: **đọc được**. Danh sách chỗ phải sửa: **suy ra**.

**Còn mở.** `write` hiện là một ô duy nhất bao cả "tạo short link" và (nếu thêm) "publish artifact
ra public web". Publish artifact là **xuất bản nội dung công khai** — rủi ro khác hẳn tạo short link.
Có đáng một ô riêng vì lý do *consent honesty* chứ không vì kỹ thuật không — **câu hỏi sản phẩm,
code không trả lời được.**

---

## Q6. Giới hạn body của đường back-hop JSON là bao nhiêu?

**Đáp án: không tìm thấy giới hạn nào trong repo cho đường back-hop. Và tôi KHÔNG đo được.**

**Bằng chứng (những gì không có).**
- `grep` `bodyParser|sizeLimit|maxDuration|MAX_BODY|content-length` trên `src/app/api/`,
  `src/shared/lib/middlewares/`, `next.config.*`: **không có** giới hạn nào áp cho
  `/api/agent/tools/*`. Ba hit `content-length` duy nhất là logging bỏ qua header đó
  (`with-agent-auth.ts:127`, `with-auth.ts:47`, `with-logger.ts:26`).
- `next.config.mjs` đọc toàn bộ: **không** có `api`/`bodyParser`/`serverActions.bodySizeLimit`.
  Next 14.2.35 (`package.json:96`). `bodyParser.sizeLimit` là cấu hình của **Pages API**, không áp cho
  App Router route handler — nên mặc định 1MB của Pages **không** áp ở đây.
- Back-hop phía gọi cũng không giới hạn: `src/core/mcp/call-tool.ts:302-309` chỉ
  `JSON.stringify(forwarded)`; cái duy nhất bị bound là **thời gian**,
  `BACK_HOP_TIMEOUT_MS = 30_000` (`:73`).
- Traefik là reverse proxy (`docker-compose.dev.yml:18-27`): chỉ có label router/tls và một rule chặn
  `next-action` malformed. **Không** có middleware `buffering.maxRequestBodyBytes`. Traefik không
  giới hạn body khi không khai middleware đó.

**Bằng chứng (giới hạn duy nhất có thật, nhưng ở đường khác).** Upload artifact tay có check
layer-0 trên header, và nó **không** phải đường back-hop:
- `src/app/api/organizations/[org_id]/artifacts/route.ts:41-45` → `artifactBodyExceedsLimit(...)` →
  `PayloadTooLargeError`.
- `src/core/helpers/artifact-upload-limit.ts:21-28`: ngưỡng là
  `ARTIFACT_MAX_BYTES + ARTIFACT_BODY_HEADROOM_BYTES` = **10MB + 1MB = 11MB**.
  `ARTIFACT_BODY_HEADROOM_BYTES = 1MB` (`:8`) vì multipart boundary + part header đo được **265 byte**.
  Header **thiếu** thì **không** refuse (`:22`) — chunked request là hợp lệ, nên layer 1 (extension)
  và layer 2 (magic bytes) vẫn phải làm việc (`:17-19`).
  Lý do phải check trên header: `request.formData()` của undici nhân memory **~5×** — 10MB vào thì
  +50,7MB RSS, **đã đo** (`:12-15` và route `:36-40`).

**Mức chắc chắn.** "Không có giới hạn trong repo": **đọc được** (bằng chứng phủ định — grep + đọc
config, luôn yếu hơn bằng chứng khẳng định). Con số 11MB: **đọc được**, và có test pin nó
(`src/__tests__/unit/artifacts/upload-route.test.ts:90-107`).

**Không đo được — và tại sao.** Tôi đã thử gửi body 1/5/11/30MB tới
`https://app.example.com/api/mcp` (POST không auth, sẽ bị 401 — không ghi gì) để xem proxy có
trả 413 trước Next hay không. **Lệnh bị classifier của Claude Code từ chối** ("Interfere With
Workloads"). Chưa có số đo. Nếu cần, phép đo đó là cách duy nhất biết giới hạn thực tế của
Traefik + Node trên LiHi, và nó cần user cho phép tường minh.

**Còn mở.** Một tool artifact nhận HTML **dạng text trong JSON** sẽ đi qua `request.json()`, không
phải `formData()` — nên hệ số 5× của undici multipart **không áp**. Nhưng `request.json()` cũng buffer
toàn bộ body vào memory. Ngưỡng an toàn cho đường JSON là bao nhiêu: **chưa có bằng chứng**. Và vì
back-hop hiện **không** có check header nào, tool mới sẽ phải tự thêm một `artifactBodyExceedsLimit`
tương đương cho đường JSON — nó không được thừa hưởng gì.

---

## Q7. Audit: publish từ MCP cần ghi khác publish tay không?

**Sự kiện bất ngờ thứ hai: `artifact.service.ts` KHÔNG gọi `orgAuditLogService` một lần nào.**
Nên câu hỏi "ghi khác publish tay không" có một tiền đề sai — publish tay hiện **cũng không ghi
audit log trực tiếp**.

**Bằng chứng.**
- `grep "orgAuditLogService\|logEvent"` trên `src/core/services/artifact.service.ts`:
  **0 hit**. Trên `src/app/api/agent/tools/create-short-link/route.ts`: **0 hit**.
- Toàn bộ audit log của domain này nằm trong `src/core/services/touch-point.service.ts` (import ở
  `:45`), 7 call-site: `:1028`, `:1107`, `:1145`, `:1315`, `:1532`, `:1744`, `:1781`.
- `createTouchPoint` (bắt đầu `:865`) **có** ghi:
  `orgAuditLogService.generateChangesAndLogEvent({ module: 'touch_point', action: 'create', ... })`
  tại `:1028-1040`.
- `createBasicTp` (`:1135+`) cũng ghi, qua `logEvent` tại `:1145-1156`.

**Đã xác minh: `publish()` GỌI `createTouchPoint`.**
`src/core/services/artifact.service.ts:397` → `await this.deps.createTouchPoint(orgId, payload, userId)`.
Nên publish artifact ghi audit **gián tiếp**, dưới `module: 'touch_point'`, `action: 'create'`
(`touch-point.service.ts:1028-1040`) — tức log nói "có người tạo một touch point", **không** nói "có
người xuất bản một artifact". Không có event nào cho chính hành động publish.

Publish từ MCP sẽ ghi **y hệt**, không phân biệt được với publish tay: cả hai đổ về cùng
`createTouchPoint`, và `user_id` trong cả hai trường hợp đều là user thật — MCP mint PASETO với
`user_id: claims.userId` (`call-tool.ts:238-241`). Mức chắc chắn: **đọc được**.

**Đáp án đề xuất.** Nếu muốn phân biệt được, chỗ duy nhất đã mang thông tin đó là claim
`surface: 'mcp'` trong PASETO — nó tới được back-hop (`agent.surface`, dùng ở
`create-short-link/route.ts:50`). Cho `surface` vào `metadata` của audit event là cách nhỏ nhất, và
**không** cần thêm cột "source" vào `artifacts` (đúng ràng buộc intent).

**Mức chắc chắn.** Cả ba mệnh đề đều **đọc được**: `artifact.service` không gọi audit (grep phủ định
trên một file cụ thể), `createTouchPoint` có ghi, và `publish()` gọi `createTouchPoint`.

**Còn mở.**
- Ghi chú `log.md` 2026-09-30 nói audit log touch point **không ghi** trên LiHi, nguyên nhân chưa rõ.
  Tôi **chưa xác minh** điều này và chưa tìm nguyên nhân. Đáng chú ý: cả 7 call-site đều gọi
  **không `await`** (`orgAuditLogService.logEvent({...})` là statement trần, ví dụ `:1145`) — nếu
  promise đó reject thì là unhandled rejection, và trong Next standalone request có thể kết thúc
  trước khi insert xong. Đây là **giả thuyết**, chưa đo.
- Nếu audit log vốn không chạy trên LiHi thì mọi thiết kế audit cho tool mới là vô nghĩa cho tới khi
  cái gốc được sửa. **Cần đo trước khi thiết kế.**

---

## Phụ lục: claim `surface` — CÓ THẬT

Lead nghi ngờ claim này ("một agent trước nói có, `main` chưa thấy trong `mcp/route.ts`"). Nó có
thật, chỉ **không ở `route.ts`**:

- Mint: `src/core/mcp/call-tool.ts:252-255`
  ```ts
  // ★ The claim the whole of Phase 1b exists for: it routes the six tool routes' `ensureOrgPlan`
  // onto MCP_ACCESS instead of AI_CHAT. Drop it and every MCP call silently gates on the chat
  // entitlement.
  surface: 'mcp',
  ```
- Tiêu thụ: `src/app/api/agent/tools/create-short-link/route.ts:50`
  ```ts
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])
  ```
  với comment `:46-49`: re-gate plan mỗi call vì gate lúc mint chỉ chứng minh org **đã** có feature
  khi token (15 phút) được phát; downgrade giữa đời token phải chặn ngay.
- Bảng tra: `src/shared/lib/agent/surface-plan-gate.ts` (`SURFACE_FEATURE_KEY`).

Mức chắc chắn: **đọc được**.
