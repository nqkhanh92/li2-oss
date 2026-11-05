// Sinh ip_country.gob.gz cho li2-be và lihi-worker từ DB-IP Lite (CC-BY-4.0).
//
// BẢN NÀY THAY THẾ ~/lihi/geoip/main.go trên server LiHi.
//
// Bản cũ có một bình luận ở đầu tệp nói rằng nó đọc được CSV ASN ở tham số thứ
// ba. Bình luận đó sai, và nó là nguồn của hai lỗi trong docs/kien-truc-lihi.md:
// tham số thứ ba của bản cũ là CSV tên quốc gia, và bản cũ không có một lệnh nào
// gán ISP / Org / AS / ASName — bốn trường đó chỉ được khai trong struct rồi bỏ
// trống. Vì vậy mọi hàng của bảng visits trên LiHi đều có asn = ” và isp = ”.
//
// Input (tham số theo vị trí, giữ nguyên thứ tự của bản cũ để ai gọi theo cách
// cũ vẫn chạy đúng):
//
//	[1] dbip-city-lite CSV  (ip_start,ip_end,continent,country,stateprov,city[,lat,lng])
//	[2] tệp .gob.gz đầu ra
//	[3] CSV mã↔tên quốc gia — TUỲ CHỌN, phải là country-map.csv
//	[4] dbip-asn-lite CSV   (ip_start,ip_end,as_number,as_org) — TUỲ CHỌN
//	[5] Apple Private Relay CSV (network,country,region,city,) — TUỲ CHỌN
//
// [1], [4] và [5] nhận cả .csv và .csv.gz. Đọc .gz trực tiếp để khỏi giải nén
// 740 MB ra đĩa; đĩa / của LiHi chỉ còn 25 GB (đo 2026-10-22).
//
// Về [5] — APPLE PRIVATE RELAY.
//
// Nguồn: https://mask-api.icloud.com/egress-ip-ranges.csv (12 MB, 285 105 dòng
// đo 2026-10-22: 41 746 dải IPv4, 243 359 dải IPv6 /64). Apple TỰ khai người
// dùng sau mỗi dải egress thật sự ở đâu. DB-IP chỉ thấy dải đó thuộc Cloudflare
// / Akamai / Fastly nên ghi vị trí của nhà mạng — đó là lý do báo cáo LiHi có
// 15 lượt "Canada" và 4 lượt "Hàn Quốc" trong khi khách ở TP. Hồ Chí Minh.
//
// Trộn ở đây thay vì tra lúc chạy: không thêm lượt tra cho li2-be / lihi-worker,
// và danh sách được làm mới cùng nhịp cập nhật hằng tháng (Apple đổi IP liên tục
// nên danh sách tĩnh sẽ lạc hậu nhanh).
//
// GHI ĐÈ, KHÔNG PHẢI GHI THÊM: dải nào trúng danh sách Apple thì CountryCode /
// Country / Continent / ContinentCode / Region / RegionCode / City lấy theo
// Apple. ISP / Org / AS / ASName GIỮ NGUYÊN của DB-IP, vì đó là nhà mạng egress
// thật (Cloudflare) — đúng, chỉ vô dụng cho câu hỏi "khách ở đâu".
//
// ÁNH XẠ TRƯỜNG — đọc trước khi sửa. Apple cho `region` là MÃ phân vùng
// ("VN-SG"), còn DB-IP cho Region là TÊN phân vùng ("Ontario", "Jeollabuk-do").
// Hai thứ khác loại. lihi-worker ghi visits.city = record.Region
// (internal/services/visit.service.go), nên nhét "VN-SG" vào Region sẽ làm cột
// city của visits thành mã phân vùng — tệ hơn hiện trạng. Apple không công bố
// tên phân vùng, giá trị người-đọc-được duy nhất họ có là city. Vì vậy:
//
//	RegionCode = region của Apple  ("VN-SG", có thể rỗng — Apple bỏ trống nhiều dòng)
//	Region     = city của Apple    ("Ho Chi Minh City") → visits.city đúng
//	City       = city của Apple    ("Ho Chi Minh City")
//
// Đánh đổi: Region không còn là cấp phân vùng cho riêng các dải relay. Chấp
// nhận, vì thay thế duy nhất là để trống và mất luôn thông tin.
//
// CẮT DẢI. Dải Apple mịn hơn dải DB-IP (20 422 mục /32) và nằm lồng trong dải
// DB-IP, nên không thể chỉ sửa tại chỗ: một dải DB-IP bị cắt thành
// [trước | relay | sau]. Số bản ghi tăng, tệp và RAM tăng theo — xem số đo in
// ra ở cuối và docs/_brief-geoip-lihi.md. Mảng kết quả vẫn sắp xếp tăng và
// KHÔNG chồng lấn, điều kiện đúng của tìm nhị phân trong
// li2-be/src/pkg/utils/helpers/geo-record.go.
//
// TƯƠNG THÍCH GOB. Trường IsPrivateRelay là MỚI, và li2-be + lihi-worker đang
// decode tệp này vào struct CŨ không có trường đó. Đã thử thật cả hai chiều
// (2026-10-22): an toàn. encoding/gob khớp trường theo TÊN —
// "Fields (identified by name) that are in the source but absent from the
// receiving variable will be ignored." Thêm nữa, "if a field has the zero value
// for its type (...) it is omitted from the transmission", nên các dải không
// phải relay thậm chí không mang trường này trên dây. Kết luận: tệp mới đọc
// được bằng code đang chạy trên prod và LiHi, KHÔNG cần deploy đồng thời.
//
// Về [3]: thư mục geoip có hai tệp ngược cột nhau — country-map.csv là
// "Code,Name" còn country-names.csv là "Name,Code". Bản cũ lấy ô đầu làm khoá,
// nên truyền country-names.csv sẽ âm thầm để Country rơi về mã quốc gia. Bản
// này nhận cả hai chiều, nhưng usage vẫn ghi country-map.csv cho rõ.
//
// AS mang tiền tố chữ ("AS13335"), KHÔNG phải số trần. lihi-worker lọc trường
// này bằng regexp `AS\d+` ở internal/services/visit.service.go; số trần sẽ không
// khớp và cột asn vẫn rỗng dù tệp có dữ liệu.
package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"encoding/csv"
	"encoding/gob"
	"fmt"
	"io"
	"net"
	"os"
	"runtime"
	"runtime/debug"
	"sort"
	"strings"
)

