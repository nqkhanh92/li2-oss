/**
 * `/api/mcp` — the protected resource (plan Phase 4a).
 *
 * ★ WHAT THESE TESTS ARE FOR. Two things in this route are invisible to a normal integration test
 * and catastrophic when wrong, so they are pinned character by character:
 *
 * 1. **The `WWW-Authenticate` header on every 401.** It is the ONLY thing that tells a brand-new MCP
 *    client where the `.well-known` documents are. Without it the client cannot bootstrap, reports
 *    "could not connect", and all of Phase 3a/3b is unreachable — while this endpoint keeps
 *    answering 401 exactly as it should. There is no symptom that points at the header.
 *
 * 2. **`tools/list` filtering by granted scope.** The plan enforces the write scope by HIDING
 *    `create_short_link`, so a bug that leaks it into a read-only list is not a failed call the user
 *    sees — it is a tool the model will try, and the failure surfaces one layer down.
 *
 * ⚠️ WHAT THESE TESTS CANNOT PROVE. `McpToolError` uses a `Symbol.for` guard instead of `instanceof`
 * because Next gives every route its own copy of a shared class (the 3b lesson). vitest loads each
 * module exactly ONCE, so there is only ever one class object here and `instanceof` would pass these
 * tests just as well. Only a real dev server, warmed in two different route orders, can check it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/core/repositories/mcp-oauth.repository', async () => {
  const { FakeMcpOAuthRepository } = await import('@/__tests__/__mocks__/mcp-oauth-repo.mock')
  const repo = new FakeMcpOAuthRepository()
  return { mcpOAuthRepo: repo, McpOAuthRepository: FakeMcpOAuthRepository }
})

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

/**
 * ⚠️ THE SEAM IS MOCKED HERE ON PURPOSE. What this file tests is the ROUTE: scope gating, JSON-RPC
 * shape, and that `tools/call` reaches the seam with the right arguments. The seam's own behaviour —
 * the membership/entitlement/mint/strip sequence that carries the IDOR risk — is pinned in
 * `unit/mcp/call-tool.test.ts` against real descriptors. Exercising it again through here would
 * duplicate that and drag repositories, plans and paseto into a transport test.
 */
vi.mock('@/core/mcp/call-tool', () => ({ callTool: vi.fn() }))

/**
 * ⚠️ BOTH LIMITER FUNCTIONS ARE OVERRIDDEN HERE ON PURPOSE, and that is the trap this factory is
 * shaped around: `route.ts` calls `peek` at the door AND `consume` per tool call, so a factory naming
 * only one of them leaves the other `undefined` and fails somewhere unrelated. The limiter's own
 * behaviour is pinned in `unit/mcp/rate-limit.test.ts`; what this file tests is the WIRING — that the
 * door answers 429 and that a refused call is charged per call, not per POST.
 *
 * ★ The rest of the module is the REAL one, because `SERVER_INSTRUCTIONS` now publishes
 * `MCP_RATE_LIMIT_WINDOWS` and a test asserting mocked numbers would prove nothing about what the
 * model is told. Loading it for real means loading its ioredis import, hence the `redis` stub below —
 * a bare object, so any Redis call that escapes the two mocked functions is a loud TypeError here
 * instead of a connection attempt to a server this suite does not have.
 */
vi.mock('@/infrastructure/cache/redis', () => ({ redis: {} }))

vi.mock('@/core/mcp/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/mcp/rate-limit')>()),
  peekMcpRateLimit: vi.fn(),
  consumeMcpRateLimit: vi.fn(),
}))

import { POST, GET, DELETE, OPTIONS } from '@/app/api/mcp/route'
import { callTool } from '@/core/mcp/call-tool'
import { orgAccessDenied } from '@/core/mcp/errors'
import {
  consumeMcpRateLimit,
  peekMcpRateLimit,
  MCP_RATE_LIMIT_WINDOWS,
} from '@/core/mcp/rate-limit'
import {
  ACCESS_TOKEN_PREFIX,
  mcpOAuthService,
  type McpScope,
} from '@/core/services/mcp-oauth.service'
import { mcpOAuthRepo } from '@/core/repositories/mcp-oauth.repository'
import { MCP_TOOLS } from '@/core/mcp/tools'
import { APP_VERSION } from '@/core/constants/app-version'
import type { FakeMcpOAuthRepository } from '@/__tests__/__mocks__/mcp-oauth-repo.mock'

const ISSUER = 'https://app.li2.test'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '33333333-3333-4333-8333-333333333333'
const CLIENT_ID = 'client_phase4a'
const repo = mcpOAuthRepo as unknown as FakeMcpOAuthRepository

process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER

/** JSON-RPC envelope for a POST body. */
function rpc(method: string, params: Record<string, unknown> = {}, id = 1) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params })
}

