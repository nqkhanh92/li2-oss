/**
 * AI Agent Platform — link-details read tool.
 *
 * GET /api/agent/tools/link-details?id=<string>  (preferred)
 * GET /api/agent/tools/link-details?slug=<string> (fallback)
 * Behind withAgentAuth (PASETO back hop, scope=read). Use case: "tạo link mới giống link 6LBCU" —
 * the agent needs to read back an existing link's config to show/reuse/duplicate it.
 *
 * `id` is the touchpoint id threaded straight from get_top_links' TopLinkEntry.id — an exact
 * primary-key lookup, no guessing. `slug` is the pre-existing fallback: whatever identifier segment
 * the caller has for the short URL. Most touch-points never get a custom slug (only an auto
 * short_code), and the model sometimes passes the link's `name` instead, so the repository resolves
 * by priority — `slug` > `short_code` > `name` (touch-point.repository.ts:
 * getBySlugShortCodeOrNameForOrg). A `name` match on more than one row throws BadRequestError (400)
 * from the service rather than guessing — see getBySlugForOrg. At least one of `id`/`slug` is
 * required (linkDetailsQuerySchema.refine).
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai):
 *   LinkDetails = { slug, name, destination_url, utm_source, utm_medium, utm_campaign, utm_term,
 *                    utm_content, has_password, expires_at, detail_url }
 * plus, as OPTIONAL additions (SL-0 §4): id, short_url, qr_url, enabled.
 * `has_password` is a boolean projection ONLY — the real password value never leaves this route.
 * `detail_url` points the AI chat at the link's detail page in the app — built from the org's
 * `org_slug` (falling back to the org id when unset, same identifier the app's routing accepts)
 * plus the resolved touch-point id, matching the canonical in-app href shape.
 *
 * nodejs runtime: withAgentAuth -> paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { touchPointService } from '@/core/services/touch-point.service'
import { organizationService } from '@/core/services/organization.service'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SURFACE_FEATURE_KEY } from '@/shared/lib/agent/surface-plan-gate'
import { TouchPointContentType } from '@/features/touch-points/types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { linkDetailsQuerySchema, type LinkDetails } from '@/shared/schemas/agent-tools'

export const runtime = 'nodejs'

// Shapes of the two jsonb columns this route reads — deliberately narrow (only the fields the
// wire contract projects), NOT the full advanced-schema shape.
type AccessControlShape = { password?: string | null; expires_at?: string | null }
type UtmTagsShape = {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  utm_content?: string | null
}

// Read scope is enforced structurally by withAgentAuth(['read'], ...) before this handler runs.
export const GET = withAgentAuth(['read'], async (request: NextRequest, { agent, context }) => {
  const orgId = agent.orgId

  // Gated on the caller's surface: chat panel → AI_CHAT, MCP client → MCP_ACCESS.
  await ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])

  const parsed = linkDetailsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  // 400, not 500 — missing id/slug (or an empty one) is a user error
  if (!parsed.success) throw new BadRequestError()

  // `id` is the preferred exact lookup (get_top_links' TopLinkEntry.id); `slug` is the tolerant
  // fallback resolver. The refine above guarantees at least one is present.
  const tp = parsed.data.id
    ? await touchPointService.getByIdForOrg(orgId, parsed.data.id)
    : await touchPointService.getBySlugForOrg(orgId, parsed.data.slug!)
  if (!tp) throw new NotFoundError('Link not found') // org-scoped miss -> friendly 404, never a 500

  // Data-leak gate: org scoping alone is NOT per-member view scoping. Same check the human-facing
  // touch-point route enforces (collection permission if categorized, else OWN-scope for the
  // uncategorized case) — reused here so an org member with an AI_CHAT token cannot read a link
  // they cannot see in the UI. A ForbiddenError (403) is correct: short_code existence is already
  // publicly observable via the redirect service, so this is not an existence-oracle concern.
  await touchPointService.ensureCanViewTouchPoint(orgId, tp.id, context.userId)

  const utmTags = (tp.utm_tags ?? null) as UtmTagsShape | null
  const accessControl = (tp.access_control ?? null) as AccessControlShape | null

  // The app's routing keys the org path segment by org_slug (a middleware maps slug -> org_id),
  // falling back to the raw org id when org_slug is null — the same identifier-or-slug fallback
  // organization.repository.ts's updateByIdentifier already relies on.
  const org = await organizationService.getOrgById(orgId)
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
  const orgPathSegment = org?.org_slug ?? orgId
  const detailUrl = `${appBaseUrl}/org/${orgPathSegment}/short-links/${tp.id}`

  const data: LinkDetails = {
    // Echo the current canonical identifier, not blindly the query param — a lookup that matched
    // by short_code (or by `id`) still reports the link's real slug when one exists.
    // `parsed.data.slug` is undefined on the `id` path, so fall back to '' rather than leaking
    // `tp.id` into the response.
    slug: tp.slug ?? tp.short_code ?? parsed.data.slug ?? '',
    name: tp.name,
    destination_url: tp.content_type === TouchPointContentType.URL ? tp.content_value : null,
    utm_source: utmTags?.utm_source ?? null,
    utm_medium: utmTags?.utm_medium ?? null,
    utm_campaign: utmTags?.utm_campaign ?? null,
    utm_term: utmTags?.utm_term ?? null,
    utm_content: utmTags?.utm_content ?? null,
    // Boolean projection ONLY — never the password value itself.
    has_password: Boolean(accessControl?.password),
    expires_at: accessControl?.expires_at ?? null,
    detail_url: detailUrl,
    // SL-0 §4 — four ADDITIONS to the cross-repo contract, no renames. Always sent; optional in the
    // type so an older li2-ai mirror keeps validating this payload. `id` was previously withheld on
    // the reasoning that it is a lookup key, not part of the shape; that reasoning cost the agent
    // the only identifier the short-link tools accept, so it is now published.
    id: tp.id,
    short_url: tp.short_url,
    qr_url: tp.path_qr_code ?? null,
    enabled: tp.enabled,
  }

  return APIResponse.ok({ data })
})
