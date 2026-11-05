/**
 * ============================================================================
 * RFC 8414 Authorization Server Metadata — MCP OAuth (plan Phase 3b, §5).
 * ============================================================================
 *
 * ⚠️ THE PATH IS THE FEATURE. This document MUST be served from `<origin>/.well-known/
 * oauth-authorization-server` and nowhere else. Clients DERIVE this URL from the issuer they were
 * given; they do not probe sub-paths, so moving it under `/api/mcp/oauth/` — where the rest of the
 * authorization server lives — makes it invisible. Observed live in the Phase 0.2 spike: MCP
 * Inspector requests exactly this path on the resource's own origin, and the first stub that did not
 * serve it killed discovery with a zod `issuer/authorization_endpoint Required` error.
 *
 * Two consequences of living at the app root rather than under `/api`:
 *   1. The root `middleware.ts` matcher had to be taught to skip `.well-known`. It excludes `api`,
 *      and this path is not under `api`, so without that exclusion an anonymous discovery request is
 *      answered with a 307 to `/auth/login` — discovery dies silently and nothing in the logs says
 *      why. Verified by curl, not by reading the regex.
 *   2. Like the `/api/mcp/oauth/*` endpoints, this answers with a BARE RFC document and never the
 *      app's `APIResponse` envelope. An OAuth client parses RFC 8414 §2 and nothing else.
 */
import { NextResponse } from 'next/server'
import { getIssuer, MCP_SCOPES, CODE_CHALLENGE_METHOD } from '@/core/services/mcp-oauth.service'
import { logger } from '@/infrastructure/logging/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'mcp-oauth-as-metadata' })

/**
 * Public, unauthenticated, and fetched from browser-hosted clients — so `*` is both safe and
 * required. There is nothing here that is not already public, and no ambient authority to abuse.
 */
const PUBLIC_DOC_HEADERS: Record<string, string> = {
  'content-type': 'application/json;charset=UTF-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, mcp-protocol-version',
  // Short on purpose: a stale copy of this document is a connect failure a user cannot clear, and
  // discovery happens once per client rather than once per call.
  'cache-control': 'public, max-age=300',
}

export async function GET(): Promise<Response> {
  let issuer: string
  try {
    issuer = getIssuer()
  } catch (error) {
    log.error({ err: error }, '[mcp-oauth] cannot build AS metadata')
    return NextResponse.json(
      { error: 'server_error', error_description: 'The authorization server is not configured.' },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    )
  }

  const body = {
    /**
     * ★ MUST equal the `iss` that `/authorize` stamps on its response (RFC 9207) and the origin this
     * document was fetched from (RFC 8414 §3.3). Both come from `getIssuer()` for exactly that
     * reason — a client that sees a mismatch rejects the authorization code, and the Phase 0.2 spike
     * watched Claude Desktop abort before it ever POSTed `/register` over an issuer it disliked.
     */
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    revocation_endpoint: `${issuer}/api/mcp/oauth/revoke`,
    /**
     * DCR is a MAY under spec 2025-11-25 and deprecated outright in the 2026-07-28 draft, but it is
     * still the only mechanism MCP Inspector (2025-06-18) has. Advertised as the fallback below CIMD.
     */
    registration_endpoint: `${issuer}/api/mcp/oauth/register`,
    scopes_supported: [...MCP_SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    /**
     * ★ S256 ONLY, and no `plain` entry to fall back to. This list is what a client reads to decide
     * which PKCE method to use, so advertising `plain` here would be the polite way of asking for it.
     */
    code_challenge_methods_supported: [CODE_CHALLENGE_METHOD],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    /**
     * ★ CIMD is the SHOULD of spec 2025-11-25; this flag is how a client learns it may skip
     * registration entirely and present an https URL as its `client_id`. The Phase 0.2 spike is the
     * proof it matters: the stub never advertised it, so Claude Desktop fell all the way through to
     * its DCR fallback and wrote a row we did not need.
     */
    client_id_metadata_document_supported: true,
    /** RFC 9207. We do emit `iss` on both the success and the error redirect; saying so lets a
     *  strict client validate it instead of guessing. */
    authorization_response_iss_parameter_supported: true,
    service_documentation: 'https://docs.li2.ai',
    /**
     * ⭐ P0.5 — RFC 8414 §2 `op_policy_uri` / `op_tos_uri`. Both are OPTIONAL in the RFC and are
     * treated as mandatory by the two directories this server is being submitted to: a client
     * registering without registration (CIMD) has nowhere else to find the terms a human is agreeing
     * to when they tick the consent screen, so a reviewer who cannot fetch them has no way to tell
     * what data the connector touches.
     *
     * Built from `issuer` and not from a literal, for the same reason every endpoint above is: this
     * document is served by self-hosted instances too (LiHi), and a hard-coded li2.ai URL would send
     * their users to someone else's policy.
     */
    op_policy_uri: `${issuer}/privacy`,
    op_tos_uri: `${issuer}/terms`,
  }

  return new Response(JSON.stringify(body), { status: 200, headers: PUBLIC_DOC_HEADERS })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: PUBLIC_DOC_HEADERS })
}
