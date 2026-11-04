# li2-oss

**Short link + QR + hosting tệp, tự host.** Một app Next.js và một Postgres. Hết.

Chạy được bằng **một lệnh `docker compose up`, chỉ cần Postgres** — không Redis, không
ClickHouse, không hàng đợi, không dịch vụ đám mây nào. Đó là điểm khác biệt đã kiểm được so
với các bản self-host khác: [Dub](https://github.com/dubinc/dub) chẳng hạn, bản self-host của
họ không hỗ trợ Docker và cần Tinybird + Upstash + PlanetScale + Vercel mới chạy. Ở đây
`docker compose up` là đủ, và `db/schema.sql` nằm trong repo nên lần `up` đầu tiên đã có bảng.

Giấy phép **MIT** ([LICENSE](LICENSE)).

---

## Chạy trong 5 phút

Cần: Docker và Docker Compose. Không cần Node ở máy.

```bash
git clone <địa-chỉ-repo-này> li2-oss
cd li2-oss

# 1. Tạo file cấu hình
cp .env.example .env

# 2. Sinh SESSION_SECRET và dán vào .env
openssl rand -base64 32

# 3. Mở .env, điền hai giá trị:
#      SESSION_SECRET=<giá trị vừa sinh>
#      PUBLIC_BASE_URL=http://localhost:3000
#    (PUBLIC_BASE_URL để rỗng có chủ ý — xem phần dưới)

# 4. Chạy
docker compose up -d

# 5. Tạo tài khoản admin. Mật khẩu được sinh ngẫu nhiên và IN ĐÚNG MỘT LẦN — lưu lại ngay.
docker compose exec web node scripts/db-seed.mjs
```

Mở **http://localhost:3000** và đăng nhập.

Muốn tự chọn email và mật khẩu:

```bash
docker compose exec web node scripts/db-seed.mjs ban@cua-ban.com 'mat-khau-dai-hon-12-ky-tu'
```

### Vì sao `PUBLIC_BASE_URL` không có mặc định

Vì một bản self-host phải phục vụ domain của **người cài**. Bản thương mại của Li2 hard-code
`li2.ai` ở 59 file, và một trong số đó mời người tự host đăng ký link trên domain của Li2 —
đúng cái sai mà bản này tồn tại để không lặp lại. Giá trị này được dùng để dựng URL đầy đủ
trong QR; điền sai thì **QR in ra trỏ sai chỗ và không in lại được**.

### Đưa lên máy chủ thật

```bash
# Trong .env:
PUBLIC_BASE_URL=https://link.cua-ban.com
POSTGRES_PASSWORD=<openssl rand -base64 24>
TRUSTED_PROXY=true        # CHỈ KHI có nginx/Traefik/Cloudflare ở trước
```

`TRUSTED_PROXY=true` khi **không** có proxy nghĩa là để khách tự khai IP của họ, và mọi phép
đếm khách duy nhất thành số do client bịa. Mặc định `false` đếm thiếu — chủ ý, vì đếm thiếu
sửa được còn đếm sai thì không biết là sai.

TLS do reverse proxy của bạn lo; app này nghe HTTP ở cổng 3000.

---

## v1 KHÔNG có gì

Mục này bắt buộc phải có và phải đúng. Lý do: đánh giá bản thương mại tìm ra việc README của
nó hứa một tính năng ("link hết hạn") mà code không hề có. Một README hứa quá là một lỗi,
không phải một cách tiếp thị.

**Không có trong v1:**

- analytics nâng cao
- heatmap
- session recording
- funnel
- attribution / conversion
- affiliate
- custom domain
- chat AI
- MCP

**Có trong schema nhưng CHƯA dùng được:**

- `links.password_hash` — đặt mật khẩu cho link thì link đó trả `401` với mọi người, vì chưa
  có trang nhập mật khẩu.
- `artifacts.expires_at` — cột có, index có, nhưng không UI nào đặt được và không đường phục
  vụ nào đọc. Artifact "đã hết hạn" hiện vẫn mở được.
- `users.is_admin` — mọi người dùng đăng nhập được đều làm được mọi việc.

Danh sách đầy đủ kèm lý do: [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Làm được gì

1. Đăng nhập bằng tài khoản seed
2. Tạo short link → `http://localhost:3000/<slug>` redirect tới đích
3. Tải QR của link đó về dạng PNG hoặc SVG
4. Tải lên một tệp (PDF / HTML / ảnh) → nhận một địa chỉ công khai, có QR
5. Xem số lượt click / lượt xem

---

## Kiến trúc trong 10 dòng

1. **Một app Next.js duy nhất.** Không service backend riêng. Việc giải short link là
   `app/[slug]/route.ts` — khoảng 70 dòng.
2. **Postgres trực tiếp qua `pg`.** Không ORM, không PostgREST. Schema là
   [`db/schema.sql`](db/schema.sql), nằm trong repo, mount vào initdb.
3. **Single-tenant.** Một instance = một tổ chức. Không có cột `organization_id` ở đâu cả.
4. **Session cookie + `scrypt`** (`node:crypto`). Không dịch vụ auth ngoài. Bảng `sessions`
   lưu **hash** của token, không lưu token.
5. **Tệp tải lên nằm trên đĩa**, trong một Docker volume (`STORAGE_DIR`). Không object store.
6. **QR sinh bằng `qrcode`** (MIT, JavaScript thuần). Không `canvas`, không `jsdom`, không
   `sharp` — **không dep nào phải compile native**, nên Dockerfile không cần `apk add` gì.
7. **Artifact xuất bản bằng cách tạo một link** (`artifacts.link_id`, quan hệ 1-1). Không có
   artifact nào "live" mà không có địa chỉ công khai.
8. **IP không được lưu.** Chỉ lưu HMAC của IP với muối đổi theo ngày — đếm được khách duy nhất
   trong ngày, không nối được hành vi qua nhiều ngày.
9. **URL đích được kiểm bằng `new URL()`**, cả lúc lưu và lúc redirect. Không tự phân tích
   chuỗi: `/\evil.com` đi qua được mọi guard viết bằng `startsWith`.
10. **Tổng dep chạy: 7 gói.**

Lý do đằng sau từng quyết định, và blocker nào của bản thương mại mà nó xoá:
[**docs/ADR-001-kien-truc.md**](docs/ADR-001-kien-truc.md).

---

## Phát triển

```bash
yarn install
cp .env.example .env     # điền DATABASE_URL, SESSION_SECRET, STORAGE_DIR
yarn db:init             # áp db/schema.sql
yarn db:seed             # tạo admin
yarn dev                 # http://localhost:3000
yarn test                # vitest
```

Chạy một DB riêng cho lúc phát triển:

```bash
docker compose up -d db
# rồi bỏ comment `ports: ['5432:5432']` trong docker-compose.yml nếu cần psql từ máy
```

**Quy ước code:** Prettier không dấu chấm phẩy, nháy đơn, 2 space, 100 cột. TypeScript
`strict`. Alias `@/*` → gốc repo.

**Comment trong code viết bằng tiếng Việt** — có chủ ý, không phải sót. Một comment tiếng Việt
ở bản gốc đã ngăn được một sự cố OOM production, và nó ngăn được chỉ vì có người đọc nó. PR
bằng tiếng Anh vẫn được nhận.

---
---

# li2-oss (English)

**Self-hosted short links + QR codes + file hosting.** One Next.js app and one Postgres. That's it.

Runs with **a single `docker compose up`, and Postgres is the only dependency** — no Redis, no
ClickHouse, no queue, no cloud service. That is the measured difference from other self-hosted
options: [Dub](https://github.com/dubinc/dub)'s self-hosted build, for instance, has no Docker
support and needs Tinybird + Upstash + PlanetScale + Vercel. Here `docker compose up` is
enough, and `db/schema.sql` ships in the repo so the first `up` already has tables.

**MIT** licensed ([LICENSE](LICENSE)).

## Five-minute start

Requires Docker and Docker Compose. No local Node needed.

```bash
git clone <this-repo> li2-oss
cd li2-oss

cp .env.example .env

# Generate a session secret and paste it into .env
openssl rand -base64 32

# In .env, fill in two values:
#   SESSION_SECRET=<the value above>
#   PUBLIC_BASE_URL=http://localhost:3000

docker compose up -d

# Create the first admin. The password is generated and PRINTED ONCE — save it now.
docker compose exec web node scripts/db-seed.mjs
```

Open **http://localhost:3000** and sign in. To choose your own credentials:

```bash
docker compose exec web node scripts/db-seed.mjs you@your-domain.com 'a-password-over-12-chars'
```

### Why `PUBLIC_BASE_URL` has no default

Because a self-hosted install must serve **your** domain. The commercial build hard-codes
`li2.ai` across 59 files, and one of those invites self-hosters to register links on Li2's own
domain. This value builds the absolute URLs encoded into your QR codes; get it wrong and
**printed QR codes point to the wrong place and cannot be reprinted.**

### Production

```bash
PUBLIC_BASE_URL=https://links.your-domain.com
POSTGRES_PASSWORD=<openssl rand -base64 24>
TRUSTED_PROXY=true        # ONLY if nginx / Traefik / Cloudflare sits in front
```

Setting `TRUSTED_PROXY=true` without a real proxy lets visitors declare their own IP, which
turns every unique-visitor count into a number the client made up. The default (`false`)
undercounts on purpose: undercounting is fixable, silent miscounting is not.

TLS is your reverse proxy's job; this app serves plain HTTP on port 3000.

## What v1 does NOT have

This section is mandatory and must stay accurate. The review of the commercial build found its
README promising a feature ("link expiry") the code never implemented. An over-promising README
is a bug, not marketing.

**Not in v1:** advanced analytics · heatmaps · session recording · funnels ·
attribution/conversion · affiliate · custom domains · AI chat · MCP.

**In the schema but not usable yet:**

- `links.password_hash` — setting a link password makes that link return `401` for everyone,
  because there is no password prompt page.
- `artifacts.expires_at` — the column and index exist, but no UI sets it and no serving path
  reads it. An "expired" artifact is still reachable.
- `users.is_admin` — every account that can sign in can do everything.

Full list with reasoning: [docs/ROADMAP.md](docs/ROADMAP.md).

## What it does

1. Sign in with the seeded account
2. Create a short link → `http://localhost:3000/<slug>` redirects
3. Download that link's QR code as PNG or SVG
4. Upload a file (PDF / HTML / image) → get a public address, with a QR code
5. See click and view counts

## Architecture in 10 lines

1. **One Next.js app.** No separate backend. Short-link resolution is
   `app/[slug]/route.ts`, about 70 lines.
2. **Postgres directly via `pg`.** No ORM, no PostgREST. The schema is
   [`db/schema.sql`](db/schema.sql), in the repo, mounted into initdb.
3. **Single-tenant.** One instance = one organisation. No `organization_id` column anywhere.
4. **Session cookie + `scrypt`** (`node:crypto`). No external auth service. The `sessions`
   table stores a **hash** of the token, never the token.
5. **Uploads live on disk**, in a Docker volume (`STORAGE_DIR`). No object store.
6. **QR codes from `qrcode`** (MIT, pure JavaScript). No `canvas`, no `jsdom`, no `sharp` —
   **no dependency compiles native code**, so the Dockerfile needs no `apk add` at all.
7. **Publishing an artifact creates a link** (`artifacts.link_id`, 1-to-1). No artifact is
   ever "live" without a public address.
8. **IP addresses are never stored.** Only an HMAC of the IP with a daily-rotating salt —
   enough to count unique visitors within a day, not enough to link behaviour across days.
9. **Destination URLs are validated with `new URL()`**, on write and again on redirect. Never
   by string inspection: `/\evil.com` defeats any `startsWith`-based guard.
10. **Seven runtime dependencies total.**

The reasoning behind each decision: [**docs/ADR-001-kien-truc.md**](docs/ADR-001-kien-truc.md)
(Vietnamese).

## Development

```bash
yarn install
cp .env.example .env     # fill DATABASE_URL, SESSION_SECRET, STORAGE_DIR
yarn db:init
yarn db:seed
yarn dev
yarn test
```

**Code style:** Prettier with no semicolons, single quotes, 2-space indent, 100 columns.
TypeScript `strict`. Alias `@/*` → repo root.

**Code comments are written in Vietnamese** — deliberately. In the original codebase a
Vietnamese comment prevented a production OOM incident, and it only worked because someone read
it. Pull requests in English are welcome.

## Ghi công bên thứ ba (NOTICE)

| Thành phần | License | Nghĩa vụ |
|---|---|---|
| **Be Vietnam Pro** (font) | OFL-1.1 — [bettergui/BeVietnamPro](https://github.com/bettergui/BeVietnamPro) | Giữ dòng ghi công này. Font được `next/font/google` tải lúc build rồi **tự host** — không gọi về Google lúc chạy, nên không rò IP người đọc sang bên thứ ba |
| shadcn/ui (component trong `components/ui/`) | MIT | — |
| Radix UI, lucide-react, Tailwind CSS, Next.js, React, `pg`, `qrcode`, `zod`, `nanoid` | MIT | — |

Bản OSS này **không** nhúng dataset địa lý nào. Bản thương mại có ba dataset đang chạy mà license
chưa tra được (`states.json`, `country-with-code.js`, `vietnam.json`); đó là một trong những lý do
bản này viết mới thay vì copy.
