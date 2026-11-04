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