type GeoRecord4 struct {
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
	// MỚI 2026-10-22. li2-be và lihi-worker decode tệp này vào struct CŨ không
	// có trường này; gob khớp trường theo tên và bỏ qua trường lạ, nên an toàn.
	// Xem "TƯƠNG THÍCH GOB" ở đầu tệp. Trường này chưa ai đọc — nó để dành cho
	// báo cáo "lọc lượt qua Private Relay" sau này.
	IsPrivateRelay bool
}

type GeoRecord6 struct {
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
	// MỚI 2026-10-22. li2-be và lihi-worker decode tệp này vào struct CŨ không
	// có trường này; gob khớp trường theo tên và bỏ qua trường lạ, nên an toàn.
	// Xem "TƯƠNG THÍCH GOB" ở đầu tệp. Trường này chưa ai đọc — nó để dành cho
	// báo cáo "lọc lượt qua Private Relay" sau này.
	IsPrivateRelay bool
}

type GeoData struct {
	IPv4 []GeoRecord4
	IPv6 []GeoRecord6
}

type asnRange4 struct {
	start, end uint32
	as, org    string
}

type asnRange6 struct {
	start, end [16]byte
	as, org    string
}

// Một dải egress của Apple Private Relay kèm vị trí thật mà Apple công bố.
type relayRange4 struct {
	start, end              uint32
	network, cc, code, city string
}

type relayRange6 struct {
	start, end              [16]byte
	network, cc, code, city string
}

var continentNames = map[string]string{
	"AF": "Africa", "AN": "Antarctica", "AS": "Asia", "EU": "Europe",
	"NA": "North America", "OC": "Oceania", "SA": "South America",
}

// Tên quốc gia, vùng và nhà mạng lặp lại hàng triệu lần trong 7,8 triệu hàng.
// Không intern thì mỗi hàng giữ bản sao riêng và RAM lúc sinh phình vô ích.
var interned = map[string]string{}

func intern(s string) string {
	if s == "" {
		return ""
	}
	if v, ok := interned[s]; ok {
		return v
	}
	interned[s] = s
	return s
}

