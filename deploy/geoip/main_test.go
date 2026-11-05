// Kiểm phần trộn Apple Private Relay.
//
// Điều kiện đúng quan trọng nhất: mảng đầu ra phải SẮP XẾP TĂNG và KHÔNG CHỒNG
// LẤN. Tìm nhị phân của li2-be (src/pkg/utils/helpers/geo-record.go) và của
// lihi-worker giả định như vậy; chồng lấn một dải là tra sai âm thầm, không báo
// lỗi ở đâu cả.
//
//	cd deploy/geoip && go test ./...
package main

import (
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"encoding/gob"
	"net"
	"os"
	"path/filepath"
	"testing"
)

func ip4(s string) uint32 {
	return binary.BigEndian.Uint32(net.ParseIP(s).To4())
}

func key6(s string) [16]byte {
	return ipToKey16(net.ParseIP(s))
}

var testCountryNames = map[string]string{"VN": "Vietnam", "CA": "Canada", "KR": "South Korea"}
var testCCContinent = map[string]string{"VN": "AS", "CA": "NA", "KR": "AS"}

// assertSortedDisjoint4 là bài kiểm thật sự của cả WP này.
func assertSortedDisjoint4(t *testing.T, recs []GeoRecord4) {
	t.Helper()
	for i := range recs {
		if recs[i].Start > recs[i].End {
			t.Fatalf("ban ghi %d co Start > End: %d > %d", i, recs[i].Start, recs[i].End)
		}
		if i > 0 && recs[i].Start <= recs[i-1].End {
			t.Fatalf("chong lap tai %d: [%d,%d] sau [%d,%d]",
				i, recs[i].Start, recs[i].End, recs[i-1].Start, recs[i-1].End)
		}
	}
}

func assertSortedDisjoint6(t *testing.T, recs []GeoRecord6) {
	t.Helper()
	for i := range recs {
		if bytes.Compare(recs[i].Start[:], recs[i].End[:]) > 0 {
			t.Fatalf("ban ghi %d co Start > End", i)
		}
		if i > 0 && bytes.Compare(recs[i].Start[:], recs[i-1].End[:]) <= 0 {
			t.Fatalf("chong lap tai %d", i)
		}
	}
}

// lookup4 bắt chước đúng tìm nhị phân của li2-be.
func lookup4(recs []GeoRecord4, s string) *GeoRecord4 {
	n := ip4(s)
	lo, hi := 0, len(recs)-1
	for lo <= hi {
		m := (lo + hi) / 2
		if n < recs[m].Start {
			hi = m - 1
		} else if n > recs[m].End {
			lo = m + 1
		} else {
			return &recs[m]
		}
	}
	return nil
}

