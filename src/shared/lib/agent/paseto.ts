/**
 * AI Agent Platform — PASETO v4.public token seam (Phase 0).
 *
 * The ONLY place in li2-app that knows the agent token is PASETO. The mint route signs here; the
 * back-hop middleware verifies here. Same token serves both hops (architecture §3, no X-Li2-API-Key).
 *
 * Format = PASERK (k4.secret / k4.public), required by paseto-ts. Keys come from env:
 *   AGENT_PASETO_PRIVATE_KEY  — k4.secret (signing; li2-app only)
 *   AGENT_PASETO_PUBLIC_KEY   — k4.public (verifying)
 *   AGENT_PASETO_KEY_ID       — current signer's kid (PASETO footer)
 *   AGENT_PASETO_PUBLIC_KEYS  — optional JSON map {kid: k4.public} for rotation
 *
 * v4.public is SIGNED, not encrypted — the payload is readable by the token holder. Never put a
 * genuine secret in the claims (email is acceptable — the user knows their own).
 */
import { sign, verify } from 'paseto-ts/v4'

export const AGENT_TOKEN_ISSUER = 'li2-app'
export const AGENT_TOKEN_AUDIENCE = 'li2-ai'
/**
 * Front-hop token lifetime. Short — the browser re-mints on expiry (task-0.7). Single source of
 * truth: mintAgentToken derives ONE expiry instant from this and uses it for BOTH the token's `exp`
 * claim AND the `expiresAt` it returns, so the value the browser trusts is the token's own claim —
 * never a second re-derivation that could drift and silently under/over-report the real lifetime.
 */
export const AGENT_TOKEN_TTL_MS = 15 * 60 * 1000

export type AgentScope = 'read' | 'write'

/** Which product surface holds the token: the li2-ai chat panel, or a third-party MCP client. */
export type AgentSurface = 'chat' | 'mcp'

/** Per-org advanced-field entitlements (Phase 3b, B4) — mirrors the two ensureOrgPlan tracks. */
export interface AgentEntitlements {
  advanced_features_allowed: string[] // list track (link_password, link_expiration, …)
  allow_custom_utm_tags: boolean // boolean track (UTM)
}

/** The claims contract (KEYPAIR.md §3). Consumed by withAgentAuth on the back hop. */
export interface AgentClaims {
  org_id: string
  user_id: string
  email: string
  plan: string
  scopes: AgentScope[]
  ai_budget: number // resolved monthly cap, integer cents; li2-ai meters against it (§11 amendment)
  // 3b: li2-ai pre-checks plan at propose time. Optional — pre-3b tokens verify fine; li2-ai skips
  // the propose-time check when absent (B7).
  entitlements?: AgentEntitlements
  // MCP: which surface minted this token, so the tool routes can gate on the right plan feature.
  // MUST stay optional — every token li2-ai and the chat panel hold omits it, and
  // resolveAgentSurface() reads that absence as 'chat'. Making it required breaks both.
  surface?: AgentSurface
  /**
   * MCP: the OAuth client_id of the connected third-party agent, carried so a back-hop route can put
   * it in an audit row — "which agent deleted this artifact" has no other answer (WP1 §5).
   *
   * MUST stay optional for the same reason as `surface`: every chat-panel and li2-ai token omits it.
   * Informational only — nothing authorizes on it, and it is NOT a secret (a v4.public token is
   * signed, not encrypted, so the holder can read its own client_id anyway).
   */
  client_id?: string
  iss: string
  aud: string
  // iat/exp are added/validated by paseto-ts.
  [key: string]: unknown
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`[agent/paseto] missing env ${name}`)
  return v
}

/**
 * The trusted {kid -> public key} map, parsed ONCE at module load — not per request. A malformed
 * AGENT_PASETO_PUBLIC_KEYS fails fast at startup here, rather than masquerading as a 401 on the
 * verify hot path. `null` means "no map configured" → fall back to the single AGENT_PASETO_PUBLIC_KEY.
 */
