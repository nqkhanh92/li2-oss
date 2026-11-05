/**
 * ============================================================================
 * MCP OAuth authorization server — data access (plan Phase 3a).
 * ============================================================================
 *
 * The three tables from `supabase/migrations/mcp/20260729000002_mcp__oauth_tables.sql`:
 * `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_oauth_tokens`.
 *
 * ⚠️ THIS FILE DOES NOT EXTEND `BaseRepository`, AND THAT IS DELIBERATE. `BaseRepository<T>` builds
 * generic CRUD around a single table, and none of the three access patterns that matter here fit it:
 * `claimCodeAtomically` is a DELETE...RETURNING used as a lock, refresh rotation reads and claims
 * one row then inserts another, and revocation works on a whole `grant_id` family. Inheriting CRUD
 * would add methods this table must NOT expose alongside the ones it needs.
 *
 * The explicit row types below are the contract this layer exposes upward. They now duplicate what
 * `database.types.ts` generates, and that is on purpose: they name only the columns the service is
 * allowed to read, so a column added to the table does not silently widen the service's view.
 *
 * ⚠️ NO AUTHORIZATION DECISIONS LIVE HERE. This repo answers "what does the row say"; whether a
 * caller may have it is decided in `mcp-oauth.service.ts`. The repo-wide no-RLS convention means
 * every query here runs as the service role and would happily return any user's grant.
 *
 * The one thing in this file that is a security control rather than plumbing is
 * `claimCodeAtomically` — see its comment before touching it.
 */
import 'server-only'
import { supabaseService } from '@/infrastructure/database/supabase'

// ---------------------------------------------------------------------------
// Row types — the contract this layer exposes upward
// ---------------------------------------------------------------------------

export interface McpOAuthClientRow {
  client_id: string
  client_name: string
  redirect_uris: string[]
  token_endpoint_auth_method: string
  created_at: string
  last_granted_at: string | null
}

export interface McpOAuthCodeRow {
  code_hash: string
  client_id: string
  user_id: string
  scopes: string[]
  code_challenge: string
  redirect_uri: string
  expires_at: string
  created_at: string
}

export interface McpOAuthTokenRow {
  id: string
  grant_id: string
  access_token_hash: string
  refresh_token_hash: string | null
  client_id: string
  user_id: string
  scopes: string[]
  expires_at: string
  refresh_expires_at: string | null
  revoked_at: string | null
  created_at: string
}

export type McpOAuthClientInsert = Pick<
  McpOAuthClientRow,
  'client_id' | 'client_name' | 'redirect_uris' | 'token_endpoint_auth_method'
>

export type McpOAuthCodeInsert = Omit<McpOAuthCodeRow, 'created_at'>

export type McpOAuthTokenInsert = Omit<McpOAuthTokenRow, 'id' | 'created_at' | 'revoked_at'>

/**
 * PostgREST's "no rows" code. `.single()` raises it instead of returning null, and for every lookup
 * in this file "not found" is an ordinary answer, not a fault.
 */
const PGRST_NO_ROWS = 'PGRST116'

export class McpOAuthRepository {
  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------