func ipToUint32(ip net.IP) (uint32, bool) {
	ip4 := ip.To4()
	if ip4 == nil {
		return 0, false
	}
	return binary.BigEndian.Uint32(ip4), true
}

func ipToKey16(ip net.IP) [16]byte {
	var k [16]byte
	copy(k[:], ip.To16())
	return k
}

// openCSV mở tệp thường hoặc .gz và trả reader CSV đã đệm.
func openCSV(path string) (*csv.Reader, io.Closer, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	var r io.Reader = bufio.NewReaderSize(f, 1<<20)
	if strings.HasSuffix(path, ".gz") {
		gz, err := gzip.NewReader(r)
		if err != nil {
			f.Close()
			return nil, nil, fmt.Errorf("%s: khong phai gzip hop le: %w", path, err)
		}
		r = bufio.NewReaderSize(gz, 1<<20)
	}
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	cr.ReuseRecord = true
	return cr, f, nil
}

func loadCountryNames(path string) map[string]string {
	names := map[string]string{}
	cr, c, err := openCSV(path)
	if err != nil {
		// Bản cũ cũng bỏ qua lỗi ở đây và chạy tiếp với Country = mã quốc gia.
		// Giữ nguyên hành vi đó để không làm cron đổ vì một tệp phụ.
		fmt.Fprintf(os.Stderr, "CANH BAO: khong doc duoc %s (%v), Country se la ma quoc gia\n", path, err)
		return names
	}
	defer c.Close()
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if len(rec) < 2 {
			continue
		}
		a, b := strings.TrimSpace(rec[0]), strings.TrimSpace(rec[1])
		// Nhận cả "Code,Name" và "Name,Code": ô nào dài 2 ký tự in hoa là mã.
		if len(a) == 2 && a == strings.ToUpper(a) && len(b) > 2 {
			names[a] = b
		} else if len(b) == 2 && b == strings.ToUpper(b) && len(a) > 2 {
			names[b] = a
		}
	}
	return names
}

func loadASN(path string) ([]asnRange4, []asnRange6, error) {
	var v4 []asnRange4
	var v6 []asnRange6
	cr, c, err := openCSV(path)
	if err != nil {
		return nil, nil, err
	}
	defer c.Close()
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if len(rec) < 4 {
			continue
		}
		startIP := net.ParseIP(rec[0])
		endIP := net.ParseIP(rec[1])
		if startIP == nil || endIP == nil {
			continue
		}
		number := strings.TrimSpace(rec[2])
		if number == "" {
			continue
		}
		as := intern("AS" + number)
		org := intern(strings.TrimSpace(rec[3]))
		if s, ok := ipToUint32(startIP); ok {
			e, _ := ipToUint32(endIP)
			v4 = append(v4, asnRange4{start: s, end: e, as: as, org: org})
		} else {
			v6 = append(v6, asnRange6{start: ipToKey16(startIP), end: ipToKey16(endIP), as: as, org: org})
		}
	}
	if len(v4) == 0 && len(v6) == 0 {
		return nil, nil, fmt.Errorf("%s: khong doc duoc dai ASN nao", path)
	}
	sort.Slice(v4, func(i, j int) bool { return v4[i].start < v4[j].start })
	sort.Slice(v6, func(i, j int) bool { return bytes.Compare(v6[i].start[:], v6[j].start[:]) < 0 })
	return v4, v6, nil
}

// QUYẾT ĐỊNH VỀ DẢI CHỒNG LẤN.
//
// Một dải địa lý của DB-IP có thể nằm vắt qua nhiều dải ASN. Ở đây chọn ASN phủ
// ĐIỂM ĐẦU của dải địa lý, và chỉ ghi một ASN cho cả dải. Lý do: cấu trúc
// GeoRecord4 / GeoRecord6 mà li2-be và lihi-worker đọc chỉ có một trường AS cho
// mỗi bản ghi, nên muốn chính xác từng IP thì phải cắt dải địa lý ra nhiều bản
// ghi nhỏ — làm tệp và RAM phình lên, và phải sửa cả hai dịch vụ.
//
// Mức sai số, đo thật trên dữ liệu 2026-10 (xem SAI SỐ in ra ở cuối khi chạy):
// tỷ lệ dải địa lý vắt qua nhiều dải ASN là nhỏ, vì DB-IP cắt dải địa lý theo
// ranh giới mạng của nhà cung cấp nên hai bộ dữ liệu phần lớn trùng ranh giới.
// Với những dải có vắt, IP ở cuối dải có thể bị gán sai nhà mạng; quốc gia và
// thành phố vẫn đúng vì chúng đến từ chính dải địa lý đó.
//
// Thuật toán là duyệt hai con trỏ trên hai mảng đã sắp xếp, O(n+m), không phải
// tìm nhị phân từng hàng. Điều kiện đúng: mảng địa lý phải được sắp xếp theo
// Start TRƯỚC khi gọi, nên hai hàm dưới được gọi sau bước sort, không phải
// trong lúc đọc CSV.