func TestOverlayRelay4CatDaiGiuaDai(t *testing.T) {
	// Một dải DB-IP của Cloudflare ghi Canada, bên trong có một /32 của Apple
	// nói khách ở TP. Hồ Chí Minh. Phải cắt thành ba đoạn.
	recs := []GeoRecord4{{
		Start: ip4("104.28.68.0"), End: ip4("104.28.68.255"),
		Continent: "North America", ContinentCode: "NA",
		CountryCode: "CA", Country: "Canada", Region: "Ontario", City: "Toronto",
		ISP: "Cloudflare", Org: "Cloudflare", AS: "AS13335", ASName: "CLOUDFLARENET",
	}}
	relays := []relayRange4{{
		start: ip4("104.28.68.172"), end: ip4("104.28.68.172"),
		network: "104.28.68.172/32", cc: "VN", code: "VN-SG", city: "Ho Chi Minh City",
	}}

	out, marked, orphan := overlayRelay4(recs, relays, testCountryNames, testCCContinent)
	if len(out) != 3 {
		t.Fatalf("muon 3 doan, duoc %d", len(out))
	}
	if marked != 1 || orphan != 0 {
		t.Fatalf("marked=%d orphan=%d, muon 1/0", marked, orphan)
	}
	assertSortedDisjoint4(t, out)

	// Hai đoạn ngoài giữ nguyên Canada.
	for _, i := range []int{0, 2} {
		if out[i].CountryCode != "CA" || out[i].IsPrivateRelay {
			t.Fatalf("doan %d phai giu CA va khong co dau relay, duoc %+v", i, out[i])
		}
	}

	// Đoạn giữa đổi sang Việt Nam.
	mid := out[1]
	if mid.Start != ip4("104.28.68.172") || mid.End != ip4("104.28.68.172") {
		t.Fatalf("doan giua sai bien: %d-%d", mid.Start, mid.End)
	}
	if mid.CountryCode != "VN" {
		t.Errorf("CountryCode = %q, muon VN", mid.CountryCode)
	}
	if mid.Country != "Vietnam" {
		t.Errorf("Country = %q, muon Vietnam (phai tra tu country-map, khong de trong)", mid.Country)
	}
	if mid.ContinentCode != "AS" || mid.Continent != "Asia" {
		t.Errorf("luc dia = %q/%q, muon AS/Asia", mid.ContinentCode, mid.Continent)
	}
	if mid.RegionCode != "VN-SG" {
		t.Errorf("RegionCode = %q, muon VN-SG", mid.RegionCode)
	}
	// lihi-worker ghi visits.city = record.Region, nên Region phải là tên đọc
	// được, không phải mã "VN-SG".
	if mid.Region != "Ho Chi Minh City" {
		t.Errorf("Region = %q, muon Ho Chi Minh City (worker ghi visits.city tu day)", mid.Region)
	}
	if mid.City != "Ho Chi Minh City" {
		t.Errorf("City = %q", mid.City)
	}
	if !mid.IsPrivateRelay {
		t.Error("thieu dau IsPrivateRelay")
	}
	// ASN / ISP giữ nguyên: đó là nhà mạng egress thật.
	if mid.AS != "AS13335" || mid.ISP != "Cloudflare" || mid.ASName != "CLOUDFLARENET" {
		t.Errorf("ASN/ISP bi mat: AS=%q ISP=%q ASName=%q", mid.AS, mid.ISP, mid.ASName)
	}
	if mid.Network != "104.28.68.172/32" {
		t.Errorf("Network = %q, muon CIDR cua Apple", mid.Network)
	}
}

func TestOverlayRelay4DaiApplePhuTronDai(t *testing.T) {
	recs := []GeoRecord4{{
		Start: ip4("172.225.56.0"), End: ip4("172.225.56.63"),
		CountryCode: "KR", Country: "South Korea", Region: "Seoul", City: "Seoul",
	}}
	relays := []relayRange4{{
		start: ip4("172.225.56.0"), end: ip4("172.225.56.63"),
		network: "172.225.56.0/26", cc: "VN", code: "VN-SG", city: "Ho Chi Minh City",
	}}
	out, marked, orphan := overlayRelay4(recs, relays, testCountryNames, testCCContinent)
	if len(out) != 1 {
		t.Fatalf("phu tron thi khong can cat, muon 1 ban ghi, duoc %d", len(out))
	}
	if marked != 1 || orphan != 0 {
		t.Fatalf("marked=%d orphan=%d", marked, orphan)
	}
	if out[0].CountryCode != "VN" || !out[0].IsPrivateRelay {
		t.Fatalf("khong ghi de: %+v", out[0])
	}
	assertSortedDisjoint4(t, out)
}

