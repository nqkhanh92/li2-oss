import { NextRequest } from 'next/server'
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { artifactPublicHost, artifactPublicPath } from '@/core/helpers/artifact-public-url'
import { artifactNotFoundResponse } from '@/core/helpers/artifact-not-found'
import { serveArtifactGet } from '../../../_lib/serve'

/**
 * Địa chỉ công khai của artifact: `https://artifact.<root>/<org_slug>/<slug>`. Middleware rewrite
 * `/<org_slug>/<slug>` trên host artifact về đây; URL trên thanh địa chỉ không đổi. Chỉ GET: form
 * mật khẩu vẫn POST về `/a/<token>` (Traefik đưa cả host artifact vào app) kèm `return_to` để quay về
 * đúng đường này. Chỉ trả lời trên host artifact — trên app host, `/a/s/…` là 404 để không có hai
 * địa chỉ cho một nội dung.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { org_slug: string; slug: string } }
) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const expected = artifactPublicHost()
  // Cùng một trang 404 với "org không có thật" và "slug không có thật" — và đó là điều kiện để việc
  // gõ thử `/<org>/<slug>` hàng loạt không đọc ra được org nào tồn tại.
  const notFound = () => artifactNotFoundResponse(request.headers.get('accept-language'))

  if (!expected || host.split(':')[0] !== expected.split(':')[0]) return notFound()

  const publicPath = artifactPublicPath(params.org_slug, params.slug)
  if (!publicPath) return notFound()

  const lookup = await artifactServeService.resolveTargetByPublicPath(params.org_slug, params.slug)
  const token = lookup.outcome === 'live' ? lookup.target.serveToken : ''
  return serveArtifactGet(request, lookup, token, publicPath)
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
