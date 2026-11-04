# ADR-001 — Kiến trúc bản OSS

Ngày 2026-11-04. Trạng thái: **đã chốt**, Lead tự quyết theo uỷ quyền của chủ sản phẩm.

## Bối cảnh

`li2-app/docs/oss-review/` (6 file, ~10.000 dòng) đánh giá việc mở mã bản hiện tại. Kết luận:
**31,5 → ~44 ngày** cho đường "copy code hiện có + gắn cờ", và phần lớn chi phí **không** nằm ở
tính năng mà ở việc tháo các thứ dính vào hạ tầng riêng của Li2.

Bản này **không copy code cũ**. Lý do: mọi blocker đắt nhất của báo cáo đều là hệ quả của những
lựa chọn hạ tầng mà một bản single-tenant viết mới **không cần mắc lại**.

## Quyết định và cái nó xoá

| Quyết định | Thay vì | Xoá blocker nào của báo cáo |
|---|---|---|
| **Một app Next.js duy nhất**, redirect bằng `app/[slug]/route.ts` | li2-app (Next) + li2-be (Go, 188 file) | `li2-be` không boot được (`/config/*` bị gitignore, `loadconfig.go` panic) · 12 UUID khách hàng FTEL · mật khẩu short link bản rõ (`touch-point.service.go:313`, `authentication.html:608`) · bot detection một dòng `strings.Contains(uaLower,"axios")` · 3 test / 188 file Go · module path `github.com/QQuik/shlink-be` · OG meta `"Li2.ai - Vietnam's #1 Link Shortener"` · allowlist host ẩn `stag.li2.ai` |
| **`qrcode` (MIT, JS thuần)** sinh QR | `qr-code-styling` + `jsdom` + `canvas` | **6 mục NOTICE LGPL** — báo cáo kết luận `canvas` *"KHÔNG gỡ được"* vì `FORCE_QR_ENABLED` buộc mọi touch point render QR phía server. Ở bản mới không có nhánh đó |
| **Postgres trực tiếp qua `pg`** | Supabase (PostgREST + service-role key) | Lộ schema qua `PGRST_DB_SCHEMAS`/`ALTER ROLE authenticator` · service-role key trong bundle · `database.types.ts` 116 quan hệ không có schema trong repo |
| **`db/schema.sql` nằm trong repo** | không có schema | Việc #1 của báo cáo: *"hôm nay không ai clone về chạy được"* — `README.md:88,160` trỏ tới hai file SQL **không tồn tại** |
| **Single-tenant: không `organization_id`** | multi-tenant + RBAC | 55 route không nhắc `org_id` · toàn bộ lớp `shared/lib/permission/` · hồi quy authz 2026-10-26 (403 cho cả Owner) |
| **Không plan-gate** | 26 `ensureOrgPlan` ở `touch-point.service.ts` | `PLAN_LIMIT_KEYS` · `plans.ts:129` bỏ qua gate cho `RequestRole.SERVICE` |
| **Session cookie + `scrypt`** | Casdoor | Hai tài khoản trùng email gây vòng lặp redirect · `CASDOOR_MASTER_PASSWORD` |
| **Lưu tệp trên đĩa (volume)** | Supabase Storage / MinIO | MinIO không kiểm MIME nên nửa `allowed_mime_types` biến mất |
| **Không nạp dataset địa lý ở v1** | `states.json` 636 KB + `vietnam.json` 362 KB + `country-with-code.js` 1,35 MB | **Ba dataset sống chưa tra được license.** `vietnam.json` còn là derivative (Li2 đã thêm cột `ISO3166_2_CODE`), nguồn không ghi ở đâu, tra web không ra |
| **Không chat AI / MCP ở v1** | `features/agent-chat` + `api/agent` + `core/mcp` | Cờ `AI_CHAT` **không gate route** — 24 handler vẫn gọi được bằng `curl`, 4 trong đó ghi dữ liệu artifact |

## Cái KHÔNG đổi so với bản gốc

- **Artifact publish bằng cách tạo một link** — `artifact.service.ts:721` của bản gốc gọi
  `createTouchPoint` trong `publish()`, và đó là thiết kế **đúng**: một artifact cần một địa chỉ
  công khai. Bản này giữ quan hệ 1-1 `artifacts.link_id`.
- **Mỗi link có QR** — mặc định bật. Bản gốc dùng hằng `FORCE_QR_ENABLED`; bản này sinh QR theo yêu
  cầu từ `slug` nên không cần cờ nào.
- **Comment tiếng Việt được giữ.** Báo cáo có một ví dụ thuyết phục: một comment tiếng Việt ở
  `artifact-storage.ts:148-152` ngăn được sự cố OOM production, và nó chỉ ngăn được vì có người đọc.

## Phạm vi v1 — "chạy được" nghĩa là gì

Một người clone về, chạy `docker compose up`, rồi làm được **đủ vòng**:

1. Đăng nhập bằng tài khoản seed
2. Tạo short link → mở `http://localhost:3000/<slug>` thấy redirect
3. Tải QR của link đó về dạng PNG/SVG
4. Tải lên một tệp (PDF/HTML/ảnh) → nhận một địa chỉ công khai → mở được, có QR
5. Thấy số lượt click/xem

Không có trong v1 (ghi rõ trong README để không hứa thứ chưa có): analytics nâng cao, heatmap,
session recording, funnel, attribution/conversion, affiliate, custom domain, chat AI, MCP.

## Giấy phép

**MIT.** Theo chốt của chủ sản phẩm. Không dùng lại code của bản thương mại nên không kéo theo
nghĩa vụ nào từ dep đã gỡ.
