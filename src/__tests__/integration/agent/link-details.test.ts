import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock server-only so the route + middleware import cleanly in the node test env.
vi.mock('server-only', () => ({}))

// Mock ONLY token verification — the withAgentAuth scope gate itself runs for real, so the ['write']
// -> 403 case (no 'read' scope) is proven structurally, not stubbed.
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

// Mock the whole touch-point service — we assert orchestration (which method, which args, how the
// projection is built), not the service/repository internals.
vi.mock('../../../core/services/touch-point.service', () => ({
  touchPointService: {
    getByIdForOrg: vi.fn(),
    getBySlugForOrg: vi.fn(),
    ensureCanViewTouchPoint: vi.fn(),
  },
}))

// Mock the organization service — detail_url needs org_slug (or the id fallback), not the org's
// other fields, so we only stub getOrgById.
vi.mock('../../../core/services/organization.service', () => ({
  organizationService: {
    getOrgById: vi.fn(),
  },
}))

import { GET } from '../../../app/api/agent/tools/link-details/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { organizationService } from '../../../core/services/organization.service'
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

const createMockRequest = (query: Record<string, string> = {}) => {
  const url = new URL('http://localhost:3000/api/agent/tools/link-details')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as any
}

describe('GET /api/agent/tools/link-details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: a valid read-scoped token and a plan that still has AI_CHAT.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read']) as any)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as any)
    // Default: the per-member view gate allows the caller — individual tests override this to
    // prove the 403 path (collection NO_ACCESS / OWN-scope non-owner).
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockResolvedValue(undefined as any)
    // Default: an org with a slug — individual tests override this to prove the org-id fallback.
    vi.mocked(organizationService.getOrgById).mockResolvedValue({ org_slug: 'acme' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 403 for a write-only token before touching any service', async () => {
    // WHY (L1/L5): this is a read tool — a token lacking 'read' must be rejected structurally by
    // withAgentAuth BEFORE the handler runs.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write']) as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(response.status).toBe(403)
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('returns 400 for a missing slug without touching any service', async () => {
    const response = await GET(createMockRequest({}), { params: {} } as any)

    expect(response.status).toBe(400)
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('returns 400 for an empty slug without touching any service', async () => {
    const response = await GET(createMockRequest({ slug: '' }), { params: {} } as any)

    expect(response.status).toBe(400)
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('returns 400 when neither id nor slug is present, without touching any service', async () => {
    // WHY: linkDetailsQuerySchema.refine — at least one lookup key is required.
    const response = await GET(createMockRequest({}), { params: {} } as any)

    expect(response.status).toBe(400)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('returns 404 when no touch-point matches (orgId, slug) — never a 500', async () => {
    // WHY: an org-scoped miss (wrong slug, or a slug belonging to a different org) must be a
    // friendly not-found, not an unhandled 500.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(null as any)

    const response = await GET(createMockRequest({ slug: 'does-not-exist' }), {
      params: {},
    } as any)

    expect(touchPointService.getBySlugForOrg).toHaveBeenCalledWith(mockOrgId, 'does-not-exist')
    expect(response.status).toBe(404)
  })

  it('resolves by ID (preferred path) -> 200, and never calls the slug resolver', async () => {
    // WHY (LOCKED contract): id is the touchpoint id threaded from get_top_links' TopLinkEntry.id —
    // an exact primary-key lookup, so the tolerant slug resolver must not run at all.
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue({
      id: 'tp-by-id',
      name: 'Spring Sale',
      slug: '6LBCU',
      short_code: '6LBCU',
      short_url: 'https://example.com/6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/sale',
      utm_tags: null,
      access_control: null,
      path_qr_code: null,
      enabled: true,
    } as any)

    const response = await GET(createMockRequest({ id: 'tp-by-id' }), { params: {} } as any)

    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(mockOrgId, 'tp-by-id')
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    const body = await response.json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('get_link_details', body.data)
    expect(body.data.slug).toBe('6LBCU')
    // ⭐ SL-0 §4 REVERSED THIS ASSERTION, deliberately. `id` used to be withheld on the reasoning
    // that it is a lookup key and not part of the shape — which left an agent holding a
    // `LinkDetails` with no identifier any other Li2 tool accepts. It is now published, as an
    // OPTIONAL addition to the cross-repo contract (no field was renamed or removed).
    expect(body.data.id).toBe('tp-by-id')
  })

  it('returns 404 when no touch-point matches (orgId, id) — never a 500', async () => {
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as any)

    const response = await GET(createMockRequest({ id: 'does-not-exist' }), { params: {} } as any)

    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(mockOrgId, 'does-not-exist')
    expect(response.status).toBe(404)
  })

  it('returns 403 for an id-lookup link the caller has NO_ACCESS to (gate runs)', async () => {
    // WHY: the `id` path must go through the exact same ensureCanViewTouchPoint gate as `slug` —
    // an exact lookup is not a bypass for per-member view scoping.
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue({
      id: 'tp-locked-by-id',
      name: 'Locked Space Link',
      slug: 'locked',
      short_code: 'locked',
      content_type: 'URL',
      content_value: 'https://example.com/locked',
      utm_tags: null,
      access_control: null,
    } as any)
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockRejectedValue(new ForbiddenError())

    const response = await GET(createMockRequest({ id: 'tp-locked-by-id' }), { params: {} } as any)

    expect(touchPointService.ensureCanViewTouchPoint).toHaveBeenCalledWith(
      mockOrgId,
      'tp-locked-by-id',
      mockUserId
    )
    expect(response.status).toBe(403)
  })

  it('resolves by NAME (single exact match) -> 200 with the projection', async () => {
    // WHY: the model sometimes passes get_top_links' `name` field into this tool's `slug` param
    // instead of `slug`/`short_code` — the service resolves it as a last-resort match.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-by-name',
      name: 'walk-3aw-live-0ffa2a94',
      slug: null,
      short_code: '6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/walk',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: 'walk-3aw-live-0ffa2a94' }), {
      params: {},
    } as any)

    expect(touchPointService.getBySlugForOrg).toHaveBeenCalledWith(
      mockOrgId,
      'walk-3aw-live-0ffa2a94'
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    // The real short_code is echoed back — never the model-supplied name.
    expect(body.data.slug).toBe('6LBCU')
  })

  it('resolves by SHORT_CODE -> 200 with the projection', async () => {
    // WHY: most touch-points never get a custom slug — only an auto short_code — so a
    // short_code-only lookup must succeed, not 404.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-by-short-code',
      name: 'Spring Sale',
      slug: null,
      short_code: '6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/sale',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.slug).toBe('6LBCU')
  })

  it('returns 400 (not 500) when the identifier matches more than one link by name', async () => {
    // WHY: `name` is not unique. The repository detects >1 match (getBySlugShortCodeOrNameForOrg)
    // and the service turns that into a BadRequestError instead of guessing which row was meant.
    vi.mocked(touchPointService.getBySlugForOrg).mockRejectedValue(
      new BadRequestError('Nhiều liên kết dùng chung tên này', {
        key: 'common:messages.error.ambiguous_link_name',
      })
    )

    const response = await GET(createMockRequest({ slug: 'walk-3aw-live-0ffa2a94' }), {
      params: {},
    } as any)

    expect(response.status).toBe(400)
  })

  it('precedence: a slug-shaped row wins even though it could also match by name', async () => {
    // WHY: priority order is slug > short_code > name. The orchestration boundary this file tests
    // is the route/service call, not the repo's internal branching (that is unit-tested directly
    // in touch-point.repository.test.ts) — here we assert the resolved slug row's own `slug` flows
    // through untouched, proving the route never re-derives identity from the query param.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-slug-wins',
      name: '6LBCU', // hypothetically also a `name` match for the same identifier
      slug: '6LBCU',
      short_code: 'aaaaaa',
      content_type: 'URL',
      content_value: 'https://example.com/slug-wins',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.slug).toBe('6LBCU')
    expect(body.data.name).toBe('6LBCU')
  })

  it('blocks the read when the org lost AI_CHAT mid-token', async () => {
    // WHY (L8): the plan is re-gated on every call, mirroring create-short-link.
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(response.status).toBe(403)
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('projects the full LinkDetails shape for a URL link with UTM + password + expiry', async () => {
    // WHY: proof of the LOCKED cross-repo contract, byte-for-byte.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-1',
      name: 'Spring Sale',
      slug: '6LBCU',
      short_code: '6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/sale',
      utm_tags: {
        enabled: true,
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'spring',
        utm_term: 'sale',
        utm_content: 'banner',
      },
      access_control: { password: 'spring2027', expires_at: '2027-01-01T00:00:00.000Z' },
      short_url: 'https://example.com/6LBCU',
      path_qr_code: 'https://supa.example/qr-tp-1.svg',
      enabled: true,
    } as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
    expect(body.data).toEqual({
      slug: '6LBCU',
      name: 'Spring Sale',
      destination_url: 'https://example.com/sale',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'spring',
      utm_term: 'sale',
      utm_content: 'banner',
      has_password: true,
      expires_at: '2027-01-01T00:00:00.000Z',
      detail_url: `${appBaseUrl}/org/acme/short-links/tp-1`,
      // SL-0 §4 — the four optional additions. Always sent by this producer.
      id: 'tp-1',
      short_url: 'https://example.com/6LBCU',
      qr_url: 'https://supa.example/qr-tp-1.svg',
      enabled: true,
    })
    // NEVER the real password value anywhere in the response.
    expect(JSON.stringify(body)).not.toContain('spring2027')
    // The view gate runs with the resolved touch-point's real id — never leaked into the response.
    expect(touchPointService.ensureCanViewTouchPoint).toHaveBeenCalledWith(
      mockOrgId,
      'tp-1',
      mockUserId
    )
  })

  it('projects a minimal link with no UTM/password/expiry as nulls/false', async () => {
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-2',
      name: 'aaaaaa',
      slug: null,
      short_code: 'aaaaaa',
      short_url: 'https://example.com/aaaaaa',
      content_type: 'URL',
      content_value: 'https://example.com',
      utm_tags: null,
      access_control: null,
      // A link whose QR image was never rendered — `qr_url` is null, not absent.
      path_qr_code: null,
      enabled: false,
    } as any)

    const response = await GET(createMockRequest({ slug: 'aaaaaa' }), { params: {} } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
    expect(body.data).toEqual({
      slug: 'aaaaaa', // no custom slug on the row -> falls back to short_code, not null
      name: 'aaaaaa',
      destination_url: 'https://example.com',
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      has_password: false,
      expires_at: null,
      detail_url: `${appBaseUrl}/org/acme/short-links/tp-2`,
      id: 'tp-2',
      short_url: 'https://example.com/aaaaaa',
      qr_url: null,
      // ⭐ The field that could not be inferred before SL-0: this link is switched OFF, so every
      // scan sees a not-found page — and the old projection reported it identically to a live one.
      enabled: false,
    })
  })

  it('treats an empty-string password as no password (has_password: false)', async () => {
    // WHY: linkPasswordSchema allows '' (means "no password set") — must not report true for empty.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-3',
      name: 'aaaaaa',
      slug: 'aaaaaa',
      short_code: 'aaaaaa',
      content_type: 'URL',
      content_value: 'https://example.com',
      utm_tags: null,
      access_control: { password: '' },
    } as any)

    const response = await GET(createMockRequest({ slug: 'aaaaaa' }), { params: {} } as any)

    const body = await response.json()
    expect(body.data.has_password).toBe(false)
  })

  it('returns destination_url: null for a non-URL content_type', async () => {
    // WHY: destination_url is only populated when content_type === URL, per the locked contract.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-4',
      name: 'wifi-tp',
      slug: 'wifi-tp',
      short_code: 'wifi-tp',
      content_type: 'WIFI',
      content_value: 'some-wifi-payload',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: 'wifi-tp' }), { params: {} } as any)

    const body = await response.json()
    expect(body.data.destination_url).toBeNull()
  })

  it('builds detail_url with the org SLUG when org_slug is present', async () => {
    // WHY: the app's routing keys the org path segment by slug (a middleware maps slug -> org_id),
    // so detail_url must use org_slug when the org has one.
    vi.mocked(organizationService.getOrgById).mockResolvedValue({ org_slug: 'acme' } as any)
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-slug-org',
      name: 'Spring Sale',
      slug: '6LBCU',
      short_code: '6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/sale',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    expect(organizationService.getOrgById).toHaveBeenCalledWith(mockOrgId)
    const body = await response.json()
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
    expect(body.data.detail_url).toBe(`${appBaseUrl}/org/acme/short-links/tp-slug-org`)
  })

  it('falls back to the org id in detail_url when org_slug is null', async () => {
    // WHY: not every org has a custom slug — the route/middleware also accepts the raw org id
    // (organization.repository.ts updateByIdentifier branches the same way).
    vi.mocked(organizationService.getOrgById).mockResolvedValue({ org_slug: null } as any)
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-no-slug-org',
      name: 'Spring Sale',
      slug: '6LBCU',
      short_code: '6LBCU',
      content_type: 'URL',
      content_value: 'https://example.com/sale',
      utm_tags: null,
      access_control: null,
    } as any)

    const response = await GET(createMockRequest({ slug: '6LBCU' }), { params: {} } as any)

    const body = await response.json()
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
    expect(body.data.detail_url).toBe(`${appBaseUrl}/org/${mockOrgId}/short-links/tp-no-slug-org`)
  })

  it('returns 403 for a link in a collection the caller has NO_ACCESS to', async () => {
    // WHY: org scoping alone is not per-member view scoping — a link inside a collection the
    // caller cannot see must never be readable by slug, even with a valid AI_CHAT token.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-locked-collection',
      name: 'Locked Space Link',
      slug: 'locked',
      short_code: 'locked',
      content_type: 'URL',
      content_value: 'https://example.com/locked',
      utm_tags: null,
      access_control: null,
    } as any)
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockRejectedValue(new ForbiddenError())

    const response = await GET(createMockRequest({ slug: 'locked' }), { params: {} } as any)

    expect(touchPointService.ensureCanViewTouchPoint).toHaveBeenCalledWith(
      mockOrgId,
      'tp-locked-collection',
      mockUserId
    )
    expect(response.status).toBe(403)
  })

  it('returns 403 for a non-owner OWN-scope uncategorized link', async () => {
    // WHY: an uncategorized link created by a different member must 403 when the caller's role
    // scope is OWN (Editor/"Member") — matches ensureCanViewTouchPoint's own-scope branch.
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue({
      id: 'tp-other-owner',
      name: "Someone Else's Link",
      slug: 'not-mine',
      short_code: 'not-mine',
      content_type: 'URL',
      content_value: 'https://example.com/not-mine',
      utm_tags: null,
      access_control: null,
    } as any)
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockRejectedValue(new ForbiddenError())

    const response = await GET(createMockRequest({ slug: 'not-mine' }), { params: {} } as any)

    expect(response.status).toBe(403)
  })
})
