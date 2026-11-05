import { NextRequest } from 'next/server'
import { artifactBodyExceedsLimit } from '@/core/helpers/artifact-upload-limit'
import { uploadedFileFromHtml } from '@/core/helpers/html-upload'
import { artifactService, type UploadedArtifactFile } from '@/core/services/artifact.service'
import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'
import {
  BadRequestError,
  PayloadTooLargeError,
} from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext } from '@/shared/types/request'

/**
 * `POST …/replace`, not `PATCH …/{artifact_id}` (spec R1). Three reasons, heaviest first:
 *
 * 1. The MCP back-hop only emits GET or POST+JSON (`core/mcp/call-tool.ts`), and `update_artifact`
 *    is this endpoint's second caller. A PATCH would mean touching the MCP transport.
 * 2. PATCH on the resource is reserved for editing FIELDS (`name`, later `access_mode`). Replacing
 *    content is an operation with side effects outside the database — an upload and a delete — and
 *    it forbids changing almost every field. Calling that PATCH would be naming it wrong.
 * 3. It matches `POST …/{artifact_id}/publish`.
 *
 * Two bodies, one service call. The branch is on `Content-Type`:
 *
 * - `multipart/form-data` — the UI. Field `file`, nothing else: the name does not change here.
 * - `application/json`    — the MCP tool. `{ "html": string }`; the server wraps it as a file named
 *   `index.html`, so only `kind = 'html'` can arrive this way, which is the MCP v1 scope.
 *
 * Both go through layer 0 first: refuse on the declared `Content-Length` before parsing anything,
 * for the same memory reason as the upload route. For JSON the escaping (`\n`, `\"`) makes the body
 * longer than the HTML itself; the 1MB headroom covers ordinary pages, and an HTML under 10MB that
 * is dense with escapes may be refused unfairly — accepted for v1 (spec §6).
 */
export const POST = withAuth<{ org_id: string; artifact_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; artifact_id: string }; context: AuthContext }
  ) => {
    if (artifactBodyExceedsLimit(request.headers.get('content-length')))
      throw new PayloadTooLargeError('Artifact replace body exceeds the size limit', {
        key: 'common:messages.error.field_exceed_limit',
        params: { field: '$t(label.file)', limit: ARTIFACT_MAX_BYTES / 1024 / 1024 },
      })

    const file = isJson(request) ? await fileFromJson(request) : await fileFromMultipart(request)

    const result = await artifactService.replaceContent(
      params.org_id,
      context.userId,
      params.artifact_id,
      { file }
    )

    return APIResponse.ok({
      data: result,
      i18nMessage: { key: 'common:messages.success.updated_field', params: { field: '$t(label.artifact)' } },
    })
  }
)

const isJson = (request: NextRequest) =>
  (request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')

async function fileFromMultipart(request: NextRequest): Promise<UploadedArtifactFile> {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File))
    throw new BadRequestError('A file is required', {
      key: 'common:messages.error.field_required',
      params: { field: '$t(label.file)' },
    })

  return file
}

/**
 * `{ html }` → a file named `index.html` via the shared helper (the MCP agent routes wrap HTML the
 * same way — one place decides the name and that `size` is UTF-8 bytes). An unparsable body or a
 * non-string `html` is a 400 with the same key the multipart branch uses for a missing file — to the
 * caller both mean "you sent no file".
 */
async function fileFromJson(request: NextRequest): Promise<UploadedArtifactFile> {
  const body = await request.json().catch(() => null)
  const html = body?.html

  if (typeof html !== 'string')
    throw new BadRequestError('`html` is required', {
      key: 'common:messages.error.field_required',
      params: { field: '$t(label.file)' },
    })

  return uploadedFileFromHtml(html)
}