// assignASN4 gán ASN cho mảng IPv4 đã sắp xếp theo Start.
// Trả về: số bản ghi khớp ASN, số bản ghi mà ASN không phủ hết dải.
func assignASN4(recs []GeoRecord4, ranges []asnRange4) (matched, truncated int) {
	j := 0
	for i := range recs {
		for j < len(ranges) && ranges[j].end < recs[i].Start {
			j++
		}
		if j >= len(ranges) || ranges[j].start > recs[i].Start {
			continue
		}
		recs[i].AS = ranges[j].as
		recs[i].ASName = ranges[j].org
		recs[i].ISP = ranges[j].org
		recs[i].Org = ranges[j].org
		matched++
		if ranges[j].end < recs[i].End {
			truncated++
		}
	}
	return matched, truncated
}

// assignASN6 làm việc tương tự cho IPv6.
func assignASN6(recs []GeoRecord6, ranges []asnRange6) (matched, truncated int) {
	j := 0
	for i := range recs {
		for j < len(ranges) && bytes.Compare(ranges[j].end[:], recs[i].Start[:]) < 0 {
			j++
		}
		if j >= len(ranges) || bytes.Compare(ranges[j].start[:], recs[i].Start[:]) > 0 {
			continue
		}
		recs[i].AS = ranges[j].as
		recs[i].ASName = ranges[j].org
		recs[i].ISP = ranges[j].org
		recs[i].Org = ranges[j].org
		matched++
		if bytes.Compare(ranges[j].end[:], recs[i].End[:]) < 0 {
			truncated++
		}
	}
	return matched, truncated
}

// ---------------------------------------------------------------------------
// APPLE PRIVATE RELAY
// ---------------------------------------------------------------------------

// inc16 trả b+1. ok=false khi tràn (b là ::ffff.. toàn 1).
func inc16(b [16]byte) ([16]byte, bool) {
	for i := 15; i >= 0; i-- {
		b[i]++
		if b[i] != 0 {
			return b, true
		}
	}
	return b, false
}

// dec16 trả b-1. ok=false khi b = :: (không có số trước nó).
func dec16(b [16]byte) ([16]byte, bool) {
	for i := 15; i >= 0; i-- {
		if b[i] != 0 {
			b[i]--
			return b, true
		}
		b[i] = 0xff
	}
	return b, false
}

