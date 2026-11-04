# Nhật ký — li2-oss

## 2026-11-04 — v1 chạy được, nghiệm thu bằng Docker thật

Dựng từ đầu bản OSS single-tenant. **Không copy code của `li2-app`/`li2-be`.**

Căn cứ: `li2-app/docs/oss-review/` (6 file, ~10.000 dòng) kết luận đường "copy code hiện có + gắn
cờ" tốn ~44 ngày, và phần lớn chi phí không nằm ở tính năng mà ở việc tháo các thứ dính vào hạ
tầng riêng của Li2. Viết mới tránh được hầu hết — xem `docs/ADR-001-kien-truc.md`.

### Đã nghiệm thu (chạy thật, không phải phân tích)

```
yarn test            154/154 xanh, 7 file
yarn build           13 route, build KHÔNG cần database
docker compose up    db healthy, web lên, schema tự nạp qua initdb (6 bảng)
```

Đủ vòng 5 bước của ADR, bằng `curl` trên container thật:

| Bước | Kết quả |
|---|---|
| Đăng nhập | 200 + cookie `li2_session`; sai mật khẩu 401; **email không tồn tại trả CÙNG thông điệp** |
| Tạo link + redirect | `POST /api/links` → 201; `GET /demo` → **302 → https://example.com/landing** |
| QR | PNG 512×512 (2.885 B), SVG hợp lệ, slug không có → 404 |
| Artifact | tải HTML lên → mở qua `/<slug>` → 200 **có CSP sandbox**; `.exe` bị từ chối |
| Đếm lượt | `demo` 4 lượt, `tailieu` 1 lượt trong `link_stats` |

Ba PoC từ báo cáo đều bị chặn trên hệ thống đang chạy:
- `destination=/\evil.com` → từ chối (đây là open redirect Critical **chưa vá** ở bản thương mại)
- `destination=javascript:alert(1)` → từ chối
- `GET /api/qr/demo?width=99999` → ảnh ra **2048×2048**, không phải 99999

Và ba đường đòi đăng nhập: `POST /api/links` 401, `POST /api/artifacts` 401, link ẩn danh 401.

### Ba lỗi của tôi, và cái nào bắt được chúng

| Lỗi | `yarn test` bắt? | `yarn build` bắt? | Chạy thật bắt? |
|---|---|---|---|
| `promisify(scrypt)` mất overload 4 tham số → type error | ✗ (vitest không type-check) | **✓** | — |
| `lib/db.ts` tạo pool lúc import → `next build` đòi có DB | ✗ | **✓** | — |
| `NextResponse.rewrite()` không dùng được trong route handler | ✗ | ✗ | **✓ 500 khi mở artifact** |

Lỗi thứ ba là lý do bước `docker compose up` + `curl` phải nằm trong quy trình. Test xanh và build
xanh **không** chứng minh ứng dụng chạy — đúng bài học đã ghi trong `li2-app/CLAUDE.md`, nhưng lần
này nó còn đi xa hơn một bậc: có lỗi mà **cả test lẫn build đều không thấy**.

Cách sửa lỗi thứ ba: uỷ quyền bằng cách **gọi hàm** `GET` của `app/a/[slug]/route.ts`. Không dùng
middleware được vì `pg` không chạy trên edge runtime nên middleware không tra được DB để biết slug
là artifact hay redirect.

### Một việc bảo mật phải làm ngay lúc dựng

`yarn install` cảnh báo `next@15.5.4` có **CVE-2025-66478**. Đã nâng lên **15.5.29**. Một repo OSS
không được phát hành với dep có CVE đã công bố — và cảnh báo đó chỉ hiện ở dòng output của `yarn`,
rất dễ trôi qua.

### Còn thiếu

Xem `docs/ROADMAP.md`. Đáng chú ý nhất: trang nhập mật khẩu link (route hiện trả 401 có chủ ý, không
để lọt), `expires_at` cho artifact (schema có cột, UI chưa có).

### Chưa làm

