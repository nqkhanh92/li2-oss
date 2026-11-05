# Li2UI — bố cục lại Artifact theo pattern Short link

Thư mục tài liệu thiết kế, không chứa code chạy. Ngày 2026-10-06, nhánh `feat/artifact`.

| File | Nội dung | Cách xem |
|---|---|---|
| `01-phan-tich-shortlink-vs-artifact.md` | Bản đồ màn hình Short link và Artifact hiện tại (kèm `file:line`), bảng đối chiếu từng màn phân loại lệch pattern / khác bản chất / chờ dữ liệu, và đề xuất bố cục lại cho từng màn | Mở bằng trình đọc Markdown bất kỳ |
| `02-artifact-flow.html` | Sơ đồ flow tổng (người tạo và người xem) và wireframe mid-fidelity mọi màn Artifact theo bố cục đề xuất, đúng token của `src/app/globals.css`, có công tắc light/dark, chú thích thay đổi và component tái dùng bên mỗi màn | Mở trực tiếp bằng trình duyệt, không cần build, không tải tài nguyên ngoài |

Nguồn token và copy được ghi ở đầu file HTML (comment) và ở §0 của file. Copy tiếng Việt lấy từ
`public/lang/vi/artifact.json` và `src/core/helpers/artifact-landing.ts`.
