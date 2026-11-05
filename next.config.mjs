// import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'
import { getHostname } from 'tldts'

/** Hostname của một URL trong env; bỏ qua nếu env rỗng hoặc không phải URL hợp lệ. */
const envHost = (value) => {
  if (!value) return null
  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

/**
 * Host được phép đi qua `/_next/image`. Trùng lặp bị khử, giá trị rỗng bị loại.
 * Thêm host mới ở ĐÂY, không mở lại `**`.
 */
const IMAGE_HOSTS = [
  ...new Set(
    [
      envHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
      envHost(process.env.SUPABASE_URL),
      envHost(process.env.NEXT_PUBLIC_APP_BASE_URL),
      envHost(process.env.NEXT_PUBLIC_CASDOOR_APP_URL),
      // Ảnh tĩnh và QR của li2 trên prod.
      'cdn.li2.ai',
      's.li2.ai',
      'art.li2.ai',
      // Ảnh đại diện. Hai host này đọc ra từ `profiles.avatar` trên LiHi, không phải đoán:
      // Google cho ai đăng nhập bằng Google, Casbin CDN cho avatar mặc định Casdoor sinh ra.
      'lh3.googleusercontent.com',
      'cdn.casbin.org',
    ].filter(Boolean)
  ),
]

/** @type {import('next').NextConfig} */
let nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    /**
     * `dangerouslyAllowSVG` GIỮ LẠI: logo của app là `/images/*.svg` và đi qua chính optimizer này,
     * tắt đi thì logo vỡ. An toàn vì hai lớp — Next tự gắn
     * `script-src 'none'; frame-src 'none'; sandbox` cho mọi response SVG (đã đo trên LiHi), và
     * `remotePatterns` dưới đây không còn cho SVG từ bên ngoài đi vào.
     */
    dangerouslyAllowSVG: true,

    /**
     * Danh sách TRẮNG, suy từ env.
     *
     * Trước 2026-10-25 ở đây có `{ protocol: 'https', hostname: '**' }` — mọi host HTTPS. Đo được
     * trên LiHi: `/_next/image?url=https://www.google.com/favicon.ico` trả **200**, tức app đang
     * là một proxy tải ảnh hộ cho bất kỳ ai. Hai hệ quả:
     *
     * 1. Bất kỳ ai cũng dùng được băng thông và CPU của server để tải ảnh ẩn danh.
     * 2. Next 14.2.35 nằm trong dải bị ảnh hưởng của hai CVE RCE ở Image Optimization API
     *    (GHSA-2xp9-vwfh-vxw4 — AVIF; GHSA-2464-fhr4-w9xw — SVG). CVE SVG chỉ áp cho glibc nên
     *    container Alpine/musl không chạm, nhưng CVE AVIF thì không giới hạn libc — và
     *    `hostname: '**'` để kẻ tấn công tự trỏ tới file AVIF của họ.
     *
     * Host suy từ env chứ không viết cứng: LiHi dùng `app.example.com`, prod dùng
     * `supa.li2.ai`. Viết cứng một cái là cái kia vỡ ảnh.
     */
    remotePatterns: [
      ...IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })),
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    turbo: {
      loaders: undefined,
    },
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverComponentsExternalPackages: ['pino', 'pino-pretty', 'pino-roll'],
    outputFileTracingIncludes: {
      '/**': ['./node_modules/pino-roll/**'],
    },
    serverSourceMaps: process.env.NODE_ENV !== 'development',
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: process.env.NEXT_PUBLIC_APP_ENV === 'development',
  async headers() {
    return [
      {
        /**
         * MCP OAuth consent (plan Phase 3b). Framing this page is a clickjacking primitive with a
         * real payload: an invisible overlay over "Allow access" turns any click on an attacker's
         * page into a third-party grant on the visitor's Li2 account. `frame-ancestors` is the
         * modern control and `X-Frame-Options` covers browsers that ignore it.
         *
         * `no-store` because the page embeds a consent token bound to the signed-in user — a shared
         * or proxy cache must never hand it to the next visitor.
         */
        source: '/mcp/consent',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          /**
           * ⚠️ `same-origin`, NOT `no-referrer`. Both hide this URL — which carries the whole OAuth
           * request — from cross-origin destinations, but `no-referrer` ALSO forces `Origin: null`
           * on the consent form's own POST (Fetch: a navigation request under that policy serializes
           * its origin as null). That silently failed the CSRF origin check with "This request did
           * not come from Li2", on a page whose form was perfectly legitimate. Verified live
           * 2026-07-29. `same-origin` sends the referrer only to ourselves and keeps `Origin` intact.
           */
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
      {
        /**
         * Artifact serving.
         *
         * ⚠ NO `Content-Security-Policy` HERE, and this is load-bearing. It used to sit next to
         * these four as "two layers, on purpose", which was true while every artifact was HTML.
         *
         * It stopped being true the moment a PDF, a slide deck or a video could be served from the
         * same path. Two CSP headers on one response are not a fallback for each other: the browser
         * enforces the INTERSECTION of both. So this layer would force `sandbox` onto every kind no
         * matter what the route handler returned — a blank PDF, a dead <video>, an Office viewer
         * iframe that never loads — while every unit test stayed green, because a test reads the
         * headers the route handler set and never sees this file.
         *
         * CSP for /a/* now has exactly one source: `artifactCsp(kind)` in
         * `src/core/helpers/artifact-csp.ts`, applied by the route handler that knows the kind.
         * A config rule matches by path, and a path does not know what it is serving.
         *
         * The four headers below stay here because none of them depends on the kind.
         */
        source: '/a/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig)
