/**
 * In-memory stand-in for `McpOAuthRepository` (plan Phase 3a).
 *
 * ★ WHY A HAND-WRITTEN FAKE AND NOT `vi.mock` STUBS: two of the repository's methods are security
 * controls whose whole value is ATOMICITY — `claimCodeAtomically` and `claimRefreshTokenAtomically`
 * are single `DELETE/UPDATE … RETURNING` statements, so Postgres' row lock guarantees that exactly
 * one of N concurrent callers gets the row. A `mockResolvedValue` cannot express that, and a test
 * built on one would pass just as happily against a read-then-delete implementation — i.e. against
 * the exact bug we care about.
 *
 * This fake reproduces the guarantee the only way JavaScript can: the claim methods mutate the map
 * SYNCHRONOUSLY, before their first `await`. Two overlapping calls therefore interleave the same way
 * two transactions do — the first takes the row, the second finds nothing. If someone later
 * rewrites the real repository as read-then-delete, the concurrency test here still fails, because
 * the service would then perform its own read and delete around an await.
 */
import type {
  McpOAuthClientInsert,
  McpOAuthClientRow,
  McpOAuthCodeInsert,
  McpOAuthCodeRow,
  McpOAuthTokenInsert,
  McpOAuthTokenRow,
} from '@/core/repositories/mcp-oauth.repository'

export class FakeMcpOAuthRepository {
  clients = new Map<string, McpOAuthClientRow>()
  codes = new Map<string, McpOAuthCodeRow>()
  tokens: McpOAuthTokenRow[] = []

  /** Counts the bearer lookup so a test can prove `/api/mcp`'s prefix guard rejects junk BEFORE the
   *  database is asked (Phase 5). A verdict-only assertion cannot tell "rejected early" from
   *  "rejected late", and "late" is the whole cost the guard exists to avoid. */
  findLiveTokenByAccessHashCalls = 0

  private tokenSeq = 0

  reset(): void {
    this.clients.clear()
    this.codes.clear()
    this.tokens = []
    this.tokenSeq = 0
    this.findLiveTokenByAccessHashCalls = 0
  }

  // ── clients ───────────────────────────────────────────────────────────────────────────────────

  async createClient(input: McpOAuthClientInsert): Promise<McpOAuthClientRow> {
    const row: McpOAuthClientRow = {
      ...input,
      created_at: new Date().toISOString(),
      last_granted_at: null,
    }
    this.clients.set(row.client_id, row)
    return row
  }

  async findClient(clientId: string): Promise<McpOAuthClientRow | null> {
    return this.clients.get(clientId) ?? null
  }

  async markClientGranted(clientId: string): Promise<void> {
    const row = this.clients.get(clientId)
    if (row) row.last_granted_at = new Date().toISOString()
  }

  // ── codes ─────────────────────────────────────────────────────────────────────────────────────

  async createCode(input: McpOAuthCodeInsert): Promise<void> {
    this.codes.set(input.code_hash, { ...input, created_at: new Date().toISOString() })
  }

  /** Synchronous take-and-delete — see the file header. Do not add an `await` before the delete. */
  async claimCodeAtomically(codeHash: string): Promise<McpOAuthCodeRow | null> {
    const row = this.codes.get(codeHash)
    if (!row) return null
    this.codes.delete(codeHash)
    return row
  }

  // ── tokens ────────────────────────────────────────────────────────────────────────────────────

  async createToken(input: McpOAuthTokenInsert): Promise<McpOAuthTokenRow> {
    const row: McpOAuthTokenRow = {
      ...input,
      id: `token_${++this.tokenSeq}`,
      revoked_at: null,
      created_at: new Date().toISOString(),
    }
    this.tokens.push(row)
    return row
  }

  async findLiveTokenByAccessHash(accessTokenHash: string): Promise<McpOAuthTokenRow | null> {
    this.findLiveTokenByAccessHashCalls += 1
    return (
      this.tokens.find((t) => t.access_token_hash === accessTokenHash && t.revoked_at === null) ??
      null
    )
  }

  /** Mirrors `UPDATE … WHERE refresh_token_hash = $1 AND revoked_at IS NULL RETURNING *`. */
  async claimRefreshTokenAtomically(refreshTokenHash: string): Promise<McpOAuthTokenRow | null> {
    const row = this.tokens.find(
      (t) => t.refresh_token_hash === refreshTokenHash && t.revoked_at === null
    )
    if (!row) return null
    row.revoked_at = new Date().toISOString()
    return row
  }

  async findAnyTokenByRefreshHash(refreshTokenHash: string): Promise<McpOAuthTokenRow | null> {
    return this.tokens.find((t) => t.refresh_token_hash === refreshTokenHash) ?? null
  }

  async findTokenByEitherHash(tokenHash: string): Promise<McpOAuthTokenRow | null> {
    return (
      this.tokens.find(
        (t) => t.access_token_hash === tokenHash || t.refresh_token_hash === tokenHash
      ) ?? null
    )
  }

  async revokeGrantFamily(grantId: string): Promise<number> {
    let revoked = 0
    for (const token of this.tokens) {
      if (token.grant_id === grantId && token.revoked_at === null) {
        token.revoked_at = new Date().toISOString()
        revoked++
      }
    }
    return revoked
  }
}
