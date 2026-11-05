/**
 * GET /api/agent/tools/get-short-link — back-hop target of MCP `get_short_link` (SL-1).
 *
 * Three things are pinned, and all three are ORDER or IDENTITY rather than output shape:
 *
 *  1. READ → GATE → ARTIFACT CHECK. Reading first is what keeps a wrong id answerable as a 404:
 *     `canViewTouchPoint` returns false for a row that is not there, so gating first would report
 *     "you do not have permission" for a link that simply does not exist (measured on the human
 *     route, checklist R3). The artifact check comes LAST because its refusal names the row's kind,
 *     which is more than a member who may not see the row is entitled to learn.
 *  2. An ARTIFACT's touch point is refused with its OWN i18n key, so the refusal can point at
 *     `get_artifact` instead of sending a model to re-check an id that was correct.
 *  3. The slug path falls back to the `slugs` table, which is the only thing that can resolve an
 *     ending a link NO LONGER uses — i.e. the one printed on a flyer.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('../../../shared/lib/agent/paseto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/lib/agent/paseto')>()),
  verifyAgentToken: vi.fn(),
}))

vi.mock('../../../shared/lib/plan/plans', () => ({
  ensureOrgPlan: vi.fn(),
}))

vi.mock('../../../shared/lib/permission/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/lib/permission/permissions')>()),
  ensureOrgMember: vi.fn(),
}))

vi.mock('../../../core/services/touch-point.service', () => ({
  touchPointService: {
    getByIdForOrg: vi.fn(),
    getBySlugForOrg: vi.fn(),
    ensureCanViewTouchPoint: vi.fn(),
  },
}))

vi.mock('../../../core/services/slug.service', () => ({
  slugService: { findTpIdBySlug: vi.fn() },
}))

import { GET } from '../../../app/api/agent/tools/get-short-link/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { slugService } from '../../../core/services/slug.service'
import {
  BadRequestError,
  ForbiddenError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const TP_ID = '22222222-2222-4222-8222-222222222222'

const makeClaims = (scopes: string[], surface?: 'mcp' | 'chat') => ({
  org_id: ORG,
  user_id: USER,
  email: 'agent@example.com',
  plan: 'pro',
  scopes,
  ai_budget: 0,
  iss: 'li2-app',
  aud: 'li2-ai',
  ...(surface ? { surface } : {}),
})

const createMockRequest = (query: Record<string, string> = {}) => {
  const url = new URL('http://localhost:3000/api/agent/tools/get-short-link')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as unknown as Parameters<typeof GET>[0]
}

const call = (request: Parameters<typeof GET>[0]) => GET(request, { params: {} } as never)

/** A `LinkDetailsRow` as the single-row lookups return it: no tag join. */
const row = (overrides: Record<string, unknown> = {}) => ({
  id: TP_ID,
  name: 'Bảng giá tháng 10',
  slug: 'bang-gia-t10',
  short_code: '6LAA3',
  short_url: 'https://example.com/bang-gia-t10',
  content_type: 'URL',
  content_value: 'https://example.com/pricing',
  utm_tags: null,
  access_control: null,
  path_qr_code: 'https://supa.example/qr-tp.svg',
  enabled: true,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-18T09:00:00.000Z',
  ...overrides,
})

