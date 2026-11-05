/**
 * ============================================================================
 * `list_orgs` — seam exception #1 (plan §4.1, §3).
 * ============================================================================
 *
 * ⛔ THIS FILE READS A REPOSITORY DIRECTLY AND THAT IS DELIBERATE. Every other data tool goes
 * through the HTTP back hop (§3), which is what keeps "extract MCP into its own service" a base-URL
 * change instead of a rewrite. This one CANNOT: the back hop is `withAgentAuth`, `withAgentAuth`
 * requires an `org_id` in the PASETO, and this tool exists precisely to find out which org_ids the
 * user has. There is no org to mint with yet.
 *
 * §3 records the extraction cost honestly: on extraction this collapses into ONE new HTTP endpoint
 * together with the membership + entitlement check inside `call-tool.ts` — the two need the same
 * data. It is one of exactly THREE sanctioned exceptions (this, that check, and `find_li2_docs`);
 * §3 forbids a fourth without amending the plan.
 *
 * ★ THE USER IS THE OAuth GRANT'S USER, FULL STOP. `claims.userId` comes off a validated access
 * token; nothing about the org axis is client-supplied here, which is what makes this tool the only
 * one in the server with no untrusted input to police. That property is why the tool description
 * tells the model to start here — an id from this list is an id that has already been proven.
 *
 * `has_mcp_access` is INFORMATIONAL. It is not a gate: entitlement is re-checked per call at mint
 * time and again inside every tool route, because a plan can change between this call and the next
 * one. Listing an unentitled org rather than hiding it is the friendlier failure — the model can
 * tell the user "that org's plan doesn't include MCP" instead of "that org doesn't exist".
 */
import { organizationRepo } from '@/core/repositories/organization.repository'
import { getOrganizationPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { logger } from '@/infrastructure/logging/logger'
import type { z } from 'zod'
import type { listOrgsResultSchema, mcpOrgEntrySchema } from '@/shared/schemas/agent-tools'

const log = logger.child({ module: 'mcp-list-orgs' })

/**
 * ⭐ P0.4 — inferred from the Zod in `shared/schemas/agent-tools.ts`, which is also what `tools.ts`
 * generates this tool's `outputSchema` from. The shape is unchanged; the declaration moved so there
 * is one of it. See the schema's own comment for why it lives there and not here.
 */
export type McpOrgEntry = z.infer<typeof mcpOrgEntrySchema>
export type ListOrgsResult = z.infer<typeof listOrgsResultSchema>

/**
 * One plan lookup per org, in parallel.
 *
 * That looks like an N+1 and is not worth removing: `getOrganizationPlan` resolves through
 * `getUserPlan`, which is Redis-cached for 30 minutes per OWNING user, so a repeat call across a
 * session is a cache read. Users belong to a handful of orgs, not hundreds.
 *
 * A plan lookup that FAILS reports `has_mcp_access: false` rather than failing the whole tool: the
 * flag is advisory, and an org that cannot resolve a plan genuinely cannot pass the entitlement
 * gate on the next call either — so `false` is the honest answer, not a guess.
 */
async function resolveMcpAccess(orgId: string): Promise<boolean> {
  try {
    const plan = await getOrganizationPlan(orgId)
    return (plan?.advanced_features_allowed ?? []).includes(ADVANCED_FEATURE_KEYS.MCP_ACCESS)
  } catch (error) {
    log.warn({ err: error, orgId }, '[mcp] plan lookup failed while badging list_orgs')
    return false
  }
}

export async function listOrgs(userId: string): Promise<ListOrgsResult> {
  const rows = await organizationRepo.getUserOrgs(userId)

  const organizations = await Promise.all(
    (rows ?? []).map(async (org) => ({
      id: org.id,
      // `name` is nullable in the schema; an unnamed org still needs a label the model can quote
      // back to the user, and its id is not one.
      name: org.name ?? '(unnamed organization)',
      has_mcp_access: await resolveMcpAccess(org.id),
    }))
  )

  // Stable output for a stable prompt: PostgREST does not promise an order without an ORDER BY, and
  // a list that reshuffles between calls burns the client's prompt cache and confuses the model
  // about whether anything changed. Name first because that is what the user recognises.
  organizations.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))

  if (organizations.length === 0) {
    return {
      organizations: [],
      note:
        'This Li2 account is not a member of any organization, so no other Li2 tool can be used ' +
        'yet. The user needs to create or be invited to an organization at https://li2.ai first.',
    }
  }
  return { organizations }
}
