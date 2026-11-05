# Artifact — review nguyên nhân gốc và lỗi cùng lớp chưa bị phát hiện

Ngày: 2026-09-29. Phạm vi: chỉ đọc code trên `development` (chưa commit) + DB LiHi (read-only) + header thật trên `app.example.com`. Không sửa gì ngoài file này.

Hai lỗi đã sửa (MIME whitelist, header multipart) **không bàn lại**. Bên dưới là (1) cơ chế chung, (2) các lỗi cùng lớp còn nằm trong code, (3) cách ép ranh giới khớp nhau từ giờ.

---

## 1. Hệ thống hiện tại

```
 Browser (dashboard, origin app.*)                     Server (Next 14, Node)                      Ngoài TS
 ─────────────────────────────────                     ────────────────────────                    ─────────────────────
 artifact-create/index.tsx                              api/.../artifacts/route.ts POST             Supabase Storage
   file, name, slug ──► useCreateArtifact ──multipart──► request.formData()                          bucket artifact-content
   (slugifyFileName, SLUG_MAX_LENGTH=60,                  artifactService.create()                     allowed_mime_types={text/html}
    KHÔNG validate slug/name)                               ├ ext .html/.htm, size ≤ ARTIFACT_MAX_BYTES  file_size_limit=5242880
                                                            ├ storage.put(ARTIFACT_STORAGE_MIME) ─────►
                                                            └ repo.create(status='draft', kind='html')► Postgres artifacts
                                                                                                        CHECK status ∈ 6 giá trị
   ──► usePublishArtifact ──json {slug?}──► .../publish/route.ts POST                                   CHECK kind ∈ 4 giá trị
                                              artifactService.publish()
                                                ├ buildServeUrl(NEXT_PUBLIC_APP_BASE_URL)            env (bake lúc build)
                                                ├ touchPointFormCreateWithAdvanceSchema.parse() ◄─── Zod của touch-points:
                                                │    (name ≤64, slugSchema 6..64 + regex,             slug.ts, schemas/index.ts
                                                │     requiredUrlSchema qua tldts)                    (tldts: localhost = invalid)
                                                ├ touchPointService.createTouchPoint()            ──► touch_points (content_type='ARTIFACT')
                                                └ repo.update(status='live', touch_point_id)          li2-be (Go) resolve + li2-worker ghi visits

 Người quét QR ──► example.com/<slug> ──302──► /a/<token> (route.ts, KHÔNG qua middleware)
                                                          artifactServeService ──► storage.get ──► HTML + CSP sandbox

 Toast/UI ──► react-query/index.ts onSettled/onError: t(i18nMessage.key) ◄──── public/lang/{vi,en}/common.json
```

Điểm cần nhìn: **mỗi mũi tên rời khỏi cột giữa là một hợp đồng ngầm** (whitelist, CHECK, Zod của module khác, JSON i18n, hành vi tldts, env). Không mũi tên nào có thứ gì ép hai đầu khớp nhau, trừ một contract test vừa thêm cho MIME + size.

---

## 2. Kiến trúc đề xuất (nguyên nhân gốc và cách nhìn lại)

### 2.1 Kiểm chứng giả thuyết "ranh giới + mock"

Giả thuyết: *lỗi nằm ở ranh giới hai hệ thống, mock đặt đúng ranh giới làm test mất tác dụng.*

**Đúng một nửa.** Phần "ranh giới" đúng cho cả hai lỗi và cho **mọi** phát hiện mới ở mục 3. Phần "vì mock" chỉ giải thích được lỗi MIME; nó **không** giải thích được:

