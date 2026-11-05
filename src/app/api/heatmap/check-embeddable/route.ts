import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

// Block private/loopback/link-local ranges to prevent SSRF
function isPublicUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl)
    if (protocol !== 'https:' && protocol !== 'http:') return false
    if ((hostname === 'localhost' || hostname === '0.0.0.0') && process.env.NODE_ENV !== 'development') return false
    // IPv4 loopback + private ranges + AWS metadata
    if (/^127\./.test(hostname)) return false
    if (/^10\./.test(hostname)) return false
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return false
    if (/^192\.168\./.test(hostname)) return false
    if (/^169\.254\./.test(hostname)) return false
    // IPv6 loopback and ULA
    if (hostname === '::1' || /^fc|^fd/i.test(hostname)) return false
    return true
  } catch {
    return false
  }
}

export const GET = withAuth<Record<string, string>>(async (request: NextRequest) => {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || !isPublicUrl(url)) {
    return NextResponse.json(
      { embeddable: false, reason: 'invalid_url' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })

    const xfo = res.headers.get('x-frame-options')
    if (xfo) {
      const val = xfo.toUpperCase().trim()
      // DENY blocks all; SAMEORIGIN blocks cross-origin (dashboard is a different origin)
      if (val === 'DENY' || val === 'SAMEORIGIN') {
        return NextResponse.json({ embeddable: false, reason: 'x-frame-options' })
      }
    }

    const csp = res.headers.get('content-security-policy')
    if (csp) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/i)
      if (match) {
        const directive = match[1].trim()
        // 'none' or 'self' (or any allowlist without '*') blocks cross-origin embedding
        if (!directive.includes('*')) {
          return NextResponse.json({ embeddable: false, reason: 'csp' })
        }
      }
    }

    return NextResponse.json({ embeddable: true })
  } catch {
    // Network error or timeout — treat as not embeddable
    return NextResponse.json({ embeddable: false, reason: 'error' })
  }
})
