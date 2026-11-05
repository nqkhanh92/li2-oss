import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock server-only so the route + middleware import cleanly in the node test env.
vi.mock('server-only', () => ({}))

// Mock ONLY token verification — the withAgentAuth scope gate itself runs for real. Spread the real
// module: resolveAgentSurface() is pure and IS under test here (it turns a claim-less token into
// 'chat'), so stubbing it would hide exactly the regression this file now guards.
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

// getTimeZone reads next/headers — stub it out, the value is not part of this contract.
vi.mock('../../../shared/utils/server/get-timezone', () => ({
  getTimeZone: vi.fn().mockReturnValue(undefined),
}))

// Mock the whole analytic service — we assert orchestration (call args, projection shape), not
// the RPC/repository internals.
vi.mock('../../../core/services/analytic.service', () => ({
  analyticService: {
    getAdvancedAnalytics: vi.fn(),
  },
}))

import { GET } from '../../../app/api/agent/tools/top-links/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { analyticService } from '../../../core/services/analytic.service'
import { PlanError } from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const mockOrgId = 'org-123'
const mockUserId = '123e4567-e89b-12d3-a456-426614174000'

const makeClaims = (scopes: string[]) => ({
  org_id: mockOrgId,
  user_id: mockUserId,
  email: 'agent@example.com',
  plan: 'pro',
  scopes,
  ai_budget: 1000,
  iss: 'li2-app',
  aud: 'li2-ai',
})

const createMockRequest = (query: Record<string, string> = {}) => {
  const url = new URL('http://localhost:3000/api/agent/tools/top-links')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as any
}

const makeTouchpointReport = () => ({
  period_info: {} as any,
  filters_applied: {} as any,
  summary: {} as any,
  top_touchpoints: [
    {
      rank: 1,
      touchpoint_id: 'tp-1',
      name: 'Spring Sale',
      performance_score: 90,
      slug: '6LBCU',
      performance_tier: 'top_performer',
      engagement_quality: 'high',
      associated_tags: null,
      core_metrics: { total_interactions: 100, link_clicks: 60, qr_scans: 40 } as any,
      interaction_breakdown: {} as any,
      rankings: {} as any,
      audience_insights: {} as any,
    },
    {
      rank: 2,
      touchpoint_id: 'tp-2',
      name: 'Winter Promo',
      performance_score: 80,
      slug: null,
      performance_tier: 'good_performer',
      engagement_quality: 'medium',
      associated_tags: null,
      core_metrics: { total_interactions: 50, link_clicks: 30, qr_scans: 20 } as any,
      interaction_breakdown: {} as any,
      rankings: {} as any,
      audience_insights: {} as any,
    },
  ],
})

describe('GET /api/agent/tools/top-links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read']) as any)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 403 for a write-only token before touching any service', async () => {
    // WHY (L1/L5): this is a read tool — a token lacking 'read' must be rejected structurally by
    // withAgentAuth BEFORE the handler runs.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write']) as any)

    const response = await GET(createMockRequest(), { params: {} } as any)

    expect(response.status).toBe(403)
    expect(analyticService.getAdvancedAnalytics).not.toHaveBeenCalled()
  })

  it('blocks the read when the org lost AI_CHAT mid-token', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const response = await GET(createMockRequest(), { params: {} } as any)

    expect(response.status).toBe(403)
    expect(analyticService.getAdvancedAnalytics).not.toHaveBeenCalled()
  })

  it('returns an empty ranking (not a 500) when the RPC has no data for the org', async () => {
    vi.mocked(analyticService.getAdvancedAnalytics).mockResolvedValue(null as any)

    const response = await GET(createMockRequest(), { params: {} } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.top).toEqual([])
  })

  it('projects each entry with `id` (LOCKED contract) alongside the existing fields', async () => {
    // WHY: `id` (= the RPC's touchpoint_id) lets the model thread this link straight into
    // get_link_details' `id` param instead of guessing which of name/slug/short_code to pass.
    vi.mocked(analyticService.getAdvancedAnalytics).mockResolvedValue(
      makeTouchpointReport() as any
    )

    const response = await GET(createMockRequest({ period_days: '30', limit: '5' }), {
      params: {},
    } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('get_top_links', body.data)
    expect(body.data.top).toEqual([
      {
        id: 'tp-1',
        rank: 1,
        name: 'Spring Sale',
        slug: '6LBCU',
        total_interactions: 100,
        link_clicks: 60,
        qr_scans: 40,
      },
      {
        id: 'tp-2',
        rank: 2,
        name: 'Winter Promo',
        slug: null,
        total_interactions: 50,
        link_clicks: 30,
        qr_scans: 20,
      },
    ])
  })

  it('respects `limit` when slicing the ranking', async () => {
    vi.mocked(analyticService.getAdvancedAnalytics).mockResolvedValue(
      makeTouchpointReport() as any
    )

    const response = await GET(createMockRequest({ limit: '1' }), { params: {} } as any)

    const body = await response.json()
    expect(body.data.top).toHaveLength(1)
    expect(body.data.top[0].id).toBe('tp-1')
  })
})
