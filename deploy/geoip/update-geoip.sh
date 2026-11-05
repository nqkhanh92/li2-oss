#!/usr/bin/env bash
# Cập nhật dữ liệu tra cứu IP cho LiHi từ DB-IP Lite (CC-BY-4.0), kèm ASN và
# danh sách egress của Apple Private Relay.
#
# Chạy trên host LiHi với user cyborg. Không tham số, hoặc:
#   update-geoip.sh                 # tháng hiện tại, fallback tháng trước
#   update-geoip.sh 2026-09         # ép một tháng cụ thể
#   DRY_RUN=1 update-geoip.sh       # sinh tệp .new rồi dừng, không thay, không restart
#
# An toàn: tệp đang chạy chỉ bị thay sau khi tệp mới đã sinh xong VÀ decode lại được.
# Bản cũ luôn được giữ thành ip_country.gob.gz.prev để rollback.
#
# FAIL-OPEN với Apple. mask-api.icloud.com là dịch vụ của bên thứ ba và không
# nằm trong SLA của ai ở đây. Apple sập thì script vẫn sinh tệp như trước, chỉ
# ghi cảnh báo và bỏ bước sửa vị trí Private Relay — KHÔNG chặn cả quy trình
# cập nhật DB-IP. Hai tệp DB-IP thì vẫn fail-closed như cũ.
set -euo pipefail

GEOIP_DIR="${GEOIP_DIR:-$HOME/lihi/geoip}"
GEN_DIR="$GEOIP_DIR/gen"              # chứa main.go + go.mod của bản sinh có ASN
WORK_DIR="$GEOIP_DIR/.work"
LOG_FILE="$GEOIP_DIR/update.log"
LIVE="$GEOIP_DIR/ip_country.gob.gz"
GO_IMAGE="${GO_IMAGE:-golang:1.23-alpine}"
BE_CONTAINER="li2-be"
WORKER_CONTAINER="lihi-worker"

# Nguồn Apple Private Relay: Apple công bố vị trí thật của người dùng sau mỗi
# dải egress. Xem docs/apple-private-relay-lihi.md.
APPLE_RELAY_URL="${APPLE_RELAY_URL:-https://mask-api.icloud.com/egress-ip-ranges.csv}"

# Ngưỡng tối thiểu, đo thật 2026-10-22: city.csv.gz 85.8 MB, asn.csv.gz 7.0 MB,
# egress-ip-ranges.csv 12.0 MB (285 105 dòng, KHÔNG nén).
MIN_CITY_BYTES=$((60 * 1024 * 1024))
MIN_ASN_BYTES=$((3 * 1024 * 1024))
MIN_RELAY_BYTES=$((4 * 1024 * 1024))
MIN_OUT_BYTES=$((60 * 1024 * 1024))

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_FILE"; }
die() { log "LỖI: $*"; exit 1; }