describe('GET /api/agent/tools/get-short-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(row() as never)
    vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(row() as never)
  })

  it('gates on the surface plan before reading anything', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    expect((await call(createMockRequest({ id: TP_ID }))).status).toBe(403)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
  })

  it('a write-only grant never reaches this read tool', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write'], 'mcp') as never)
    expect((await call(createMockRequest({ id: TP_ID }))).status).toBe(403)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
  })

  it('resolves by id with the org from the token, and never calls the slug resolver', async () => {
    const response = await call(createMockRequest({ id: TP_ID }))

    expect(response.status).toBe(200)
    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(ORG, TP_ID)
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
    expect(slugService.findTpIdBySlug).not.toHaveBeenCalled()
  })

  it('projects ShortLink and never the password', async () => {
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
      row({
        access_control: { password: 'scrypt$hash', expires_at: '2027-01-01T00:00:00.000Z' },
      }) as never
    )
    const body = await (await call(createMockRequest({ id: TP_ID }))).json()

    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('get_short_link', body.data)
    expect(Object.keys(body.data).sort()).toEqual([
      'created_at',
      'destination_url',
      'enabled',
      'expires_at',
      'has_password',
      'id',
      'name',
      'qr_url',
      'short_code',
      'short_url',
      'slug',
      'tags',
      'updated_at',
    ])
    expect(body.data.has_password).toBe(true)
    expect(body.data.expires_at).toBe('2027-01-01T00:00:00.000Z')
    expect(JSON.stringify(body)).not.toContain('scrypt')
    // A single-row read has no tag join, so `[]` is the honest answer rather than a missing field.
    expect(body.data.tags).toEqual([])
  })

  it('⭐ answers 404 for an unknown id — NOT a 403 and never a 500', async () => {
    // The gate collapses "no such row" into "no permission" (`canViewTouchPoint` returns false for a
    // null row). Reading first is what keeps a wrong id answerable as a wrong id.
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)

    const response = await call(createMockRequest({ id: TP_ID }))
    expect(response.status).toBe(404)
    expect(touchPointService.ensureCanViewTouchPoint).not.toHaveBeenCalled()
  })

  it('⭐ runs the per-member view gate with the resolved id, and 403s when it refuses', async () => {
    vi.mocked(touchPointService.ensureCanViewTouchPoint).mockRejectedValue(new ForbiddenError())

    const response = await call(createMockRequest({ id: TP_ID }))
    expect(response.status).toBe(403)
    expect(touchPointService.ensureCanViewTouchPoint).toHaveBeenCalledWith(ORG, TP_ID, USER)
  })

  describe('the ARTIFACT guard', () => {
    it('⭐ refuses an artifact touch point with 404 and its own i18n key', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )

      const response = await call(createMockRequest({ id: TP_ID }))
      const body = await response.json()

      expect(response.status).toBe(404)
      // The key is what lets the MCP refusal say "use get_artifact" instead of "check the id".
      expect(body.i18nMessage.key).toBe('agent:short_link.is_artifact')
      // ⛔ And NOTHING about the artifact crosses: no destination, no short_url, no name.
      expect(JSON.stringify(body)).not.toContain('bang-gia-t10')
      expect(JSON.stringify(body)).not.toContain('example.com')
    })

    it('⭐ runs AFTER the view gate, so the row kind is not leaked to a member who may not see it', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )
      vi.mocked(touchPointService.ensureCanViewTouchPoint).mockRejectedValue(new ForbiddenError())

      const body = await (await call(createMockRequest({ id: TP_ID }))).json()
      // 403, not the artifact 404 — the caller learns nothing about what kind of row this is.
      expect(body.i18nMessage.key).not.toBe('agent:short_link.is_artifact')
    })

    it('also applies on the slug path', async () => {
      vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )
      const response = await call(createMockRequest({ slug: 'bang-gia-t10' }))
      expect(response.status).toBe(404)
      expect((await response.json()).i18nMessage.key).toBe('agent:short_link.is_artifact')
    })
  })

  describe('the slug path', () => {
    it('resolves the CURRENT slug / short_code / name off touch_points first', async () => {
      const response = await call(createMockRequest({ slug: '6LAA3' }))

      expect(response.status).toBe(200)
      expect(touchPointService.getBySlugForOrg).toHaveBeenCalledWith(ORG, '6LAA3')
      // The `slugs` table is only consulted on a miss — one query, not two, for the common case.
      expect(slugService.findTpIdBySlug).not.toHaveBeenCalled()
    })

    it('⭐ falls back to the slugs table, so an ending the link NO LONGER uses still resolves', async () => {
      // This is the case the whole fallback exists for: `updateTpSlug` inserts into `slugs` and never
      // deletes the old row (checklist S4), which is why a printed QR keeps working — and
      // `touch_points.slug` holds only the current ending, so it cannot answer.
      vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(null as never)
      vi.mocked(slugService.findTpIdBySlug).mockResolvedValue(TP_ID as never)

      const response = await call(createMockRequest({ slug: 'bang-gia-cu' }))

      expect(response.status).toBe(200)
      expect(slugService.findTpIdBySlug).toHaveBeenCalledWith('bang-gia-cu')
      // The id goes through the SAME org-scoped read — which is what refuses another org's link,
      // since the `slugs` lookup is deliberately not org-filtered.
      expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(ORG, TP_ID)
      // …and the same gate.
      expect(touchPointService.ensureCanViewTouchPoint).toHaveBeenCalledWith(ORG, TP_ID, USER)
    })

    it('⭐ a slug belonging to ANOTHER org is a 404, not a leak', async () => {
      // `findTpIdBySlug` is global (the unique index is), so it happily returns a foreign tp_id. The
      // org-scoped read is the gate, and its miss is indistinguishable from "no such slug".
      vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(null as never)
      vi.mocked(slugService.findTpIdBySlug).mockResolvedValue(
        'ffffffff-6666-4666-8666-ffffffffffff' as never
      )
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)

      const response = await call(createMockRequest({ slug: 'someone-elses' }))
      expect(response.status).toBe(404)
      expect(touchPointService.ensureCanViewTouchPoint).not.toHaveBeenCalled()
    })

    it('a slug that resolves nowhere is a 404', async () => {
      vi.mocked(touchPointService.getBySlugForOrg).mockResolvedValue(null as never)
      vi.mocked(slugService.findTpIdBySlug).mockResolvedValue(null as never)

      expect((await call(createMockRequest({ slug: 'nope' }))).status).toBe(404)
    })

    it('⭐ an AMBIGUOUS name surfaces as 400, not as a guess', async () => {
      // `getBySlugForOrg` resolves by name as a last resort and refuses to pick when several links
      // share one. The 400 reaches the model as "retry with the id", which is the only fix.
      vi.mocked(touchPointService.getBySlugForOrg).mockRejectedValue(
        new BadRequestError('ambiguous', { key: 'common:messages.error.ambiguous_link_name' })
      )

      const response = await call(createMockRequest({ slug: 'Bảng giá' }))
      expect(response.status).toBe(400)
      expect((await response.json()).i18nMessage.key).toBe(
        'common:messages.error.ambiguous_link_name'
      )
      expect(slugService.findTpIdBySlug).not.toHaveBeenCalled()
    })
  })

  it('refuses neither key, both keys, a bad uuid and a leftover org_id with a 400', async () => {
    const queries: Record<string, string>[] = [
      {},
      { id: TP_ID, slug: 'bang-gia-t10' },
      { id: 'not-a-uuid' },
      { slug: '' },
      { org_id: ORG, id: TP_ID },
    ]
    for (const query of queries) {
      expect((await call(createMockRequest(query))).status).toBe(400)
    }
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
    expect(touchPointService.getBySlugForOrg).not.toHaveBeenCalled()
  })
})
