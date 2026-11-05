import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Phase 1b — the 6 agent tool routes gate on the CALLER'S surface, not a hardcoded AI_CHAT.
//
// WHY THIS EXISTS: MCP is sold as its own entitlement (MCP_ACCESS), so an MCP client must not be let
// in by an org's AI_CHAT, and — the load-bearing half — every token already in flight (the chat
// panel's, li2-ai's) carries NO `surface` claim and must keep gating on AI_CHAT exactly as before.
// One wrong branch here and either the chat panel 403s for every customer, or MCP_ACCESS becomes
// unsellable because AI_CHAT already opens the same doors. Both directions are asserted below
// through a REAL route and the REAL withAgentAuth, so only `verifyAgentToken` is stubbed — the
// surface resolution, the scope gate and the gate's position in the handler all run for real.

vi.mock('server-only', () => ({}))

vi.mock('../../../shared/lib/agent/paseto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/lib/agent/paseto')>()),
  verifyAgentToken: vi.fn(),
}))

vi.mock('../../../shared/lib/plan/plans', () => ({
  ensureOrgPlan: vi.fn(),
}))

// withAgentAuth now calls ensureOrgMember() for every agent route (defense in depth: the mint-time
// check used to be the only membership layer). Spread the real module — the other exports are the
// live permission gates these routes depend on, and stubbing the whole file would hide them.
vi.mock('../../../shared/lib/permission/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/lib/permission/permissions')>()),
  ensureOrgMember: vi.fn(),
}))

vi.mock('../../../shared/utils/server/get-timezone', () => ({
  getTimeZone: vi.fn().mockReturnValue(undefined),
}))

vi.mock('../../../core/services/analytic.service', () => ({
  analyticService: { getAdvancedAnalytics: vi.fn() },
}))

vi.mock('../../../core/services/touch-point.service', () => ({
  touchPointService: { createTouchPoint: vi.fn(), bulkCreateFromDestinations: vi.fn() },
}))

import { GET as topLinks } from '../../../app/api/agent/tools/top-links/route'
import { POST as createShortLink } from '../../../app/api/agent/tools/create-short-link/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { analyticService } from '../../../core/services/analytic.service'
import { touchPointService } from '../../../core/services/touch-point.service'
import { SURFACE_FEATURE_KEY } from '../../../shared/lib/agent/surface-plan-gate'
import { ADVANCED_FEATURE_KEYS } from '../../../shared/types/plan-permission'
import { PlanError } from '../../../infrastructure/response/errors/domain.errors'

const ORG_ID = 'org-123'
const USER_ID = '123e4567-e89b-12d3-a456-426614174000'

/** Exactly what `POST /api/agent/session` mints today — deliberately no `surface` key. */
const legacyClaims = () => ({
  org_id: ORG_ID,
  user_id: USER_ID,
  email: 'agent@example.com',
  plan: 'pro',
  scopes: ['read', 'write'],
  ai_budget: 1000,
  iss: 'li2-app',
  aud: 'li2-ai',
})

const getRequest = () =>
  ({
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/top-links'),
  }) as any

const postRequest = (body: unknown, onJson?: () => void) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/create-short-link'),
    json: async () => {
      onJson?.()
      return body
    },
  }) as any

describe('SURFACE_FEATURE_KEY', () => {
  it('prices chat as AI_CHAT and mcp as MCP_ACCESS', () => {
    expect(SURFACE_FEATURE_KEY).toEqual({
      chat: ADVANCED_FEATURE_KEYS.AI_CHAT,
      mcp: ADVANCED_FEATURE_KEYS.MCP_ACCESS,
    })
  })

  it('keeps the two keys distinct — a shared value would make MCP_ACCESS unsellable', () => {
    expect(SURFACE_FEATURE_KEY.chat).not.toBe(SURFACE_FEATURE_KEY.mcp)
  })
})

describe('tool routes gate on the token surface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
    vi.mocked(analyticService.getAdvancedAnalytics).mockResolvedValue(null as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gates a token WITHOUT a surface claim on ai_chat — the whole backward compatibility', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(legacyClaims() as any)

    const response = await topLinks(getRequest(), { params: {} } as any)

    expect(response.status).toBe(200)
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_ID, 'ai_chat')
  })

  it("gates a surface:'mcp' token on mcp_access", async () => {
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'mcp' } as any)

    const response = await topLinks(getRequest(), { params: {} } as any)

    expect(response.status).toBe(200)
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_ID, 'mcp_access')
  })

  it("treats an explicit surface:'chat' the same as an absent claim", async () => {
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'chat' } as any)

    await topLinks(getRequest(), { params: {} } as any)

    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_ID, 'ai_chat')
  })

  it('falls back to ai_chat for an unrecognised surface — never opens the MCP door by accident', async () => {
    // A forged/garbage claim must degrade to the STRICTER-for-MCP side: chat. Reaching mcp_access
    // here would let an org's MCP entitlement be probed by an arbitrary string.
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'wat' } as any)

    await topLinks(getRequest(), { params: {} } as any)

    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_ID, 'ai_chat')
  })

  it('403s an MCP token when the org has AI_CHAT but not MCP_ACCESS', async () => {
    // The point of splitting the entitlement: AI_CHAT must not buy MCP.
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'mcp' } as any)
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const response = await topLinks(getRequest(), { params: {} } as any)

    expect(response.status).toBe(403)
    expect(analyticService.getAdvancedAnalytics).not.toHaveBeenCalled()
  })
})

describe('create-short-link keeps the gate ahead of the body parse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("gates the write on mcp_access for a surface:'mcp' token", async () => {
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'mcp' } as any)
    vi.mocked(touchPointService.createTouchPoint).mockResolvedValue({
      id: 'tp-1',
      short_url: 'https://li2.link/abc',
      slug: 'abc',
      name: 'x',
    } as any)

    const response = await createShortLink(
      postRequest({ mode: 'single', destination_url: 'https://example.com' }),
      { params: {} } as any
    )

    expect(response.status).toBe(201)
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_ID, 'mcp_access')
  })

  it('rejects an unentitled org before the request body is even read', async () => {
    // Ordering is the contract, not an accident: an org without the feature must never have its
    // input parsed or reach the service. Asserting json() was not called pins the gate's position.
    const bodyRead = vi.fn()
    vi.mocked(verifyAgentToken).mockReturnValue({ ...legacyClaims(), surface: 'mcp' } as any)
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const response = await createShortLink(
      postRequest({ mode: 'single', destination_url: 'https://example.com' }, bodyRead),
      { params: {} } as any
    )

    expect(response.status).toBe(403)
    expect(bodyRead).not.toHaveBeenCalled()
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })
})