func TestOverlayRelay4DaiAppleVatQuaNhieuDaiDBIP(t *testing.T) {
	recs := []GeoRecord4{
		{Start: ip4("10.0.0.0"), End: ip4("10.0.0.99"), CountryCode: "CA", Country: "Canada"},
		{Start: ip4("10.0.0.100"), End: ip4("10.0.0.199"), CountryCode: "KR", Country: "South Korea"},
		{Start: ip4("10.0.0.200"), End: ip4("10.0.0.255"), CountryCode: "CA", Country: "Canada"},
	}
	relays := []relayRange4{{
		start: ip4("10.0.0.50"), end: ip4("10.0.0.220"),
		network: "10.0.0.50-220", cc: "VN", code: "VN-SG", city: "Ho Chi Minh City",
	}}
	out, marked, orphan := overlayRelay4(recs, relays, testCountryNames, testCCContinent)
	if orphan != 0 {
		t.Fatalf("orphan=%d", orphan)
	}
	// Dải Apple chạm cả ba bản ghi, nên phải có 3 đoạn mang dấu relay.
	if marked != 3 {
		t.Fatalf("marked=%d, muon 3", marked)
	}
	assertSortedDisjoint4(t, out)

	// Mọi IP trong dải Apple phải tra ra VN; ngoài dải thì giữ nguyên.
	for _, s := range []string{"10.0.0.50", "10.0.0.99", "10.0.0.100", "10.0.0.150", "10.0.0.199", "10.0.0.200", "10.0.0.220"} {
		r := lookup4(out, s)
		if r == nil {
			t.Fatalf("%s khong tra duoc", s)
		}
		if r.CountryCode != "VN" || !r.IsPrivateRelay {
			t.Errorf("%s -> cc=%s relay=%v, muon VN/true", s, r.CountryCode, r.IsPrivateRelay)
		}
	}
	for _, s := range []string{"10.0.0.0", "10.0.0.49", "10.0.0.221", "10.0.0.255"} {
		r := lookup4(out, s)
		if r == nil {
			t.Fatalf("%s khong tra duoc", s)
		}
		if r.IsPrivateRelay {
			t.Errorf("%s bi danh dau relay oan", s)
		}
	}
	// Không IP nào trong 0..255 bị mất sau khi cắt.
	for n := ip4("10.0.0.0"); n <= ip4("10.0.0.255"); n++ {
		if lookup4(out, net.IPv4(10, 0, 0, byte(n&0xff)).String()) == nil {
			t.Fatalf("mat IP 10.0.0.%d sau khi cat", n&0xff)
		}
	}
}

func TestOverlayRelay4KhongMatIPOCuoiKhongGianDiaChi(t *testing.T) {
	// Bẫy tràn uint32: dải kết thúc đúng 255.255.255.255.
	recs := []GeoRecord4{{
		Start: ip4("255.255.255.0"), End: ip4("255.255.255.255"),
		CountryCode: "CA", Country: "Canada",
	}}
	relays := []relayRange4{{
		start: ip4("255.255.255.128"), end: ip4("255.255.255.255"),
		network: "255.255.255.128/25", cc: "VN", code: "VN-SG", city: "Ho Chi Minh City",
	}}
	out, marked, _ := overlayRelay4(recs, relays, testCountryNames, testCCContinent)
	if marked != 1 {
		t.Fatalf("marked=%d", marked)
	}
	assertSortedDisjoint4(t, out)
	last := out[len(out)-1]
	if last.End != ip4("255.255.255.255") {
		t.Fatalf("doan cuoi ket thuc o %d, muon 4294967295 — nghi tran uint32", last.End)
	}
	if r := lookup4(out, "255.255.255.255"); r == nil || r.CountryCode != "VN" {
		t.Fatalf("255.255.255.255 tra ra %v", r)
	}
}

func TestOverlayRelay4DaiApplePhiaNgoaiBiDemLaOrphan(t *testing.T) {
	recs := []GeoRecord4{{Start: ip4("10.0.0.0"), End: ip4("10.0.0.255"), CountryCode: "CA"}}
	relays := []relayRange4{
		{start: ip4("9.0.0.0"), end: ip4("9.0.0.255"), cc: "VN", city: "Ho Chi Minh City"},
		{start: ip4("10.0.0.10"), end: ip4("10.0.0.20"), cc: "VN", city: "Ho Chi Minh City"},
		{start: ip4("11.0.0.0"), end: ip4("11.0.0.255"), cc: "VN", city: "Ho Chi Minh City"},
	}
	out, marked, orphan := overlayRelay4(recs, relays, testCountryNames, testCCContinent)
	if marked != 1 {
		t.Fatalf("marked=%d, muon 1", marked)
	}
	if orphan != 2 {
		t.Fatalf("orphan=%d, muon 2 (dai 9.x va 11.x khong co dai DB-IP nao de cat)", orphan)
	}
	assertSortedDisjoint4(t, out)
}

