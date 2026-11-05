# Li2 — rút gọn link, mã QR, artifact, analytics

Nền tảng tự host để rút gọn link, sinh mã QR, xuất bản artifact (trang AI tạo ra, PDF, Word,
Excel, PowerPoint) và đo lượt truy cập. Next.js 14 + Supabase + Casdoor + Redis.

```bash
git clone <repo> li2 && cd li2/self-host
cp .env.example .env
./generate-keys.sh
docker compose up -d
```

Lần đầu mất 15–25 phút (Docker biên dịch `node-canvas`, nạp 129 bảng). Sau đó mở
<http://localhost:3000>. Còn **một bước bấm tay** để tạo application trong Casdoor —
[`self-host/README.md`](self-host/README.md) hướng dẫn từng bước và liệt kê ba cạm bẫy đã thật
sự làm hỏng lần cài.

## Có gì

- **Link** — rút gọn, slug tuỳ chọn, mật khẩu, hẹn giờ, domain riêng
- **QR** — sinh mã, tuỳ biến, gắn với link
- **Artifact** — xuất bản tệp và trang, có kiểm soát truy cập
- **Analytics** — lượt nhấp, nguồn, thiết bị, vị trí
- **Trợ lý AI** — dùng endpoint tương thích OpenAI của **chính bạn** (OpenAI, LiteLLM, Ollama,
  vLLM). Không khoá nào gửi về đâu cả.

## Bản này khác bản thương mại chỗ nào

Một kho, hai bản phát hành — mô hình Dub.co. Build với `NEXT_PUBLIC_EDITION=oss` thì các tính
năng thương mại bị ẩn: Deep Links, Dashboards, Conversions, và nhóm phân tích hành vi (Hành
trình Link, Funnels, Phân tích trang, Ghi lại phiên, Quy tắc sự kiện). Mã của chúng nằm ở
`src/ee/` dưới giấy phép riêng ([`src/ee/LICENSE`](src/ee/LICENSE)).

⚠ Cờ `EDITION` **ẩn** chứ không **loại khỏi gói**. Nó là cơ chế giao diện, không phải cơ chế
bảo mật — xem `src/shared/constants/edition.ts`.

## Phát triển

```bash
yarn install
cp self-host/.env.example .env   # rồi điền
yarn dev
yarn test                        # 3856 phép kiểm, 218 file
yarn build
```

`yarn build` cần `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REDIS_HOST` có mặt — Next nạp mã server
thật ở bước collect page data. Giá trị giả cũng được; `self-host/docker-compose.yml` làm đúng vậy.

Tài liệu kiến trúc cũ (do Google AI Studio sinh, nhiều chỗ đã lạc hậu) giữ ở
[`docs-legacy-README.md`](docs-legacy-README.md).

## Giấy phép

Phần `src/ee/` theo [`src/ee/LICENSE`](src/ee/LICENSE). **Phần còn lại chưa gắn giấy phép** —
cho tới khi có file `LICENSE` ở thư mục gốc, mặc định của luật bản quyền là **không cấp quyền
nào**. Đây là việc còn phải quyết, không phải sơ suất.
