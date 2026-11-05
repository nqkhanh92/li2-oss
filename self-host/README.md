# Tự dựng Li2

Thư mục này dựng một bản Li2 hoàn chỉnh trên máy của bạn: rút gọn link, mã QR, artifact,
analytics. Không cần tài khoản Supabase, không cần dịch vụ trả phí nào.

```bash
git clone https://github.com/<bạn>/li2.git
cd li2/self-host
cp .env.example .env
./generate-keys.sh
docker compose up -d
```

Lần `up` đầu tiên mất khoảng **15–25 phút**: Docker phải biên dịch `node-canvas` từ nguồn và nạp
129 bảng. Những lần sau tính bằng giây.

Xong thì mở <http://localhost:3000>. Nhưng trước đó còn **một bước thủ công** — xem mục Casdoor.

---

## Cần gì

| | |
|---|---|
| Docker + Docker Compose | bản nào có `docker compose` (v2) |
| RAM | 4 GB cho Docker là đủ |
| Đĩa | ~6 GB cho image |
| `openssl`, `python3` | để `generate-keys.sh` ký khoá |

---

## Bước thủ công duy nhất: tạo application trong Casdoor

Li2 dùng **Casdoor** để đăng nhập, và Casdoor không có cách khai báo application bằng file cấu
hình. Phải bấm tay một lần.

1. Mở <http://localhost:8000>, đăng nhập `admin` / `123`.
2. **Đổi mật khẩu ngay.** Mặc định của Casdoor là công khai.
3. Vào **Identity → Applications → Add**. Đặt tên tuỳ ý.
4. Mục *Redirect URLs* điền: `http://localhost:3000/auth/callback`
5. Chép **Client ID** và **Client secret**.
6. Điền bốn giá trị vào `.env`:

   ```
   NEXT_PUBLIC_CASDOOR_ORG_NAME=built-in
   NEXT_PUBLIC_CASDOOR_APP_NAME=<tên application vừa tạo>
   NEXT_PUBLIC_CASDOOR_CLIENT_ID=<Client ID>
   CASDOOR_CLIENT_SECRET=<Client secret>
   ```

7. `NEXT_PUBLIC_*` được nhúng vào bundle **lúc build**, nên phải build lại:

   ```bash
   docker compose up -d --build app
   ```

---

## ⚠ Ba cái bẫy đã thật sự làm hỏng lần cài

**Chạy HTTP trên IP LAN hay Tailscale thì đăng nhập xong bị đá về trang đăng nhập.** Cookie phiên
đặt cờ `Secure`, và trình duyệt vứt cookie `Secure` trên HTTP thường — *trừ* `localhost`, vốn
được coi là nguồn tin cậy. Không có thông báo lỗi nào. Hoặc dựng HTTPS, hoặc dùng `localhost`.

**Sửa `.env` rồi `docker compose up -d` là chưa đủ nếu biến bắt đầu bằng `NEXT_PUBLIC_`.** Next
nhúng chúng vào JavaScript lúc build. Phải `--build app`.

**`./generate-keys.sh --force` làm mất dữ liệu đang có.** Nó ký lại `JWT_SECRET`, và mọi khoá cũ
lập tức vô hiệu. Chỉ dùng khi dựng lại từ đầu.

---

## Bên trong có gì

8 container. Phần Supabase chỉ lấy **4 trong 11** dịch vụ — `docker-compose.yml` ghi rõ từng cái
được giữ hay bỏ và vì sao.

| Container | Việc |
|---|---|
| `db` | Postgres 17 + 129 bảng |
| `rest` | PostgREST — mọi truy vấn đi qua đây |
| `storage` | lưu tệp artifact |
| `kong` | cổng API, chặn mọi yêu cầu không có khoá |
| `casdoor` + `casdoor-db` | đăng nhập |
| `redis` | cache |
| `app` | Li2 (Next.js) |

Database dựng từ `../supabase/schema.sql` — đọc phần đầu file đó nếu bạn định sinh lại nó, nó có
một bước hậu xử lý bắt buộc.

---

## Bản OSS khác bản thương mại chỗ nào

`docker-compose.yml` build app với `NEXT_PUBLIC_EDITION=oss`. Sidebar khi đó có: **Overview ·
Domain riêng · Link & Artifact · Analytics · Khách hàng**.

Những phần thuộc bản thương mại — Deep Links, Dashboards, Conversions, và cả nhóm phân tích hành
vi — mã nằm ở `src/ee/` với giấy phép riêng (`src/ee/LICENSE`), và bị ẩn ở bản này.

⚠ Cờ `EDITION` **ẩn** chứ không **loại khỏi gói**. Nó là cơ chế giao diện, không phải cơ chế bảo
mật. Ranh giới giấy phép do `src/ee/LICENSE` giữ.

---

## Việc thường làm

```bash
docker compose logs -f app            # xem log
docker compose up -d --build app      # build lại sau khi đổi NEXT_PUBLIC_*
docker compose down                   # dừng, GIỮ dữ liệu
docker compose down -v                # dừng và XOÁ SẠCH dữ liệu
```

Vào thẳng database:

```bash
docker compose exec db psql -U supabase_admin -d postgres
```

---

## Tuỳ chọn: bật cụm AI

Hỏi AI, gợi ý slug và smart setup cần một endpoint tương thích OpenAI. Dùng được OpenAI, LiteLLM,
Ollama, vLLM — bất cứ cái nào nói `/v1/chat/completions`. Điền vào `.env`:

```
LI2_AI_GATEWAY_URL=https://api.openai.com/v1
LI2_AI_GATEWAY_KEY=sk-...
LI2_AI_MODEL=gpt-4o-mini
```

Bỏ trống thì cụm AI tắt, phần còn lại vẫn chạy.