cleanup() {
  if [[ -d "$WORK_DIR" ]]; then
    log "dọn $WORK_DIR"
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

mkdir -p "$GEOIP_DIR"
: > /dev/null  # no-op, giữ set -e yên

log "===== bắt đầu cập nhật dữ liệu IP ====="

# --- kiểm điều kiện trước khi chạm vào gì ---
[[ -f "$GEN_DIR/main.go" ]] || die "thiếu $GEN_DIR/main.go (bản sinh có ASN). Xem docs/_brief-geoip-lihi.md"
[[ -f "$GEN_DIR/go.mod" ]] || die "thiếu $GEN_DIR/go.mod"
[[ -f "$GEOIP_DIR/country-map.csv" ]] || die "thiếu $GEOIP_DIR/country-map.csv"
command -v docker >/dev/null || die "không có docker"
docker image inspect "$GO_IMAGE" >/dev/null 2>&1 || {
  log "kéo ảnh $GO_IMAGE"
  docker pull "$GO_IMAGE" >/dev/null || die "không kéo được $GO_IMAGE"
}

# Đĩa: cần chỗ cho 2 CSV nén (~93 MB) + CSV Apple (~12 MB, không nén)
# + tệp mới (~86 MB) + bản .prev (~85 MB)
AVAIL_MB=$(df -Pm "$GEOIP_DIR" | awk 'NR==2{print $4}')
[[ "$AVAIL_MB" -ge 3000 ]] || die "đĩa chỉ còn ${AVAIL_MB} MB, cần tối thiểu 3000 MB"
log "đĩa còn ${AVAIL_MB} MB"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

# --- chọn tháng: DB-IP chỉ giữ tháng hiện tại và tháng trước ---
if [[ $# -ge 1 ]]; then
  MONTHS=("$1")
else
  MONTHS=("$(date -u +%Y-%m)" "$(date -u -d '1 month ago' +%Y-%m)")
fi

MONTH=""
for m in "${MONTHS[@]}"; do
  url="https://download.db-ip.com/free/dbip-city-lite-${m}.csv.gz"
  code=$(curl -sI -m 60 -o /dev/null -w '%{http_code}' "$url" || echo 000)
  log "thử $m → HTTP $code"
  if [[ "$code" == "200" ]]; then MONTH="$m"; break; fi
done
[[ -n "$MONTH" ]] || die "không tháng nào trong ${MONTHS[*]} có bản city trên download.db-ip.com"
log "dùng bản $MONTH"

download() {
  local name="$1" dest="$2" min="$3"
  local url="https://download.db-ip.com/free/${name}-${MONTH}.csv.gz"
  log "tải $url"
  curl -fsSL --retry 4 --retry-delay 10 --retry-connrefused \
    --connect-timeout 30 --max-time 1800 -o "$dest" "$url" \
    || die "tải thất bại: $url"
  local size
  size=$(stat -c%s "$dest")
  [[ "$size" -ge "$min" ]] || die "$dest chỉ $size byte, nhỏ hơn ngưỡng $min — nghi tệp lỗi"
  gzip -t "$dest" || die "$dest không phải gzip hợp lệ"
  log "$(basename "$dest"): $size byte, gzip hợp lệ"
}

download dbip-city-lite "$WORK_DIR/city.csv.gz" "$MIN_CITY_BYTES"
download dbip-asn-lite  "$WORK_DIR/asn.csv.gz"  "$MIN_ASN_BYTES"

# --- danh sách Apple Private Relay: FAIL-OPEN, không dùng die() ---
RELAY_FILE=""
RELAY_SRC="$WORK_DIR/apple-relay.csv"
log "tải $APPLE_RELAY_URL (Apple Private Relay)"
if curl -fsSL --retry 4 --retry-delay 10 --retry-connrefused \
      --connect-timeout 30 --max-time 600 -o "$RELAY_SRC" "$APPLE_RELAY_URL"; then
  RELAY_SIZE=$(stat -c%s "$RELAY_SRC" 2>/dev/null || echo 0)
  RELAY_LINES=$(wc -l < "$RELAY_SRC" 2>/dev/null || echo 0)
  if [[ "$RELAY_SIZE" -lt "$MIN_RELAY_BYTES" ]]; then
    log "CẢNH BÁO: tệp Apple chỉ $RELAY_SIZE byte (< $MIN_RELAY_BYTES) — nghi lỗi, BỎ bước trộn"
  elif ! head -1 "$RELAY_SRC" | grep -qE '^[0-9a-fA-F.:]+/[0-9]+,[A-Z]{2},'; then
    log "CẢNH BÁO: dòng đầu tệp Apple không đúng dạng 'network,CC,region,city,' — BỎ bước trộn"
    log "  dòng đầu: $(head -c 120 "$RELAY_SRC")"
  else
    RELAY_FILE="apple-relay.csv"
    log "apple-relay.csv: $RELAY_SIZE byte, $RELAY_LINES dòng — sẽ trộn"
  fi
else
  log "CẢNH BÁO: KHÔNG tải được $APPLE_RELAY_URL — vẫn sinh tệp như cũ, BỎ bước trộn."
  log "  Hệ quả: lượt truy cập qua Apple Private Relay tiếp tục bị gán sai quốc gia (CA/KR thay vì VN)."
fi

# --- sinh tệp mới ra tên tạm, không chạm tệp đang chạy ---
cp "$GEOIP_DIR/country-map.csv" "$WORK_DIR/country-map.csv"
cp "$GEN_DIR/main.go" "$GEN_DIR/go.mod" "$WORK_DIR/"

# Tham số theo vị trí, đúng thứ tự của main.go:
#   city, out, country-map, asn, apple-relay
# Tham số 3 PHẢI là country-map.csv (Code,Name), không phải country-names.csv.
# Tham số 5 rỗng thì main.go chỉ cảnh báo và bỏ bước trộn — đó là nhánh fail-open.
log "sinh ip_country.gob.gz.new bằng $GO_IMAGE (đo 2026-10-22: 77 giây, đỉnh RAM 7,64 GiB)"
docker run --rm \
  -v "$WORK_DIR:/w" -w /w \
  -e GOFLAGS=-mod=mod \
  "$GO_IMAGE" \
  go run main.go \
    city.csv.gz \
    ip_country.gob.gz.new \
    country-map.csv \
    asn.csv.gz \
    $RELAY_FILE \
  2>&1 | tee -a "$LOG_FILE" \
  || die "sinh dữ liệu thất bại — tệp đang chạy KHÔNG bị đụng"

NEW="$WORK_DIR/ip_country.gob.gz.new"
[[ -f "$NEW" ]] || die "không thấy $NEW"
NEW_SIZE=$(stat -c%s "$NEW")
[[ "$NEW_SIZE" -ge "$MIN_OUT_BYTES" ]] \
  || die "tệp mới chỉ $NEW_SIZE byte, nhỏ hơn ngưỡng $MIN_OUT_BYTES — không thay"
log "tệp mới: $NEW_SIZE byte (bản đang chạy: $(stat -c%s "$LIVE" 2>/dev/null || echo 0) byte)"

# --- kiểm tệp mới decode được trước khi thay ---
# verify nằm ở thư mục con vì nó cũng là `package main`; hai tệp main trong
# cùng một thư mục sẽ làm `go run` báo "GeoRecord4 redeclared".
if [[ -f "$GEN_DIR/verify/verify.go" ]]; then
  log "kiểm tệp mới decode được, không chồng lấn, và tra đúng 4 IP Private Relay"
  mkdir -p "$WORK_DIR/verify"
  cp "$GEN_DIR/verify/verify.go" "$GEN_DIR/verify/go.mod" "$WORK_DIR/verify/"
  # Không truyền IP: verify dùng bộ mặc định, trong đó có 4 IP Private Relay đã
  # đo trên bảng visits. REQUIRE_RELAY=1 chỉ khi thật sự đã trộn tệp Apple —
  # verify sẽ thoát 1 nếu KHÔNG IP mẫu nào trúng (Apple đổi vài dải thì chỉ cảnh báo).
  # Dùng if, KHÔNG dùng `[[ ... ]] && x=1`: dưới `set -e` danh sách đó trả 1 khi
  # test sai và làm script thoát ngay.
  if [[ -n "$RELAY_FILE" ]]; then REQUIRE_RELAY=1; else REQUIRE_RELAY=0; fi
  docker run --rm -v "$WORK_DIR:/w" -w /w/verify \
    -e GOFLAGS=-mod=mod -e "REQUIRE_RELAY=$REQUIRE_RELAY" "$GO_IMAGE" \
    go run verify.go ../ip_country.gob.gz.new \
    2>&1 | tee -a "$LOG_FILE" \
    || die "nghiệm thu tệp mới THẤT BẠI — không thay"
else
  log "CẢNH BÁO: thiếu $GEN_DIR/verify/verify.go, bỏ qua bước kiểm decode"
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  KEEP="$GEOIP_DIR/ip_country.gob.gz.new"
  mv "$NEW" "$KEEP"
  log "DRY_RUN=1: giữ tệp mới ở $KEEP, KHÔNG thay, KHÔNG restart. Kết thúc."
  exit 0
fi

# ===========================================================================
# ĐOẠN TỚI HẠN. Từ dòng `mv` trở xuống, tệp đang chạy ĐÃ bị thay nhưng hai
# container vẫn giữ dữ liệu cũ trong RAM. Thoát giữa đoạn này để lại hệ thống ở
# trạng thái nửa vời: tệp mới trên đĩa, dữ liệu cũ trong bộ nhớ, và không ai
# biết cho tới lần restart tình cờ sau đó.
#
# Đó chính là lỗi đã xảy ra: `chmod 644 "$LIVE"` thất bại vì tệp mới do
# container sinh ra nên thuộc root, còn script chạy bằng user cyborg. Dưới
# `set -e` lệnh đó làm script exit 1 SAU khi đã thay tệp và TRƯỚC khi restart.
#
# Vì vậy cả đoạn chạy với `set +e` và mọi lệnh tự xử lỗi. Restart là bước cuối
# và không có đường nào nhảy qua nó.
# ===========================================================================
set +e

if [[ -f "$LIVE" ]]; then
  if cp -p "$LIVE" "$GEOIP_DIR/ip_country.gob.gz.prev"; then
    log "đã lưu bản cũ → ip_country.gob.gz.prev"
  else
    log "CẢNH BÁO: không lưu được bản cũ → .prev. Rollback sẽ không có bản sao lưu."
  fi
fi

if ! mv "$NEW" "$LIVE"; then
  log "LỖI: không thay được $LIVE — tệp đang chạy còn nguyên, KHÔNG restart."
  set -e
  exit 1
fi
log "đã thay $LIVE"

# chmod KHÔNG được làm đổ script: tệp vừa `mv` vào thuộc root (container sinh
# ra), user cyborg không chmod được. Quyền mặc định 644 từ container đã đúng.
if ! chmod 644 "$LIVE" 2>/dev/null; then
  log "CẢNH BÁO: không chmod được $LIVE (tệp thuộc root, script chạy bằng $(id -un)) — bỏ qua."
  log "  quyền hiện tại: $(stat -c '%A %U:%G' "$LIVE" 2>/dev/null || echo 'không đọc được')"
fi

# --- restart cả hai consumer: cả li2-be và lihi-worker đều nạp tệp này một lần
#     lúc khởi động. Chính lihi-worker mới là nơi ghi cột asn/isp của visits. ---
RESTART_FAIL=0
for c in "$BE_CONTAINER" "$WORKER_CONTAINER"; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    log "restart $c"
    if ! docker restart "$c" >/dev/null; then
      log "LỖI: restart $c thất bại"
      RESTART_FAIL=1
    fi
  else
    log "CẢNH BÁO: không thấy container $c đang chạy, bỏ qua"
  fi
done

set -e

if [[ "$RESTART_FAIL" == "1" ]]; then
  log "có container restart thất bại. Rollback:"
  log "  cp $GEOIP_DIR/ip_country.gob.gz.prev $LIVE && docker restart $BE_CONTAINER $WORKER_CONTAINER"
  exit 1
fi

# --- nghiệm thu: cả hai phải báo nạp thành công ---
sleep 45
FAIL=0
for c in "$BE_CONTAINER" "$WORKER_CONTAINER"; do
  if docker logs "$c" --since 3m 2>&1 | grep -q 'Load geo record success'; then
    log "$c: Load geo record success — OK"
  else
    log "$c: KHÔNG thấy 'Load geo record success' trong 3 phút qua"
    docker logs "$c" --since 3m 2>&1 | tail -20 | tee -a "$LOG_FILE"
    FAIL=1
  fi
done

if [[ "$FAIL" == "1" ]]; then
  log "NGHIỆM THU THẤT BẠI. Rollback:"
  log "  cp $GEOIP_DIR/ip_country.gob.gz.prev $LIVE && docker restart $BE_CONTAINER $WORKER_CONTAINER"
  exit 1
fi

log "RAM sau khi nạp:"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' \
  | grep -E "^($BE_CONTAINER|$WORKER_CONTAINER) " | tee -a "$LOG_FILE" || true

if [[ -n "$RELAY_FILE" ]]; then
  log "===== xong, bản $MONTH đã hoạt động (CÓ trộn Apple Private Relay) ====="
else
  log "===== xong, bản $MONTH đã hoạt động (KHÔNG trộn Apple — xem cảnh báo ở trên) ====="
fi
log "Kiểm quốc gia của lượt qua Private Relay (CA/KR phải biến mất, chuyển sang VN):"
log "  docker exec -i supabase-db psql -U supabase_admin -d postgres -At -c \\"
log "    \"select country, count(*) from visits where created_at > now() - interval '1 hour'\\"
log "     group by 1 order by 2 desc\""
log "Kiểm cột asn của visits sau khi có lượt truy cập mới:"
log "  docker exec -i supabase-db psql -U supabase_admin -d postgres -At -c \\"
log "    \"select count(*) filter (where asn ~ '^AS[0-9]+\$') as co_asn, count(*) as tong\\"
log "     from visits where created_at > now() - interval '1 hour'\""
