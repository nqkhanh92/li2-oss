/**
 * POST /api/agent/tools/update-short-link — back-hop target of MCP `update_short_link` (SL-2 §1).
 *
 * What is pinned here is ORDER and IDENTITY, not output shape — the projection has its own test:
 *
 *  1. READ → EDIT GATE → ARTIFACT CHECK. Reading first keeps a wrong id answerable as a 404, because
 *     `canEditTouchPoint` returns false for a row that is not there. The artifact check comes LAST
 *     because its refusal names the row's KIND, which is more than a member who may not touch the
 *     row is entitled to learn — the same decision, and the same test, as `get_short_link`.
 *  2. An ARTIFACT is refused with its own i18n key, so the refusal can name the artifact tools
 *     instead of sending a model to re-check an id that was correct. `artifacts.touch_point_id` is
 *     `ON DELETE SET NULL` and nothing in `touch_points` knows it is serving a hosted page, so
 *     without this guard an agent could redirect or switch off a published artifact with no artifact
 *     tool reporting any of it (checklist §Kết luận 2).
 *  3. The patch handed to the service, and the `changed` list handed back — the one answer that
 *     distinguishes "done" from "already was".
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
    ensureCanEditTouchPoint: vi.fn(),
    updateAndReturn: vi.fn(),
  },
}))

vi.mock('../../../core/helpers/agent-audit', () => ({
  recordShortLinkAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/update-short-link/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { recordShortLinkAudit } from '../../../core/helpers/agent-audit'
import { ForbiddenError, PlanError } from '../../../infrastructure/response/errors/domain.errors'
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
  client_id: 'cli_test',
  ...(surface ? { surface } : {}),
})

const createMockRequest = (body?: unknown) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/update-short-link'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

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

describe('POST /api/agent/tools/update-short-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.ensureCanEditTouchPoint).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(row() as never)
    vi.mocked(touchPointService.updateAndReturn).mockResolvedValue(row() as never)
  })

  it('gates on the surface plan before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest({ id: TP_ID, enabled: false })

    expect((await call(request)).status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
  })

  it('a read-only grant never reaches this write tool', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    expect((await call(createMockRequest({ id: TP_ID, enabled: false }))).status).toBe(403)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
  })

  describe('the schema is the only validation on this path', () => {
    it('⭐ refuses a patch with nothing to change, and writes nothing', async () => {
      const response = await call(createMockRequest({ id: TP_ID }))
      expect(response.status).toBe(400)
      expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })

    it('refuses a body that is not an object, and a leftover org_id', async () => {
      expect((await call(createMockRequest(null))).status).toBe(400)
      expect(
        (await call(createMockRequest({ id: TP_ID, org_id: ORG, enabled: true }))).status
      ).toBe(400)
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })
  })

  describe('read → gate → artifact, in that order', () => {
    it('reads the row org-scoped, with the org from the TOKEN', async () => {
      await call(createMockRequest({ id: TP_ID, enabled: false }))
      expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(ORG, TP_ID)
    })

    it('⭐ answers 404 for an unknown id — NOT a 403, and never writes', async () => {
      // The gate collapses "no such row" into "no permission"; reading first is what keeps a wrong
      // id answerable as a wrong id.
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)

      const response = await call(createMockRequest({ id: TP_ID, enabled: false }))
      expect(response.status).toBe(404)
      expect(touchPointService.ensureCanEditTouchPoint).not.toHaveBeenCalled()
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })

    it('⭐ runs the EDIT gate — not the view gate — and 403s when it refuses', async () => {
      vi.mocked(touchPointService.ensureCanEditTouchPoint).mockRejectedValue(new ForbiddenError())

      const response = await call(createMockRequest({ id: TP_ID, enabled: false }))
      expect(response.status).toBe(403)
      expect(touchPointService.ensureCanEditTouchPoint).toHaveBeenCalledWith(ORG, TP_ID, USER)
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })

    it('⭐ refuses an artifact touch point with 404 and its own i18n key', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )

      const response = await call(createMockRequest({ id: TP_ID, destination_url: 'x.example' }))
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.i18nMessage.key).toBe('agent:short_link.is_artifact')
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
      // ⛔ Nothing about the row crosses: no destination, no short_url, no name.
      expect(JSON.stringify(body)).not.toContain('bang-gia-t10')
      expect(JSON.stringify(body)).not.toContain('example.com')
    })

    it('⭐ the artifact check runs AFTER the gate, so the row kind is not leaked', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )
      vi.mocked(touchPointService.ensureCanEditTouchPoint).mockRejectedValue(new ForbiddenError())

      const body = await (await call(createMockRequest({ id: TP_ID, enabled: false }))).json()
      expect(body.i18nMessage.key).not.toBe('agent:short_link.is_artifact')
    })
  })

  describe('what reaches the service', () => {
    it('hands updateAndReturn the mapped patch, the row id and the token user', async () => {
      await call(
        createMockRequest({
          id: TP_ID,
          destination_url: 'https://example.com/new',
          enabled: false,
        })
      )

      expect(touchPointService.updateAndReturn).toHaveBeenCalledWith(
        ORG,
        TP_ID,
        { content_value: 'https://example.com/new', enabled: false },
        USER
      )
    })

    it('⛔ never sends a slug — renaming is set_short_link_slug, and the schema has no such field', async () => {
      await call(createMockRequest({ id: TP_ID, name: 'Bảng giá tháng 11' }))
      const patch = vi.mocked(touchPointService.updateAndReturn).mock.calls[0][2]
      expect(patch).not.toHaveProperty('slug')
      expect(patch).not.toHaveProperty('variants_content')
    })
  })

  describe('the answer', () => {
    it('returns the ShortLink block plus `changed`, re-read after the write', async () => {
      // Re-read rather than project the service's return value: that value is a different SHAPE
      // depending on whether anything changed, which would make `tags` come and go.
      vi.mocked(touchPointService.getByIdForOrg)
        .mockResolvedValueOnce(row() as never)
        .mockResolvedValueOnce(row({ content_value: 'https://example.com/new' }) as never)

      const response = await call(
        createMockRequest({ id: TP_ID, destination_url: 'https://example.com/new' })
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
      // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
      expectValidToolOutput('update_short_link', body.data)
      expect(body.data.destination_url).toBe('https://example.com/new')
      expect(body.data.changed).toEqual(['destination_url'])
      expect(touchPointService.getByIdForOrg).toHaveBeenCalledTimes(2)
    })

    it('⭐ `changed` is empty when every value sent was already in place', async () => {
      const body = await (
        await call(createMockRequest({ id: TP_ID, destination_url: 'https://example.com/pricing' }))
      ).json()

      expect(body.data.changed).toEqual([])
    })

    it('⛔ never returns the password, only whether one is set', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ access_control: { password: 'nho-mat-khau' } }) as never
      )

      const body = await (
        await call(createMockRequest({ id: TP_ID, access_control: { password: 'nho-mat-khau' } }))
      ).json()

      expect(body.data.has_password).toBe(true)
      expect(JSON.stringify(body)).not.toContain('nho-mat-khau')
    })
  })

  describe('the audit row', () => {
    it('records the tool, the client, the surface and the changed FIELD NAMES', async () => {
      await call(createMockRequest({ id: TP_ID, enabled: false }))

      expect(recordShortLinkAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: ORG,
          userId: USER,
          targetId: TP_ID,
          action: 'update',
          tool: 'update_short_link',
          surface: 'mcp',
          changed: ['enabled'],
        })
      )
    })

    it('⛔ carries no argument VALUES — a password travels in this tool’s arguments', async () => {
      await call(createMockRequest({ id: TP_ID, access_control: { password: 'nho-mat-khau' } }))

      const event = vi.mocked(recordShortLinkAudit).mock.calls[0][0]
      expect(JSON.stringify(event)).not.toContain('nho-mat-khau')
      // The field NAME is what an investigation needs; the value is what `/api/mcp` promised not to
      // log.
      expect(event.changed).toEqual(['password'])
    })

    it('is written only AFTER the write succeeded', async () => {
      vi.mocked(touchPointService.updateAndReturn).mockRejectedValue(new ForbiddenError())

      expect((await call(createMockRequest({ id: TP_ID, enabled: false }))).status).toBe(403)
      expect(recordShortLinkAudit).not.toHaveBeenCalled()
    })
  })
})
