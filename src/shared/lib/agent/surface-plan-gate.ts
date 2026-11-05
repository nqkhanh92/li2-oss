/**
 * AI Agent Platform / MCP (Phase 1b) — which plan feature each agent surface is sold under.
 *
 * Lives here, downstream of BOTH `paseto.ts` (the token layer, which owns `AgentSurface`) and
 * `plan-permission.ts` (the plan layer, which owns the feature keys), so neither has to import the
 * other. Putting it in `plan-permission.ts` would drag a `paseto-ts`/node-crypto module into a leaf
 * that client components import; putting it in `paseto.ts` would teach the token layer about plans.
 */
import { AgentSurface } from './paseto'
import { ADVANCED_FEATURE_KEYS, OrgAdvancedFeatureKey } from '@/shared/types/plan-permission'

/**
 * `Record<AgentSurface, …>` on purpose: adding a surface fails to compile until it is priced here,
 * rather than silently falling through to a wrong gate. Callers index it with the ALREADY-RESOLVED
 * `agent.surface` — a token with no `surface` claim resolves to `'chat'` and so still gates on
 * AI_CHAT, which is the whole of the li2-ai backward compatibility.
 */
export const SURFACE_FEATURE_KEY: Record<AgentSurface, OrgAdvancedFeatureKey> = {
  chat: ADVANCED_FEATURE_KEYS.AI_CHAT,
  mcp: ADVANCED_FEATURE_KEYS.MCP_ACCESS,
}
