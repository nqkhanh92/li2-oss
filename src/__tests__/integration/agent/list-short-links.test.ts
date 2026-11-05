/**
 * GET /api/agent/tools/list-short-links — back-hop target of MCP `list_short_links` (SL-1).
 *
 * ⭐ THE TEST THAT MATTERS MOST ASSERTS AN ARGUMENT, NOT AN OUTPUT: `applyCollectionPermissions`
 * must be `true`. `getAllTouchPoints` defaults it to FALSE (measured, checklist S9), so forgetting
 * it would make this tool list links the very same member cannot see in the dashboard — a widening
 * of what an org member may read, on the surface where a third-party agent is the reader, with no
 * visible symptom in any response body.
 *
 * The second half is `next_cursor`, derived from the TRUE row count rather than from "the page came
 * back full" — a cursor that lies costs a model one wasted call per exact multiple of `limit`, plus
 * a report that says "there are more" when there are none.
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
  getPermissionScopeOrThrow: vi.fn(),
}))

vi.mock('../../../core/services/touch-point.service', () => ({
  touchPointService: { getAllTouchPoints: vi.fn() },
}))

import { GET } from '../../../app/api/agent/tools/list-short-links/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { getPermissionScopeOrThrow } from '../../../shared/lib/permission/permissions'
import { touchPointService } from '../../../core/services/touch-point.service'
import { decodeArtifactCursor, encodeArtifactCursor } from '../../../core/helpers/artifact-cursor'
import { PermissionError, PlanError } from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const COLLECTION = 'cccccccc-3333-4333-8333-cccccccccccc'
const TAG = 'dddddddd-4444-4444-8444-dddddddddddd'

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
  const url = new URL('http://localhost:3000/api/agent/tools/list-short-links')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as unknown as Parameters<typeof GET>[0]
}

const call = (request: Parameters<typeof GET>[0]) => GET(request, { params: {} } as never)

/** A `touch_points` row as `findAllByOrganization` returns it: everything, plus the tag join. */
const tpRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  organization_id: ORG,
  user_id: USER,
  name: `Link ${id}`,
  slug: `slug-${id}`,
  short_code: `C${id}`,
  short_url: `https://example.com/slug-${id}`,
  content_type: 'URL',
  content_value: `https://example.com/${id}`,
  path_qr_code: `https://supa.example/qr-${id}.svg`,
  enabled: true,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-18T09:00:00.000Z',
  access_control: null,
  // The columns a projection must not pass through.
  targeting: { rules: ['vn'] },
  privacy_security: { x: true },
  safety_status: null,
  tp_tag_links: [{ tag_id: TAG, tags: { id: TAG, name: 'Tết', color: '#f00' } }],
  visits: [{ count: 987654 }],
  ...overrides,
})

const page = (ids: string[], count: number) => ({ data: ids.map((id) => tpRow(id)), count })

/** The options object `getAllTouchPoints` was called with. */
const lastOptions = () =>
  vi.mocked(touchPointService.getAllTouchPoints).mock.calls[0][1] as Record<string, any>