func TestOverlayRelay6CatDai(t *testing.T) {
	recs := []GeoRecord6{{
		Start: key6("2a02:26f7:b000::"), End: key6("2a02:26f7:bfff:ffff:ffff:ffff:ffff:ffff"),
		CountryCode: "CA", Country: "Canada",
	}}
	relays := []relayRange6{{
		start:   key6("2a02:26f7:b001:4000::"),
		end:     key6("2a02:26f7:b001:4000:ffff:ffff:ffff:ffff"),
		network: "2a02:26f7:b001:4000::/64", cc: "VN", code: "VN-SG", city: "Ho Chi Minh City",
	}}
	out, marked, orphan := overlayRelay6(recs, relays, testCountryNames, testCCContinent)
	if len(out) != 3 || marked != 1 || orphan != 0 {
		t.Fatalf("len=%d marked=%d orphan=%d, muon 3/1/0", len(out), marked, orphan)
	}
	assertSortedDisjoint6(t, out)
	if out[1].CountryCode != "VN" || !out[1].IsPrivateRelay {
		t.Fatalf("doan giua: %+v", out[1])
	}
	if out[0].IsPrivateRelay || out[2].IsPrivateRelay {
		t.Fatal("doan ngoai bi danh dau oan")
	}
}

func TestInc16Dec16(t *testing.T) {
	var zero [16]byte
	if _, ok := dec16(zero); ok {
		t.Error("dec16(::) phai bao tran")
	}
	var max [16]byte
	for i := range max {
		max[i] = 0xff
	}
	if _, ok := inc16(max); ok {
		t.Error("inc16(ffff..) phai bao tran")
	}
	// Mượn qua biên byte.
	b := key6("::ff")
	n, ok := inc16(b)
	if !ok || n != key6("::100") {
		t.Errorf("inc16(::ff) = %x", n)
	}
	d, ok := dec16(key6("::100"))
	if !ok || d != key6("::ff") {
		t.Errorf("dec16(::100) = %x", d)
	}
}

func TestLoadAppleRelayDocDungDinhDang(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "apple.csv")
	// Đúng định dạng thật: 5 cột, cột cuối rỗng, cột region có thể rỗng.
	body := "172.224.226.0/27,GB,GB-EN,London,\n" +
		"104.28.68.172/32,VN,VN-SG,Ho Chi Minh City,\n" +
		"172.224.240.0/28,KR,,Seoul,\n" +
		"2a02:26f7:b000:4000::/64,US,US-AK,Anchorage,\n" +
		"khong-phai-cidr,VN,VN-SG,Ho Chi Minh City,\n" +
		"10.0.0.0/8,,,Nowhere,\n"
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	v4, v6, err := loadAppleRelay(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(v4) != 3 {
		t.Fatalf("IPv4 = %d, muon 3 (bo dong khong phai CIDR va dong thieu ma quoc gia)", len(v4))
	}
	if len(v6) != 1 {
		t.Fatalf("IPv6 = %d, muon 1", len(v6))
	}
	// Đã sắp xếp theo start.
	for i := 1; i < len(v4); i++ {
		if v4[i].start < v4[i-1].start {
			t.Fatal("IPv4 chua sap xep")
		}
	}
	// Biên /32 và /27.
	var found32, found28 bool
	for _, r := range v4 {
		if r.network == "104.28.68.172/32" {
			found32 = true
			if r.start != ip4("104.28.68.172") || r.end != ip4("104.28.68.172") {
				t.Errorf("/32 sai bien: %d-%d", r.start, r.end)
			}
			if r.cc != "VN" || r.code != "VN-SG" || r.city != "Ho Chi Minh City" {
				t.Errorf("/32 sai noi dung: %+v", r)
			}
		}
		if r.network == "172.224.240.0/28" {
			found28 = true
			if r.start != ip4("172.224.240.0") || r.end != ip4("172.224.240.15") {
				t.Errorf("/28 sai bien: %d-%d", r.start, r.end)
			}
			if r.code != "" {
				t.Errorf("region rong phai cho ra code rong, duoc %q", r.code)
			}
		}
	}
	if !found32 || !found28 {
		t.Fatal("thieu dai /32 hoac /28")
	}
	// IPv6 /64.
	if v6[0].start != key6("2a02:26f7:b000:4000::") ||
		v6[0].end != key6("2a02:26f7:b000:4000:ffff:ffff:ffff:ffff") {
		t.Errorf("IPv6 /64 sai bien: %x - %x", v6[0].start, v6[0].end)
	}
}

