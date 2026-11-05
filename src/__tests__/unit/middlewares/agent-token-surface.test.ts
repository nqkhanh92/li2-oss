import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { generateKeys } from 'paseto-ts/v4'
import type { AgentClaims } from '@/shared/lib/agent/paseto'

// Backward-compatibility guard for the MCP `surface` claim (Phase 1a).
//
// WHY THIS EXISTS: MCP needs to gate on a different plan feature than the chat panel, so the token
// gained a `surface` claim. Every token already in flight — the chat panel's, and every one li2-ai
// holds — was minted WITHOUT it. The single line `claims.surface === 'mcp' ? 'mcp' : 'chat'` is the
// whole of that backward compatibility: if `surface` ever becomes required, or a caller reads
// `claims.surface` raw instead of going through resolveAgentSurface(), every existing token starts
// resolving to an unintended surface and (once Phase 1b lands) gates on the wrong plan feature —
// i.e. the chat panel 403s for every customer. These tests mint the exact claim set
// `api/agent/session/route.ts` produces today, so a regression cannot hide behind a synthetic token.

const mockLog = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }))
const mockEnsureOrgMember = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => mockLog) },
}))

// Spread the real module: the other exports are live permission gates, and a blanket stub would
// disable them for anything else this file pulls in.
vi.mock('@/shared/lib/permission/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/permission/permissions')>()),
  ensureOrgMember: mockEnsureOrgMember,
}))

let paseto: typeof import('@/shared/lib/agent/paseto')
let middleware: typeof import('@/shared/lib/middlewares/with-agent-auth')

const ORG_ID = '123e4567-e89b-12d3-a456-426614174000'
const USER_ID = '223e4567-e89b-12d3-a456-426614174111'

/** The claims `POST /api/agent/session` mints TODAY — note there is no `surface` key at all. */
const legacyClaims = (): Omit<AgentClaims, 'iss' | 'aud'> => ({
  org_id: ORG_ID,
  user_id: USER_ID,
  email: 'user@example.com',
  plan: 't1',
  scopes: ['read', 'write'],
  ai_budget: 1000,
  entitlements: { advanced_features_allowed: ['ai_chat'], allow_custom_utm_tags: false },
})

beforeAll(async () => {
  const { secretKey, publicKey } = generateKeys('public')
  process.env.AGENT_PASETO_PRIVATE_KEY = secretKey
  process.env.AGENT_PASETO_PUBLIC_KEY = publicKey
  process.env.AGENT_PASETO_KEY_ID = 'test-kid'
  // paseto.ts parses the rotation map ONCE at module load, and vitest.config.ts loads real .env
  // files — so clear it and re-import, or a locally decrypted env would bind the module to keys this
  // test cannot sign with.
  delete process.env.AGENT_PASETO_PUBLIC_KEYS
  vi.resetModules()
  paseto = await import('@/shared/lib/agent/paseto')
  middleware = await import('@/shared/lib/middlewares/with-agent-auth')
})

const bearer = (token: string) =>
  new NextRequest('https://app.li2.ai/api/agent/tools/top-links', {
    headers: { authorization: `Bearer ${token}` },
  })

beforeEach(() => {
  mockEnsureOrgMember.mockReset().mockResolvedValue(undefined)
})

describe('agent token `surface` claim', () => {
  it('verifies a token minted without `surface` and resolves it to chat', () => {
    const { token } = paseto.mintAgentToken(legacyClaims())

    const claims = paseto.verifyAgentToken(token)

    expect(claims.surface).toBeUndefined() // the claim really is absent on the wire
    expect(paseto.resolveAgentSurface(claims)).toBe('chat')
  })

  it('resolves to mcp only when the claim says so explicitly', () => {
    const { token } = paseto.mintAgentToken({ ...legacyClaims(), surface: 'mcp' })

    expect(paseto.resolveAgentSurface(paseto.verifyAgentToken(token))).toBe('mcp')
  })

  it('leaves aud as li2-ai — li2-ai’s pyseto verifier hard-rejects anything else', () => {
    const { token } = paseto.mintAgentToken({ ...legacyClaims(), surface: 'mcp' })

    expect(paseto.verifyAgentToken(token).aud).toBe('li2-ai')
  })
})

describe('withAgentAuth exposes the resolved surface', () => {
  it('hands a pre-MCP token to the handler as surface=chat, org and scopes untouched', async () => {
    const { token } = paseto.mintAgentToken(legacyClaims())
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))

    const res = await middleware.withAgentAuth(['read'], handler)(bearer(token), { params: {} })

    expect(res.status).toBe(200)
    const [, ctx] = handler.mock.calls[0]
    expect(ctx.agent).toEqual({ orgId: ORG_ID, scopes: ['read', 'write'], surface: 'chat' })
    expect(ctx.context.email).toBe('user@example.com') // still copied into AuthContext
  })

  it('hands an MCP token to the handler as surface=mcp', async () => {
    const { token } = paseto.mintAgentToken({ ...legacyClaims(), surface: 'mcp' })
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))

    await middleware.withAgentAuth(['read'], handler)(bearer(token), { params: {} })

    expect(handler.mock.calls[0][1].agent.surface).toBe('mcp')
  })
})

// Phase 4c. Measured on a running server: a PASETO minted for an org the user does not belong to
// got 200 with Owner-identical data out of org-overview and analytics-summary, because those routes
// pass only `agent.orgId` to services that never see a userId. Both mint sites check membership, so
// this was never live — but the mint check was the ONLY layer, and a third mint site that forgets
// would be a silent cross-tenant read. Delete this line and four of six tool routes leak again.
describe('withAgentAuth enforces org membership', () => {
  it('checks membership against the org in the token, not one the caller supplies', async () => {
    const { token } = paseto.mintAgentToken(legacyClaims())
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))

    await middleware.withAgentAuth(['read'], handler)(bearer(token), { params: {} })

    expect(mockEnsureOrgMember).toHaveBeenCalledWith(ORG_ID)
  })

  it('refuses a non-member with 403 and never runs the handler', async () => {
    const { PermissionError } = await import('@/infrastructure/response/errors/domain.errors')
    mockEnsureOrgMember.mockRejectedValue(new PermissionError('You are not a member of this organization'))
    const { token } = paseto.mintAgentToken(legacyClaims())
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ leaked: true }))

    const res = await middleware.withAgentAuth(['read'], handler)(bearer(token), { params: {} })

    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('runs the membership check before the handler, so a route cannot read org data first', async () => {
    const order: string[] = []
    mockEnsureOrgMember.mockImplementation(async () => {
      order.push('member-check')
    })
    const { token } = paseto.mintAgentToken(legacyClaims())
    const handler = vi.fn().mockImplementation(async () => {
      order.push('handler')
      return NextResponse.json({ ok: true })
    })

    await middleware.withAgentAuth(['read'], handler)(bearer(token), { params: {} })

    expect(order).toEqual(['member-check', 'handler'])
  })
})