function mcpRequest(body: string, token?: string, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    // The SDK's transport requires the client to say it accepts both, or it answers 406.
    accept: 'application/json, text/event-stream',
    ...extraHeaders,
  }
  if (token !== undefined) headers.authorization = `Bearer ${token}`
  return new NextRequest(`${ISSUER}/api/mcp`, { method: 'POST', headers, body })
}

/** The transport answers a JSON-RPC POST as a single JSON body (`enableJsonResponse`). */
async function rpcResult(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json()) as { result?: Record<string, unknown> }
  return body.result ?? (body as Record<string, unknown>)
}

const ALLOWED = { allowed: true, retryAfterSeconds: 0, window: null, limit: null }
const REFUSED = { allowed: false, retryAfterSeconds: 47, window: 'burst', limit: 60 }

beforeEach(() => {
  repo.reset()
  vi.mocked(callTool).mockReset()
  vi.mocked(callTool).mockResolvedValue({ content: [{ type: 'text', text: '{"ok":true}' }] })
  vi.mocked(peekMcpRateLimit).mockReset()
  vi.mocked(peekMcpRateLimit).mockResolvedValue(ALLOWED)
  vi.mocked(consumeMcpRateLimit).mockReset()
  vi.mocked(consumeMcpRateLimit).mockResolvedValue(ALLOWED)
  process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The 401 challenge — discovery starts here
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('401 challenge', () => {
  it('answers an unauthenticated POST with the resource_metadata pointer', async () => {
    const response = await POST(mcpRequest(rpc('tools/list')))

    expect(response.status).toBe(401)
    const challenge = response.headers.get('www-authenticate') ?? ''
    expect(challenge).toContain(
      `resource_metadata="${ISSUER}/.well-known/oauth-protected-resource"`
    )
    // RFC 6750 §3: no error code when no credential was presented. This is the first request every
    // client makes, and calling it an "invalid_token" would be a lie.
    expect(challenge).not.toContain('error=')
  })

  it('challenges with BOTH scopes so the write consent is reachable at all', async () => {
    /**
     * Regression test for the defect Phase 6 found on a real client (2026-07-30): challenging with
     * `read` alone made a spec-conformant client request only `read`, which meant the consent screen
     * never offered the write checkbox, `tools/list` hid `create_short_link`, and no client could
     * switch writes on by ANY route. The challenge advertises what may be ASKED for; the consent tick
     * decides what is GRANTED — so narrowing it here does not add safety, it removes a user choice.
     */
    const response = await POST(mcpRequest(rpc('tools/list')))
    const challenge = response.headers.get('www-authenticate')
    expect(challenge).toContain('scope="read write"')
  })

  it('exposes WWW-Authenticate to browser clients', async () => {
    // Not a CORS-safelisted response header: unexposed, a browser-hosted client reads a bare 401
    // and cannot start discovery at all.
    const response = await POST(mcpRequest(rpc('tools/list')))
    expect(response.headers.get('access-control-expose-headers')).toContain('www-authenticate')
  })

  it('returns the SAME 401 for an unknown, an expired and a revoked token', async () => {
    const live = await mintToken(['read'])

    const expired = await mintToken(['read'])
    repo.tokens[1].expires_at = new Date(Date.now() - 1000).toISOString()

    const revoked = await mintToken(['read'])
    repo.tokens[2].revoked_at = new Date().toISOString()

    const responses = await Promise.all(
      ['li2mcp_at_never-existed', expired, revoked].map((token) =>
        POST(mcpRequest(rpc('tools/list'), token))
      )
    )

    for (const response of responses) {
      expect(response.status).toBe(401)
      expect(response.headers.get('www-authenticate')).toBe(
        responses[0].headers.get('www-authenticate')
      )
    }
    // The challenge for a PRESENTED credential does name the error — that much RFC 6750 wants, and
    // it says nothing about which of the three failures occurred.
    expect(responses[0].headers.get('www-authenticate')).toContain('error="invalid_token"')
    expect(responses[0].headers.get('www-authenticate')).toContain('resource_metadata=')

    // Control: the live token is not caught by any of the three.
    expect((await POST(mcpRequest(rpc('tools/list'), live))).status).toBe(200)
  })

  it('challenges a malformed Authorization header rather than 500ing', async () => {
    for (const header of ['Bearer', 'Basic abc', 'Bearer a b', '']) {
      const request = new NextRequest(`${ISSUER}/api/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: header },
        body: rpc('tools/list'),
      })
      expect((await POST(request)).status).toBe(401)
    }
  })

  it('accepts a lowercase "bearer" scheme (RFC 7235 §2.1)', async () => {
    const token = await mintToken(['read'])
    const request = new NextRequest(`${ISSUER}/api/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `bearer ${token}`,
      },
      body: rpc('tools/list'),
    })
    expect((await POST(request)).status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Layer 0 — the declared body size
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ★ WHY THE HEADER IS SPOOFED AND THE BODY IS TINY. The check reads `Content-Length` and nothing
 * else — that is its whole point, since measuring the body means reading the body. So a 13 MB test
 * body would prove nothing extra and cost 13 MB per run. `NextRequest` leaves `content-length`
 * unset unless it is passed explicitly (verified: a `body: 'abc'` request reports `null`), which is
 * also why every other test in this file travels the missing-header path for free.
 */
const OVER_LIMIT = 13 * 1024 * 1024
const AT_LIMIT = 12 * 1024 * 1024

describe('layer-0 body size', () => {
  it('refuses an over-limit declared size with 413 and a JSON-RPC error', async () => {
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { 'content-length': String(OVER_LIMIT) })
    )

    expect(response.status).toBe(413)
    const body = (await response.json()) as {
      jsonrpc: string
      id: null
      error: { code: number; message: string }
    }
    expect(body.jsonrpc).toBe('2.0')
    // JSON-RPC 2.0 §5: the id of a request that was never parsed cannot be attributed.
    expect(body.id).toBeNull()
    expect(body.error.code).toBe(-32600)
    // Both numbers are in the message: a client that cannot see the ceiling cannot aim under it.
    expect(body.error.message).toContain(String(OVER_LIMIT))
    expect(body.error.message).toContain(String(AT_LIMIT))
  })

  it('says nothing about where the second limit lives', async () => {
    const token = await mintToken(['read'])
    const raw = await (
      await POST(mcpRequest(rpc('tools/list'), token, { 'content-length': String(OVER_LIMIT) }))
    ).text()

    expect(raw).not.toContain('/api/agent')
    expect(raw).not.toContain('artifact')
  })

  it('stays readable to a browser client — the 413 carries the CORS headers', async () => {
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { 'content-length': String(OVER_LIMIT) })
    )

    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('refuses before the bearer is even looked up', async () => {
    // No token at all. The 401 challenge normally wins here; the size check is deliberately in front
    // of it, because not paying for the body is the entire value of the check and a token lookup is a
    // round trip to Postgres.
    const response = await POST(
      mcpRequest(rpc('tools/list'), undefined, { 'content-length': String(OVER_LIMIT) })
    )

    expect(response.status).toBe(413)
  })

  it('lets a body exactly at the limit through', async () => {
    // 12 MB = 10 MB artifact + 1 MB back-hop headroom + 1 MB JSON-RPC envelope. The boundary is
    // inclusive on purpose: a 10 MB file arrives as a body larger than the file, and refusing it here
    // would make the documented ceiling unreachable.
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { 'content-length': String(AT_LIMIT) })
    )

    expect(response.status).toBe(200)
  })

  it('lets a request with no content-length through', async () => {
    // A chunked request legitimately has no `Content-Length` (HTTP/1.1 §3.3.1). Refusing on absence
    // would refuse honest clients to catch a dishonest one; the back hop's own layer-0 covers it.
    const token = await mintToken(['read'])
    const request = mcpRequest(rpc('tools/list'), token)

    expect(request.headers.get('content-length')).toBeNull()
    expect((await POST(request)).status).toBe(200)
  })

  it('ignores a malformed content-length rather than refusing on it', async () => {
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { 'content-length': 'not-a-number' })
    )

    expect(response.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// initialize — the instructions the model reads
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ THIS IS THE FIRST TEST THAT READS `SERVER_INSTRUCTIONS` AT ALL, AND THAT GAP IS THE REASON IT
 * EXISTS. The string once claimed "every tool except list_orgs and find_li2_docs needs an org_id",
 * which went false the moment a third org-free tool shipped, and nothing caught it — no test read it.
 * It is asserted here by MEANING (the artifact concept, the budget numbers), not word for word: a
 * character-exact assertion on prose makes every reword a failing test and teaches people to update
 * the expectation without reading it.
 */
describe('initialize instructions', () => {
  async function instructions(): Promise<string> {
    const token = await mintToken(['read'])
    const result = await rpcResult(
      await POST(
        mcpRequest(
          rpc('initialize', {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'endpoint-test', version: '0.0.0' },
          }),
          token
        )
      )
    )
    return String(result.instructions ?? '')
  }

  it('explains what an artifact is and which URL is which', async () => {
    const text = await instructions()

    expect(text).toContain('artifact')
    expect(text).toContain('serve_url')
    expect(text).toContain('short_url')
    expect(text).toContain('QR')
  })

  it('warns that deleting leaves the printed QR alive', async () => {
    const text = await instructions()

    expect(text).toMatch(/delet/i)
    expect(text).toMatch(/taken-down|taken down/i)
  })

  it('states the shared rate-limit budget using the limiter own numbers', async () => {
    const text = await instructions()

    // Read off `MCP_RATE_LIMIT_WINDOWS` rather than typed, so tightening the limiter cannot leave the
    // model pacing itself against a number we no longer enforce.
    for (const window of MCP_RATE_LIMIT_WINDOWS) {
      expect(text).toContain(String(window.maxCalls))
    }
    expect(text).toContain('minute')
    expect(text).toContain('hour')
  })

  it('still states the org_id RULE and names no roster of tools', async () => {
    const text = await instructions()

    expect(text).toContain('org_id as a required parameter')
    expect(text).not.toContain('publish_artifact')
    expect(text).not.toContain('create_short_link')
  })

  it('⭐ tells the model to name the organization before it writes (P0.6)', async () => {
    // A multi-org grant is the normal case, and `org_id` is a UUID the user never sees — so a write
    // aimed at the wrong org is invisible until after it lands. Asserted by meaning: the
    // instructions must tie naming the org to acting, not merely mention orgs somewhere.
    const text = await instructions()

    expect(text).toMatch(/name the organization/i)
    expect(text).toMatch(/creates, changes or deletes/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// initialize — the branding block (P0.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ `serverInfo` IS READ PER REQUEST IN THE ROUTE AND THESE TESTS ARE WHY THAT MATTERS. Two of the
 * fields are built from `NEXT_PUBLIC_APP_BASE_URL`, which this file sets at module scope — AFTER
 * vitest has hoisted the route import. A const captured at import time would be correct in
 * production and empty here, i.e. the test would pin the broken shape.
 */
describe('initialize serverInfo', () => {
  async function serverInfo(): Promise<Record<string, unknown>> {
    const token = await mintToken(['read'])
    const result = await rpcResult(
      await POST(
        mcpRequest(
          rpc('initialize', {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'endpoint-test', version: '0.0.0' },
          }),
          token
        )
      )
    )
    return (result.serverInfo ?? {}) as Record<string, unknown>
  }

  it('keeps the protocol `name` stable and puts the display name in `title`', async () => {
    // ⛔ `name` is the identifier clients key a stored connector on. Renaming it to "Li2" for looks
    // would read as a DIFFERENT server to every client that already trusts this one.
    const info = await serverInfo()

    expect(info.name).toBe('li2-mcp')
    expect(info.title).toBe('Li2')
  })

  it('reports the real app version, not a number maintained by hand', async () => {
    const info = await serverInfo()

    expect(info.version).toBe(APP_VERSION)
    expect(info.version).not.toBe('0.1.0')
  })

  it('carries a website URL and an icon both rooted at the configured base URL', async () => {
    const info = await serverInfo()

    expect(info.websiteUrl).toBe(ISSUER)
    expect(info.icons).toEqual([
      { src: `${ISSUER}/images/mini_logo.svg`, mimeType: 'image/svg+xml', sizes: ['any'] },
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Origin — DNS-rebinding protection (P0.2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ★ THE MIDDLE TEST IS THE LOAD-BEARING ONE. Claude Code, MCP Inspector and curl send NO Origin
 * header at all, so an allow-list applied to a missing Origin would 403 every non-browser client
 * while leaving the browser case — the only one this check defends against — untouched. The whole
 * reason the SDK option is safe to switch on is that it validates Origin only when present, and
 * nothing else in this suite would notice if that changed under us on an SDK bump.
 */
describe('Origin allow-list', () => {
  it('passes a request with no Origin at all — Claude Code and Inspector send none', async () => {
    const token = await mintToken(['read'])
    const response = await POST(mcpRequest(rpc('tools/list'), token))

    expect(response.status).toBe(200)
  })

  it('passes the connector origins the two platforms call from', async () => {
    const token = await mintToken(['read'])
    for (const origin of ['https://claude.ai', 'https://chatgpt.com', ISSUER]) {
      const response = await POST(mcpRequest(rpc('tools/list'), token, { origin }))
      expect(response.status, origin).toBe(200)
    }
  })

  it('refuses an unlisted Origin with 403, before any handler runs', async () => {
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { origin: 'https://evil.example' })
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(JSON.stringify(body)).toMatch(/origin/i)
  })

  it('⛔ validates Origin only — a Host check would 403 everything behind the proxy', async () => {
    // The SDK's `allowedHosts` has no "only if present" escape and reads `host`, which behind the
    // reverse proxy is the internal hop (the real name arrives in `x-forwarded-host`). Enabling it
    // would pass in dev and fail every request in production, so it stays off — pinned here because
    // the two options sit on the same object and look interchangeable.
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/list'), token, { host: 'some-internal-hop.local' })
    )

    expect(response.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// tools/list
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('tools/list', () => {
  it('hides the 9 write tools from a read-only grant — 12 tools, not 21', async () => {
    const token = await mintToken(['read'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const names = (result.tools as { name: string }[]).map((t) => t.name)

    expect(names).toHaveLength(12)
    expect(names).not.toContain('create_short_link')
    // Wave 4: a read-only grant must never be shown the tool that deletes a published page.
    expect(names).not.toContain('delete_artifact')
    // Wave 4 WP2: nor the two that change who can open a page and what its address is.
    expect(names).not.toContain('set_artifact_access')
    expect(names).not.toContain('set_artifact_slug')
    // SL-2/SL-3: nor the three that redirect, rename or destroy a link already printed on things.
    expect(names).not.toContain('update_short_link')
    expect(names).not.toContain('set_short_link_slug')
    expect(names).not.toContain('delete_short_link')
    expect(names).toEqual([
      'list_orgs',
      'get_org_overview',
      'get_analytics_summary',
      'get_clicks_timeseries',
      'get_top_links',
      'get_link_details',
      'find_li2_docs',
      'get_doc_page',
      // The two wave-4 READS are visible to a read grant, which is the point of the scope split.
      'get_artifact',
      'list_artifacts',
      // SL-1's two reads, for the same reason.
      'list_short_links',
      'get_short_link',
    ])
  })

  it('shows all 22 to a read+write grant — the newest tools last', async () => {
    const token = await mintToken(['read', 'write'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const names = (result.tools as { name: string }[]).map((t) => t.name)

    expect(names).toHaveLength(22)
    expect(names).toContain('create_short_link')
    // Waves 3 and 4 plus SL-1: a grant that already had `write` sees the new tools without
    // re-consent (§9).
    expect(names.slice(-13)).toEqual([
      'publish_artifact',
      'update_artifact',
      'get_artifact',
      'list_artifacts',
      'delete_artifact',
      'set_artifact_access',
      'set_artifact_slug',
      'list_short_links',
      'get_short_link',
      'update_short_link',
      'set_short_link_slug',
      'delete_short_link',
      // Chat-1: tool cho file đính kèm trong dock chat. `publish_artifact` chỉ nhận HTML dạng chữ
      // nên một PDF kéo vào khung chat không có tool nào đỡ.
      'publish_draft_artifact',
    ])
  })

  it('⭐ publishes annotations, and marks delete_artifact destructive (wave 4 WP1)', async () => {
    // This is the channel the MCP spec puts human-in-the-loop confirmation on. If `tools/list` drops
    // `annotations` — which it did before WP1 — a client has no way to know a tool deletes anything,
    // and the only remaining signal is prose the model may skip.
    const token = await mintToken(['read', 'write'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const tools = result.tools as { name: string; annotations?: Record<string, unknown> }[]

    for (const tool of tools) {
      expect(tool.annotations, tool.name).toBeDefined()
      expect(tool.annotations!.openWorldHint, tool.name).toBe(false)
    }

    const deleteTool = tools.find((t) => t.name === 'delete_artifact')!
    expect(deleteTool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    })
    expect(tools.find((t) => t.name === 'get_artifact')!.annotations!.readOnlyHint).toBe(true)
  })

  it('⭐ publishes a human-readable title for every tool (P0.1)', async () => {
    // `description` is the model's field; `title` is the row a person approves in a consent dialog
    // and the one both directory reviews check for. A client that gets no `title` falls back to the
    // snake_case name, which is what this is here to stop.
    const token = await mintToken(['read', 'write'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const tools = result.tools as { name: string; title?: string }[]

    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy()
      expect(tool.title!.length, tool.name).toBeLessThanOrEqual(40)
    }
    expect(tools.find((t) => t.name === 'publish_artifact')!.title).toBe('Publish artifact')
  })

  it('⭐ publishes an outputSchema for every tool, matching the descriptor (P0.4)', async () => {
    // The spec ties `outputSchema` to `structuredContent`: a client that receives the structured
    // block validates it against this, so a schema dropped in transit turns a correct answer into a
    // client-side error. Compared against the descriptor rather than re-described, because the whole
    // point of generating it is that there is one copy.
    const token = await mintToken(['read', 'write'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const tools = result.tools as { name: string; outputSchema?: Record<string, unknown> }[]

    for (const tool of tools) {
      expect(tool.outputSchema, tool.name).toBeDefined()
      expect(tool.outputSchema!.type, tool.name).toBe('object')
      expect(tool.outputSchema, tool.name).toEqual(
        MCP_TOOLS.find((t) => t.name === tool.name)!.outputSchema
      )
    }
  })

  it('returns a deterministic order across calls (plan §6b)', async () => {
    const token = await mintToken(['read', 'write'])
    const first = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    const second = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))

    expect((first.tools as { name: string }[]).map((t) => t.name)).toEqual(
      (second.tools as { name: string }[]).map((t) => t.name)
    )
    // And that order is the descriptor array's, so a reorder there is a deliberate act.
    expect((first.tools as { name: string }[]).map((t) => t.name)).toEqual(
      MCP_TOOLS.map((t) => t.name)
    )
  })

  it('never leaks the internal back-hop route of a tool', async () => {
    // `transport.path` is the real `/api/agent/tools/*` URL. Publishing it would hand every client a
    // map of the internal API for free.
    const token = await mintToken(['read', 'write'])
    const response = await POST(mcpRequest(rpc('tools/list'), token))
    const raw = await response.clone().text()

    expect(raw).not.toContain('/api/agent/tools')
    expect(raw).not.toContain('requiredScope')
    expect(raw).not.toContain('back-hop')

    const result = await rpcResult(response)
    for (const tool of result.tools as Record<string, unknown>[]) {
      // Six fields now — `annotations` joined in wave 4 WP1, `title` in P0.1, `outputSchema` in
      // P0.4. Still a CLOSED list: the day someone spreads the whole descriptor here,
      // `transport.path` ships to every client.
      expect(Object.keys(tool).sort()).toEqual([
        'annotations',
        'description',
        'inputSchema',
        'name',
        'outputSchema',
        'title',
      ])
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// tools/call — the route's half: scope, dispatch, and error shape
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('tools/call dispatch (Phase 4b)', () => {
  it('hands the descriptor, the raw arguments and the grant to the seam', async () => {
    const token = await mintToken(['read'])
    await POST(
      mcpRequest(
        rpc('tools/call', {
          name: 'get_top_links',
          arguments: { org_id: 'org-from-the-client', period_days: 30 },
        }),
        token
      )
    )

    expect(callTool).toHaveBeenCalledTimes(1)
    const [descriptor, args, claims] = vi.mocked(callTool).mock.calls[0]
    expect(descriptor.name).toBe('get_top_links')
    // Passed through UNCHANGED: `org_id` is untrusted and the seam — not the route — is the single
    // place that validates it (plan §4.1). A route that pre-cleaned it would split that check.
    expect(args).toEqual({ org_id: 'org-from-the-client', period_days: 30 })
    expect(claims.userId).toBe(USER_ID)
    expect(claims.scopes).toEqual(['read'])
  })

  it("returns the seam's payload as the tool result", async () => {
    vi.mocked(callTool).mockResolvedValue({
      content: [{ type: 'text', text: '{"org_name":"Acme"}' }],
    })
    const token = await mintToken(['read'])
    const result = await rpcResult(
      await POST(mcpRequest(rpc('tools/call', { name: 'get_org_overview', arguments: {} }), token))
    )

    expect(result.isError).toBeUndefined()
    expect((result.content as { text: string }[])[0].text).toBe('{"org_name":"Acme"}')
  })

  it('turns a seam refusal into an isError RESULT, never a JSON-RPC error or a 500', async () => {
    // The generic org denial has to reach the MODEL to be useful — it is the message that tells it
    // to call list_orgs. A protocol error would be swallowed by the client's plumbing instead.
    vi.mocked(callTool).mockRejectedValue(orgAccessDenied())
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(
        rpc('tools/call', { name: 'get_org_overview', arguments: { org_id: 'someone-elses' } }),
        token
      )
    )
    const body = (await response.json()) as { error?: unknown; result?: Record<string, unknown> }

    expect(response.status).toBe(200)
    expect(body.error).toBeUndefined()
    expect(body.result?.isError).toBe(true)
    expect(String((body.result?.content as { text: string }[])[0].text)).toContain('list_orgs')
  })

  it('replaces an UNEXPECTED seam throw wholesale — no internals reach the client', async () => {
    vi.mocked(callTool).mockRejectedValue(
      new Error('relation "org_members" does not exist at /app/src/core/...')
    )
    const token = await mintToken(['read'])
    const result = await rpcResult(
      await POST(mcpRequest(rpc('tools/call', { name: 'get_org_overview', arguments: {} }), token))
    )

    expect(result.isError).toBe(true)
    const text = String((result.content as { text: string }[])[0].text)
    expect(text).not.toContain('org_members')
    expect(text).not.toContain('/app/src')
  })

  it('substitutes {} when a client omits arguments entirely', async () => {
    // `arguments` is optional in the spec and clients omit it for a no-argument tool. A crash on
    // `undefined` here would make `list_orgs` — the tool every session starts with — unusable.
    const token = await mintToken(['read'])
    await POST(mcpRequest(rpc('tools/call', { name: 'list_orgs' }), token))
    expect(vi.mocked(callTool).mock.calls[0][1]).toEqual({})
  })

  it('lets the SDK reject a non-object arguments field before our handler sees it', async () => {
    // Measured, not assumed: `CallToolRequestSchema` types `arguments` as a record, so an array is a
    // JSON-RPC protocol error (-32603) from the SDK's OWN bundled zod 4 and never reaches us. Worth
    // pinning because it means our `!Array.isArray` guard is belt-and-braces, not the control —
    // and because if a future SDK loosens that schema, this test is what notices.
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/call', { name: 'list_orgs', arguments: [1, 2] }), token)
    )
    const body = (await response.json()) as { error?: { code: number } }

    expect(body.error?.code).toBe(-32603)
    expect(callTool).not.toHaveBeenCalled()
  })

  it('does not reach the seam at all for a tool outside the granted scope', async () => {
    const token = await mintToken(['read'])
    await POST(mcpRequest(rpc('tools/call', { name: 'create_short_link', arguments: {} }), token))
    expect(callTool).not.toHaveBeenCalled()
  })
})

describe('tools/call', () => {
  it('rejects a hidden tool on call too — hiding is not enforcement', async () => {
    const token = await mintToken(['read'])
    const result = await rpcResult(
      await POST(mcpRequest(rpc('tools/call', { name: 'create_short_link', arguments: {} }), token))
    )

    expect(result.isError).toBe(true)
    const text = String((result.content as { text: string }[])[0].text)
    expect(text).toContain('"write"')
    // The model must be told to stop, not to retry with different arguments.
    expect(text).toContain('reconnect')
  })

  it('answers an unknown tool with a tool error, not a protocol error', async () => {
    // An `isError` result lands in the MODEL's context where it can recover; a JSON-RPC error is
    // swallowed by the client's plumbing.
    const token = await mintToken(['read'])
    const response = await POST(
      mcpRequest(rpc('tools/call', { name: 'drop_everything', arguments: {} }), token)
    )
    const body = (await response.json()) as { error?: unknown; result?: Record<string, unknown> }

    expect(body.error).toBeUndefined()
    expect(body.result?.isError).toBe(true)
  })

  it('there is no ping tool any more', async () => {
    const token = await mintToken(['read', 'write'])
    const result = await rpcResult(await POST(mcpRequest(rpc('tools/list'), token)))
    expect((result.tools as { name: string }[]).map((t) => t.name)).not.toContain('ping')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Rate limiting (Phase 5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('rate limiting', () => {
  it('answers a client that is already over with 429 + retry-after', async () => {
    // The HTTP status is the half of the limiter the client's TRANSPORT can act on; a tool-result
    // error is only read by the model, and no model waits 47 seconds because it was asked to.
    const token = await mintToken(['read'])
    vi.mocked(peekMcpRateLimit).mockResolvedValue(REFUSED)

    const response = await POST(mcpRequest(rpc('tools/list'), token))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('47')
    // Still this endpoint's dialect — an MCP client parses JSON-RPC, not an APIResponse envelope.
    expect((await response.json()).jsonrpc).toBe('2.0')
  })

  it('exposes retry-after to browser clients', async () => {
    // Not CORS-safelisted: unexposed, a browser-hosted client sees a 429 it cannot obey.
    const response = await POST(mcpRequest(rpc('tools/list')))
    expect(response.headers.get('access-control-expose-headers')).toContain('retry-after')
  })

  it('does not charge the door check — being refused must not deepen the hole', async () => {
    const token = await mintToken(['read'])
    vi.mocked(peekMcpRateLimit).mockResolvedValue(REFUSED)

    await POST(mcpRequest(rpc('tools/list'), token))

    expect(consumeMcpRateLimit).not.toHaveBeenCalled()
  })

  it('charges once per TOOL CALL, keyed by user and client only', async () => {
    const token = await mintToken(['read'])
    await POST(
      mcpRequest(
        rpc('tools/call', { name: 'get_org_overview', arguments: { org_id: ORG_ID } }),
        token
      )
    )

    expect(consumeMcpRateLimit).toHaveBeenCalledTimes(1)
    // ⛔ The identity the limiter receives must carry NO org. `org_id` is a tool argument, so an
    // org-keyed window would reset itself every time the client named a different org.
    expect(vi.mocked(consumeMcpRateLimit).mock.calls[0][0]).toEqual({
      userId: USER_ID,
      clientId: CLIENT_ID,
    })
  })

  it('charges a tools/call that fails scope, so a hidden tool is not a free channel', async () => {
    const token = await mintToken(['read'])
    await POST(mcpRequest(rpc('tools/call', { name: 'create_short_link', arguments: {} }), token))
    expect(consumeMcpRateLimit).toHaveBeenCalledTimes(1)
  })

  it('does not charge tools/list — only calls are metered', async () => {
    const token = await mintToken(['read'])
    await POST(mcpRequest(rpc('tools/list'), token))
    expect(consumeMcpRateLimit).not.toHaveBeenCalled()
  })

  it('refuses the call itself when the meter says no, and never reaches the seam', async () => {
    // This is the batch case: the door let the POST in because the counter was under the limit when
    // it arrived, and the elements past the line are refused one by one.
    const token = await mintToken(['read'])
    vi.mocked(consumeMcpRateLimit).mockResolvedValue(REFUSED)

    const result = await rpcResult(
      await POST(
        mcpRequest(
          rpc('tools/call', { name: 'get_org_overview', arguments: { org_id: ORG_ID } }),
          token
        )
      )
    )

    expect(result.isError).toBe(true)
    expect(String((result.content as { text: string }[])[0].text)).toContain('47 seconds')
    expect(callTool).not.toHaveBeenCalled()
  })

  it('tells the model that rotating org_id will not help', async () => {
    const token = await mintToken(['read'])
    vi.mocked(consumeMcpRateLimit).mockResolvedValue(REFUSED)

    const result = await rpcResult(
      await POST(mcpRequest(rpc('tools/call', { name: 'list_orgs', arguments: {} }), token))
    )
    expect(String((result.content as { text: string }[])[0].text)).toContain('organizations')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The access-token prefix guard (Phase 4a's debt, paid in Phase 5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('bearer prefix guard', () => {
  it('rejects a wrong-prefix bearer WITHOUT touching the database', async () => {
    const before = repo.findLiveTokenByAccessHashCalls

    for (const token of ['not-a-li2-token', 'li2mcp_rt_' + 'x'.repeat(43), 'li2mcp_code_abc', '']) {
      const response = await POST(mcpRequest(rpc('tools/list'), token))
      expect(response.status).toBe(401)
    }

    expect(repo.findLiveTokenByAccessHashCalls).toBe(before)
  })

  it('sends a REFRESH token here to the same 401 as junk — the prefix is what tells them apart', async () => {
    const junk = await POST(mcpRequest(rpc('tools/list'), 'not-a-li2-token'))
    const refresh = await POST(mcpRequest(rpc('tools/list'), 'li2mcp_rt_' + 'x'.repeat(43)))

    expect(refresh.status).toBe(junk.status)
    expect(refresh.headers.get('www-authenticate')).toBe(junk.headers.get('www-authenticate'))
  })

  it('⭐ does NOT falsely reject a real token — every issued token carries the prefix', async () => {
    // The whole risk of the guard is a false negative, and it would be invisible: the client just
    // "cannot connect" while its grant sits healthy in the database. This asserts the property the
    // guard depends on at the source — `issueTokenPair` is the only writer of access tokens.
    const token = await mintToken(['read'])

    expect(token.startsWith(ACCESS_TOKEN_PREFIX)).toBe(true)
    expect((await POST(mcpRequest(rpc('tools/list'), token))).status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Transport surface
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('method handling', () => {
  it('405s GET and DELETE — stateless has no stream to resume', async () => {
    for (const handler of [GET, DELETE]) {
      const response = await handler()
      expect(response.status).toBe(405)
      expect(response.headers.get('allow')).toBe('POST')
      expect((await response.json()).jsonrpc).toBe('2.0')
    }
  })

  it('answers the CORS preflight a browser client sends before it can even see the 401', async () => {
    const response = await OPTIONS()
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-headers')).toContain('authorization')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Helpers that need the service
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * A real access token for `scopes`, produced by the real issue path so its hash matches what the
 * route will look up. Goes through authorize → code → exchange rather than inserting a row, because
 * an inserted row cannot prove the hashing on both sides agrees.
 */
async function mintToken(scopes: McpScope[]): Promise<string> {
  const { createHash, randomBytes } = await import('node:crypto')
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url')
  const redirectUri = 'https://claude.ai/api/mcp/auth_callback'

  await repo.createClient({
    client_id: CLIENT_ID,
    client_name: 'Phase 4a test client',
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: 'none',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: scopes.join(' '),
  })
  const authorizationRequest = await mcpOAuthService.validateAuthorizationRequest(params)
  const { code } = await mcpOAuthService.issueAuthorizationCode(
    authorizationRequest,
    USER_ID,
    scopes
  )
  const tokens = await mcpOAuthService.exchangeAuthorizationCode({
    code,
    clientId: CLIENT_ID,
    redirectUri,
    codeVerifier: verifier,
  })
  return tokens.access_token
}
