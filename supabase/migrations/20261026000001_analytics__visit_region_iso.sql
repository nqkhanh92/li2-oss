-- Cột mã tỉnh ISO 3166-2 cho `visits`, cộng cột IP đã cắt.
--
-- VÌ SAO CÓ FILE NÀY
--
-- Card "Theo vị trí" cần nhóm lượt truy cập theo tỉnh. Hôm nay việc nhóm xảy ra ở TypeScript,
-- trên cột `visits.city` — mà cột đó chứa **TÊN** tỉnh dạng tự do, không phải mã, và cùng một
-- tỉnh đến dưới nhiều tên ("Ho Chi Minh", "Ho Chi Minh City", "Ho Chi Minh City (HCMC)").
-- Nhóm theo tên tự do thì không nhóm được trong SQL, và mỗi lần nguồn GeoIP đổi cách viết là
-- bản đồ lệch một ít mà không ai thấy.
--
-- VÌ SAO KHÔNG DÙNG LUÔN CỘT `region`
--
-- `region` nhìn có vẻ đúng việc vì nó mang MÃ. Nhưng đo trên LiHi 2026-10-26, toàn bộ lượt VN:
--
--     region='SG'     city='Ho Chi Minh'             105 lượt
--     region='VN-SG'  city='Ho Chi Minh City'         43 lượt
--     region=''       city='Hanoi'                    15 lượt
--
-- Ba dạng cho hai tỉnh, và Hà Nội **không có mã nào**. Nguyên nhân nằm ở bộ sinh dữ liệu GeoIP
-- (`~/lihi/geoip/gen/main.go`, phần "ÁNH XẠ TRƯỜNG"): DB-IP — nguồn của gần như toàn bộ IP —
-- **không có cột mã vùng** (`city.csv` chỉ có dải IP, châu, quốc gia, TÊN vùng, tên thành phố,
-- toạ độ), nên `region` rỗng; chỉ các dải Apple Private Relay mới mang mã ISO thật.
--
-- Nên **mã là tín hiệu chắc nhưng thưa, tên là tín hiệu dày nhưng nhiều cách viết.** Cột
-- `region_iso` dưới đây được điền từ CẢ HAI, mã trước rồi mới tên — xem
-- `scripts/backfill-visit-region-iso.ts` và `resolveProvinceByIsoCode` /
-- `resolveVietnamProvince` trong `src/shared/constants/vietnam-provinces.ts`.
--
-- VÌ SAO KHÔNG CÓ BẢNG TRA TRONG DB
--
-- Đặc tả yêu cầu "bảng remap boundary_version". Bảng remap **tồn tại**, nhưng nằm trong code
-- chứ không trong DB: `LEGACY_ISO_CODES` (63 mã ISO thời trước sáp nhập → tên tỉnh cũ) cộng
-- `aliases` của 34 tỉnh. Chép nó xuống SQL sẽ thành bản thứ hai của cùng một sự thật, và bản
-- nào lệch thì bản đồ sai im lặng. Không có gì trong hệ thống cần tra tỉnh **trong** SQL, nên
-- một bảng như vậy sẽ không ai đọc. Cột `region_boundary_version` ghi lại tỉnh được tính theo
-- bộ ranh giới NÀO, để lần sáp nhập sau còn dịch được những hàng đã ghi.
--
-- CHẠY LẠI ĐƯỢC. Toàn bộ file dùng `if not exists`, và lần backfill `ip_prefix` chỉ chạm hàng
-- `ip_prefix is null`. Không xoá, không ghi đè dữ liệu click cũ.
--
-- ⚠ CỘT `ip` VẪN CÒN. Đặc tả nói "không giữ IP thô sau resolve", và `ip_prefix` là nửa dựng
-- sẵn cho việc đó, nhưng file này **không** bỏ `ip`. Bỏ một cột là không lùi được, mà LiHi thì
-- không khôi phục được. ⚠ Và bỏ nó KHÔNG hề rẻ: audit 2026-10-26 cho thấy `li2-worker` INSERT
-- nêu tên cột `ip` tường minh (bỏ cột ⇒ mọi lượt ghi visit lỗi), và RPC `get_raw_visit_data_v4`
-- đọc `v.ip` rồi trả ra UI cho khách hàng (bỏ cột ⇒ `analytics/raw-visits` 500). Phải sửa hai
-- chỗ đó TRƯỚC. Chi tiết ở `docs/_trang-thai-hien-tai.md` mục 2.

alter table public.visits
  add column if not exists region_iso text,
  add column if not exists region_boundary_version text,
  add column if not exists ip_prefix inet;

comment on column public.visits.region_iso is
  'Mã ISO 3166-2 của tỉnh/vùng, suy ra từ `region` (mã) trước rồi `city` (tên). NULL = chưa nhận ra, cố ý — xem scripts/backfill-visit-region-iso.ts';
comment on column public.visits.region_boundary_version is
  'Bộ ranh giới hành chính mà `region_iso` được tính theo, ví dụ `vn-2025-07` (34 tỉnh sau sáp nhập 01/07/2025)';
comment on column public.visits.ip_prefix is
  'IP đã cắt phần host: IPv4 /24, IPv6 /48. Dựng cho ngày bỏ cột `ip` thô.';

-- Nhóm theo tỉnh luôn nằm trong phạm vi một tổ chức, nên index đi theo cặp đó. Lọc
-- `region_iso is not null` giữ index nhỏ: phần lớn hàng cũ sẽ còn NULL cho tới khi backfill xong,
-- và hàng NULL không bao giờ là kết quả của một câu nhóm theo tỉnh.
create index if not exists idx_visits_org_region_iso
  on public.visits (organization_id, region_iso)
  where region_iso is not null;

-- Cắt IP. `network(set_masklen(...))` xoá hẳn phần host — `set_masklen` một mình chỉ đổi mặt nạ
-- mà vẫn giữ đủ bit host, tức là vẫn còn IP thô trong cột.
update public.visits
set ip_prefix = case
  when family(ip) = 4 then network(set_masklen(ip, 24))
  else network(set_masklen(ip, 48))
end
where ip_prefix is null and ip is not null;
