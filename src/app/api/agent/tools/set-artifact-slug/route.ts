/**
 * MCP write tool `set_artifact_slug` — the back-hop target (WP2 §2).
 *
 * POST /api/agent/tools/set-artifact-slug   body `{ artifact_id, slug }`
 *
 * POST and not PATCH, matching the service's own reasoning: this call has side effects OUTSIDE the
 * database — a new row in `slugs` and a QR image rendered and uploaded — and the repo reserves PATCH
 * for plain column edits. Same family as `publish` and `replace`.
 *
 * Thin on purpose. `artifactService.changeSlug` owns `ensurePolicy(add_touch_point)`, the live-only
 * rule (a draft is a 409), re-validating the slug against the shared `slugSchema`, the plan's
 * `MAX_SLUGS_PER_TP` limit, the `slug_is_taken` mapping of a unique violation, re-rendering the QR
 * with the user's own `qr_customize_options`, and bumping `updated_at` so the QR image cache busts.
 *
 * ⚠️ THE SECOND IDENTICAL CALL IS A SUCCESS, NOT A REFUSAL, and it is the SERVICE that makes it so:
 * `changeSlug` compares the touch point's current slug with the requested one and returns the DTO
 * untouched when they match, before reaching the `slugs` insert. So a retry after a lost response
 * cannot collide with the row it created itself — which is what `idempotent: true` in the registry
 * is claiming, and it is claiming it about code, not about a hope.
 *
 * NOT `POST …/organizations/{org}/artifacts/{id}/slug`: that route is `withAuth` (Casdoor cookie)
 * and would 401 a PASETO.
 *
 * nodejs runtime: withAgentAuth → paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { artifactService } from '@/core/services/artifact.service'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { toArtifactToolResult } from '@/core/helpers/artifact-agent-tools'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { setArtifactSlugInputSchema, type ArtifactToolResult } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const body = await request.json().catch(() => null)
  const parsed = setArtifactSlugInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { artifact_id, slug } = parsed.data
  // The schema's `.refine` already rejected an empty slug; this line is how that becomes a `string`
  // for the compiler, because `slugSchema` transforms `''` to `undefined` and a `.refine` cannot
  // narrow a type. Not dead weight either way: a 400 is the right answer if it ever is reachable.
  if (!slug) throw new BadRequestError()

  const dto = await artifactService.changeSlug(orgId, context.userId, artifact_id, slug)

  recordArtifactAudit({
    orgId,
    userId: context.userId,
    artifactId: artifact_id,
    action: 'update',
    tool: 'set_artifact_slug',
    clientId: agent.clientId,
    surface: agent.surface,
  })

  const data: ArtifactToolResult = toArtifactToolResult(dto)
  return APIResponse.ok({ data })
})
