import { NextRequest, NextResponse } from 'next/server'
// artifact-serve.service, NOT artifact.service: the latter imports touchPointService, which pulls in
// qr-code-styling and the native `canvas` binary. This public route must stay off that path.
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { artifactGateService } from '@/core/services/artifact-gate.service'
import { artifactByteResponse, artifactGateRefusal } from '@/core/helpers/artifact-byte-response'

/**
 * The raw bytes, INLINE, speaking `Range`.
 *
 * This is what the `<video>` on `/a/<token>` points at when `resolveVideoDelivery()` returns
 * `proxy`, and it is the reason that mode can exist at all: the bucket stays private, the Supabase
 * host is never handed to a viewer, and the response stays under li2's own CSP and no-store headers.
 *
 * The client's `Range` header is forwarded verbatim and storage's answer is passed back whole — see
 * `getRangeStream`. Nothing here parses a range or counts a byte.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const target = await artifactServeService.getLiveTargetByToken(params.token)
  if (!target) return new NextResponse('Not found', { status: 404 })

  // Same gate as `/a/<token>`, no HTML: a <video> or a download manager cannot show a form (spec R10).
  const verdict = await artifactGateService.evaluateGate(request, target)
  if (verdict.kind !== 'allow') return artifactGateRefusal(target, verdict)

  const stream = await artifactServeService.streamBytes(target, request.headers.get('range'))
  if (!stream) return new NextResponse('Not found', { status: 404 })

  return artifactByteResponse(target, stream, { 'Content-Disposition': 'inline' })
}

/**
 * Without this, `base-server.js` takes the `isSSG` branch, calls `response.blob()` and buffers the
 * whole body to cache it — which for a 10MB video undoes the streaming this route exists for, and
 * does it silently.
 */
export const dynamic = 'force-dynamic'

/**
 * Same reason as `/a/<token>`: without this, Next's on-disk Data Cache keeps answering
 * `findByServeToken` for a token whose row is gone, so a deleted artifact keeps streaming. See the
 * long note in `../route.ts` for the measurement. Needed here independently — `fetchCache` is
 * per-segment, and this route resolves the token itself.
 */
export const fetchCache = 'force-no-store'