// loadAppleRelay đọc egress-ip-ranges.csv: network,country,region,city,
//
// Cột thứ 5 luôn rỗng (đo 2026-10-22). Cột region có thể rỗng — Apple bỏ trống
// ở nhiều dòng, ví dụ "172.224.240.0/28,KR,,Seoul,".
func loadAppleRelay(path string) ([]relayRange4, []relayRange6, error) {
	var v4 []relayRange4
	var v6 []relayRange6
	cr, c, err := openCSV(path)
	if err != nil {
		return nil, nil, err
	}
	defer c.Close()
	skipped := 0
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if len(rec) < 4 {
			skipped++
			continue
		}
		cidr := strings.TrimSpace(rec[0])
		ip, netw, err := net.ParseCIDR(cidr)
		if err != nil {
			skipped++
			continue
		}
		cc := strings.ToUpper(strings.TrimSpace(rec[1]))
		if len(cc) != 2 {
			// Không có mã quốc gia thì không ghi đè được gì có ích.
			skipped++
			continue
		}
		cc = intern(cc)
		code := intern(strings.TrimSpace(rec[2]))
		city := intern(strings.TrimSpace(rec[3]))
		network := intern(cidr)

		if ip4 := ip.To4(); ip4 != nil {
			start := binary.BigEndian.Uint32(ip4)
			mask := net.IP(netw.Mask).To4()
			if mask == nil {
				skipped++
				continue
			}
			end := start | ^binary.BigEndian.Uint32(mask)
			v4 = append(v4, relayRange4{
				start: start, end: end,
				network: network, cc: cc, code: code, city: city,
			})
		} else {
			var start, end [16]byte
			copy(start[:], netw.IP.To16())
			copy(end[:], netw.IP.To16())
			for i := 0; i < 16; i++ {
				end[i] |= ^netw.Mask[i]
			}
			v6 = append(v6, relayRange6{
				start: start, end: end,
				network: network, cc: cc, code: code, city: city,
			})
		}
	}
	if skipped > 0 {
		fmt.Fprintf(os.Stderr, "Apple relay: bo qua %d dong khong doc duoc\n", skipped)
	}
	if len(v4) == 0 && len(v6) == 0 {
		return nil, nil, fmt.Errorf("%s: khong doc duoc dai relay nao", path)
	}
	sort.Slice(v4, func(i, j int) bool { return v4[i].start < v4[j].start })
	sort.Slice(v6, func(i, j int) bool { return bytes.Compare(v6[i].start[:], v6[j].start[:]) < 0 })

	// Chống chồng lấn TRONG danh sách Apple. Dữ liệu đo 2026-10-22 không chồng,
	// nhưng tìm nhị phân của li2-be yêu cầu mảng cuối không chồng lấn, nên nếu
	// Apple phát hành một bản có dải lồng nhau thì phải cắt ở đây chứ không để
	// nó lan vào tệp đầu ra. Giữ dải xuất hiện trước, cắt đầu dải sau.
	v4 = dedupRelay4(v4)
	v6 = dedupRelay6(v6)
	return v4, v6, nil
}

func dedupRelay4(in []relayRange4) []relayRange4 {
	out := in[:0]
	var lastEnd uint32
	first := true
	for _, r := range in {
		if !first && r.start <= lastEnd {
			if r.end <= lastEnd {
				continue // nằm hoàn toàn trong dải trước
			}
			r.start = lastEnd + 1
		}
		out = append(out, r)
		lastEnd = r.end
		first = false
	}
	return out
}

func dedupRelay6(in []relayRange6) []relayRange6 {
	out := in[:0]
	var lastEnd [16]byte
	first := true
	for _, r := range in {
		if !first && bytes.Compare(r.start[:], lastEnd[:]) <= 0 {
			if bytes.Compare(r.end[:], lastEnd[:]) <= 0 {
				continue
			}
			next, ok := inc16(lastEnd)
			if !ok {
				continue
			}
			r.start = next
		}
		out = append(out, r)
		lastEnd = r.end
		first = false
	}
	return out
}

// applyRelay ghi vị trí Apple lên một bản ghi, giữ nguyên ISP / Org / AS /
// ASName của DB-IP. Xem "ÁNH XẠ TRƯỜNG" ở đầu tệp về chuyện Region = city.
func applyRelay4(r *GeoRecord4, cc, code, city, network string, countryNames, ccContinent map[string]string) {
	r.CountryCode = cc
	r.Country = countryName(cc, countryNames)
	r.ContinentCode = ccContinent[cc]
	r.Continent = continentNames[r.ContinentCode]
	r.RegionCode = code
	r.Region = city
	r.City = city
	r.Network = network
	r.IsPrivateRelay = true
}

func applyRelay6(r *GeoRecord6, cc, code, city, network string, countryNames, ccContinent map[string]string) {
	r.CountryCode = cc
	r.Country = countryName(cc, countryNames)
	r.ContinentCode = ccContinent[cc]
	r.Continent = continentNames[r.ContinentCode]
	r.RegionCode = code
	r.Region = city
	r.City = city
	r.Network = network
	r.IsPrivateRelay = true
}

// countryName tra tên đầy đủ theo mã Apple đưa ra. Rơi về chính mã quốc gia khi
// country-map.csv không có — giống hệt nhánh đọc city CSV, để Country không bao
// giờ rỗng (li2-be trả thẳng trường này ra API).
func countryName(cc string, countryNames map[string]string) string {
	if n := countryNames[cc]; n != "" {
		return intern(n)
	}
	return cc
}