const PUBLIC_KEY_MAP: Record<string, string> | null = (() => {
  const mapRaw = process.env.AGENT_PASETO_PUBLIC_KEYS
  if (!mapRaw) return null
  try {
    return JSON.parse(mapRaw) as Record<string, string>
  } catch {
    throw new Error('[agent/paseto] AGENT_PASETO_PUBLIC_KEYS is not valid JSON')
  }
})()

/** Resolve the public key for a given kid from the rotation map, falling back to the single key. */
export function resolvePublicKeyByKid(kid: string | undefined): string {
  if (PUBLIC_KEY_MAP) {
    if (kid && PUBLIC_KEY_MAP[kid]) return PUBLIC_KEY_MAP[kid]
    // No kid, or kid not in the map: if exactly one key is configured, use it; else fail.
    const keys = Object.values(PUBLIC_KEY_MAP)
    if (keys.length === 1) return keys[0]
    throw new Error(`[agent/paseto] no public key for kid=${kid ?? '<none>'}`)
  }
  return requireEnv('AGENT_PASETO_PUBLIC_KEY')
}

/**
 * Mint a v4.public agent token (front hop). The kid travels in the footer for rotation.
 *
 * Returns the token AND its absolute expiry as an ISO string. The expiry instant is computed ONCE
 * and passed to sign() as the `exp` claim, so the returned `expiresAt` IS the token's own claim,
 * not a matching re-derivation. paseto-ts accepts an absolute ISO `exp` and normalizes it to the
 * same ISO string in-token (lib/parse.js), so the wire format is identical to a relative `'15m'`
 * and the li2-ai (pyseto) verifier reads the same `exp`.
 */
export function mintAgentToken(claims: Omit<AgentClaims, 'iss' | 'aud'>): {
  token: string
  expiresAt: string
} {
  const secretKey = requireEnv('AGENT_PASETO_PRIVATE_KEY')
  const kid = requireEnv('AGENT_PASETO_KEY_ID')
  const expiresAt = new Date(Date.now() + AGENT_TOKEN_TTL_MS).toISOString()
  const token = sign(
    secretKey,
    {
      ...claims,
      iss: AGENT_TOKEN_ISSUER,
      aud: AGENT_TOKEN_AUDIENCE,
      exp: expiresAt,
    },
    { footer: { kid } }
  )
  return { token, expiresAt }
}

/**
 * Verify a v4.public agent token (back hop). Checks signature (by footer kid), exp (paseto-ts),
 * and iss/aud. Throws on any failure — the caller maps that to 401.
 */
export function verifyAgentToken(token: string): AgentClaims {
  // Peek the footer kid WITHOUT trusting it — used only to pick which public key to verify against.
  const kid = peekFooterKid(token)
  const publicKey = resolvePublicKeyByKid(kid)
  const { payload } = verify<AgentClaims>(publicKey, token)
  if (payload.iss !== AGENT_TOKEN_ISSUER) throw new Error('[agent/paseto] bad iss')
  if (payload.aud !== AGENT_TOKEN_AUDIENCE) throw new Error('[agent/paseto] bad aud')
  return payload
}

/**
 * The token's surface, defaulted. THE single source of the `'chat'` fallback — never read
 * `claims.surface` raw, or the default drifts across call sites. An absent (pre-MCP) or unrecognised
 * value reads as `'chat'`, i.e. exactly today's behaviour; only an explicit `'mcp'` opts out.
 */
export function resolveAgentSurface(claims: AgentClaims): AgentSurface {
  return claims.surface === 'mcp' ? 'mcp' : 'chat'
}

/**
 * Extract the kid from the (unverified) footer. PASETO format: v4.public.<payload>.<footer?>,
 * footer is base64url JSON. Safe because the signature is still verified afterwards with the
 * resolved key — a forged kid only points at a public key that won't validate the signature.
 */
function peekFooterKid(token: string): string | undefined {
  const parts = token.split('.')
  if (parts.length < 4) return undefined
  try {
    const json = Buffer.from(parts[3], 'base64url').toString('utf8')
    const footer = JSON.parse(json) as { kid?: string }
    return footer.kid
  } catch {
    return undefined
  }
}