| Phát hiện | Có mock ở ranh giới không? | Vì sao test vẫn xanh |
|---|---|---|
| MIME (đã sửa) | Có — `deps.storage` | assertion ghim giá trị sai |
| Multipart (đã sửa) | Có — `axiosApiInstance` | assertion bỏ qua tham số thứ ba |
| Slug ngắn / tên dài → publish 500 (3.1, 3.2) | **Không** — `touchPointFormCreateWithAdvanceSchema.parse` chạy thật trong `artifact.service.test.ts` | test chỉ đưa input đẹp (`name: 'Landing page'`, không slug); không có test nào cho biên |
| localhost → publish 500 (3.3) | Không — Zod thật | test tự đặt `NEXT_PUBLIC_APP_BASE_URL = 'https://app.li2.ai'` (`artifact.service.test.ts:3`), tức test chọn đúng env để đi qua |
| i18n key không tồn tại (3.4) | Không có test nào chạm `common.json` | `artifact-components.test.tsx:10-16` mock `t()` trả về **chính key** khi thiếu → thiếu key trông y như có key |

Nguyên nhân sâu hơn, theo thứ tự tôi tin nhất:

1. **Hợp đồng của hạ tầng tái dùng chưa từng được liệt kê.** Kế hoạch (log.md) khảo sát rất kỹ *ba cổng chặn `content_type`* rồi dừng. Nhưng "85% nối vào thứ đã có" nghĩa là kế thừa *toàn bộ* ràng buộc của thứ đó: whitelist bucket, `slugSchema` 6..64, `name ≤ 64`, `tldts` từ chối localhost, key i18n có sẵn, `axios` mặc định JSON. Không ai đi qua danh sách này vì không có danh sách.
2. **Nhiều agent song song, không có file hợp đồng chung.** FE tự khai `SLUG_MAX_LENGTH = 60` (`src/features/artifacts/constants.ts:6`) trong khi BE có `slugMaxLength = 64`, `slugMinLength = 6` cách đó ba thư mục. BE tự bịa key `messages.error.already_exists`, `label.artifact` không có trong JSON. Mỗi bên viết đúng theo *hiểu biết của mình* về bên kia — đó chính là định nghĩa của lỗi ranh giới.
3. **Test viết bởi người viết code, cùng lúc, cùng giả định.** Test và code chia sẻ cùng một hiểu nhầm (ghim `text/html; charset=utf-8`), nên test là bản chụp của giả định chứ không phải phép kiểm. Đây là lý do 1403 test xanh không mang thông tin về ranh giới.
4. **Chỉ có một lượt chạy thật, với một bộ input đẹp** (slug dài đúng, tên ngắn, base URL production). Nghiệm thu 5 tiêu chí đều đúng nhưng không có tiêu chí nào "input xấu".

Mock không phải nguyên nhân; mock chỉ là **một** cách để hai bên ranh giới không bao giờ gặp nhau. Cách khác: input đẹp, env đẹp, `t()` giả nuốt lỗi.

### 2.2 Hình tổng quát của lớp lỗi

```
   Nguồn A (TS)  ──── giả định ────►  Nguồn B (SQL / JSON / Zod module khác / env / lib bên thứ ba)
        │                                    │
        │  test unit chỉ nhìn A              │  chỉ lộ khi chạy thật với input chạm biên
        ▼                                    ▼
   xanh                                  500 / raw key / iframe trắng
```

Khắc phục ở tầng kiến trúc không phải "viết thêm test", mà là **đổi hướng mũi tên**: A phải *đọc* B (import chung hoặc parse file B trong test), không *đoán* B. Mục 4 liệt kê cách rẻ nhất cho từng ranh giới.

---

## 3. Edge case — lỗi cùng lớp CHƯA bị phát hiện

Xếp theo mức nghiêm trọng. **Đã xác minh** = đọc cả hai phía + (nếu có) chạy thử. **Nghi ngờ** = một phía đọc rõ, phía kia suy luận.