func TestDedupRelay4CatDaiChongLan(t *testing.T) {
	in := []relayRange4{
		{start: 100, end: 200, cc: "VN"},
		{start: 150, end: 180, cc: "KR"}, // lồng hoàn toàn -> bỏ
		{start: 190, end: 300, cc: "US"}, // chồng đầu -> cắt thành 201..300
		{start: 400, end: 500, cc: "GB"},
	}
	out := dedupRelay4(in)
	if len(out) != 3 {
		t.Fatalf("len=%d, muon 3: %+v", len(out), out)
	}
	if out[1].start != 201 || out[1].end != 300 {
		t.Errorf("dai thu hai = %d-%d, muon 201-300", out[1].start, out[1].end)
	}
	var lastEnd uint32
	for i, r := range out {
		if i > 0 && r.start <= lastEnd {
			t.Fatalf("van con chong lan tai %d", i)
		}
		lastEnd = r.end
	}
}

// ---------------------------------------------------------------------------
// TƯƠNG THÍCH GOB — bài kiểm quan trọng nhất của WP này.
//
// li2-be và lihi-worker đang chạy code KHÔNG có trường IsPrivateRelay. Nếu tệp
// mới làm hai dịch vụ đó vỡ lúc decode thì cả hai sập ngay khi khởi động
// (InitGeoRecord gọi global.Logger.Fatal khi decode lỗi).
// ---------------------------------------------------------------------------

// Bản sao NGUYÊN VĂN struct của li2-be, src/internal/models/geo-record.model.go,
// đọc 2026-10-22. Không có IsPrivateRelay.
type legacyGeoRecord4 struct {
	Start         uint32
	End           uint32
	Network       string
	Continent     string
	ContinentCode string
	CountryCode   string
	Country       string
	Region        string
	RegionCode    string
	City          string
	ISP           string
	Org           string
	AS            string
	ASName        string
}

type legacyGeoRecord6 struct {
	Start         [16]byte
	End           [16]byte
	Network       string
	Continent     string
	ContinentCode string
	CountryCode   string
	Country       string
	Region        string
	RegionCode    string
	City          string
	ISP           string
	Org           string
	AS            string
	ASName        string
}

type legacyGeoData struct {
	IPv4 []legacyGeoRecord4
	IPv6 []legacyGeoRecord6
}

