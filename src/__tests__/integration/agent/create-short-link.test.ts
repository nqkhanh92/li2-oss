import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock server-only so the route + middleware import cleanly in the node test env.
vi.mock('server-only', () => ({}))

// Mock ONLY token verification — the withAgentAuth scope gate itself runs for real, so the ['read']
// -> 403 case is proven structurally, not stubbed. Claims control which scopes the token carries.
// Spread the real module so resolveAgentSurface() stays real — withAgentAuth calls it on every
// request, and its 'chat' default is what keeps claim-less (pre-MCP) tokens gating on AI_CHAT.
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

// Mock the whole touch-point service — we assert orchestration (which method, which args), not the
// service internals, and this keeps the heavy QR/jsdom import graph out of the test.
vi.mock('../../../core/services/touch-point.service', () => ({
  touchPointService: {
    createTouchPoint: vi.fn(),
    bulkCreateFromDestinations: vi.fn(),
    // SL-3: the replay path reads each created link back, fresh.
    getByIdForOrg: vi.fn(),
  },
}))

/**
 * SL-3: the route imports the Redis client for `idempotency_key`. Mocked because the real module
 * constructs an ioredis client at import time — importing it would open a socket from every test in
 * this file, including the ones that send no key at all.
 */
vi.mock('../../../infrastructure/cache/redis', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
}))

import { POST } from '../../../app/api/agent/tools/create-short-link/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { redis } from '../../../infrastructure/cache/redis'
import {
  BadRequestError,
  ForbiddenError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
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

const createMockRequest = ({ body }: { body?: unknown } = {}) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/create-short-link'),
    json: async () => body,
  }) as any