| # | Tình huống | Hậu quả | Mức | Trạng thái |
|---|---|---|---|---|
| 3.1 | Tên file ngắn → slug tự sinh < 6 ký tự, hoặc slug có `--`/kết thúc `-`/bắt đầu `f-` | Publish trả **500** (ZodError → AppError), artifact kẹt `draft`, toast "đã tải lên nhưng chưa xuất bản" | Hỏng âm thầm, gặp thường | Đã xác minh |
| 3.2 | Tên artifact > 64 ký tự (tên file dài, hoặc người dùng gõ) | Publish **500 vĩnh viễn** — không có endpoint đổi tên, artifact kẹt `draft` mãi | Hỏng âm thầm, không tự thoát | Đã xác minh |
| 3.3 | Dev local với `NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000` (đúng như log.md hướng dẫn) | Publish **luôn 500** vì `tldts` coi `localhost` không phải domain | Chặn đường cho mọi dev local | Đã xác minh bằng chạy `tldts` |
| 3.4 | 6 key i18n backend dùng không tồn tại trong `common.json` (vi lẫn en) | Mọi publish thành công hiện toast tiêu đề **`messages.success.updated`** (raw key); 409 hiện raw key; create hiện "Đã tạo mới thành công ." | Khó chịu, hiện với 100% người dùng | Đã xác minh bằng đọc JSON |
| 3.5 | Dashboard chạy ở host khác `NEXT_PUBLIC_APP_BASE_URL` (dev local trỏ LiHi, hoặc domain dashboard tuỳ chỉnh) | iframe xem trước **trắng** do `frame-ancestors 'self'` | Khó chịu, phụ thuộc môi trường | Đã xác minh cả hai phía |
| 3.6 | `status`/`kind` trong DB rộng hơn union TS (drift tương lai, hoặc ai đó `UPDATE` tay) | `getArtifactStatusView` trả `undefined` → FE **crash** khi đọc `.badge` | Hiện chưa hỏng; là ranh giới chưa được ép | Nghi ngờ (ranh giới thật, kịch bản giả định) |
| 3.7 | Touch point `ARTIFACT` lộ ra ở UI touch-point/collections vốn chỉ biết `URL` | Hiện nhãn "QR" sai ở collections; có thể sửa `content_value` qua `short-link` route → artifact vẫn `live` nhưng link trỏ đi nơi khác | Hỏng âm thầm, hiếm | Nghi ngờ (schema cho phép; đường UI chưa lái) |
| 3.8 | `PaginationResponse` đòi `pagination` nhưng API trả `{data,rowCount}` | Type nói dối, không lỗi runtime | Khó chịu | Đã xác minh |

### 3.1 Slug tự sinh không qua được `slugSchema` — publish 500

**Hai phía lệch:**
- FE: `src/features/artifacts/constants.ts:6` `SLUG_MAX_LENGTH = 60`; `:27-33` `slugifyFileName` không có min; `:39-45` `normalizeSlugInput` cho phép `a--b`, `abc-`. `src/features/artifacts/components/artifact-create/index.tsx:88` gửi `slug || undefined` **không validate**.
- BE: `src/shared/schemas/slug.ts:4-5` `slugMaxLength = 64`, `slugMinLength = 6`; `:13` regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (không `--`, không `-` cuối); `:6` cấm prefix `f-`. Được gọi tại `src/core/services/artifact.service.ts:175` qua `touchPointFormCreateWithAdvanceSchema.parse(...)`.
- Đường lỗi: `ZodError` không phải `BaseError` → `src/shared/lib/middlewares/with-auth.ts:79-81` bọc thành `AppError` → **500** + log `error`.

**Kịch bản:** upload `menu.html` → FE điền sẵn slug `menu` (4 ký tự) → bấm Xuất bản → create 201, publish 500 → toast `publish_failed_draft_kept`, chuyển sang detail. Ở detail bấm Xuất bản (không slug) → thành công nhưng **mất slug người dùng thấy trên form**. Tên file có dấu cách kép (`bao  gia.html` → `bao-gia`? không: `[^a-z0-9]+` gộp thành một `-`, ok) nhưng tên `f-2026.html` → `f-2026` bị cấm prefix.

**Vì sao test không bắt:** `artifact.service.test.ts` cho `parse` chạy thật nhưng không có test nào truyền slug; `use-artifacts.test.tsx` mock axios; không test nào gọi `slugifyFileName` rồi đưa qua `slugSchema`.

### 3.2 Tên artifact không giới hạn, touch-point giới hạn 64 — publish 500 vĩnh viễn

