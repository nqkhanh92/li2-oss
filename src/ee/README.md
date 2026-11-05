# `src/ee/` — Enterprise Edition

Mã của bản thương mại. **Giấy phép riêng** — xem `LICENSE` trong chính thư mục này, nó KHÔNG phải
giấy phép của phần còn lại trong kho.

Theo mô hình Dub.co: thư mục này **ở lại trong kho công khai**, không bị gỡ khỏi bản phát hành.
"Chuyển vào `ee/`" nghĩa là **tách ranh giới và tách giấy phép**, không phải xoá.

## Quy ước — cái gì vào đây, cái gì không

| Loại | Vào `ee/`? |
|---|---|
| Feature, service, repository, helper của tính năng thương mại | **Có** |
| `page.tsx`, `route.ts` | **KHÔNG** — phải ở nguyên trong `src/app/` |

Lý do `page.tsx` ở nguyên: `src/app/(protected)/org/[org_id]/layout.tsx` là thứ cấp sidebar và
toàn bộ vỏ giao diện. Đẩy một trang sang route group khác là **mất layout đó** — UI vỡ, và vỏ
giao diện chính là tiêu chí nghiệm thu của đợt tách này.

Thay vào đó, trang và route **import từ `@/ee/...`** và được gate bằng `EDITION`.

## Bảng kiểm kê

`docs/oss-split/01-kiem-ke.md` — module nào vào đây, và vì sao.