func TestTepMoiDecodeDuocBangStructCuCuaLi2BE(t *testing.T) {
	data := GeoData{
		IPv4: []GeoRecord4{
			{Start: 1, End: 10, CountryCode: "CA", Country: "Canada", Region: "Ontario", City: "Toronto", AS: "AS13335", ISP: "Cloudflare"},
			{
				Start: 11, End: 20, CountryCode: "VN", Country: "Vietnam",
				Region: "Ho Chi Minh City", RegionCode: "VN-SG", City: "Ho Chi Minh City",
				AS: "AS13335", ISP: "Cloudflare", Network: "104.28.68.172/32",
				IsPrivateRelay: true,
			},
		},
		IPv6: []GeoRecord6{
			{Start: key6("::1"), End: key6("::ff"), CountryCode: "VN", Country: "Vietnam", IsPrivateRelay: true},
		},
	}

	path := filepath.Join(t.TempDir(), "ip_country.gob.gz")
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	gz := gzip.NewWriter(f)
	if err := gob.NewEncoder(gz).Encode(&data); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}

	rf, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer rf.Close()
	rgz, err := gzip.NewReader(rf)
	if err != nil {
		t.Fatal(err)
	}
	var legacy legacyGeoData
	if err := gob.NewDecoder(rgz).Decode(&legacy); err != nil {
		t.Fatalf("STRUCT CU KHONG DECODE DUOC TEP MOI: %v — khong duoc thay tep tren server", err)
	}
	if len(legacy.IPv4) != 2 || len(legacy.IPv6) != 1 {
		t.Fatalf("mat ban ghi: IPv4=%d IPv6=%d", len(legacy.IPv4), len(legacy.IPv6))
	}
	// Mọi trường cũ phải còn nguyên giá trị.
	got := legacy.IPv4[1]
	if got.CountryCode != "VN" || got.Country != "Vietnam" ||
		got.Region != "Ho Chi Minh City" || got.RegionCode != "VN-SG" ||
		got.City != "Ho Chi Minh City" || got.AS != "AS13335" ||
		got.ISP != "Cloudflare" || got.Network != "104.28.68.172/32" {
		t.Fatalf("truong cu bi lech sau khi them truong moi: %+v", got)
	}
	if legacy.IPv6[0].CountryCode != "VN" {
		t.Fatalf("IPv6 lech: %+v", legacy.IPv6[0])
	}
}

func TestTepCuDecodeDuocBangStructMoi(t *testing.T) {
	// Chiều ngược lại: tệp đang chạy trên server (sinh bằng bản cũ) vẫn phải đọc
	// được bằng bản mới, để verify và rollback không vỡ.
	legacy := legacyGeoData{
		IPv4: []legacyGeoRecord4{{Start: 1, End: 10, CountryCode: "VN", Country: "Vietnam"}},
		IPv6: []legacyGeoRecord6{{Start: key6("::1"), End: key6("::ff"), CountryCode: "VN"}},
	}
	path := filepath.Join(t.TempDir(), "old.gob.gz")
	f, _ := os.Create(path)
	gz := gzip.NewWriter(f)
	if err := gob.NewEncoder(gz).Encode(&legacy); err != nil {
		t.Fatal(err)
	}
	gz.Close()
	f.Close()

	rf, _ := os.Open(path)
	defer rf.Close()
	rgz, err := gzip.NewReader(rf)
	if err != nil {
		t.Fatal(err)
	}
	var data GeoData
	if err := gob.NewDecoder(rgz).Decode(&data); err != nil {
		t.Fatalf("struct moi khong doc duoc tep cu: %v", err)
	}
	if len(data.IPv4) != 1 || data.IPv4[0].CountryCode != "VN" {
		t.Fatalf("lech: %+v", data.IPv4)
	}
	if data.IPv4[0].IsPrivateRelay {
		t.Error("tep cu khong co truong nay, phai la false")
	}
}

func TestCountryNameKhongBaoGioRong(t *testing.T) {
	if got := countryName("VN", testCountryNames); got != "Vietnam" {
		t.Errorf("countryName(VN) = %q", got)
	}
	// Mã Apple không có trong country-map.csv: rơi về chính mã, không để trống,
	// vì li2-be trả thẳng Country ra API.
	if got := countryName("XX", testCountryNames); got != "XX" {
		t.Errorf("countryName(XX) = %q, muon XX", got)
	}
}
