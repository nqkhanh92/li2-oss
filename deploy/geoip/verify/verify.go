// Kiểm một tệp ip_country.gob.gz có decode được, đúng thứ tự sắp xếp, KHÔNG
// chồng lấn, và tra thử vài IP. Dùng để nghiệm thu tệp mới TRƯỚC khi thay tệp
// đang chạy.
//
//	go run verify.go ip_country.gob.gz.new 1.0.0.1 222.255.200.153 8.8.8.8
//
// Không truyền IP nào thì dùng bộ mặc định, trong đó có bốn IP Apple Private
// Relay đã đo trên bảng visits của LiHi (docs/apple-private-relay-lihi.md).
// Bốn IP đó phải ra VN / Ho Chi Minh City sau khi trộn danh sách Apple; nếu còn
// CA hoặc KR thì bước trộn không ăn.
//
// MÃ THOÁT. Chỉ thoát khác 0 vì lỗi CẤU TRÚC: không decode được, không sắp xếp,
// chồng lấn, một bên rỗng. Những lỗi đó làm li2-be tra sai hoặc sập.
//
// Bốn IP mẫu thì KHÁC: Apple đổi IP egress liên tục, nên một IP mẫu rụng khỏi
// danh sách tháng sau là chuyện bình thường, không phải lỗi. Mặc định chỉ cảnh
// báo. Đặt REQUIRE_RELAY=1 (update-geoip.sh đặt khi tải được tệp Apple) thì
// thoát 1 nếu KHÔNG IP mẫu nào trúng — tức bước trộn hỏng thật, chứ không phải
// Apple vừa đổi dải.
//
// Trường AS được in kèm kết quả regexp `AS\d+` — đúng biểu thức lihi-worker
// dùng ở internal/services/visit.service.go để suy ra cột asn của visits. Cột
// visits.city lấy từ Region, nên Region được in riêng dưới dạng worker.city.
package main

import (
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"encoding/gob"
	"fmt"
	"net"
	"os"
	"regexp"
	"runtime"
)

// Struct phải trùng tên trường với bản sinh. IsPrivateRelay là trường mới; gob
// bỏ qua trường lạ nên tệp CŨ (chưa có trường này) vẫn decode được ở đây.
type GeoRecord4 struct {
	Start, End                                                                                  uint32
	Network, Continent, ContinentCode, CountryCode, Country, Region, RegionCode, City, ISP, Org string
	AS, ASName                                                                                  string
	IsPrivateRelay                                                                              bool
}

type GeoRecord6 struct {
	Start, End                                                                                  [16]byte
	Network, Continent, ContinentCode, CountryCode, Country, Region, RegionCode, City, ISP, Org string
	AS, ASName                                                                                  string
	IsPrivateRelay                                                                              bool
}

type GeoData struct {
	IPv4 []GeoRecord4
	IPv6 []GeoRecord6
}

// Bốn IP Private Relay đã thấy thật trong bảng visits của LiHi, kèm điều LiHi
// đang ghi sai. Sự thật theo Apple: cả bốn đều VN / Ho Chi Minh City.
var defaultIPs = []string{
	"1.0.0.1",
	"222.255.200.153",
	"8.8.8.8",
	"104.28.68.172",   // LiHi ghi CA/Ontario
	"104.28.119.133",  // LiHi ghi KR/Jeollabuk-do
	"172.224.240.121", // LiHi ghi KR/Seoul
	"172.225.56.67",   // LiHi ghi VN/Ho Chi Minh (trùng, may)
}

// relayExpect: IP nào bắt buộc phải ra quốc gia nào sau khi trộn.
var relayExpect = map[string]string{
	"104.28.68.172":   "VN",
	"104.28.119.133":  "VN",
	"172.224.240.121": "VN",
	"172.225.56.67":   "VN",
}

func u32(ip net.IP) uint32 { return binary.BigEndian.Uint32(ip.To4()) }

