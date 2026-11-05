/**
 * MCP write tool `update_artifact` — the back-hop target (spec artifact-wave3-mcp-publish R3/R6).
 *
 * POST /api/agent/tools/update-artifact   body `{ artifact_id, html }`
 *
 * Swaps the HTML behind an artifact and leaves its short link, QR, name and visit history alone —
 * `artifactService.replaceContent` (wave 3, replace-file) is the whole feature; this route only wraps
 * the HTML as a file and calls it. NOT `POST …/artifacts/{id}/replace`: that route is `withAuth` and
 * does not read a PASETO. 200, not 201: nothing is created.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import {
  ensureHtmlNotBlank,
  rejectOversizedAgentBody,
  toArtifactToolResult,
} from '@/core/helpers/artifact-agent-tools'
import { uploadedFileFromHtml } from '@/core/helpers/html-upload'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { updateArtifactInputSchema, type UpdatedArtifact } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  rejectOversizedAgentBody(request)

  const body = await request.json().catch(() => null)
  ensureHtmlNotBlank(body)
  const parsed = updateArtifactInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { artifact_id, html } = parsed.data

  const result = await artifactService.replaceContent(orgId, context.userId, artifact_id, {
    file: uploadedFileFromHtml(html),
  })

  const data: UpdatedArtifact = {
    ...toArtifactToolResult(result),
    previous_size_bytes: result.previous_size_bytes,
  }
  return APIResponse.ok({ data })
})