  async createClient(input: McpOAuthClientInsert): Promise<McpOAuthClientRow> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_clients')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as McpOAuthClientRow
  }

  async findClient(clientId: string): Promise<McpOAuthClientRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) throw error
    return (data as McpOAuthClientRow | null) ?? null
  }

  /**
   * Flip a registered client from "someone POSTed /register" to "a human actually connected it".
   * That distinction is the whole basis of the 24h anti-spam sweep, so this must be called on every
   * successful authorization — best-effort is not good enough, a missed call means a live client
   * gets swept out from under a real user.
   */
  async markClientGranted(clientId: string): Promise<void> {
    const { error } = await supabaseService
      .from('mcp_oauth_clients')
      .update({ last_granted_at: new Date().toISOString() })
      .eq('client_id', clientId)
    if (error) throw error
  }

  // -------------------------------------------------------------------------
  // Authorization codes
  // -------------------------------------------------------------------------

  async createCode(input: McpOAuthCodeInsert): Promise<void> {
    const { error } = await supabaseService.from('mcp_oauth_codes').insert(input)
    if (error) throw error
  }

  /**
   * ★ SECURITY CONTROL, NOT PLUMBING. Take the code and destroy it in ONE statement.
   *
   * PostgREST turns `.delete().eq(...).select()` into a single `DELETE ... RETURNING`, so the row
   * lock is held for the whole operation: of two concurrent token requests presenting the same
   * code, the second blocks, re-evaluates after the first commits, finds nothing, and gets `null`.
   * Exactly one caller can ever receive the row.
   *
   * The obvious-looking alternative — read the row, validate it, then delete it — has a window
   * between read and delete in which both callers validate successfully and both mint a token pair.
   * That is authorization-code replay, and it is why RFC 6749 §4.1.2 makes single use a MUST.
   *
   * Consequence to keep in mind when reading the service: EVERY failure after this point (wrong
   * client, wrong redirect_uri, bad PKCE verifier, expired) still consumed the code. That is
   * correct — a code that took part in a failed exchange must never be usable again.
   */
  async claimCodeAtomically(codeHash: string): Promise<McpOAuthCodeRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_codes')
      .delete()
      .eq('code_hash', codeHash)
      .select('*')
      .maybeSingle()
    if (error) {
      if (error.code === PGRST_NO_ROWS) return null
      throw error
    }
    return (data as McpOAuthCodeRow | null) ?? null
  }

  // -------------------------------------------------------------------------
  // Tokens
  // -------------------------------------------------------------------------

  async createToken(input: McpOAuthTokenInsert): Promise<McpOAuthTokenRow> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as McpOAuthTokenRow
  }

  /**
   * Look up a live access token. Phase 4 calls this on every MCP request, so it is the hottest query
   * in the feature — `idx_mcp_oauth_tokens_live` exists for exactly this shape.
   *
   * Revoked rows are filtered in SQL, expiry is judged by the caller: the service needs to tell
   * "expired" from "never existed" for its own logging even though both answer the client the same.
   */
  async findLiveTokenByAccessHash(accessTokenHash: string): Promise<McpOAuthTokenRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .select('*')
      .eq('access_token_hash', accessTokenHash)
      .is('revoked_at', null)
      .maybeSingle()
    if (error) throw error
    return (data as McpOAuthTokenRow | null) ?? null
  }

  /**
   * ★ THE ROTATION PRIMITIVE, and atomic for the same reason `claimCodeAtomically` is.
   *
   * One `UPDATE ... WHERE refresh_token_hash = $1 AND revoked_at IS NULL RETURNING *`: the row lock
   * means only one of N concurrent refresh calls can observe `revoked_at IS NULL` and get a row
   * back. The losers get `null` and are told the grant is invalid — which is the correct answer,
   * because the winner has already superseded them.
   *
   * Returning `null` here is genuinely ambiguous between "no such refresh token" and "already
   * rotated". `findAnyTokenByRefreshHash` below resolves that, and only to decide whether this is a
   * REPLAY worth killing the family over.
   */
  async claimRefreshTokenAtomically(refreshTokenHash: string): Promise<McpOAuthTokenRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('refresh_token_hash', refreshTokenHash)
      .is('revoked_at', null)
      .select('*')
      .maybeSingle()
    if (error) {
      if (error.code === PGRST_NO_ROWS) return null
      throw error
    }
    return (data as McpOAuthTokenRow | null) ?? null
  }

  /**
   * Includes already-revoked rows on purpose — this exists to answer "was this refresh token real
   * once?", which is how a replayed (already-rotated) token is told apart from a random string.
   */
  async findAnyTokenByRefreshHash(refreshTokenHash: string): Promise<McpOAuthTokenRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .select('*')
      .eq('refresh_token_hash', refreshTokenHash)
      .maybeSingle()
    if (error) throw error
    return (data as McpOAuthTokenRow | null) ?? null
  }

  /**
   * RFC 7009 accepts either token type at /revoke without being told which, so both columns are
   * searched. `.or()` is safe here because both operands are hex SHA-256 digests produced by this
   * app — never client text — so there is no PostgREST filter string to inject into.
   */
  async findTokenByEitherHash(tokenHash: string): Promise<McpOAuthTokenRow | null> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .select('*')
      .or(`access_token_hash.eq.${tokenHash},refresh_token_hash.eq.${tokenHash}`)
      .maybeSingle()
    if (error) throw error
    return (data as McpOAuthTokenRow | null) ?? null
  }

  /**
   * Kill every generation of one rotation chain. Used by /revoke (the user means "disconnect this
   * agent", not "invalidate one of its two tokens") and by replay detection.
   *
   * @returns how many rows were newly revoked
   */
  async revokeGrantFamily(grantId: string): Promise<number> {
    const { data, error } = await supabaseService
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('grant_id', grantId)
      .is('revoked_at', null)
      .select('id')
    if (error) throw error
    return (data as { id: string }[] | null)?.length ?? 0
  }
}

export const mcpOAuthRepo =
  globalThis._mcpOAuthRepo ?? new McpOAuthRepository()

if (process.env.NODE_ENV !== 'production') globalThis._mcpOAuthRepo = mcpOAuthRepo
