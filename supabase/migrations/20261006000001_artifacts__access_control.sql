-- Quyền xem artifact: public / private / password / google (wave 3, việc 2, pha 1).
--
-- VÌ SAO CÓ FILE NÀY
--
-- Hôm nay mọi artifact công khai với bất kỳ ai có link và bảng `artifacts` không có cột nào để đổi
-- điều đó (11 cột ở 20260928000001 + `updated_at` ở 20261005000001). Bốn cột mới cho `/a/<token>`
-- biết phải dựng cổng nào trước khi phục vụ bytes. Spec: docs/artifact-wave3-access-control.md R1.
--
-- - `access_mode`     DEFAULT 'public' → mọi hàng đang có giữ nguyên hành vi hôm nay (A1: count = 0).
--                     'google' nằm trong CHECK từ pha 1 để pha 2 không cần migration thứ hai.
-- - `password_hash`   chuỗi `scrypt$N$r$p$<salt>$<key>` do Node tạo (R4). Không bao giờ ra DTO.
-- - `access_version`  TĂNG 1 mỗi lần PATCH đổi chế độ HOẶC đổi mật khẩu. Cookie phiên người xem mang
--                     giá trị này; lệch là phiên chết. Không phải `password_version`: một phiên Google
--                     phải chết khi chủ chuyển sang Mật khẩu rồi quay lại Google (spec §8.4).
-- - `password_set_at` nguồn cho dòng "Đặt lúc …" trên dashboard. NULL khi không ở chế độ mật khẩu.
--
-- Ba hàm SQL hiện có KHÔNG sửa: `artifact_create_if_within_quota` INSERT không liệt kê cột mới nên
-- nhận default; `artifact_publish_if_within_quota` và `artifact_replace_if_within_quota` `RETURNING *`
-- nên trả luôn cột mới. Thay file KHÔNG tăng `access_version` — cố ý, ghim bằng test (A18).
--
-- IF NOT EXISTS / DROP IF EXISTS để file này re-runnable, cùng tinh thần 20261005000001.

ALTER TABLE "public"."artifacts"
  ADD COLUMN IF NOT EXISTS "access_mode"     text        NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "password_hash"   text,
  ADD COLUMN IF NOT EXISTS "access_version"  integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "password_set_at" timestamp with time zone;

ALTER TABLE "public"."artifacts" DROP CONSTRAINT IF EXISTS "artifacts_access_mode_check";
ALTER TABLE "public"."artifacts" ADD CONSTRAINT "artifacts_access_mode_check"
  CHECK (access_mode IN ('public', 'private', 'password', 'google'));

-- Mật khẩu và chế độ phải đi cùng nhau: không có hàng 'password' mà thiếu hash, không có hash mồ côi.
ALTER TABLE "public"."artifacts" DROP CONSTRAINT IF EXISTS "artifacts_password_hash_check";
ALTER TABLE "public"."artifacts" ADD CONSTRAINT "artifacts_password_hash_check"
  CHECK ((access_mode = 'password') = (password_hash IS NOT NULL));