- `src/core/services/artifact.service.ts:121` `name = input.name?.trim() || stripExtension(filename)` — không max; DB `name text` (migration `:32`); FE `<Input id="artifact-name">` (`artifact-create/index.tsx:162-168`) không `maxLength`.
- `src/shared/schemas/touch-points/index.ts:17` `MAX_TOUCHPOINTS_NAME_LENGTH = 64`, `:134` `name: z.string().min(1).max(64)`.

**Kịch bản:** file `Bao-gia-thang-9-cho-khach-hang-doanh-nghiep-khu-vuc-mien-nam-ban-cuoi.html` (71 ký tự) → create OK → publish 500 → detail → bấm Xuất bản → **500 lại**. Không có API đổi tên artifact → kẹt `draft`, chỉ còn cách upload lại (tạo bản trùng — đúng điều comment ở `index.tsx:66-71` muốn tránh).

**Vì sao test không bắt:** tên trong test là `'Landing page'`.

### 3.3 `NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000` → `requiredUrlSchema` từ chối

- `src/core/services/artifact.service.ts:222-229` dựng `http://localhost:3000/a/<token>` làm `content_value`.
- `src/shared/schemas/index.ts:36-44` `checkUrl` dùng `tldts.parse(..., {allowPrivateDomains:false})` và đòi `domain || isIp`. Chạy thật:

```
http://localhost:3000/a/abc      => domain: null  isIp: false  pass: false
https://app.example.com => domain: example.com    pass: true
http://127.0.0.1:3000/a/abc      => isIp: true                 pass: true
```

- `.env.local` hiện tại trên máy này: `NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000` (đúng hướng dẫn trong log.md, mục "Môi trường nghiệm thu").

**Kịch bản:** `yarn dev` → tạo artifact → publish 500 mọi lần. Hai artifact `live` trên LiHi có `content_value = https://app.lihi...` nên lượt nghiệm thu đã chạy trên build có base URL production, không phải từ `yarn dev` với localhost.

**Vì sao test không bắt:** `artifact.service.test.ts:3` tự đặt `https://app.li2.ai`. Workaround tức thời: dùng `http://127.0.0.1:3000`.

### 3.4 Key i18n backend không tồn tại — raw key hiện ở toast

Kiểm bằng script đọc `public/lang/{vi,en}/common.json`:

| Key dùng trong code | Nơi dùng | Có trong JSON? | Gần nhất có |
|---|---|---|---|
| `common:messages.error.invalid_file` | `artifact.service.ts:112` | không (vi+en) | `invalid_file_type` |
| `common:messages.error.already_exists` | `artifact.service.ts:169` | không | `api_key_already_exists`, `tag_name_exists` |
| `common:messages.error.something_went_wrong` | `artifact.service.ts:226` | không | `some_error`, `unexpected`, `generic` |
| `common:messages.success.updated` | `publish/route.ts:23` | không (là object ở nhánh khác) | `updated_field` |
| `$t(label.artifact)` | `artifact.service.ts:170, 234` | không | — |
| `$t(label.name)` | `artifact.service.ts:125` | không | — |
| `common:messages.success.created` | `artifacts/route.ts:48` | **có**, nhưng cần `{{field}}` mà không truyền | → "Đã tạo mới thành công ." |

Consumer: `src/shared/lib/react-query/index.ts:10-25` — **mọi mutation** thành công đều toast `t(i18nMessage.key, params)`; không có `defaultMessage` → i18next trả về chính key. Tức **mỗi lần publish thành công người dùng thấy toast tiêu đề `messages.success.updated`**. Lỗi 409 (đã publish): component tự toast success (`artifact-detail/index.tsx:51-55`) **và** handler toàn cục toast destructive với description là raw key `messages.error.already_exists` — hai toast trái ngược nhau.

**Vì sao test không bắt:** `artifact-components.test.tsx:10-16` mock `t` trả `path` khi thiếu — lỗi và thành công trông giống nhau; và chỉ nạp `artifact.json`, không nạp `common.json`; không test nào chạm `react-query/index.ts`.

