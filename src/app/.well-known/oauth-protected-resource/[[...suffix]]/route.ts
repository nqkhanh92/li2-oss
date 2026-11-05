/**
 * ============================================================================
 * RFC 9728 Protected Resource Metadata — MCP OAuth (plan Phase 3b, §5).
 * ============================================================================
 *
 * The entry point of the MCP discovery chain: Phase 4's `/api/mcp` answers an unauthenticated call
 * with `401 + WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/
 * oauth-protected-resource"`, the client fetches this, and `authorization_servers` sends it on to the
 * RFC 8414 document next door.
 *
 * ⚠️ WHY THIS IS AN OPTIONAL CATCH-ALL ROUTE AND NOT A PLAIN ONE. RFC 9728 §3.1 inserts the
 * resource's path AFTER the well-known segment, so a resource at `/api/mcp` is described at
 * `/.well-known/oauth-protected-resource/api/mcp`. Observed live in the Phase 0.2 spike: Claude
 * Desktop (spec 2025-11-25) probes the path-suffixed form FIRST and only falls back to the bare one
 * on a 404. Both must work, so `[[...suffix]]` serves both from one handler.
 *
 * A suffix we do not recognise is answered with 404 rather than with this document. That is not
 * strictness for its own sake: the same spike watched Claude Desktop take a 404 here and fall back
 * cleanly, whereas answering every path with a document that claims `resource: <origin>/api/mcp`
 * would hand a client metadata for a resource it did not ask about.
 *
 * Like the AS metadata, this is a BARE RFC document — never the app's `APIResponse` envelope — and
 * it depends on `.well-known` being excluded from the root `middleware.ts` matcher.
 */
import { NextResponse } from 'next/server'
import { getIssuer, MCP_SCOPES } from '@/core/services/mcp-oauth.service'
import { logger } from '@/infrastructure/logging/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'mcp-oauth-prm' })

/** The MCP endpoint this document describes. Phase 4 mounts the transport here. */
const RESOURCE_PATH = '/api/mcp'

/** See the AS metadata route for why `*` is safe on a public, ambient-authority-free document. */
const PUBLIC_DOC_HEADERS: Record<string, string> = {
  'content-type': 'application/json;charset=UTF-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'authorization, mcp-protocol-version',
  'cache-control': 'public, max-age=300',
}

type RouteContext = { params: { suffix?: string[] } }

/** `undefined` (bare path) or exactly the resource path. Anything else is somebody else's resource. */
function suffixMatchesResource(suffix: string[] | undefined): boolean {
  if (!suffix || suffix.length === 0) return true
  return `/${suffix.join('/')}` === RESOURCE_PATH
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  if (!suffixMatchesResource(params.suffix)) {
    return NextResponse.json(
      { error: 'not_found', error_description: 'No protected resource is registered at that path.' },
      { status: 404, headers: { 'cache-control': 'no-store' } }
    )
  }

  let issuer: string
  try {
    issuer = getIssuer()
  } catch (error) {
    log.error({ err: error }, '[mcp-oauth] cannot build resource metadata')
    return NextResponse.json(
      { error: 'server_error', error_description: 'The authorization server is not configured.' },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    )
  }

  const body = {
    /** RFC 9728 §3.1: the client checks this against the URL it is actually calling. */
    resource: `${issuer}${RESOURCE_PATH}`,
    /**
     * li2-app points at itself. Not at Casdoor — Casdoor is the identity provider but cannot be the
     * authorization server here (no DCR on the deployed instance, no place for a Li2 org, no place
     * for the read/write consent decision; plan §5 shapes (A) and (C)).
     */
    authorization_servers: [issuer],
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'Li2',
    resource_documentation: 'https://docs.li2.ai',
  }

  return new Response(JSON.stringify(body), { status: 200, headers: PUBLIC_DOC_HEADERS })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: PUBLIC_DOC_HEADERS })
}
