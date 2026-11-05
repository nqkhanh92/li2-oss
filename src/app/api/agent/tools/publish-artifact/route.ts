/**
 * MCP write tool `publish_artifact` — the back-hop target (spec artifact-wave3-mcp-publish R3/R5).
 *
 * POST /api/agent/tools/publish-artifact
 *   body `{ name, html, slug?, domain_id?, access?, idempotency_key? }`
 *
 * WP2 added `access` and nothing else in here: one destructured field and one block at the end that
 * calls `applyRequestedAccess` after the publish has already succeeded.
 *
 * Behind `withAgentAuth(['write'])`: the write scope is enforced structurally before this runs, the
 * org comes from the PASETO (`agent.orgId`), never from the body — `publishArtifactInputSchema` is
 * `.strict()`, so a leftover `org_id` is a 400. The route is pure orchestration: layer-0 size check,
 * parse, wrap the HTML as a file, ONE service call. Quota, slug, domain, blacklist and the compensating
 * delete of the draft all live in `artifactService.createAndPublish` and surface through
 * `withAgentAuth`'s error handler as `{ error, message, i18nMessage }`.
 *
 * WP3 added the only branch in here: an optional `idempotency_key` makes the publish claimable, so a
 * retry after a lost response replays the artifact already created instead of making a second one.
 * All of the rule lives in `core/helpers/artifact-idempotency.ts`; this file calls `claim` before the
 * service and exactly one of `complete`/`release` after it. A call WITHOUT a key does not touch Redis.
 *
 * Why not `POST …/artifacts/{id}/publish`: that route is `withAuth` (Casdoor cookie/bearer) and does not
 * read a PASETO — the back hop would get a 401 for a token we just minted.
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
import { applyRequestedAccess } from '@/core/helpers/artifact-agent-access'
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from '@/core/helpers/artifact-idempotency'
import { uploadedFileFromHtml } from '@/core/helpers/html-upload'
import { redis } from '@/infrastructure/cache/redis'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import {
  publishArtifactInputSchema,
  type PublishedArtifactReplay,
  type PublishedArtifactWithAccess,
} from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

/**
 * The replay answer: the artifact the key already published, read back fresh rather than cached, so
 * a page that has since been renamed or had its access changed is reported as it is NOW.
 *
 * ⚠️ The `getForOrg` 404 is remapped to its own i18n key, and that is not cosmetic. `getForOrg`
 * refuses a tombstone, so "the artifact this key published was deleted afterwards" arrives here as
 * an ordinary not-found — which the MCP mapper would turn into "check the id or slug", about an id
 * the caller never sent. The agent's actual options are to drop the key or pick a new one, and only
 * a distinct key can say that. Re-publishing instead is NOT an option: the one promise of a key is
 * that it names at most one artifact, and a key that silently publishes again after a delete breaks
 * it for every caller that retries on a schedule.
 */
async function replayedPublish(
  orgId: string,
  artifactId: string
): Promise<PublishedArtifactReplay> {
  try {
    const dto = await artifactService.getForOrg(orgId, artifactId)
    return { ...toArtifactToolResult(dto), idempotent_replay: true }
  } catch (error) {
    // Duck-typed on `status`, not `instanceof NotFoundError` — the 3b lesson `core/mcp/call-tool.ts`
    // documents: Next builds one bundle per route, so a shared error class can exist as several
    // distinct class objects and `instanceof` silently returns false across bundles. Anything
    // without a numeric `status` (a driver error, a real outage) still propagates untouched.
    if ((error as { status?: unknown })?.status !== 404) throw error
    throw new NotFoundError('The artifact this idempotency_key published no longer exists', {
      key: 'agent:artifact.idem_artifact_gone',
    })
  }
}

export const POST = withAgentAuth(['write'], async (request: NextRequest, { context, agent }) => {
  const orgId = agent.orgId

  // Re-gate the plan on every call, AHEAD of the body: an unentitled org is refused before its input
  // is even looked at. MCP tokens carry `surface: 'mcp'` → MCP_ACCESS; a chat token → AI_CHAT.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  rejectOversizedAgentBody(request)

  const body = await request.json().catch(() => null)
  ensureHtmlNotBlank(body)
  const parsed = publishArtifactInputSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()

  const { name, html, slug, domain_id, access, idempotency_key: idempotencyKey } = parsed.data

  // WP3 — claim BEFORE the service, so two retries arriving together cannot both publish. A call
  // with no key skips this entirely and is not idempotent, exactly as the tool advertises.
  if (idempotencyKey) {
    const claim = await claimIdempotency(redis, orgId, idempotencyKey)
    // 200, not 201: nothing was created by this call, and the status is the second place the answer
    // says so (the first is `idempotent_replay`).
    if (claim.outcome === 'replay')
      return APIResponse.ok({ data: await replayedPublish(orgId, claim.artifactId) })
  }

  let dto
  try {
    dto = await artifactService.createAndPublish(orgId, context.userId, {
      name,
      file: uploadedFileFromHtml(html),
      slug,
      domain_id,
    })
  } catch (error) {
    // Hand the key back: a quota refusal or a taken slug is something the user fixes and the agent
    // then retries — with the same key, because it has no reason to mint a new one. Leaving the
    // claim in place would answer 409 for a day. `release` never throws, so the real error is what
    // reaches the error handler.
    if (idempotencyKey) await releaseIdempotency(redis, orgId, idempotencyKey)
    throw error
  }

  if (idempotencyKey) await completeIdempotency(redis, orgId, idempotencyKey, dto.id)

  /**
   * WP2 §3 — the requested access mode, applied AFTER the publish and in its own helper.
   *
   * It runs after `completeIdempotency` on purpose: the artifact exists either way, so the key must
   * name it before anything optional is attempted. `applyRequestedAccess` NEVER THROWS for an access
   * failure — it answers the published DTO plus a `warning`, and the page stays public. See
   * `core/helpers/artifact-agent-access.ts` for why there is no rollback.
   */
  if (access) {
    const applied = await applyRequestedAccess({
      orgId,
      userId: context.userId,
      published: dto,
      access,
      clientId: agent.clientId,
      surface: agent.surface,
    })
    const data: PublishedArtifactWithAccess = {
      ...toArtifactToolResult(applied.dto),
      ...(applied.warning ? { warning: applied.warning } : {}),
    }
    // Still 201: the publish created an artifact whether or not the lock on it landed.
    return APIResponse.created({ data })
  }

  // 201 like create-short-link: a publish creates. `backHop()` reads `.data` of any 2xx.
  return APIResponse.created({ data: toArtifactToolResult(dto) })
})
