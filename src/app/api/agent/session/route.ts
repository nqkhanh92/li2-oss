/**
 * AI Agent Platform — mint endpoint (Phase 0, architecture §3 front hop).
 *
 * POST /api/agent/session
 * Called from the browser by a logged-in user (withAuth). Gates on org membership + the AI_CHAT plan
 * feature, then mints a short-lived PASETO v4.public token the browser uses to open an SSE turn to
 * li2-ai. org_id comes from the body (this route has no [org_id] path segment).
 *
 * nodejs runtime: paseto-ts needs node crypto, not edge.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan, getOrganizationPlan, getOrgQuota } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS, TIER_DEFAULT } from '@/shared/types/plan-permission'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { mintAgentToken } from '@/shared/lib/agent/paseto'

export const runtime = 'nodejs'

const mintSchema = z.object({
  org_id: z.string().uuid(),
})

export const POST = withAuth(async (request: NextRequest, { context }) => {
  const body = await request.json().catch(() => null)
  const parsed = mintSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestError()
  const { org_id } = parsed.data

  // Front-hop gates — the single plan-gate enforcement point for the whole agent feature (§2/§3).
  await ensureOrgMember(org_id)
  await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.AI_CHAT)

  const orgPlan = await getOrganizationPlan(org_id)
  const quota = await getOrgQuota(org_id)
  const planKey = orgPlan?.plan_key

  // Per-org override wins; else the tier default. No silent fallback:
  // ensureOrgPlan(AI_CHAT) above guaranteed an AI-bearing tier, so TIER_DEFAULT[planKey] is
  // defined for every plan that can legitimately reach here. If it resolves to undefined,
  // something is wrong (orgPlan null post-gate, or a new AI tier shipped without a TIER_DEFAULT
  // entry) — fail loud rather than mint an uncapped token.
  const aiBudgetCents =
    quota?.ai_monthly_budget_cents ?? (planKey ? TIER_DEFAULT[planKey] : undefined)
  if (typeof aiBudgetCents !== 'number') {
    throw new AppError(`[agent/session] no AI budget resolvable for plan=${planKey ?? '<none>'}`)
  }

  const { token, expiresAt } = mintAgentToken({
    org_id,
    user_id: context.userId,
    email: context.email,
    plan: planKey ?? 'unknown', // informational; back hop re-checks via ensureOrgPlan
    // Every org reaching here has AI_CHAT (ensureOrgPlan above) → grant read+write to all (L5). The
    // human-approval round-trip is the real gate on writes, not a separate entitlement. Tokens minted
    // before this shipped carry only ['read'] and get 403 from the write route → the browser re-mints
    // (15-min TTL); that is expected token refresh, not a bug.
    scopes: ['read', 'write'],
    ai_budget: aiBudgetCents,
    // 3b (B4/B5): entitlements so li2-ai can refuse an unentitled advanced field BEFORE the
    // approval card, mirroring the two ensureOrgPlan tracks. orgPlan is non-null here (ensureOrgPlan
    // AI_CHAT passed above) but default defensively.
    entitlements: {
      advanced_features_allowed: orgPlan?.advanced_features_allowed ?? [], // list track
      allow_custom_utm_tags: orgPlan?.allow_custom_utm_tags ?? false, // boolean track
    },
  })

  return APIResponse.created({
    data: { token, token_type: 'Bearer', expires_at: expiresAt },
    i18nMessage: { key: 'text.success', defaultMessage: 'Success' },
  })
})