### 3.5 `frame-ancestors 'self'` vs iframe xem trước ở host khác

- `src/app/(artifact)/a/[token]/route.ts:25` và `next.config.mjs:89`: `frame-ancestors 'self'`.
- `src/features/artifacts/components/artifact-detail/artifact-preview.tsx:36` `src={artifact.serve_url}` — `serve_url` dựng từ env (`artifact.service.ts:222`), không từ host đang mở dashboard.

**Kịch bản:** dashboard mở ở `http://127.0.0.1:3000` (theo workaround 3.3) hoặc bất kỳ deployment nào dashboard và `NEXT_PUBLIC_APP_BASE_URL` khác host → iframe bị chặn, khung trắng, không có thông báo. Trên LiHi hiện khớp host nên không lộ. Đây cũng là đúng chỗ sẽ gãy khi làm "origin phục vụ riêng `{token}.art.li2.ai`" như log.md dự định — CSP này phải đổi cùng lúc.

### 3.6 CHECK constraint ↔ union TS ↔ `switch` exhaustive — không có gì ép

- Migration `:44-47` (6 status, 4 kind) = LiHi thật (đã đối chiếu `pg_constraint`) = `src/core/types/artifact.type.ts:35-42`. **Hôm nay khớp.**
- Nhưng `src/shared/types/database.types.ts:920,925` khai `kind: string`, `status: string`; `artifact.service.ts:82-83` ép kiểu `as ArtifactStatus` không kiểm; `src/features/artifacts/utils/artifact-status.ts:30-67` `switch` không `default` → giá trị lạ trả `undefined` → `artifact-status-badge.tsx:30` đọc `.badge` của `undefined` → crash trang list/detail.
- Không có test nào đọc migration để so với union (contract test hiện chỉ so MIME + size, `artifact.service.test.ts:290-313`).

Đây là ranh giới **cùng dạng đúc** với MIME/size, chỉ chưa nổ.

### 3.7 Touch point `ARTIFACT` trôi vào UI/route của touch-point thường

- DB LiHi: `touch_points.content_type` có `url|1`, `URL|3`, `ARTIFACT|2` — cột `text` không ràng buộc, đã lệch hoa/thường từ trước.
- `src/features/collections/components/collection-detail/touch-points.tsx:144` và `add-touch-point-dialog.tsx:176`: `content_type === 'URL' ? 'LINK' : 'QR'` → artifact hiện là "QR".
- `src/app/api/organizations/[org_id]/touch-points/[touch_point_id]/short-link/route.ts:32` `updateShortLinkSchema` cho sửa `content_value` của **bất kỳ** TP → sửa TP của artifact thì `artifacts.status` vẫn `live`, `serve_url` vẫn phục vụ nhưng QR đã in trỏ đi nơi khác. Ngược lại xoá TP là hard delete (`touch-point.repository.ts:208-218`) nên FK `SET NULL` chạy và FE đã xử lý (`list.link_deleted`) — phần này **ổn**.
- Form detail touch-point: `touch-point-form.constants.tsx:21` mặc định `content_type: URL`; chưa lái UI để xem update có ghi đè `ARTIFACT` → `URL` không. **Nghi ngờ.**

### 3.8 `PaginationResponse` đòi `pagination`, API không trả

`src/shared/types/index.ts:9-13` vs `src/app/api/organizations/[org_id]/artifacts/route.ts:22` `APIResponse.ok({data, rowCount})`. `use-artifacts.ts:18` khai `useQuery<PaginationResponse<ArtifactDTO>>`. Không lỗi runtime vì list chỉ đọc `.data`/`.rowCount`. Ghi để không ai tin type này.

### Những chỗ đã soát và KHÔNG thấy lệch

