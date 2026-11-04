import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

/**
 * Cùng font với bản thương mại — đây là khác biệt thị giác lớn nhất còn lại sau khi port bảng màu.
 *
 * ⚠ Nhưng lấy từ NGUỒN KHÁC. Bản thương mại dùng `next/font/local` trỏ vào file `.woff2` nằm trong
 * repo của nó, và copy file đó sang đây là copy một asset chưa tra license. `next/font/google` tải
 * lúc build rồi **tự host** — không gọi về Google lúc chạy, nên không rò IP người dùng sang bên
 * thứ ba.
 *
 * License: **OFL-1.1** (github.com/bettergui/BeVietnamPro). Phân phối lại được, có nghĩa vụ ghi
 * công — xem mục NOTICE trong README.
 */
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

/**
 * Tiêu đề và mô tả KHÔNG nhắc tên thương mại nào.
 *
 * (blocklist-ok: nhắc chuỗi của bản thương mại trong comment đối chiếu) Bản thương mại có OG meta cứng `"Li2.ai - Vietnam's #1 Link Shortener"` nằm trong code phục vụ
 * mọi short link, nên ai tự host cũng quảng cáo hộ một sản phẩm không phải của họ. Ở đây tiêu đề
 * trung tính; người vận hành sửa một dòng nếu muốn tên riêng.
 */
export const metadata: Metadata = {
  title: 'li2-oss',
  description: 'Short link, QR và artifact hosting — tự host.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Hai điều cố ý KHÔNG làm ở đây:
 *
 * 1. **Không `next-themes`.** Bản thương mại dùng nó để đổi sáng/tối. `globals.css` ở đây đã có đủ
 *    khối `.dark`, nên ai muốn giao diện tối chỉ cần thêm `className="dark"` vào `<html>` dưới đây
 *    — một dòng, không thêm dependency. Mặc định để sáng vì bản thương mại cũng mặc định sáng, và
 *    mục tiêu là trùng khít với nó.
 *
 * 2. **Font thì CÓ nạp**, khác với ghi chú cũ ở đây. Xem khối `beVietnamPro` phía trên: cùng font
 *    với bản thương mại nhưng lấy từ Google Fonts (OFL-1.1) thay vì copy file. Đánh đổi: `next
 *    build` cần mạng ở lần đầu. Chấp nhận được vì `yarn install` và `docker build` vốn đã cần.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body
        className={`${beVietnamPro.className} min-h-svh bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
