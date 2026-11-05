# Gói nộp ChatGPT plugin cho MCP server Li2

Thư mục này là **gói metadata** để nộp MCP server Li2 (`/api/mcp`) vào Plugin directory của ChatGPT.
Không có code server ở đây: ChatGPT nối thẳng vào endpoint `streamable-http` sẵn có, gói ZIP chỉ khai
phần trình bày (listing), chính sách và vật liệu review.

## Nguồn schema

Mọi field dưới đây đọc ngày **2026-10-20** từ:

| Nội dung | URL |
|---|---|
| Cấu trúc gói, `plugin.json`, `mcp.json`, cấu hình auth MCP | https://developers.openai.com/plugins/build/plugins (bản markdown: thêm `.md` vào URL) |
| Nộp ZIP, bảng field + giới hạn ký tự, icon, test case, video | https://developers.openai.com/plugins/deploy/submission |
| Yêu cầu review (credential test, test prompt) | https://developers.openai.com/plugins/deploy/app-review |
| Schema máy đọc | https://agent-plugins.org/schemas/1.0.0/plugin.schema.json , https://agent-plugins.org/schemas/1.0.0/mcp.schema.json |

**Một điểm vênh cần biết:** `mcp.schema.json` 1.0.0 đặt `additionalProperties: false` ở cấp server, nên
về mặt JSON Schema thuần thì khối `extensions["com.openai"].auth` trong `mcp.json` là **không hợp lệ**.
Nhưng docs OpenAI nói rõ phải khai auth ở đúng chỗ đó ("Declare authentication under each server's
`extensions["com.openai"].auth` object in `mcp.json`") và "The portal reads advanced authentication
settings from your package's `mcp.json`". Bên tiêu thụ gói là portal OpenAI, nên gói này theo docs
OpenAI. Script validate vì thế **không** chạy JSON Schema 1.0.0 nguyên bản mà kiểm theo bảng field của
docs OpenAI. Nếu portal báo lỗi `extensions` khi upload, bỏ khối đó khỏi `mcp.json` và khai auth bằng
tay trong mục **MCPs → Connect**.

## Nội dung gói

```
plugin/chatgpt/
├── plugin.json   # identity + listing + review (Agent Plugins 1.0.0 + extensions."com.openai")
├── mcp.json      # 1 server streamable-http + OAuth CIMD, scope read/write
└── assets/       # trống trong repo; icon được copy vào lúc build
```

ZIP xuất ra có `plugin.json`, `mcp.json`, `assets/icon.svg`, `assets/logo.svg`.

Không đóng gói `skills/`, `hooks/`, `.app.json`: ZIP chứa `apps` hoặc lifecycle hooks **không nộp được**.

## Build ZIP

```bash
yarn plugin:validate                 # chỉ validate, không ghi file
yarn plugin:zip                      # → dist/li2-chatgpt-plugin.zip (prod app.li2.ai)
```

Tham số hoá qua biến môi trường:

| Biến | Mặc định | Dùng khi |
|---|---|---|
| `BASE_URL` | `https://app.li2.ai` | đổi host của `websiteURL` / `supportURL` / `privacyPolicyURL` / `termsOfServiceURL` |
| `MCP_URL` | `${BASE_URL}/api/mcp` | endpoint MCP, nếu khác đường mặc định |
| `DEMO_URL` | (rỗng) | URL video walkthrough, chèn vào `review.demo_recording_url` |
| `OUT` | `dist/li2-chatgpt-plugin.zip` | đổi đường ra |

Gói thử trên LiHi (chỉ để test, **không nộp bản này**):

```bash
BASE_URL=https://app.example.com yarn plugin:zip
```

Bản nộp thật phải trỏ prod `https://app.li2.ai/api/mcp`, nghĩa là **phải deploy wave MCP lên prod trước**.

Script dùng `zip` CLI (`child_process`) chứ không thêm dependency: repo không có `archiver` hay
`adm-zip`, và gói này chỉ build vài lần một năm. macOS và phần lớn Linux có `zip` sẵn.

Icon: copy từ `public/images/mini_logo.svg` (SVG 200×200, vuông, ≥48×48 → đạt yêu cầu "PNG, JPEG, WebP,
SVG, ≤5 MiB, vuông, ≥48×48"). **Không cần tạo PNG.** Chỉ nếu dashboard từ chối SVG thì mới cần PNG
512×512 (việc thiết kế, không tự vẽ).

## Nộp ở đâu

1. `https://platform.openai.com/plugins` → **Upload new or existing plugin**.
2. Chọn **Developer identity** đã verify, upload ZIP → mở draft.
3. **Metadata & Skills**: đọc Issues, sửa trong gói, upload lại (dashboard không cho sửa tay field đã
   import từ ZIP).
4. **MCPs → Connect**: portal đọc auth từ `mcp.json`, đăng nhập tài khoản test rồi scan 21 tool.
5. **Submit for review**: nhập reviewer credential ở form bảo mật (ZIP **không** được chứa
   `test_credentials` / `reviewer_instructions` — validator chặn sẵn).

## Checklist review

### Field bắt buộc đã có trong gói

- `plugin.json`: `$schema`, `name` (`li2`), `version`, `description`, `author`.
- `interface`: `displayName` ≤30, `shortDescription` ≤30, `longDescription` ≤4000, `developerName` ≤80,
  `category`, 4 URL HTTPS (`websiteURL`, `supportURL`, `privacyPolicyURL`, `termsOfServiceURL`),
  `logo` + `composerIcon`, `brandColor` / `brandColorDark`.
- `review`: 5 test case dương (đủ `description`, `prompt`, `tools_triggered`, `expected_behavior`),
  3 test case âm, `commerce: false`.
- `mcp.json`: đúng **1** server (portal chỉ nối được 1 server/plugin, và `review.test_cases` ở cấp
  plugin yêu cầu đúng 1 server), `type: streamable-http`, URL HTTPS, `auth.type: oauth`,
  `client.mode: cimd`, `baseScopes: ["read","write"]` — khớp `MCP_SCOPES` trong
  `src/core/services/mcp-oauth.service.ts:78`.

### 5 test case dương (nguồn: bằng chứng e2e thật)

Lấy từ `docs/artifact-mcp-checklist-kiem-chung.md` mục "E2E thật qua claude.ai connector (LiHi, org
test, 20/10)" và `docs/shortlink-mcp-spec-dev.md` mục SL-4 — tất cả đều là bước đã chạy thật, không
phải giả định.

| # | Việc | Tool | Nguồn |
|---|---|---|---|
| 1 | Publish trang HTML một file, nhận serve URL + QR | `list_orgs`, `publish_artifact` | E2E bước 1 |
| 2 | Đổi slug trang rồi đọc lại, slug cũ vẫn sống | `set_artifact_slug`, `get_artifact` | E2E bước 2–3 |
| 3 | Tạo short link kèm QR | `create_short_link` | SL-4 bước create |
| 4 | Đổi đích short link rồi đọc lại đích | `update_short_link`, `get_short_link` | SL-4 bước update + get |
| 5 | Báo cáo click, nói rõ khi không có click | `get_analytics_summary`, `get_top_links` | tool analytics sẵn có |

### 3 test case âm

| # | Prompt kiểm | Phải xảy ra | Nguồn |
|---|---|---|---|
| 1 | Xoá short link đang phục vụ một artifact | từ chối, artifact nguyên vẹn | SL-4: "Thử `delete_short_link` với id artifact → phải bị từ chối" |
| 2 | Liệt kê + xoá short link của org mình không thuộc | từ chối, không rò dữ liệu org khác | gate org của MCP |
| 3 | Gửi email + thu tiền (không có tool nào làm được) | từ chối, không bịa kết quả | `plugin-guidelines` |

### Việc ngoài code — chủ sản phẩm phải làm trước khi nộp

1. **Verified developer**: hoàn tất individual/business verification tại
   `platform.openai.com/settings/organization/general`. Người nộp phải là org owner hoặc có quyền
   **Apps Management Write**.
2. **Tài khoản ChatGPT Business/Enterprise/Edu** để test tool `write` (Pro chỉ chạy được tool read).
3. **Video walkthrough** 2–3 phút, URL reviewer mở được → truyền qua `DEMO_URL`.
4. **Tài khoản test Li2** trên prod, có sẵn dữ liệu mẫu, **không MFA**, không hết hạn, dùng được từ
   ngoài mạng nội bộ. Nhập ở form dashboard, không nhập vào ZIP.
5. **Nội dung `/privacy` và `/terms`** trên prod phải nêu: loại dữ liệu cá nhân thu thập, mục đích,
   nhóm bên nhận, thời gian lưu, quyền kiểm soát của người dùng. `src/app/(public)/privacy` và
   `src/app/(public)/terms` đã có route; **chưa có `/support`** — gói khai `https://app.li2.ai/support`
   nên phải tạo trang này, nếu không metadata check sẽ báo URL không mở được ("Public URLs must be
   accessible"). Đổi `supportURL` sang trang khác cũng được, miễn là HTTPS và mở công khai.
6. **Domain verification**: đặt token thuần text tại `https://app.li2.ai/.well-known/openai-apps-challenge`
   (trả đúng token, không JSON) nếu portal yêu cầu.
7. **Chốt `category`** theo danh sách thật trên dashboard (gói đang để `Productivity`) và chốt
   `developerName` + `author` theo đúng pháp nhân nộp.
8. **Deploy MCP wave lên prod** `app.li2.ai` trước khi nộp.
