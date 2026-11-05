/**
 * GET /api/agent/tools/list-artifacts — back-hop target of MCP `list_artifacts` (wave 4 WP1 §3).
 *
 * The interesting half is `next_cursor`: it is derived from the TRUE row count, not from "the page
 * came back full", and a cursor that lies costs a model one wasted call per exact multiple of
 * `limit` — plus a report that says "there are more" when there are none.
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

vi.mock('../../../core/services/artifact.service', () => ({
  artifactService: { listForOrg: vi.fn() },
}))

import { GET } from '../../../app/api/agent/tools/list-artifacts/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { getPermissionScopeOrThrow } from '../../../shared/lib/permission/permissions'
import { artifactService } from '../../../core/services/artifact.service'
import { decodeArtifactCursor, encodeArtifactCursor } from '../../../core/helpers/artifact-cursor'
import { PermissionError, PlanError } from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'

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
  const url = new URL('http://localhost:3000/api/agent/tools/list-artifacts')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as unknown as Parameters<typeof GET>[0]
}

const call = (request: Parameters<typeof GET>[0]) => GET(request, { params: {} } as never)

const dto = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  organization_id: ORG,
  user_id: USER,
  name: `Artifact ${id}`,
  kind: 'html',
  status: 'live',
  serve_token: `tok-${id}`,
  content_type: 'text/html',
  size_bytes: 27,
  created_at: '2026-10-05T00:00:00.000Z',
  updated_at: '2026-10-07T09:00:00.000Z',
  touch_point_id: `tp-${id}`,
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 5,
  serve_url: `https://example.com/khanhqns/${id}`,
  preview_url: `https://app.li2.ai/a/tok-${id}`,
  download_url: `https://app.li2.ai/a/tok-${id}/download`,
  short_url: `https://s.li2.ai/${id}`,
  path_qr_code: `https://supa.example/qr-${id}.svg`,
  ...overrides,
})

const page = (ids: string[], rowCount: number) => ({ data: ids.map((id) => dto(id)), rowCount })

describe('GET /api/agent/tools/list-artifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(getPermissionScopeOrThrow).mockResolvedValue('ALL' as never)
    vi.mocked(artifactService.listForOrg).mockResolvedValue(page(['a', 'b'], 2) as never)
  })

  it('gates on the surface plan and on VIEW_TOUCH_POINTS before listing anything', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    expect((await call(createMockRequest())).status).toBe(403)

    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(getPermissionScopeOrThrow).mockRejectedValue(new PermissionError())
    expect((await call(createMockRequest())).status).toBe(403)

    expect(artifactService.listForOrg).not.toHaveBeenCalled()
  })

  it('defaults to page 1 / limit 20 with the org from the token', async () => {
    const res = await call(createMockRequest())
    expect(res.status).toBe(200)
    expect(artifactService.listForOrg).toHaveBeenCalledWith(ORG, { page: 1, limit: 20 })
  })

  it('projects the shared block for every item — no visits, no internals', async () => {
    const body = await (await call(createMockRequest())).json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('list_artifacts', body.data)
    expect(body.data.items).toHaveLength(2)
    expect(Object.keys(body.data.items[0]).sort()).toEqual([
      'access_mode',
      'artifact_id',
      'name',
      'qr_url',
      'serve_url',
      'short_url',
      'size_bytes',
      'status',
      'updated_at',
    ])
    // A list page does not pay for a visit count per card (the service returns 0 there anyway), and
    // a `visits: 0` on every row would be a number a model would happily report as fact.
    expect(body.data.items[0].visits).toBeUndefined()
    expect(JSON.stringify(body.data)).not.toContain('serve_token')
  })

  it('a draft in the list carries null short_url instead of failing the whole page', async () => {
    // The wave-3 guard threw a 500 on a null `short_url`, which would have made ONE draft break the
    // listing of every other artifact in the org.
    vi.mocked(artifactService.listForOrg).mockResolvedValue({
      data: [
        dto('a'),
        dto('b', { status: 'draft', touch_point_id: null, short_url: null, path_qr_code: null }),
      ],
      rowCount: 2,
    } as never)

    const res = await call(createMockRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.items[1]).toMatchObject({ status: 'draft', short_url: null, qr_url: null })
  })

  it('⭐ next_cursor is null on the last page, even when it came back FULL', async () => {
    // The exact-multiple case: 2 rows, limit 2. Guessing from "the page is full" would hand back a
    // cursor to an empty page — and a model that sees a cursor calls it.
    vi.mocked(artifactService.listForOrg).mockResolvedValue(page(['a', 'b'], 2) as never)
    const body = await (await call(createMockRequest({ limit: '2' }))).json()
    expect(body.data.next_cursor).toBeNull()
  })

  it('⭐ hands back a cursor that decodes to the NEXT page, and round-trips', async () => {
    vi.mocked(artifactService.listForOrg).mockResolvedValue(page(['a', 'b'], 5) as never)
    const body = await (await call(createMockRequest({ limit: '2' }))).json()

    expect(body.data.next_cursor).toBe(encodeArtifactCursor(2))
    expect(decodeArtifactCursor(body.data.next_cursor)).toBe(2)
    // Opaque to the caller: the page number is not readable without decoding.
    expect(body.data.next_cursor).not.toContain('2')
  })

  it('follows a cursor to the page it names, and stops at the end', async () => {
    vi.mocked(artifactService.listForOrg).mockResolvedValue(page(['e'], 5) as never)
    const body = await (
      await call(createMockRequest({ cursor: encodeArtifactCursor(3), limit: '2' }))
    ).json()

    expect(artifactService.listForOrg).toHaveBeenCalledWith(ORG, { page: 3, limit: 2 })
    // 3 * 2 = 6 ≥ 5 → nothing after this.
    expect(body.data.next_cursor).toBeNull()
  })

  it('an empty org answers 200 with no items and no cursor', async () => {
    vi.mocked(artifactService.listForOrg).mockResolvedValue(page([], 0) as never)
    const body = await (await call(createMockRequest())).json()
    expect(body.data).toEqual({ items: [], next_cursor: null })
  })

  it('an unreadable cursor means page 1 rather than a 400', async () => {
    // The only caller that can produce one is a model that truncated a string it was told was
    // opaque; a 400 there teaches it nothing it can act on.
    await call(createMockRequest({ cursor: 'not-base64url-json' }))
    expect(artifactService.listForOrg).toHaveBeenCalledWith(ORG, { page: 1, limit: 20 })
  })

  it('refuses a limit over 50, a non-numeric limit, and a leftover org_id', async () => {
    const queries: Record<string, string>[] = [
      { limit: '51' },
      { limit: 'twenty' },
      // `.strict()`: the MCP layer must have stripped `org_id`, and `page` is not the contract —
      // pagination is the opaque cursor, so a model guessing `page` gets told rather than obeyed.
      { org_id: ORG },
      { page: '2' },
    ]
    for (const query of queries) {
      expect((await call(createMockRequest(query))).status, JSON.stringify(query)).toBe(400)
    }
    expect(artifactService.listForOrg).not.toHaveBeenCalled()
  })

  it('accepts a limit that arrived as a string — the hop is a GET query', async () => {
    await call(createMockRequest({ limit: '50' }))
    expect(artifactService.listForOrg).toHaveBeenCalledWith(ORG, { page: 1, limit: 50 })
  })
})
