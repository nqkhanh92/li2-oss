#!/bin/bash
# Vai trò Postgres mà PostgREST và Storage cần. Chạy TRƯỚC `02-schema.sql`: schema có
# `GRANT ... TO anon` và sẽ lỗi nếu vai trò chưa tồn tại (thứ tự theo tên file).
#
# ## Vì sao là `.sh` chứ không phải `.sql`
#
# `authenticator` và `supabase_storage_admin` cần mật khẩu, mà mật khẩu nằm trong biến môi
# trường. File `.sql` trong initdb chạy qua psql và **không đọc được biến môi trường** —
# `current_setting('POSTGRES_PASSWORD')` trả rỗng. Script shell thì đọc được.
#
# ⚠ `anon` và `authenticated` KHÔNG có LOGIN. Chúng là vai trò để `authenticator` chuyển vào sau
# khi PostgREST đọc JWT; cho chúng đăng nhập trực tiếp là mở cửa thẳng vào database.

set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v pw="$POSTGRES_PASSWORD" <<'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  -- PostgREST kết nối bằng vai trò này. Tự thân nó không có quyền gì; mọi quyền đến từ việc
  -- chuyển sang một trong ba vai trò trên.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  -- Migration `buckets-objects-grants` của storage-api cấp quyền cho vai trò `postgres`.
  -- Image supabase/postgres KHÔNG tạo sẵn vai trò đó (nó dùng `supabase_admin`), nên thiếu
  -- dòng này là storage chết với: role "postgres" does not exist.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres LOGIN SUPERUSER;
  END IF;

  -- NOINHERIT, đúng như instance đang chạy thật. Quyền của nó tới qua SET ROLE chứ không
  -- tự động kế thừa.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin LOGIN CREATEROLE NOINHERIT;
  END IF;

  -- Vai trò của cụm AI: schema `agent` có 11 lệnh GRANT trỏ tới nó. Bản OSS GIỮ cụm AI nên
  -- vai trò này phải tồn tại, nếu không `schema.sql` chết ở lệnh GRANT đầu tiên.
  -- Không SUPERUSER, không BYPASSRLS — nó chỉ được đúng những gì schema cấp.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'li2_ai_agent') THEN
    CREATE ROLE li2_ai_agent LOGIN;
  END IF;
END
$$;

ALTER ROLE postgres PASSWORD :'pw';
ALTER ROLE authenticator PASSWORD :'pw';
ALTER ROLE supabase_storage_admin PASSWORD :'pw';
ALTER ROLE li2_ai_agent PASSWORD :'pw';

GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;

-- storage-api tự chạy migration của nó lúc khởi động: nó TẠO schema `storage` và các bảng
-- trong đó. Thiếu quyền CREATE trên database thì nó chết ngay với
-- "permission denied for database postgres" và container quay vòng mãi.
-- Schema `storage` cố tình KHÔNG nằm trong `supabase/schema.sql` — để storage-api tự dựng
-- đúng phiên bản migration của chính nó.
GRANT CREATE, CONNECT ON DATABASE postgres TO supabase_storage_admin;

-- storage-api chạy `set_config('role', 'service_role')` ở mỗi yêu cầu. Quyền đó đi VÒNG qua
-- `authenticator` chứ không cấp thẳng — đúng chuỗi mà instance đang chạy dùng:
--   supabase_storage_admin → authenticator → {anon, authenticated, service_role}
-- Cấp thẳng service_role cho storage admin thì nó thành thành viên trực tiếp, lệch với bản
-- tham chiếu và làm RLS hành xử khác.
GRANT authenticator TO supabase_storage_admin;

-- Xem `00-extensions.sh`: schema `extensions` tạo ở đó, quyền cấp ở đây vì lúc đó ba vai trò
-- dưới chưa tồn tại.
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- ⚠ Dòng này là thứ khiến Storage chạy được. storage-api truy vấn `migrations`, `buckets`,
-- `objects` KHÔNG kèm tên schema; không có search_path thì nó không thấy bảng nào và trả
-- 400 "DatabaseSchemaMismatch: The database schema is out of sync" ở MỌI yêu cầu — dù
-- 61 migration đã chạy xong và 10 bảng đã có đủ. Thông báo lỗi chỉ sai hướng.
ALTER ROLE supabase_storage_admin SET search_path = storage;

-- Vai trò của cụm AI cũng có search_path riêng, đúng như instance đang chạy.
ALTER ROLE li2_ai_agent SET search_path = agent;

-- ⚠ Schema `storage` phải tạo Ở ĐÂY dù storage-api tự dựng bảng bên trong nó.
--
-- Lý do: storage-api chạy mỗi yêu cầu dưới `SET ROLE service_role`, và `service_role` cần
-- USAGE trên schema đó. Thiếu USAGE thì Postgres trả 42P01 "relation \"buckets\" does not
-- exist" — nghe như thiếu bảng, thực ra là thiếu quyền — và storage-api dịch tiếp thành
-- "DatabaseSchemaMismatch: The database schema is out of sync", một thông báo sai hướng hoàn
-- toàn. Mất vài giờ mới lần ra.
--
-- ALTER DEFAULT PRIVILEGES là phần không thể thiếu: 10 bảng trong schema này do storage-api
-- tạo SAU khi script này chạy xong, nên không thể GRANT trực tiếp lên chúng.
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Chặn truy vấn chạy quá lâu. Lấy đúng giá trị instance LiHi đang dùng.
ALTER ROLE anon          SET statement_timeout = '3s';
ALTER ROLE authenticated SET statement_timeout = '8s';
ALTER ROLE authenticator SET statement_timeout = '8s';
ALTER ROLE authenticator SET lock_timeout = '8s';
EOSQL