// overlayRelay4 cắt mảng IPv4 đã sắp xếp theo các dải Apple.
//
// Một dải DB-IP trúng relay bị cắt thành tối đa [trước | relay | sau]. Một dải
// Apple có thể vắt qua nhiều dải DB-IP, nên con trỏ j chỉ tiến khi dải relay đã
// kết thúc trước điểm đầu của bản ghi đang xét.
//
// Trả về: mảng mới, số bản ghi mang dấu relay, số dải Apple không trúng dải
// DB-IP nào (bị bỏ — DB-IP không biết dải đó nên không có gì để cắt).
func overlayRelay4(recs []GeoRecord4, relays []relayRange4, countryNames, ccContinent map[string]string) ([]GeoRecord4, int, int) {
	out := make([]GeoRecord4, 0, len(recs)+2*len(relays))
	used := make([]bool, len(relays))
	marked := 0
	j := 0
	for i := range recs {
		rec := recs[i]
		for j < len(relays) && relays[j].end < rec.Start {
			j++
		}
		if j >= len(relays) || relays[j].start > rec.End {
			out = append(out, rec)
			continue
		}
		cur := rec.Start
		covered := false // cur đã đi qua hết rec.End
		for k := j; k < len(relays) && !covered; k++ {
			r := relays[k]
			if r.start > rec.End {
				break
			}
			if r.end < cur {
				continue
			}
			if r.start > cur {
				seg := rec
				seg.End = r.start - 1
				seg.Start = cur
				out = append(out, seg)
				cur = r.start
			}
			end := r.end
			if end > rec.End {
				end = rec.End
			}
			seg := rec
			seg.Start, seg.End = cur, end
			applyRelay4(&seg, r.cc, r.code, r.city, r.network, countryNames, ccContinent)
			out = append(out, seg)
			used[k] = true
			marked++
			if end >= rec.End {
				covered = true // không làm cur = end+1: rec.End có thể là 255.255.255.255
			} else {
				cur = end + 1
			}
		}
		if !covered {
			seg := rec
			seg.Start = cur
			out = append(out, seg)
		}
	}
	orphan := 0
	for _, u := range used {
		if !u {
			orphan++
		}
	}
	return out, marked, orphan
}

// overlayRelay6 giống overlayRelay4, so sánh bằng bytes.Compare trên [16]byte.
func overlayRelay6(recs []GeoRecord6, relays []relayRange6, countryNames, ccContinent map[string]string) ([]GeoRecord6, int, int) {
	out := make([]GeoRecord6, 0, len(recs)+2*len(relays))
	used := make([]bool, len(relays))
	marked := 0
	j := 0
	for i := range recs {
		rec := recs[i]
		for j < len(relays) && bytes.Compare(relays[j].end[:], rec.Start[:]) < 0 {
			j++
		}
		if j >= len(relays) || bytes.Compare(relays[j].start[:], rec.End[:]) > 0 {
			out = append(out, rec)
			continue
		}
		cur := rec.Start
		covered := false
		for k := j; k < len(relays) && !covered; k++ {
			r := relays[k]
			if bytes.Compare(r.start[:], rec.End[:]) > 0 {
				break
			}
			if bytes.Compare(r.end[:], cur[:]) < 0 {
				continue
			}
			if bytes.Compare(r.start[:], cur[:]) > 0 {
				prev, ok := dec16(r.start)
				if !ok {
					continue
				}
				seg := rec
				seg.Start, seg.End = cur, prev
				out = append(out, seg)
				cur = r.start
			}
			end := r.end
			if bytes.Compare(end[:], rec.End[:]) > 0 {
				end = rec.End
			}
			seg := rec
			seg.Start, seg.End = cur, end
			applyRelay6(&seg, r.cc, r.code, r.city, r.network, countryNames, ccContinent)
			out = append(out, seg)
			used[k] = true
			marked++
			if bytes.Compare(end[:], rec.End[:]) >= 0 {
				covered = true
			} else {
				next, ok := inc16(end)
				if !ok {
					covered = true
				} else {
					cur = next
				}
			}
		}
		if !covered {
			seg := rec
			seg.Start = cur
			out = append(out, seg)
		}
	}
	orphan := 0
	for _, u := range used {
		if !u {
			orphan++
		}
	}
	return out, marked, orphan
}

