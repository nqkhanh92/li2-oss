import 'server-only'

import { ArtifactServeTarget } from '@/core/services/artifact-serve.service'

/**
 * `proxy`      — the `<video>` points at `/a/<token>/file`; bytes travel through li2, Range and all.
 * `signed-url` — the `<video>` points straight at Supabase; li2 carries no bytes.
 */
export type VideoDelivery = { mode: 'proxy' } | { mode: 'signed-url'; url: string }

/**
 * THE one place the video strategy is decided. Changing strategy means changing this function —
 * not the route, not the landing page, not the CSP builder, each of which asks this and adapts.
 *
 * `proxy` is what ships. It was chosen on measurements taken on LiHi, not on preference:
 * storage answers `Range: bytes=0-99` with `206` and a correct `Content-Range`, and a 10MB body
 * travels the whole way through Traefik to the route handler. So there is no technical obstacle,
 * and proxying keeps three things the alternative gives up — the response stays under li2's CSP
 * and security headers, the Supabase host is not exposed to every viewer, and no URL exists that
 * keeps working after the link is taken down.
 *
 * `signed-url` is written and NOT enabled. It becomes the right answer only if egress through the
 * app turns into the bottleneck, which is a measurement nobody has yet. Enabling it also means
 * teaching `artifactCsp` the Supabase host, since `media-src 'self'` stops covering the source —
 * the two changes must land together or the video dies silently under CSP.
 */
export async function resolveVideoDelivery(_target: ArtifactServeTarget): Promise<VideoDelivery> {
  return { mode: 'proxy' }
}