func find4(d []GeoRecord4, s string) *GeoRecord4 {
	ip := net.ParseIP(s).To4()
	if ip == nil {
		return nil
	}
	n := u32(ip)
	lo, hi := 0, len(d)-1
	for lo <= hi {
		m := (lo + hi) / 2
		if n < d[m].Start {
			hi = m - 1
		} else if n > d[m].End {
			lo = m + 1
		} else {
			return &d[m]
		}
	}
	return nil
}

func pct(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return float64(part) * 100 / float64(whole)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: verify <ip_country.gob.gz> [ip...]")
		os.Exit(2)
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "khong mo duoc: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()
	st, _ := f.Stat()
	gz, err := gzip.NewReader(f)
	if err != nil {
		fmt.Fprintf(os.Stderr, "khong phai gzip: %v\n", err)
		os.Exit(1)
	}
	var d GeoData
	if err := gob.NewDecoder(gz).Decode(&d); err != nil {
		fmt.Fprintf(os.Stderr, "DECODE THAT BAI: %v\n", err)
		os.Exit(1)
	}
	if len(d.IPv4) == 0 || len(d.IPv6) == 0 {
		fmt.Fprintf(os.Stderr, "LOI: IPv4=%d IPv6=%d, mot ben rong\n", len(d.IPv4), len(d.IPv6))
		os.Exit(1)
	}
	if st != nil {
		fmt.Printf("tep: %d byte (%.1f MB)\n", st.Size(), float64(st.Size())/(1024*1024))
	}
	fmt.Printf("DECODE OK: IPv4=%d IPv6=%d\n", len(d.IPv4), len(d.IPv6))

	// RAM thật sau khi nạp — chính là lượng li2-be và lihi-worker sẽ giữ.
	var ms runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&ms)
	fmt.Printf("RAM nap: HeapAlloc=%.2f GiB, Sys=%.2f GiB\n",
		float64(ms.HeapAlloc)/(1<<30), float64(ms.Sys)/(1<<30))

	// Sắp xếp VÀ không chồng lấn. Tìm nhị phân của li2-be giả định cả hai; chồng
	// lấn không gây lỗi, chỉ tra sai âm thầm, nên phải chặn ở đây.
	bad := 0
	for i := 1; i < len(d.IPv4); i++ {
		if d.IPv4[i].Start < d.IPv4[i-1].Start {
			fmt.Fprintf(os.Stderr, "LOI: IPv4 khong sorted tai %d\n", i)
			os.Exit(1)
		}
		if d.IPv4[i].Start <= d.IPv4[i-1].End {
			if bad < 5 {
				fmt.Fprintf(os.Stderr, "LOI: IPv4 CHONG LAN tai %d: [%d,%d] sau [%d,%d]\n",
					i, d.IPv4[i].Start, d.IPv4[i].End, d.IPv4[i-1].Start, d.IPv4[i-1].End)
			}
			bad++
		}
		if d.IPv4[i].Start > d.IPv4[i].End {
			fmt.Fprintf(os.Stderr, "LOI: IPv4 Start>End tai %d\n", i)
			os.Exit(1)
		}
	}
	for i := 1; i < len(d.IPv6); i++ {
		if bytes.Compare(d.IPv6[i].Start[:], d.IPv6[i-1].Start[:]) < 0 {
			fmt.Fprintf(os.Stderr, "LOI: IPv6 khong sorted tai %d\n", i)
			os.Exit(1)
		}
		if bytes.Compare(d.IPv6[i].Start[:], d.IPv6[i-1].End[:]) <= 0 {
			if bad < 5 {
				fmt.Fprintf(os.Stderr, "LOI: IPv6 CHONG LAN tai %d\n", i)
			}
			bad++
		}
	}
	if bad > 0 {
		fmt.Fprintf(os.Stderr, "LOI: %d cho chong lan — tim nhi phan se tra sai, KHONG duoc thay tep\n", bad)
		os.Exit(1)
	}
	fmt.Println("thu tu sap xep + khong chong lan: OK")

	var hasAS, hasISP, hasCountryName, relay4 int
	for _, r := range d.IPv4 {
		if r.AS != "" {
			hasAS++
		}
		if r.ISP != "" {
			hasISP++
		}
		if r.Country != r.CountryCode {
			hasCountryName++
		}
		if r.IsPrivateRelay {
			relay4++
		}
	}
	fmt.Printf("IPv4: co AS=%d (%.1f%%), co ISP=%d, Country!=code=%d\n",
		hasAS, pct(hasAS, len(d.IPv4)), hasISP, hasCountryName)
	var hasAS6, relay6 int
	for _, r := range d.IPv6 {
		if r.AS != "" {
			hasAS6++
		}
		if r.IsPrivateRelay {
			relay6++
		}
	}
	fmt.Printf("IPv6: co AS=%d (%.1f%%)\n", hasAS6, pct(hasAS6, len(d.IPv6)))

	// --- Apple Private Relay ---
	total := len(d.IPv4) + len(d.IPv6)
	fmt.Printf("APPLE PRIVATE RELAY: %d ban ghi mang dau (%.3f%% tong), IPv4=%d (%.3f%%), IPv6=%d (%.3f%%)\n",
		relay4+relay6, pct(relay4+relay6, total),
		relay4, pct(relay4, len(d.IPv4)), relay6, pct(relay6, len(d.IPv6)))
	if relay4+relay6 == 0 {
		fmt.Println("  CANH BAO: khong ban ghi nao mang dau relay — tep sinh bang ban cu," +
			" hoac thieu tham so 5 (apple-relay.csv). Luot qua Private Relay van bi gan sai quoc gia.")
	}
	// Phân bố quốc gia của các dải relay — Việt Nam là con số đáng xem nhất ở đây.
	if relay4 > 0 {
		byCC := map[string]int{}
		for _, r := range d.IPv4 {
			if r.IsPrivateRelay {
				byCC[r.CountryCode]++
			}
		}
		fmt.Printf("  so quoc gia khac nhau trong cac dai relay IPv4: %d (VN=%d)\n", len(byCC), byCC["VN"])
	}

	requireRelay := os.Getenv("REQUIRE_RELAY") == "1"

	ips := os.Args[2:]
	if len(ips) == 0 {
		ips = defaultIPs
	}
	re := regexp.MustCompile(`AS\d+`)
	sampleTotal, sampleOK := 0, 0
	for _, ip := range ips {
		if _, isSample := relayExpect[ip]; isSample {
			sampleTotal++
		}
		r := find4(d.IPv4, ip)
		if r == nil {
			fmt.Printf("%-18s KHONG TIM THAY\n", ip)
			continue
		}
		mark := ""
		if r.IsPrivateRelay {
			mark = "  [PRIVATE RELAY]"
		}
		fmt.Printf("%-18s cc=%s country=%q region=%q city=%q regionCode=%q AS=%q ISP=%q"+
			" -> worker.asn=%q worker.city=%q%s\n",
			ip, r.CountryCode, r.Country, r.Region, r.City, r.RegionCode,
			r.AS, r.ISP, re.FindString(r.AS), r.Region, mark)
		if want, ok := relayExpect[ip]; ok {
			switch {
			case r.CountryCode != want:
				fmt.Printf("    LECH: muon cc=%s (Apple cong bo), duoc %s"+
					" — hoac Apple da doi dai, hoac buoc tron khong an\n", want, r.CountryCode)
			case !r.IsPrivateRelay:
				fmt.Printf("    LECH: dung quoc gia nhung thieu dau IsPrivateRelay\n")
			default:
				sampleOK++
			}
		}
	}

	if sampleTotal > 0 {
		fmt.Printf("IP mau Private Relay dung: %d/%d\n", sampleOK, sampleTotal)
	}
	if requireRelay && sampleTotal > 0 && sampleOK == 0 {
		fmt.Fprintf(os.Stderr,
			"\nREQUIRE_RELAY=1 nhung KHONG IP mau nao trung — buoc tron danh sach Apple khong an\n")
		os.Exit(1)
	}
	fmt.Println("nghiem thu: OK")
}