describe('POST /api/agent/tools/create-short-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: a valid write-scoped token and a plan that still has AI_CHAT.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write']) as any)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 403 for a read-only token before touching any service', async () => {
    // WHY (L1/L5): a write needs the write scope. The structural gate in withAgentAuth must reject a
    // ['read'] token BEFORE the handler runs — this is the hardest guarantee of the phase.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read']) as any)

    const response = await POST(
      createMockRequest({ body: { mode: 'single', destination_url: 'https://example.com' } }),
      { params: {} } as any
    )

    expect(response.status).toBe(403)
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
    expect(touchPointService.bulkCreateFromDestinations).not.toHaveBeenCalled()
  })

  it('single: calls createTouchPoint with mapped args and returns 201 with a one-element list', async () => {
    // WHY (L11): the route returns 201 (not 200) and a unified list-shape — this is the contract that
    // li2-ai's _back_hop_post must accept as 2xx and parse as .data.created.
    vi.mocked(touchPointService.createTouchPoint).mockResolvedValue({
      id: 'tp-1',
      short_url: 'https://li2.link/sale2026',
      slug: 'sale2026',
      name: 'My Sale',
    } as any)

    const response = await POST(
      createMockRequest({
        body: {
          mode: 'single',
          destination_url: 'https://example.com/sale',
          slug: 'sale2026',
          name: 'My Sale',
        },
      }),
      { params: {} } as any
    )

    expect(touchPointService.createTouchPoint).toHaveBeenCalledWith(
      mockOrgId,
      {
        content_type: 'URL',
        content_value: 'https://example.com/sale',
        slug: 'sale2026',
        name: 'My Sale',
      },
      mockUserId
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('create_short_link', body.data)
    expect(body.data.created).toEqual([
      { id: 'tp-1', short_url: 'https://li2.link/sale2026', slug: 'sale2026', name: 'My Sale' },
    ])
  })

  it('bulk: calls bulkCreateFromDestinations and returns 201 with an N-element list', async () => {
    // WHY (L10, state 3): the URL-only bulk path returns N links; slug may be null.
    vi.mocked(touchPointService.bulkCreateFromDestinations).mockResolvedValue([
      { id: 'tp-1', short_url: 'https://li2.link/aaaaaa', slug: null, name: 'aaaaaa' },
      { id: 'tp-2', short_url: 'https://li2.link/bbbbbb', slug: null, name: 'bbbbbb' },
    ] as any)

    const response = await POST(
      createMockRequest({
        body: { mode: 'bulk', destinations: ['https://a.com', 'https://b.com'] },
      }),
      { params: {} } as any
    )

    expect(touchPointService.bulkCreateFromDestinations).toHaveBeenCalledWith(
      mockOrgId,
      mockUserId,
      ['https://a.com', 'https://b.com']
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.created).toHaveLength(2)
    expect(body.data.created[0]).toEqual({
      id: 'tp-1',
      short_url: 'https://li2.link/aaaaaa',
      slug: null,
      name: 'aaaaaa',
    })
  })

  it('bulk: a bad URL fails the whole batch (all-or-nothing), creating nothing', async () => {
    // WHY (L10): bulkCreateFromDestinations validates every URL up-front and inserts atomically — one
    // bad URL rejects the batch; there is no partial success.
    vi.mocked(touchPointService.bulkCreateFromDestinations).mockRejectedValue(
      new BadRequestError('URL is blacklisted')
    )

    const response = await POST(
      createMockRequest({
        body: { mode: 'bulk', destinations: ['https://a.com', 'https://evil.example'] },
      }),
      { params: {} } as any
    )

    expect(response.status).toBe(400)
    expect(touchPointService.bulkCreateFromDestinations).toHaveBeenCalledTimes(1)
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid body without touching any service', async () => {
    // WHY: a malformed tool input is a user error (4xx), not a 500, and must never reach the service.
    const response = await POST(createMockRequest({ body: { mode: 'nope' } }), {
      params: {},
    } as any)

    expect(response.status).toBe(400)
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
    expect(touchPointService.bulkCreateFromDestinations).not.toHaveBeenCalled()
  })

  it('single: maps a 23505 slug-taken error to a 400 with the slug_is_taken i18n key', async () => {
    // WHY: a duplicate slug is a user error surfaced by the service; the route lets it through as 400.
    vi.mocked(touchPointService.createTouchPoint).mockRejectedValue(
      new BadRequestError('Slug was taken by another user, please choose another slug!', {
        key: 'common:messages.error.slug_is_taken',
      })
    )

    const response = await POST(
      createMockRequest({
        body: { mode: 'single', destination_url: 'https://example.com', slug: 'taken-slug' },
      }),
      { params: {} } as any
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.i18nMessage.key).toBe('common:messages.error.slug_is_taken')
  })

  it('blocks the write when the org lost AI_CHAT mid-token', async () => {
    // WHY (L8 / open-item #6): the plan is re-gated on every call, so a downgrade between propose and
    // execute stops the write — nothing is created.
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const response = await POST(
      createMockRequest({ body: { mode: 'single', destination_url: 'https://example.com' } }),
      { params: {} } as any
    )

    expect(response.status).toBe(403)
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })

  describe('3b advanced fields (single mode) — flat tool input to nested map (B2)', () => {
    beforeEach(() => {
      vi.mocked(touchPointService.createTouchPoint).mockResolvedValue({
        id: 'tp-1',
        short_url: 'https://li2.link/sale2026',
        slug: 'sale2026',
        name: 'My Sale',
      } as any)
    })

    it('maps password + expires_at + utm_source to nested access_control/utm_tags', async () => {
      // WHY: B2 flat->nested map + gate keys on enabled:true — proof of the execute-time contract.
      await POST(
        createMockRequest({
          body: {
            mode: 'single',
            destination_url: 'https://example.com/sale',
            password: 'spring',
            expires_at: '2027-01-01T00:00:00Z',
            utm_source: 'newsletter',
          },
        }),
        { params: {} } as any
      )

      expect(touchPointService.createTouchPoint).toHaveBeenCalledTimes(1)
      const [, arg] = vi.mocked(touchPointService.createTouchPoint).mock.calls[0]
      expect(arg.access_control).toEqual({
        password: 'spring',
        expires_at: expect.any(Date),
      })
      expect(arg.utm_tags).toEqual({
        enabled: true,
        overrideable: false,
        utm_source: 'newsletter',
      })
    })

    it('passes expires_at as a real Date instance, not a string (DATE-TRAP #4)', async () => {
      // WHY: accessControlSchema.expires_at is inferred Date|null and createTouchPoint does not
      // .parse() (drift-trap #2) — parseAccessControl only calls .toISOString() when the value is
      // `instanceof Date`; a raw string would flow into the DB unconverted (silent bug).
      await POST(
        createMockRequest({
          body: {
            mode: 'single',
            destination_url: 'https://example.com',
            expires_at: '2027-01-01T00:00:00Z',
          },
        }),
        { params: {} } as any
      )

      const [, arg] = vi.mocked(touchPointService.createTouchPoint).mock.calls[0]
      expect(arg.access_control?.expires_at instanceof Date).toBe(true)
    })

    it('sets only access_control when only password is present, with no utm_tags key', async () => {
      // WHY (O3): an absent field must not create an empty access_control/utm_tags object that
      // would trip a plan gate.
      await POST(
        createMockRequest({
          body: { mode: 'single', destination_url: 'https://example.com', password: 'spring' },
        }),
        { params: {} } as any
      )

      const [, arg] = vi.mocked(touchPointService.createTouchPoint).mock.calls[0]
      expect(arg.access_control).toEqual({ password: 'spring' })
      expect(arg.utm_tags).toBeUndefined()
    })

    it('sets only utm_tags when only utm_source is present, with no access_control key', async () => {
      // WHY: symmetry of the case above.
      await POST(
        createMockRequest({
          body: {
            mode: 'single',
            destination_url: 'https://example.com',
            utm_source: 'newsletter',
          },
        }),
        { params: {} } as any
      )

      const [, arg] = vi.mocked(touchPointService.createTouchPoint).mock.calls[0]
      expect(arg.utm_tags).toEqual({ enabled: true, overrideable: false, utm_source: 'newsletter' })
      expect(arg.access_control).toBeUndefined()
    })

    it('bubbles a PlanError from createTouchPoint when the org lacks link_password', async () => {
      // WHY (B3): execute-time gate is the hard authority — an unentitled/downgraded org must not
      // get a link created.
      vi.mocked(touchPointService.createTouchPoint).mockRejectedValue(
        new PlanError("This organization doesn't allow link password")
      )

      const response = await POST(
        createMockRequest({
          body: { mode: 'single', destination_url: 'https://example.com', password: 'spring' },
        }),
        { params: {} } as any
      )

      expect(response.status).toBe(403)
    })

    it('bulk requests are unaffected — no access_control/utm_tags passed', async () => {
      // WHY (B6, regression 3a): bulk stays URL-only even after 3b widens the single schema.
      vi.mocked(touchPointService.bulkCreateFromDestinations).mockResolvedValue([
        { id: 'tp-1', short_url: 'https://li2.link/aaaaaa', slug: null, name: 'aaaaaa' },
        { id: 'tp-2', short_url: 'https://li2.link/bbbbbb', slug: null, name: 'bbbbbb' },
      ] as any)

      const response = await POST(
        createMockRequest({
          body: { mode: 'bulk', destinations: ['https://a.com', 'https://b.com'] },
        }),
        { params: {} } as any
      )

      expect(response.status).toBe(201)
      expect(touchPointService.bulkCreateFromDestinations).toHaveBeenCalledWith(
        mockOrgId,
        mockUserId,
        ['https://a.com', 'https://b.com']
      )
      expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
    })
  })
})

