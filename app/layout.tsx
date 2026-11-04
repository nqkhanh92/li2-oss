import type { Metadata, Viewport } from 'next'
import './globals.css'

/**
 * Tiêu đề và mô tả KHÔNG nhắc tên thương mại nào.
 *
 * Bản thương mại có OG meta cứng `"Li2.ai - Vietnam's #1 Link Shortener"` nằm trong code phục vụ
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
