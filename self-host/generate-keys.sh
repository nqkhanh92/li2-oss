#!/usr/bin/env bash
# Sinh mọi bí mật mà bản self-host cần, ghi thẳng vào `.env`.
#
# Supabase không có "khoá anon" và "khoá service" tách rời: cả hai là **JWT ký bằng cùng một
# JWT_SECRET**, chỉ khác trường `role` bên trong. Nghĩa là không tải chúng từ đâu được — phải
# tự ký. Đó là việc của script này.
#
#   ./generate-keys.sh          # sinh những khoá còn trống, giữ nguyên khoá đã có
#   ./generate-keys.sh --force  # ký lại tất cả (sẽ làm MẤT quyền truy cập dữ liệu cũ)
#
# ⚠ `--force` đổi JWT_SECRET. Mọi khoá cũ lập tức vô hiệu, và nếu đã có dữ liệu trong Storage
# thì đường dẫn ký sẵn cũng hỏng theo. Chỉ dùng khi dựng lại từ đầu.

set -euo pipefail
cd "$(dirname "$0")"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

[ -f .env ] || { echo "Chưa có .env — chạy: cp .env.example .env"; exit 1; }

command -v openssl >/dev/null || { echo "Cần openssl"; exit 1; }
command -v python3 >/dev/null || { echo "Cần python3 để ký JWT"; exit 1; }

# Đặt một biến trong .env: có dòng rồi thì thay, chưa có thì thêm.
set_var() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" .env; then
    python3 - "$key" "$val" <<'PY'
import sys, re
key, val = sys.argv[1], sys.argv[2]
src = open('.env').read()
open('.env','w').write(re.sub(rf'^{re.escape(key)}=.*$', f'{key}={val}', src, flags=re.M))
PY
  else
    printf '%s=%s\n' "$key" "$val" >> .env
  fi
}

# Giá trị hiện tại của một biến, rỗng nếu chưa đặt.
get_var() { sed -nE "s/^$1=(.*)$/\1/p" .env | head -1; }

need() { [ "$FORCE" = 1 ] || [ -z "$(get_var "$1")" ]; }

for k in POSTGRES_PASSWORD CASDOOR_DB_PASSWORD REDIS_PASSWORD; do
  if need "$k"; then
    set_var "$k" "$(openssl rand -hex 24)"
    echo "✓ $k"
  else
    echo "· $k đã có, giữ nguyên"
  fi
done

if need JWT_SECRET; then
  JWT_SECRET="$(openssl rand -hex 32)"
  set_var JWT_SECRET "$JWT_SECRET"
  echo "✓ JWT_SECRET"
  # JWT_SECRET đổi thì hai khoá ký bằng nó phải ký lại, bất kể chúng đã có hay chưa.
  FORCE_KEYS=1
else
  JWT_SECRET="$(get_var JWT_SECRET)"
  echo "· JWT_SECRET đã có, giữ nguyên"
  FORCE_KEYS=0
fi

sign_jwt() {
  python3 - "$JWT_SECRET" "$1" <<'PY'
import base64, hashlib, hmac, json, sys

secret, role = sys.argv[1], sys.argv[2]

def b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()

# `iat`/`exp` cố định 10 năm tính từ một mốc, không dùng giờ hệ thống: máy lệch giờ lúc cài
# là thứ đã làm hỏng nhiều lần dựng Supabase, và một khoá hết hạn chỉ báo lỗi "invalid JWT".
iat = 1767225600          # 2026-01-01
exp = iat + 10 * 365 * 86400

header = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
payload = b64(json.dumps({'role': role, 'iss': 'supabase', 'iat': iat, 'exp': exp},
                         separators=(',', ':')).encode())
signing_input = f'{header}.{payload}'.encode()
sig = b64(hmac.new(secret.encode(), signing_input, hashlib.sha256).digest())
print(f'{header}.{payload}.{sig}')
PY
}

for pair in "ANON_KEY:anon" "SERVICE_KEY:service_role"; do
  key="${pair%%:*}"; role="${pair##*:}"
  if [ "$FORCE_KEYS" = 1 ] || need "$key"; then
    set_var "$key" "$(sign_jwt "$role")"
    echo "✓ $key (role=$role)"
  else
    echo "· $key đã có, giữ nguyên"
  fi
done

# Mã nguồn đọc `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_KEY`, còn compose đọc `ANON_KEY`/
# `SERVICE_KEY`. Giữ cả hai tên trỏ cùng giá trị thay vì bắt người cài chép tay.
set_var SUPABASE_ANON_KEY "$(get_var ANON_KEY)"
set_var SUPABASE_SERVICE_KEY "$(get_var SERVICE_KEY)"
set_var SUPABASE_JWT_SECRET "$(get_var JWT_SECRET)"

chmod 600 .env
echo
echo "Xong. .env đã chmod 600. Bước tiếp: docker compose up -d"