- CSP: chuỗi ở `route.ts:16-27` và `next.config.mjs:89` **giống hệt**; header thật trên LiHi chỉ có **một** dòng CSP (Next gộp), `content-type: text/html; charset=utf-8`, không `set-cookie`, 404 vẫn mang CSP. Chỉ thiếu test ghim hai chuỗi bằng nhau.
- Schema LiHi vs migration vs `database.types.ts`: 12/12 cột, kiểu, nullable, default khớp.
- Bucket LiHi: `public=f`, `5242880`, `{text/html}`; 3 object có `mimetype=text/html` — bản sửa MIME đúng.
- `middleware.ts` matcher loại `a/`; `publicPath` không có `/a/` — đúng như quyết định trong log.md.
- `ARTIFACT_MAX_BYTES` ↔ `file_size_limit`: đã có contract test.
- `variants_content: {QR: {enabled:true}}` qua `ALLOWED_TP_TYPES` — đúng.

---

## 4. Chiến lược test — ép ranh giới khớp nhau, rẻ và tự động

```
Tầng                    Ranh giới                                   Cơ chế đề xuất (rẻ nhất trước)
──────────────────────  ──────────────────────────────────────────  ─────────────────────────────────────────────────
Contract test (unit,    TS const ↔ SQL migration                    Đã có cho MIME/size. Thêm: parse CHECK (...) trong
đọc file bên kia)         status/kind union ↔ CHECK                   migration → so với union (export mảng runtime
                                                                      ARTIFACT_STATUSES rồi derive type từ mảng)
                        database.types.ts (vá tay) ↔ migration      Parse CREATE TABLE → so tên cột với keys của Row
                        Key i18n trong src ↔ JSON vi/en             Script quét literal 'common:...' và t('ns:...') trong
                                                                      src/**, assert tồn tại ở CẢ vi và en. Bắt lớp lỗi
                                                                      này cho toàn repo, không riêng artifact
                        CSP route.ts ↔ next.config.mjs              Export ARTIFACT_CSP từ một module, import ở cả hai;
                                                                      hoặc test so hai chuỗi
Property/fuzz (unit)    slugifyFileName ↔ slugSchema                FE import slugSchema/slugMinLength/slugMaxLength từ
                                                                      shared/schemas/slug (xoá SLUG_MAX_LENGTH riêng);
                                                                      test: ∀ tên file mẫu, slugSchema.safeParse(
                                                                      slugifyFileName(f)) hoặc FE phải báo lỗi trước
                        artifact name ↔ baseSchema.name             create() validate name bằng chính
                                                                      baseSchema.shape.name (max 64) → lỗi 400 lúc upload,
                                                                      không đợi publish
Boundary-input (unit,   ZodError trong service                      with-auth: map ZodError → 400 + i18n validation
Zod thật, không mock)                                                 (hiện 500). Test publish với slug 'abc', name 70 ký
                                                                      tự, base URL localhost → mong 400 rõ nghĩa
Env guard (boot)        NEXT_PUBLIC_APP_BASE_URL ↔ requiredUrlSchema  Lúc khởi động (hoặc trong buildServeUrl lần đầu)
                                                                      safeParse(base + '/a/x'); fail → log rõ "dùng
                                                                      127.0.0.1 thay localhost"
Integration (1 lần/     Toàn luồng create → publish → /a/<token>    Skill verify-artifact-lihi đã có; thêm ma trận input
deploy, LiHi)                                                         xấu: tên file 3 ký tự, tên 70 ký tự, slug 'a--b',
                                                                      'f-x'; và mở detail xem toast không chứa 'messages.'
Cố tình không test      li2-be resolve, li2-worker ghi visits        Ngoài repo; đã chứng minh bằng lượt chạy thật
                        Supabase Storage nội bộ                      Contract test đọc migration đủ; không dựng Supabase
                                                                      local cho unit
```

Ba việc nên làm **trước** mọi thứ khác vì rẻ và chặn cả lớp:
1. **Script kiểm key i18n** (contract test đọc JSON) — sửa 3.4 và ngăn tái phát ở mọi feature.
2. **FE import Zod slug/name từ shared**, bỏ hằng số chép tay — sửa 3.1, 3.2 theo hướng DRY thay vì thêm test cho bản chép.
3. **`with-auth` map ZodError → 400** — biến mọi lỗi ranh giới còn sót từ "500 mờ" thành "400 có key", tức lần sau lỗi tự khai tên.