- **Chưa có remote, chưa push.** Repo chỉ nằm trên máy này.
- Chưa chạy thử trên LiHi. Theo quy ước `~/Project/LiHi/CLAUDE.md`, mọi thứ đi LiHi trước Li2 —
  nhưng đây là repo mới, không đụng gì đang chạy, nên chưa cần.

## 2026-11-04 (tiếp) — nghiệm thu e2e toàn bộ tính năng

Thêm `scripts/e2e.mjs` (`yarn e2e`): **59 phép kiểm** trên instance đang chạy thật, 8 nhóm.
Thêm `--rate-limit` thì 62 (mục 9 phá trạng thái nên mặc định bỏ).

Môi trường sạch: `docker compose down -v` rồi `up --build`, seed admin với mật khẩu biết trước.

| Nhóm | Phép kiểm | Kết quả |
|---|---:|---|
| 1. Xác thực | 8 | đạt |
| 2. Phân quyền (6 đường đòi đăng nhập) | 6 | đạt |
| 3. Short link + redirect | 9 | đạt |
| 4. Bảo mật — PoC từ đợt đánh giá | 9 | đạt |
| 5. QR | 7 | đạt |
| 6. Artifact | 11 | đạt |
| 7. Đếm lượt | 2 | đạt |
| 8. Tắt link + trang render | 7 | đạt |
| 9. Rate limit (`--rate-limit`) | 3 | đạt |

### Hai lỗi tìm ra trong CHÍNH bộ test, không phải trong sản phẩm

1. **Không chạy lại được.** Mục 9 khoá IP 15 phút → lần chạy kế tiếp đỏ ngay mục 1.
2. **Một phép kiểm ĐẠT GIẢ.** Khi bị khoá, "email không tồn tại trả cùng thông điệp với mật khẩu
   sai" thành đúng một cách vô nghĩa — cả hai đều trả 429. **Một phép kiểm đạt vì lý do sai còn
   tệ hơn một phép kiểm đỏ.**

Sửa: mục 9 thành opt-in `--rate-limit`, cộng một `preflight()` dừng hẳn (exit 2) với hướng dẫn
`docker compose restart web` nếu phát hiện IP đang bị khoá. Đã kiểm: chạy liên tiếp hai lần không
restart → 59/59 cả hai lần.

### Negative control — chứng minh bộ test thật sự đỏ khi hệ thống hỏng

Thay `lib/links/destination.ts` bằng **đúng guard hỏng của bản thương mại**
(`startsWith('/') && !startsWith('//')`, không dùng `new URL`), build lại, chạy e2e:

```
✗ destination = /\evil.com bị TỪ CHỐI  — status=201
Tổng: 59 phép kiểm · đạt 58 · lỗi 1
```

Khôi phục bằng `git checkout --`, so với bản backup → khớp, và e2e xanh lại 59/59.

Bước này là thứ phân biệt "test chạy xong" với "test có tác dụng". Không có nó thì một bộ e2e
luôn xanh cũng cho cùng một output.

### Cổng hiện có

```
yarn typecheck   sạch (noUncheckedIndexedAccess bật)
yarn test        154/154
yarn build       13 route, không cần DB
yarn e2e         59/59 trên docker compose thật
```

## 2026-11-04 (tiếp) — thử CLONE SẠCH, và nó KHÔNG chạy được

Câu hỏi của chủ sản phẩm: *"người dùng download chạy được phải không?"* — tôi chưa kiểm, và khi
kiểm thì **câu trả lời ban đầu là KHÔNG**.

```
git clone <repo> /tmp/clonetest  →  cp .env.example .env  →  docker compose up -d
failed to solve: failed to compute cache key: "/app/public": not found
```

**Nguyên nhân:** `public/` rỗng, và **git không lưu thư mục rỗng**. `Dockerfile:60` có
`COPY --from=builder /app/public ./public`, nên bản clone không build được.

**⚠ Và đây là phần đáng ghi nhất: KHÔNG MỘT CỔNG NÀO trong bốn cổng bắt được nó.**
`yarn typecheck`, `yarn test`, `yarn build`, `yarn e2e` — cả bốn chạy trong thư mục làm việc
**đã có** `public/`, nên cả bốn xanh trong khi bản phát hành hỏng. Đúng lớp lỗi "chạy trên máy
tôi" mà không bài test nào trong repo có thể thấy, vì chúng không bao giờ nhìn repo từ ngoài.

