import type { NextRequest } from 'next/server'
import { artifactBodyExceedsLimit } from '@/core/helpers/artifact-upload-limit'
import { ARTIFACT_MAX_BYTES, type ArtifactDTO } from '@/core/types/artifact.type'
import {
  BadRequestError,
  PayloadTooLargeError,
} from '@/infrastructure/response/errors/domain.errors'
import type { ArtifactDetailResult, ArtifactToolResult } from '@/shared/schemas/agent-tools'

/**
 * The three steps `publish-artifact` and `update-artifact` share (spec R5/R6). Kept out of the route
 * files so the two can never drift on the layer-0 limit, the blank-page rule, or the projection.
 */

/**
 * LAYER 0 — refuse on the declared `Content-Length` BEFORE `request.json()` buffers the body. Same
 * helper and the same 1 MB headroom as the upload/replace routes. `declared_bytes` travels in params
 * so the MCP mapper can say "the request body is X" instead of pretending it measured the HTML.
 */
export function rejectOversizedAgentBody(request: NextRequest): void {
  const declared = request.headers.get('content-length')
  if (!artifactBodyExceedsLimit(declared)) return

  throw new PayloadTooLargeError('Artifact body exceeds the size limit', {
    key: 'common:messages.error.field_exceed_limit',
    params: {
      field: '$t(label.file)',
      limit: ARTIFACT_MAX_BYTES / 1024 / 1024,
      declared_bytes: Number(declared),
    },
  })
}

/**
 * A page that is only whitespace is, to the person who scans the QR, the same as an empty page.
 *
 * Runs on the RAW body, BEFORE `safeParse`: the Zod schema says `html.min(1)` so the JSON Schema
 * carries `minLength`, which means `""` would otherwise fail as a generic 400 ("re-read the schema")
 * while `"   "` got this key — two different answers for what is the same mistake (spec A16 wants one).
 * Key `agent:*` on purpose: no UI renders it, the MCP mapper is the only reader. A non-string `html`
 * is left to the schema.
 */
export function ensureHtmlNotBlank(body: unknown): void {
  const html = (body as { html?: unknown } | null)?.html
  if (typeof html !== 'string' || html.trim() !== '') return
  throw new BadRequestError('`html` is empty', { key: 'agent:artifact.html_empty' })
}

/**
 * The tool's view of an artifact — ONE projection for every artifact tool (WP1 §2).
 *
 * ⚠️ THE `short_url` GUARD IS GONE, and removing it was the point rather than a side effect. It used
 * to throw a 500 on a null, on the reasoning that `publish()` always overlays the touch point it
 * just minted, so a null could only be our bug. That reasoning held while `publish_artifact` and
 * `update_artifact` were the only callers. `get_artifact` and `list_artifacts` legitimately return a
 * DRAFT, which has no touch point and therefore no short link — and a 500 for an artifact the user
 * can see in their own dashboard is a worse answer than `"short_url": null`, which the tool's
 * contract now declares nullable and every tool description explains.
 */
export function toArtifactToolResult(dto: ArtifactDTO): ArtifactToolResult {
  return {
    artifact_id: dto.id,
    status: dto.status,
    name: dto.name,
    access_mode: dto.access_mode,
    short_url: dto.short_url,
    serve_url: dto.serve_url,
    qr_url: dto.path_qr_code,
    size_bytes: dto.size_bytes,
    updated_at: dto.updated_at,
  }
}

/** `get_artifact` only: the shared block plus the two counts a detail read pays an extra query for. */
export function toArtifactDetailResult(dto: ArtifactDTO): ArtifactDetailResult {
  return {
    ...toArtifactToolResult(dto),
    visits: dto.visits,
    viewer_count: dto.viewer_count,
  }
}