describe('GET /api/agent/tools/list-short-links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(getPermissionScopeOrThrow).mockResolvedValue('ALL' as never)
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue(page(['a', 'b'], 2) as never)
  })

  it('gates on the surface plan and on VIEW_TOUCH_POINTS before listing anything', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    expect((await call(createMockRequest())).status).toBe(403)

    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(getPermissionScopeOrThrow).mockRejectedValue(new PermissionError())
    expect((await call(createMockRequest())).status).toBe(403)

    expect(touchPointService.getAllTouchPoints).not.toHaveBeenCalled()
  })

  it('⭐ passes applyCollectionPermissions: true — NOT the service default of false', async () => {
    // See the file header. This is the whole reason the test asserts arguments.
    await call(createMockRequest())

    expect(touchPointService.getAllTouchPoints).toHaveBeenCalledWith(ORG, expect.anything())
    expect(lastOptions().applyCollectionPermissions).toBe(true)
    // The uncategorized fallback the collection filter cannot scope on its own.
    expect(lastOptions().scope).toBe('ALL')
    expect(lastOptions().userId).toBe(USER)
  })

  it('⭐ filters to content_type URL, so artifacts never appear in a short-link listing', async () => {
    // Artifacts publish themselves AS touch points. Without this filter the tool would hand a model
    // artifact ids that every short-link tool then refuses.
    await call(createMockRequest())
    expect(lastOptions().queryParams.filters.content_type).toBe('URL')
  })

  it('defaults to page 1 / limit 20, newest first', async () => {
    await call(createMockRequest())
    expect(lastOptions().queryParams.pagination).toEqual({ pageIndex: 0, pageSize: 20 })
    // Stated rather than left to Postgres: an unordered result makes the cursor's pages meaningless.
    expect(lastOptions().queryParams.sorting).toEqual([{ id: 'created_at', desc: true }])
  })

  it('passes search, collection_id and tag_ids through when present', async () => {
    await call(createMockRequest({ search: 'bảng giá', collection_id: COLLECTION, tag_ids: TAG }))
    const params = lastOptions().queryParams
    expect(params.search).toBe('bảng giá')
    expect(params.filters.collection_id).toBe(COLLECTION)
    expect(params.filters.tag_ids).toEqual([TAG])
  })

  it('⛔ omits an absent filter entirely, rather than sending an empty value', async () => {
    // `queryBuilderByParams` applies whatever is in `filters`, so an `undefined`/`''` entry would
    // become a real `.match()` condition and silently return nothing.
    await call(createMockRequest())
    expect(Object.keys(lastOptions().queryParams.filters)).toEqual(['content_type'])
    expect(lastOptions().queryParams.search).toBeUndefined()
  })

  it('⭐ reads tag_ids as a REPEATED query key, not just the last value', async () => {
    // `tag_ids[]=a&tag_ids[]=b` is how an array arrives. `Object.fromEntries` would silently keep
    // only `b` and filter by one tag when the caller asked for two.
    const TAG_2 = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee'
    const url = new URL('http://localhost:3000/api/agent/tools/list-short-links')
    url.searchParams.append('tag_ids[]', TAG)
    url.searchParams.append('tag_ids[]', TAG_2)
    await call({
      method: 'GET',
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: url,
    } as unknown as Parameters<typeof GET>[0])

    expect(lastOptions().queryParams.filters.tag_ids).toEqual([TAG, TAG_2])
  })

  it('⛔ projects ShortLink only — no password, no internals, no visits count', async () => {
    const body = await (await call(createMockRequest())).json()

    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('list_short_links', body.data)
    expect(body.data.items).toHaveLength(2)
    expect(Object.keys(body.data.items[0]).sort()).toEqual([
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
    expect(body.data.items[0].tags).toEqual(['Tết'])

    const serialized = JSON.stringify(body.data)
    for (const forbidden of [
      'targeting',
      'privacy_security',
      'user_id',
      'organization_id',
      '987654',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it('a switched-off link is listed, with enabled: false', async () => {
    // It still exists and still costs the org a touch point; hiding it would have an agent report
    // that a link the user can see in the dashboard is gone.
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue({
      data: [tpRow('a'), tpRow('b', { enabled: false, path_qr_code: null, slug: null })],
      count: 2,
    } as never)

    const body = await (await call(createMockRequest())).json()
    expect(body.data.items[1]).toMatchObject({ enabled: false, qr_url: null, slug: null })
  })

  it('⭐ next_cursor is null on the last page, even when it came back FULL', async () => {
    // The exact-multiple case: 2 rows, limit 2. Guessing from "the page is full" would hand back a
    // cursor to an empty page — and a model that sees a cursor calls it.
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue(page(['a', 'b'], 2) as never)
    const body = await (await call(createMockRequest({ limit: '2' }))).json()
    expect(body.data.next_cursor).toBeNull()
  })

  it('⭐ hands back a cursor that decodes to the NEXT page, and round-trips', async () => {
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue(page(['a', 'b'], 5) as never)
    const body = await (await call(createMockRequest({ limit: '2' }))).json()

    expect(body.data.next_cursor).toBe(encodeArtifactCursor(2))
    expect(decodeArtifactCursor(body.data.next_cursor)).toBe(2)
    // Opaque to the caller: the page number is not readable without decoding.
    expect(body.data.next_cursor).not.toContain('2')
  })

  it('follows a cursor to the page it names, and stops at the end', async () => {
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue(page(['e'], 5) as never)
    const body = await (
      await call(createMockRequest({ cursor: encodeArtifactCursor(3), limit: '2' }))
    ).json()

    expect(lastOptions().queryParams.pagination).toEqual({ pageIndex: 2, pageSize: 2 })
    // 3 * 2 = 6 ≥ 5 → nothing after this.
    expect(body.data.next_cursor).toBeNull()
  })

  it('an empty org answers 200 with no items and no cursor', async () => {
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue(page([], 0) as never)
    const body = await (await call(createMockRequest())).json()
    expect(body.data).toEqual({ items: [], next_cursor: null })
  })

  it('a null count and a null data list answer 200, not a 500', async () => {
    // PostgREST can answer `count: null`; treating that as `NaN` would make `next_cursor` garbage.
    vi.mocked(touchPointService.getAllTouchPoints).mockResolvedValue({
      data: null,
      count: null,
    } as never)
    const response = await call(createMockRequest())
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual({ items: [], next_cursor: null })
  })

  it('an unreadable cursor means page 1 rather than a 400', async () => {
    await call(createMockRequest({ cursor: 'not-base64url-json' }))
    expect(lastOptions().queryParams.pagination).toEqual({ pageIndex: 0, pageSize: 20 })
  })

  it('refuses a limit over 50, a non-numeric limit, and a leftover org_id', async () => {
    const queries: Record<string, string>[] = [
      { limit: '51' },
      { limit: 'many' },
      { org_id: ORG },
      { page: '2' },
    ]
    for (const query of queries) {
      const response = await call(createMockRequest(query))
      expect(response.status).toBe(400)
    }
    expect(touchPointService.getAllTouchPoints).not.toHaveBeenCalled()
  })

  it('a write-only grant never reaches this read tool', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write'], 'mcp') as never)
    expect((await call(createMockRequest())).status).toBe(403)
    expect(touchPointService.getAllTouchPoints).not.toHaveBeenCalled()
  })
})