Sửa: `public/.gitkeep` (có comment giải thích để không ai xoá "tệp rác" đó).

**Nghiệm thu lại bằng bản clone thật**, làm đúng README không thêm bước nào:

```
git clone . /tmp/clonetest2
cp .env.example .env  +  openssl rand -base64 32  →  SESSION_SECRET, PUBLIC_BASE_URL
docker compose up -d                    → web lên sau ~4s
docker compose exec web node scripts/db-seed.mjs <email> <pass>   → tạo admin
node scripts/e2e.mjs --rate-limit       → 62/62 đạt
```

### Bài học cho quy trình phát hành

Bốn cổng hiện có kiểm **mã**; không cái nào kiểm **gói phát hành**. Bước bắt buộc trước mỗi lần
phát hành, không thay được bằng test:

```bash
git clone <repo> /tmp/x && cd /tmp/x   # rồi làm ĐÚNG README, không thêm bước
```

Nếu có CI sau này thì đây là job đầu tiên nên có — nó bắt loại lỗi mà `yarn build` không thấy.

## 2026-11-04 (tiếp) — thêm CI

`.github/workflows/ci.yml`, 3 job chạy song song.

| Job | Kiểm gì | Vì sao có |
|---|---|---|
| **`clone-chay-duoc`** | `docker compose up` → seed → `e2e --rate-limit` → `artifacts-gc` | **Job quan trọng nhất.** `actions/checkout` là một bản clone sạch, nên nó nhìn repo **từ ngoài vào** — đúng góc nhìn bắt được lỗi `public/` mà cả bốn cổng cục bộ đều không thấy |
| `kiem-ma` | `typecheck` + `test` + `build`, `yarn install --frozen-lockfile` | Nhanh hơn, nhưng kiểm hẹp hơn |
| `chuoi-bi-cam` | Quét `li2.ai`, `lihi.cyborg.services`, `quik.vn`, IP, số tài khoản, `li2.link/sh`. Và `PUBLIC_BASE_URL` phải RỖNG trong `.env.example` | Phòng tuyến cho nhóm lỗi "nằm bên trong một file bắt buộc phải có" — chọn file nào mang sang không chặn được nhóm này |

### Ba quyết định trong file CI, kèm lý do

1. **`pull_request`, KHÔNG `pull_request_target`.** Với `pull_request`, GitHub không cấp secret
   cho PR từ fork, nên người lạ mở PR không chạy được gì bằng token của repo. Đổi sang
   `pull_request_target` là cách người ta thường "sửa" để workflow chạy trên PR fork — và đúng
   lúc đó nó thành lỗ thật. Có comment cảnh báo ngay đầu file.
2. **`--frozen-lockfile`.** Lệch `yarn.lock` thì đỏ, không tự sửa. Một CI tự cập nhật lockfile là
   một CI kiểm bản không ai review.
3. **Miễn trừ theo DÒNG (`blocklist-ok:`), không theo file.** Loại theo tên file thì một hit mới
   trong cùng file sẽ im lặng; loại theo dòng thì hit mới luôn đỏ.

### Đã chạy thử cục bộ từng bước — và job 3 ĐỎ ngay lần đầu

```
docker-compose.yml:34   comment nhắc `li2.ai` để giải thích   → đánh dấu blocklist-ok
.github/workflows/*     bộ lọc .github của tôi viết sai        → sửa regex
```

Negative control: nhét `const X = 'https://api.li2.ai/v1'` vào `lib/links/destination.ts` →

```
✓ BẮT ĐƯỢC: lib/links/destination.ts:44
```

Khôi phục → xanh lại. Và kiểm `pull_request_target` chỉ xuất hiện trong comment, không phải
trigger (`grep -nE "^\s+pull_request_target:"` → rỗng).

⚠ **CI chưa chạy thật** vì repo chưa có remote. Mọi bước đã chạy cục bộ; lần chạy thật đầu tiên
sẽ là lần push đầu tiên.

