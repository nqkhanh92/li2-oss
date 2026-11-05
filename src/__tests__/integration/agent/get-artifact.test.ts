/**
 * GET /api/agent/tools/get-artifact — back-hop target of MCP `get_artifact` (wave 4 WP1 §2).
 *
 * "Integration" in the sense of the sibling tests: the real `withAgentAuth` runs (scope gate, surface
 * resolution), only token verification, the plan gate, membership, the permission scope and the
 * artifact SERVICE are mocked. Nothing here touches a database.
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
  artifactService: { getForOrg: vi.fn(), getBySlugForOrg: vi.fn() },
}))

import { GET } from '../../../app/api/agent/tools/get-artifact/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { getPermissionScopeOrThrow } from '../../../shared/lib/permission/permissions'
import { artifactService } from '../../../core/services/artifact.service'
import {
  NotFoundError,
  PermissionError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

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
  const url = new URL('http://localhost:3000/api/agent/tools/get-artifact')
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: url,
  } as unknown as Parameters<typeof GET>[0]
}

const call = (request: Parameters<typeof GET>[0]) => GET(request, { params: {} } as never)

const liveDto = () => ({
  id: ARTIFACT_ID,
  organization_id: ORG,
  user_id: USER,
  name: 'Bảng giá T10',
  kind: 'html',
  status: 'live',
  serve_token: 'tok',
  content_type: 'text/html',
  size_bytes: 27,
  created_at: '2026-10-05T00:00:00.000Z',
  updated_at: '2026-10-07T09:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 128,
  serve_url: 'https://example.com/khanhqns/bang-gia-t10',
  preview_url: 'https://app.li2.ai/a/tok',
  download_url: 'https://app.li2.ai/a/tok/download',
  short_url: 'https://s.li2.ai/bang-gia',
  path_qr_code: 'https://supa.example/storage/v1/object/public/qr.svg',
})

describe('GET /api/agent/tools/get-artifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(getPermissionScopeOrThrow).mockResolvedValue('ALL' as never)
    vi.mocked(artifactService.getForOrg).mockResolvedValue(liveDto() as never)
    vi.mocked(artifactService.getBySlugForOrg).mockResolvedValue(liveDto() as never)
  })

  it('gates on the caller surface BEFORE anything else', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(403)
    expect(artifactService.getForOrg).not.toHaveBeenCalled()
  })

  it('⭐ re-checks VIEW_TOUCH_POINTS — the service has no gate of its own', async () => {
    // Without this an org member whose role cannot see touch points would read artifacts through MCP
    // that the dashboard hides from them. The human-facing route checks the same key.
    vi.mocked(getPermissionScopeOrThrow).mockRejectedValue(new PermissionError())
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(403)
    expect(artifactService.getForOrg).not.toHaveBeenCalled()
  })

  it('reads by id with the org from the TOKEN, never from the query', async () => {
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(200)
    expect(artifactService.getForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    expect(artifactService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('reads by slug through the slug resolver', async () => {
    const res = await call(createMockRequest({ slug: 'bang-gia-t10' }))
    expect(res.status).toBe(200)
    expect(artifactService.getBySlugForOrg).toHaveBeenCalledWith(ORG, 'bang-gia-t10')
    expect(artifactService.getForOrg).not.toHaveBeenCalled()
  })

  it('⭐ neither key → 400; BOTH keys → 400, and neither service call is made', async () => {
    // The `.refine` JSON Schema could not carry. "Both" must fail as loudly as "neither": silently
    // preferring the id would make `slug` a no-op the model never learns about.
    let res = await call(createMockRequest({}))
    expect(res.status).toBe(400)

    res = await call(createMockRequest({ artifact_id: ARTIFACT_ID, slug: 'bang-gia-t10' }))
    expect(res.status).toBe(400)

    expect(artifactService.getForOrg).not.toHaveBeenCalled()
    expect(artifactService.getBySlugForOrg).not.toHaveBeenCalled()
  })

  it('a non-uuid artifact_id → 400, so no 22P02 ever reaches Postgres', async () => {
    const res = await call(createMockRequest({ artifact_id: 'bang-gia' }))
    expect(res.status).toBe(400)
    expect(artifactService.getForOrg).not.toHaveBeenCalled()
  })

  it('a leftover org_id → 400 — the strip is what this proves', async () => {
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID, org_id: ORG }))
    expect(res.status).toBe(400)
  })

  it('projects the shared block plus visits and viewer_count, and nothing internal', async () => {
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    const body = await res.json()

    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('get_artifact', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'live',
      name: 'Bảng giá T10',
      access_mode: 'public',
      short_url: 'https://s.li2.ai/bang-gia',
      serve_url: 'https://example.com/khanhqns/bang-gia-t10',
      qr_url: 'https://supa.example/storage/v1/object/public/qr.svg',
      size_bytes: 27,
      updated_at: '2026-10-07T09:00:00.000Z',
      visits: 128,
      viewer_count: null,
    })
    // ⛔ `serve_token` is what `/a/<token>` is keyed on — handing it out is handing out the private
    // preview address of a page whose access mode may be `password`.
    const serialized = JSON.stringify(body.data)
    expect(serialized).not.toContain('serve_token')
    expect(serialized).not.toContain('tok')
    expect(serialized).not.toContain('password')
  })

  it('a draft answers 200 with null short_url / qr_url, not a 500', async () => {
    // The wave-3 guard threw a 500 here. A draft the user can see in their own dashboard is not our
    // bug, and the contract declares both fields nullable.
    vi.mocked(artifactService.getForOrg).mockResolvedValue({
      ...liveDto(),
      status: 'draft',
      touch_point_id: null,
      short_url: null,
      path_qr_code: null,
      visits: 0,
    } as never)

    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({ status: 'draft', short_url: null, qr_url: null, visits: 0 })
  })

  it('surfaces a 404 from the service with its i18n key, so the mapper can word it', async () => {
    vi.mocked(artifactService.getForOrg).mockRejectedValue(
      new NotFoundError('Artifact not found', {
        key: 'common:messages.error.not_found',
        params: { field: '$t(label.artifact)' },
      })
    )
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(404)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.not_found')
  })
})