---

## 5. Rủi ro — theo blast radius giảm dần

1. **3.2 tên > 64 → kẹt draft vĩnh viễn, tạo bản trùng.** Mọi môi trường. Không tự hồi phục. Đảo ngược: validate name ở `create` (1 dòng) — nhưng artifact đã kẹt phải xoá tay.
2. **3.1 slug ngắn/xấu → publish 500.** Mọi môi trường, gặp thường (tên file ngắn rất phổ biến). Tự hồi phục qua detail nhưng mất slug và log đầy `error`.
3. **3.4 raw key ở toast trên 100% publish.** Mọi môi trường, không gãy dữ liệu, nhưng là thứ đầu tiên người dùng thấy sau khi tính năng chạy đúng.
4. **3.3 localhost → publish luôn 500.** Chỉ dev local, nhưng chặn toàn bộ vòng lặp phát triển tính năng này; nguy hiểm hơn vì hướng dẫn trong log.md đang dẫn thẳng vào nó.
5. **3.5 iframe trắng khi lệch host.** Sẽ nổ đúng lúc làm origin phục vụ riêng.
6. **3.6, 3.7** chưa hỏng; là nợ ranh giới chưa được ép.

---

## 6. Giả định của tôi

- **Giả định:** người dùng gõ/để mặc định slug trên form tạo (form hiện slug sẵn, `index.tsx:172-183`). Nếu quyết định ẩn slug ở bản prototype thì 3.1 giảm về "chỉ khi người dùng cố tình", nhưng `slugifyFileName` vẫn phải khớp `slugSchema`.
- **Giả định:** toast toàn cục `react-query/index.ts` được giữ. Nếu đội định tắt toast toàn cục cho mutation artifact thì 3.4 chỉ còn ở nhánh 409 và ở các consumer khác của key.
- **Giả định:** dev local là môi trường được hỗ trợ (log.md hướng dẫn `yarn dev` với `.env.local`). Nếu đội chỉ dev trực tiếp trên LiHi thì 3.3 hạ xuống "ghi chú", nhưng vẫn nên đổi hướng dẫn sang `127.0.0.1`.
- **Giả định:** kế hoạch "origin phục vụ riêng" vẫn còn. Nếu có, `frame-ancestors` và iframe preview (3.5) phải đi cùng một thay đổi, và `serve_url` sẽ không còn dựng từ `NEXT_PUBLIC_APP_BASE_URL` — nên tách hằng số `ARTIFACT_SERVE_BASE_URL` ngay từ giờ để chỗ đổi chỉ có một.
- **Chưa lái:** đường UI sửa touch point `ARTIFACT` qua form touch-point (3.7). Nếu form đó ghi đè `content_type` về `URL`, cần chặn edit cho TP có `content_type='ARTIFACT'` ở route `short-link` và `touch-points/[id]` — đó là thay đổi kiến trúc nhỏ (guard theo content_type) chứ không phải sửa FE.

### Phụ lục — lệnh đã dùng để xác minh

```bash
# key i18n
node -e 'const c=require("./public/lang/vi/common.json"),e=require("./public/lang/en/common.json");
  const g=(o,k)=>k.split(".").reduce((a,b)=>a&&a[b],o);
  for (const k of ["messages.error.invalid_file","messages.error.already_exists",
    "messages.error.something_went_wrong","messages.success.updated","label.artifact","label.name"])
    console.log(k, g(c,k), g(e,k))'
# tldts
node -e 'const {parse}=require("tldts"); console.log(parse("http://localhost:3000/a/x",{allowPrivateDomains:false}))'
# LiHi
.claude/skills/verify-artifact-lihi/control-artifact.sh db "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.artifacts'::regclass"
.claude/skills/verify-artifact-lihi/control-artifact.sh db "select content_type, count(*) from touch_points group by 1"
curl -sD - -o /dev/null https://app.example.com/a/fqq9cg9vvniz54ei
```
