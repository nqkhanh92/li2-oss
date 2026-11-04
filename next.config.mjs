/**
 * Cấu hình Next.
 *
 * KHÔNG khai `redirects()` hay `rewrites()` ở đây, theo chủ ý. Việc giải short link do
 * `app/[slug]/route.ts` làm — nó cần tra DB, ghi lượt truy cập, và kiểm lại URL đích. Chuyển
 * một phần việc đó sang config nghĩa là có hai chỗ quyết định một request đi đâu, và chỗ ở
 * config thì không tra được DB nên sẽ luôn là chỗ sai.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image chạy không cần `yarn install` lần nữa. Xem Dockerfile stage `runner`.
  output: 'standalone',

  async headers() {
    return [
      {
        // Áp cho mọi đường dẫn.
        source: '/:path*',
        headers: [
          // Trình duyệt phải tôn trọng Content-Type thay vì tự đoán. Quan trọng với
          // artifact: một tệp .txt do người dùng tải lên không được phép bị đoán thành HTML.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // X-Frame-Options: DENY cho mọi đường dẫn TRỪ `/a/*`.
        //
        // Vì sao loại trừ `/a/*`: đó là đường phục vụ artifact, và một artifact (PDF, trang
        // HTML, ảnh) là nội dung người dùng CHỦ ĐỘNG muốn chia sẻ — nhúng nó vào một trang
        // khác là cách dùng hợp lệ, không phải clickjacking. Chặn ở đây sẽ làm hỏng đúng cái
        // việc mà tính năng tồn tại để làm.
        //
        // Chỗ đó không bị bỏ trống: artifact được phục vụ sau một CSP sandbox riêng, đặt tại
        // chính route `/a/*`. Nghĩa là nội dung tải lên không chạy script có quyền với origin
        // này, nhúng hay không nhúng. Phần còn lại của app (trang quản lý, form đăng nhập) thì
        // không có lý do nào để bị nhúng, nên vẫn DENY.
        source: '/((?!a/).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
    ]
  },
}

export default nextConfig