/**
 * SL-3 — `idempotency_key` as the ROUTE sees it. The protocol itself is covered exhaustively in
 * `src/__tests__/unit/helpers/artifact-idempotency.test.ts` against an in-memory client; what is
 * asserted here is only what this route is responsible for: the branches it chooses between, the
 * `short_link` namespace, the comma-joined ids a bulk claim has to store, and the fact that a call
 * WITHOUT a key never reaches Redis.
 */
describe('POST /api/agent/tools/create-short-link — idempotency_key (SL-3)', () => {
  const KEY = 'create-bang-gia-t10'
  const SINGLE = { mode: 'single', destination_url: 'https://example.com/sale', name: 'My Sale' }
  const BULK = { mode: 'bulk', destinations: ['https://a.com', 'https://b.com'] }

  const tp = (id: string, slug: string | null = null) => ({
    id,
    short_url: `https://li2.link/${slug ?? id}`,
    slug,
    name: 'My Sale',
  })

  const call = (body: unknown) => POST(createMockRequest({ body }), { params: {} } as any)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write']) as any)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
    vi.mocked(touchPointService.createTouchPoint).mockResolvedValue(tp('tp-1', 'sale2026') as any)
    vi.mocked(touchPointService.bulkCreateFromDestinations).mockResolvedValue([
      tp('tp-1'),
      tp('tp-2'),
    ] as any)
    vi.mocked(redis.set).mockResolvedValue('OK' as any)
    vi.mocked(redis.get).mockResolvedValue(null as any)
    vi.mocked(redis.del).mockResolvedValue(1 as any)
  })

  it('no key → Redis is not touched at all, and the answer is the unchanged 201', async () => {
    const response = await call(SINGLE)

    expect(response.status).toBe(201)
    expect(redis.set).not.toHaveBeenCalled()
    expect(redis.get).not.toHaveBeenCalled()
    expect(redis.del).not.toHaveBeenCalled()
    // A fresh create carries NO flag — the field exists only on a replay.
    expect((await response.json()).data.idempotent_replay).toBeUndefined()
  })

  it('⭐ a free key → claims under the short_link namespace, creates, then records the id', async () => {
    const response = await call({ ...SINGLE, idempotency_key: KEY })

    expect(response.status).toBe(201)
    expect(touchPointService.createTouchPoint).toHaveBeenCalledTimes(1)
    // The NAMESPACE is in the Redis key, and it is what stops a key from replaying an artifact id
    // to a caller that names its keys by date.
    expect(vi.mocked(redis.set).mock.calls[0][0]).toMatch(/^short_link:idem:/)
    expect(vi.mocked(redis.set).mock.calls[0][0]).not.toContain('artifact')
    // claim, then complete — in that order, and the claim is before the service call.
    expect(vi.mocked(redis.set).mock.calls[0].slice(1)).toEqual(['pending', 'EX', 86_400, 'NX'])
    expect(vi.mocked(redis.set).mock.calls[1].slice(1)).toEqual(['tp-1', 'KEEPTTL'])
    expect(redis.del).not.toHaveBeenCalled()
  })

  it('⭐ a BULK claim stores every id, comma-joined — one value for N links', async () => {
    await call({ ...BULK, idempotency_key: KEY })

    expect(vi.mocked(redis.set).mock.calls[1].slice(1)).toEqual(['tp-1,tp-2', 'KEEPTTL'])
  })

  it('⭐ a key that already created → 200, the SAME links read back fresh, no second create', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as any) // SET NX lost
    vi.mocked(redis.get).mockResolvedValue('tp-1,tp-2' as any)
    vi.mocked(touchPointService.getByIdForOrg).mockImplementation((async (
      _org: string,
      id: string
    ) => tp(id)) as any)

    const response = await call({ ...BULK, idempotency_key: KEY })

    expect(response.status).toBe(200) // not 201: this call created nothing
    expect(touchPointService.bulkCreateFromDestinations).not.toHaveBeenCalled()
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
    const body = await response.json()
    // The OLD contract is intact alongside the flag — a replay is a full answer, not a stub.
    expect(body.data.created.map((link: { id: string }) => link.id)).toEqual(['tp-1', 'tp-2'])
    expect(body.data.idempotent_replay).toBe(true)
    // Read back per id, org-scoped — which is also what refuses another organization's link.
    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(mockOrgId, 'tp-1')
    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(mockOrgId, 'tp-2')
  })

  it('⭐ a replay whose links were deleted afterwards → 404 with its OWN key, never a re-create', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as any)
    vi.mocked(redis.get).mockResolvedValue('tp-1,tp-2' as any)
    // One of the two is gone — all-or-nothing, because a bulk create was one atomic INSERT.
    vi.mocked(touchPointService.getByIdForOrg).mockImplementation((async (
      _org: string,
      id: string
    ) => (id === 'tp-1' ? tp(id) : null)) as any)

    const response = await call({ ...BULK, idempotency_key: KEY })

    expect(response.status).toBe(404)
    expect((await response.json()).i18nMessage.key).toBe('agent:short_link.idem_link_gone')
    expect(touchPointService.bulkCreateFromDestinations).not.toHaveBeenCalled()
  })

  it('a key still in flight → 409 with its own key, and nothing is created', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as any)
    vi.mocked(redis.get).mockResolvedValue('pending' as any)

    const response = await call({ ...SINGLE, idempotency_key: KEY })

    expect(response.status).toBe(409)
    expect((await response.json()).i18nMessage.key).toBe('agent:short_link.idem_in_progress')
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })

  it('⭐ Redis down WITH a key → 503 and the create is never attempted (fail CLOSED)', async () => {
    vi.mocked(redis.set).mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) as any
    )

    const response = await call({ ...SINGLE, idempotency_key: KEY })

    expect(response.status).toBe(503)
    expect((await response.json()).i18nMessage.key).toBe('agent:short_link.idem_unavailable')
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })

  it('Redis down WITHOUT a key → 201, because that call never promised idempotency', async () => {
    // And the UI shares the service underneath, so a cache outage must not take creating down.
    vi.mocked(redis.set).mockRejectedValue(new Error('connect ECONNREFUSED') as any)

    expect((await call(SINGLE)).status).toBe(201)
  })

  it('a FAILED create releases the key, so the same key can be retried after the user fixes it', async () => {
    vi.mocked(touchPointService.createTouchPoint).mockRejectedValue(
      new ForbiddenError('plan limit', {
        key: 'common:messages.error.plan_errors.max_slugs_per_tp',
      })
    )

    const response = await call({ ...SINGLE, idempotency_key: KEY })

    // The create's own error reaches the caller unchanged — the release must not mask it.
    expect(response.status).toBe(403)
    expect((await response.json()).i18nMessage.key).toBe(
      'common:messages.error.plan_errors.max_slugs_per_tp'
    )
    expect(redis.del).toHaveBeenCalledTimes(1)
  })

  it('a malformed key is a 400 from the schema, before Redis and before the service', async () => {
    for (const key of ['has spaces', '', 'a'.repeat(129), 'bang giá']) {
      const response = await call({ ...SINGLE, idempotency_key: key })
      expect(response.status, key).toBe(400)
    }
    expect(redis.set).not.toHaveBeenCalled()
    expect(touchPointService.createTouchPoint).not.toHaveBeenCalled()
  })
})