## 2026-11-04 (tiếp) — port UI của LiHi

Chủ sản phẩm chạy bản OSS, thấy giao diện CSS thuần, yêu cầu giống LiHi về UI/UX.

**Nền (Lead):** `app/globals.css` port nguyên **109 token `--color-*`** + khối `.dark` + `@theme`
của `li2-app` (Tailwind v4, **không có `tailwind.config.*`**). Cộng `postcss.config.mjs`,
`lib/utils.ts` (`cn` + `hexToRGBA`), **13 primitive shadcn**, `hooks/use-mobile`.

Bốn vá khi port, đều ghi lý do tại chỗ: `badge.tsx` cần `hexToRGBA` → port hàm; `input.tsx` import
`@/features/touch-points/...` → trích riêng `inputVariants`; `JSX.Element` → `React.ReactElement`
(React 19 bỏ global `JSX`); `sonner.tsx` cần `next-themes` → bỏ.

**Font Be Vietnam Pro** — cùng font bản thương mại, nhưng lấy qua `next/font/google` (**OFL-1.1**)
thay vì copy `.woff2` chưa tra license. Tự host: 12 file `.woff2` trong build, không gọi về Google
lúc chạy nên không rò IP người đọc. Đã thêm mục NOTICE vào README.

### Agent tìm ra một lỗ trong CI của tôi

`ui-shell` báo job `chuoi-bi-cam` dùng `grep -E` nên **`Li2.ai` viết hoa lọt qua**. Kiểm đúng. Đổi
sang `grep -iE`. Một blocklist phân biệt hoa thường là một blocklist hụt.

### Hai quyết định của agent cần người sau biết

1. **`/login` giờ CẦN JavaScript.** `ui-auth-artifact` đổi từ Server Action sang `fetch` client để
   chỉ có **một** đường xác thực đi qua API — nơi `checkLoginRate` đã nằm sẵn.
   ⚠ Lý do họ nêu ("tránh hai bản copy của phép kiểm an toàn") **yếu hơn vẻ ngoài**:
   `checkLoginRate` là một hàm lib, Server Action gọi lại được. Lý do thật đáng giữ là **một đường
   xác thực duy nhất**, dễ soi khi review bảo mật hơn hai đường. Giữ, nhưng ghi đúng lý do.
2. **`data-qr-url` trên mỗi `<TableRow>`** do `ui-links` thêm để chuỗi `/api/qr/` có trong HTML
   server-render (e2e kiểm nó). QR thật vẫn dùng URL đó qua prop của `qr-dialog.tsx` nên không phải
   markup chết — nhưng đây **có phần là dạy test cách đạt**. Phép kiểm đáng giá hơn đã có sẵn ở
   mục 5 của e2e (gọi thật `/api/qr/<slug>` và kiểm magic bytes PNG).

### Bốn chỗ cố ý khác bản gốc

Không logo ảnh (`li2-logo-withtext.svg` chưa tra license) · sidebar **3 mục** thay vì 13 (bản OSS
không có Customers/Funnels/Heatmap/Analytics) · gỡ `zustand` store + `useMediaQuery` khỏi
`sidebar.tsx` (không thêm dep; và effect gốc gọi `_setOpen(false)` vô điều kiện, ghi đè lựa chọn
người dùng mỗi lần resize) · không `next-themes`.

### Nghiệm thu

```
typecheck sạch · test 154/154 · build 15 route · e2e 59/59 · CI GitHub 3/3 job
asset copy từ li2-app: 0 file · chuỗi bị cấm: 0 hit
/artifacts render 3 tệp thật, kích thước "18 B", badge "PDF" đúng
```

⚠ Một báo động giả của chính tôi, ghi lại để không ai lặp: tôi grep `/artifacts` thấy **401 lần**
`NaN|undefined` và tưởng vỡ. Thực ra `NaN` = **0**, còn `undefined` chỉ là `$undefined` — mã hoá
nội bộ của payload RSC. Grep trên HTML đã render dễ cho báo động giả; phải xem ngữ cảnh.
