import { NextRequest, NextResponse } from 'next/server'
// artifact-serve.service, NOT artifact.service: the latter imports touchPointService, which pulls in
// qr-code-styling and the native `canvas` binary. This public route must stay off that path.
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { artifactGateService } from '@/core/services/artifact-gate.service'
import { artifactByteResponse, artifactGateRefusal } from '@/core/helpers/artifact-byte-response'
import { attachmentDisposition, downloadFileName } from '@/core/helpers/artifact-download'

/**
 * The raw bytes as a download, for every kind.
 *
 * It is linked from the Office and video landing pages FROM THE FIRST BYTE of HTML and never hidden:
 * a cross-origin iframe cannot report failure back to us, so "show the download once we detect the
 * viewer broke" is a promise the page cannot keep.
 *
 * No `Range` here on purpose — a download manager resuming a 10MB file is not a case worth a second
 * code path, and `/file` already answers ranges for the one client that needs them.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const target = await artifactServeService.getLiveTargetByToken(params.token)
  if (!target) return new NextResponse('Not found', { status: 404 })

  // Same gate as `/a/<token>` and `/file`; refused with no body (spec R10).
  const verdict = await artifactGateService.evaluateGate(request, target)
  if (verdict.kind !== 'allow') return artifactGateRefusal(target, verdict)

  const stream = await artifactServeService.streamBytes(target, null)
  if (!stream) return new NextResponse('Not found', { status: 404 })

  return artifactByteResponse(target, stream, {
    'Content-Disposition': attachmentDisposition(
      downloadFileName(target.name, target.storagePath)
    ),
  })
}

/** Same reason as `/file`: the SSG branch would buffer the whole body to cache it. */
export const dynamic = 'force-dynamic'

/**
 * Same reason as `/a/<token>`: without this, a deleted artifact keeps downloading from Next's
 * on-disk Data Cache. See the long note in `../route.ts`. Per-segment, so it must be repeated here.
 */
export const fetchCache = 'force-no-store'
