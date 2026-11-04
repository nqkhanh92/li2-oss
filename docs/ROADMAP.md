# ROADMAP

Những việc đã biết là còn thiếu. **Không có ngày tháng nào ở đây** — chủ ý: một danh sách
không hứa thì không bị coi là lời hứa. Thứ tự dưới đây là thứ tự theo mức bí bách, không
phải lịch.

Phạm vi v1 và những gì cố ý nằm ngoài nó: xem [ADR-001](ADR-001-kien-truc.md).

## Lỗ đã biết trong v1

- **Trang nhập mật khẩu cho link được bảo vệ.** Schema đã có `links.password_hash` và
  `app/[slug]/route.ts` đã chặn đúng, nhưng chặn bằng `401` kèm một câu tiếng Việt chứ không
  phải một form. Đặt mật khẩu cho link ở v1 nghĩa là khoá link đó lại với mọi người.
- **`expires_at` cho artifact.** Cột có trong `db/schema.sql` (kèm index), nhưng không UI nào
  đặt được nó và không đường phục vụ nào đọc nó. Một artifact có `expires_at` trong quá khứ
  hiện vẫn mở được.
- **Đặt lại mật khẩu.** Quên mật khẩu admin ở v1 thì cách duy nhất là `yarn db:seed` với một
  email khác rồi xoá hàng cũ bằng `psql`.
- **Hệ thống migration.** `db/schema.sql` là một ảnh chụp, không phải một chuỗi. Đổi schema
  trên một DB đang có dữ liệu phải viết `ALTER` tay.

## Tính năng chưa có

- **Analytics theo quốc gia.** Cột `visits.country` đã có và được ghi khi reverse proxy gửi
  `cf-ipcountry`; không có proxy đó thì cột rỗng. Tự tra quốc gia từ IP cần một dataset GeoIP,
  và ba dataset của bản thương mại đều chưa tra được license (xem ADR-001) — nên việc này chờ
  một nguồn có license rõ ràng, không chờ thời gian lập trình.
- **Redis cache cho đường redirect.** Hiện mỗi lần giải slug là một lần truy vấn Postgres. Đủ
  cho phần lớn người dùng; thành vấn đề ở lưu lượng cao.
- **Xoá tệp đã hết hạn / đã bị xoá khỏi đĩa.** Xoá một artifact hiện xoá hàng DB, tệp vẫn nằm
  trong `STORAGE_DIR`.
- **Ghi nhật ký kiểm toán.** Không có bảng nào ghi "ai đổi gì lúc nào".
- **Xuất dữ liệu (CSV) cho thống kê.**
- **Nhiều người dùng với quyền khác nhau.** v1 có cột `users.is_admin` nhưng mọi người dùng
  đăng nhập được đều làm được mọi việc.

## Cố ý KHÔNG làm

Giữ ở đây để không ai hỏi lại: heatmap, session recording, funnel, attribution/conversion,
affiliate, custom domain, chat AI, MCP. Lý do ở ADR-001. Multi-tenant cũng vậy — cần thì fork
và thêm, bản này không để sẵn một cột `organization_id` mà không route nào lọc theo.