func pct(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return float64(part) * 100 / float64(whole)
}

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr,
			"usage: geoip-gen <dbip-city-lite.csv[.gz]> <output.gob.gz> [country-map.csv] "+
				"[dbip-asn-lite.csv[.gz]] [apple-relay.csv[.gz]]")
		os.Exit(1)
	}
	cityPath := os.Args[1]
	outPath := os.Args[2]
	countryPath := ""
	if len(os.Args) > 3 {
		countryPath = os.Args[3]
	}
	asnPath := ""
	if len(os.Args) > 4 {
		asnPath = os.Args[4]
	}
	relayPath := ""
	if len(os.Args) > 5 {
		relayPath = os.Args[5]
	}

	countryNames := map[string]string{}
	if countryPath != "" {
		countryNames = loadCountryNames(countryPath)
		fmt.Fprintf(os.Stderr, "country names: %d ma tu %s\n", len(countryNames), countryPath)
	} else {
		fmt.Fprintln(os.Stderr, "CANH BAO: khong co CSV quoc gia, Country se la ma quoc gia")
	}

	var asn4 []asnRange4
	var asn6 []asnRange6
	if asnPath != "" {
		var err error
		asn4, asn6, err = loadASN(asnPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "loi doc ASN CSV: %v\n", err)
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "ASN: %d dai IPv4, %d dai IPv6 tu %s\n", len(asn4), len(asn6), asnPath)
	} else {
		fmt.Fprintln(os.Stderr, "CANH BAO: khong co CSV ASN, cot asn/isp cua visits se RONG")
	}

	var relay4 []relayRange4
	var relay6 []relayRange6
	if relayPath != "" {
		var err error
		relay4, relay6, err = loadAppleRelay(relayPath)
		if err != nil {
			// Không exit: thiếu danh sách Apple chỉ làm mất phần sửa vị trí, còn
			// tệp đầu ra vẫn dùng được. Hợp với fail-open của update-geoip.sh.
			fmt.Fprintf(os.Stderr, "CANH BAO: khong doc duoc CSV Apple relay (%v), bo qua buoc tron\n", err)
			relay4, relay6 = nil, nil
		} else {
			fmt.Fprintf(os.Stderr, "Apple relay: %d dai IPv4, %d dai IPv6 tu %s\n",
				len(relay4), len(relay6), relayPath)
		}
	} else {
		fmt.Fprintln(os.Stderr,
			"CANH BAO: khong co CSV Apple Private Relay, luot qua Private Relay se bi gan sai quoc gia")
	}

	cr, closer, err := openCSV(cityPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "loi doc city CSV: %v\n", err)
		os.Exit(1)
	}
	defer closer.Close()

	// Apple chỉ cho mã quốc gia, không cho lục địa. Dựng map từ chính city CSV
	// để khi ghi đè còn sửa được Continent / ContinentCode cho khớp quốc gia mới
	// (một dải Cloudflare ở Canada ghi NA, nhưng khách thật ở VN thuộc AS).
	ccContinent := map[string]string{}

	var data GeoData
	rows := 0
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if len(rec) < 6 {
			continue
		}
		startIP := net.ParseIP(rec[0])
		endIP := net.ParseIP(rec[1])
		if startIP == nil || endIP == nil {
			continue
		}
		cont := intern(rec[2])
		cc := intern(rec[3])
		if _, ok := ccContinent[cc]; !ok && cont != "" {
			ccContinent[cc] = cont
		}
		region := intern(rec[4])
		city := intern(rec[5])
		country := countryNames[rec[3]]
		if country == "" {
			country = cc
		} else {
			country = intern(country)
		}

		if s, ok := ipToUint32(startIP); ok {
			e, _ := ipToUint32(endIP)
			data.IPv4 = append(data.IPv4, GeoRecord4{
				Start: s, End: e,
				Continent: continentNames[cont], ContinentCode: cont,
				CountryCode: cc, Country: country,
				Region: region, City: city,
			})
		} else {
			data.IPv6 = append(data.IPv6, GeoRecord6{
				Start: ipToKey16(startIP), End: ipToKey16(endIP),
				Continent: continentNames[cont], ContinentCode: cont,
				CountryCode: cc, Country: country,
				Region: region, City: city,
			})
		}
		rows++
	}

	if rows == 0 {
		fmt.Fprintln(os.Stderr, "city CSV khong co hang hop le — dung lai, khong ghi gi")
		os.Exit(1)
	}

	// Sắp xếp TRƯỚC khi gán ASN: duyệt hai con trỏ chỉ đúng trên mảng đã sắp xếp.
	sort.Slice(data.IPv4, func(i, j int) bool { return data.IPv4[i].Start < data.IPv4[j].Start })
	sort.Slice(data.IPv6, func(i, j int) bool {
		return bytes.Compare(data.IPv6[i].Start[:], data.IPv6[j].Start[:]) < 0
	})

	var m4, t4, m6, t6 int
	if asnPath != "" {
		m4, t4 = assignASN4(data.IPv4, asn4)
		m6, t6 = assignASN6(data.IPv6, asn6)
	}

	// Trộn Apple SAU khi gán ASN: các đoạn bị cắt ra đều là bản sao của dải gốc
	// nên thừa hưởng đúng AS / ISP / Org, và hai con trỏ của assignASN chạy trên
	// mảng ngắn hơn.
	before4, before6 := len(data.IPv4), len(data.IPv6)
	var r4, r6, orphan4, orphan6 int
	if len(relay4) > 0 || len(relay6) > 0 {
		data.IPv4, r4, orphan4 = overlayRelay4(data.IPv4, relay4, countryNames, ccContinent)
		debug.FreeOSMemory() // trả mảng IPv4 cũ về OS trước khi cấp mảng IPv6 mới
		data.IPv6, r6, orphan6 = overlayRelay6(data.IPv6, relay6, countryNames, ccContinent)
		relay4, relay6 = nil, nil
		debug.FreeOSMemory()
	}

	out, err := os.Create(outPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "loi tao tep dau ra: %v\n", err)
		os.Exit(1)
	}
	gz := gzip.NewWriter(out)
	if err := gob.NewEncoder(gz).Encode(&data); err != nil {
		out.Close()
		os.Remove(outPath)
		fmt.Fprintf(os.Stderr, "loi ghi gob: %v\n", err)
		os.Exit(1)
	}
	if err := gz.Close(); err != nil {
		out.Close()
		os.Remove(outPath)
		fmt.Fprintf(os.Stderr, "loi dong gzip: %v\n", err)
		os.Exit(1)
	}
	if err := out.Close(); err != nil {
		os.Remove(outPath)
		fmt.Fprintf(os.Stderr, "loi dong tep: %v\n", err)
		os.Exit(1)
	}

	// Sys là tổng bộ nhớ đã xin của OS, không bao giờ giảm trong tiến trình này,
	// nên nó xấp xỉ đỉnh RAM lúc sinh — số cần để biết host có chịu được không.
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	fmt.Printf("RAM luc sinh: dinh (Sys)=%.2f GiB, dang giu (HeapAlloc)=%.2f GiB\n",
		float64(ms.Sys)/(1<<30), float64(ms.HeapAlloc)/(1<<30))

	fmt.Printf("done: %d hang city CSV -> IPv4=%d, IPv6=%d ban ghi\n", rows, len(data.IPv4), len(data.IPv6))
	if r4 > 0 || r6 > 0 {
		fmt.Printf("APPLE PRIVATE RELAY: %d ban ghi mang dau relay (IPv4=%d, IPv6=%d)\n", r4+r6, r4, r6)
		fmt.Printf("  dai Apple khong trung dai DB-IP nao (bi bo): IPv4=%d, IPv6=%d\n", orphan4, orphan6)
		fmt.Printf("  ban ghi tang do cat dai: IPv4 %d -> %d (+%d, +%.2f%%), IPv6 %d -> %d (+%d, +%.2f%%)\n",
			before4, len(data.IPv4), len(data.IPv4)-before4, pct(len(data.IPv4)-before4, before4),
			before6, len(data.IPv6), len(data.IPv6)-before6, pct(len(data.IPv6)-before6, before6))
	}
	if asnPath != "" {
		fmt.Printf("ASN khop: IPv4=%d (%.1f%%), IPv6=%d (%.1f%%), tong=%d (%.1f%%)\n",
			m4, pct(m4, len(data.IPv4)), m6, pct(m6, len(data.IPv6)), m4+m6, pct(m4+m6, rows))
		fmt.Printf("SAI SO (dai dia ly vat qua nhieu dai ASN, chi ghi ASN phu diem dau): "+
			"IPv4=%d (%.2f%% so dai khop), IPv6=%d (%.2f%%)\n",
			t4, pct(t4, m4), t6, pct(t6, m6))
	}
}
