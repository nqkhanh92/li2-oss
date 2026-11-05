import 'server-only'

import { artifactCsp, ARTIFACT_COMMON_HEADERS } from '@/core/helpers/artifact-csp'
import { ArtifactServeTarget } from '@/core/services/artifact-serve.service'
import { ArtifactByteStream } from '@/infrastructure/storage/artifact-storage'

/**
 * Turns what storage answered into what the visitor gets, for both `/file` and `/download`.
 *
 * Storage's `status`, `Content-Range` and `Content-Length` are COPIED, not recomputed. The range
 * arithmetic exists in exactly one place — storage — and every extra place it is re-derived is a
 * place it can disagree. `Accept-Ranges: bytes` is asserted by us rather than forwarded, because it
 * is a statement about this route, and this route does speak ranges whatever storage echoed back.
 *
 * `206` is load-bearing, not an optimisation: Safari on iOS refuses to play a `<video>` from a
 * server that answers the whole file to a Range request.
 */
export function artifactByteResponse(
  target: ArtifactServeTarget,
  stream: ArtifactByteStream,
  extraHeaders: Record<string, string>
): Response {
  /**
   * A seek past the end of the file. `Content-Range: bytes * /<total>` is what tells the player the
   * real length so its next request can be in range; without it a player retries the same bad range
   * forever. The total comes from `artifacts.size_bytes`, already on the row — no HEAD to storage.
   */
  if (stream.status === 416)
    return new Response(null, {
      status: 416,
      headers: {
        ...ARTIFACT_COMMON_HEADERS,
        'Content-Security-Policy': artifactCsp(target.kind),
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${target.sizeBytes}`,
      },
    })

  return new Response(stream.body, {
    status: stream.status,
    headers: {
      ...ARTIFACT_COMMON_HEADERS,
      'Content-Security-Policy': artifactCsp(target.kind),
      'Content-Type': target.contentType,
      'Accept-Ranges': 'bytes',
      ...(stream.contentLength ? { 'Content-Length': stream.contentLength } : {}),
      ...(stream.contentRange ? { 'Content-Range': stream.contentRange } : {}),
      ...extraHeaders,
    },
  })
}

/**
 * The gate said no, on a route that hands out bytes (spec R10). No HTML — a `<video>` element or a
 * download manager cannot show a form — and no body at all, so nothing about the content leaks.
 * 403 only when the visitor is KNOWN and not a member; every other refusal is 401. The CSP is the
 * kind's own, so `byte-routes.test.ts` can keep asserting the header never changes shape.
 */
export function artifactGateRefusal(
  target: ArtifactServeTarget,
  verdict: { kind: string }
): Response {
  return new Response(null, {
    status: verdict.kind === 'private-denied' ? 403 : 401,
    headers: {
      ...ARTIFACT_COMMON_HEADERS,
      'Content-Security-Policy': artifactCsp(target.kind),
    },
  })
}
