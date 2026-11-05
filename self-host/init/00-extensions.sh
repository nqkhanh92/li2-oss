#!/bin/bash
# Extension mà `02-schema.sql` cần, đặt trong schema `extensions` theo đúng quy ước Supabase.
#
# ## Vì sao file này tồn tại
#
# `supabase/schema.sql` được rút bằng `pg_dump --schema=public --schema=logs --schema=agent`.
# Cờ `--schema` **lọc cả extension**: những extension cài trong schema `extensions` không có
# trong bản dump, nhưng ba câu lệnh trong đó vẫn gọi tới chúng —
#
#     CREATE INDEX ... USING gin (action extensions.gin_trgm_ops)
#
# Thiếu chúng thì psql dừng ở dòng 27208 với `schema "extensions" does not exist`, và vì initdb
# chạy với `ON_ERROR_STOP=1`, **8000 dòng cuối không chạy** — trong đó có toàn bộ 976 lệnh GRANT.
# Triệu chứng thấy được: 129 bảng có đủ, nhưng mọi truy vấn PostgREST trả 403.
#
# Chạy trước `01-roles.sh` theo thứ tự tên file.

set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE SCHEMA IF NOT EXISTS extensions;

-- pg_trgm: ba chỉ mục GIN trên `logs.org_audit_logs` dùng `extensions.gin_trgm_ops`.
CREATE EXTENSION IF NOT EXISTS pg_trgm       WITH SCHEMA extensions;
-- uuid-ossp + pgcrypto: khoá chính UUID và hàm băm, dùng rải rác trong 125 bảng.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto      WITH SCHEMA extensions;

-- Phần GRANT nằm ở `01-roles.sh`, không phải ở đây: lúc file này chạy thì ba vai trò
-- anon/authenticated/service_role còn CHƯA tồn tại.
EOSQL
