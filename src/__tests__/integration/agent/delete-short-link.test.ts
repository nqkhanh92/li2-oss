/**
 * POST /api/agent/tools/delete-short-link — back-hop target of MCP `delete_short_link` (SL-3).
 *
 * What is pinned here is ORDER, not output shape, and the order is the whole safety argument:
 *
 *  1. READ → GATE → ARTIFACT CHECK. Reading first is what makes a SECOND delete a success:
 *     `canDeleteTouchPoint` returns false for a row that is not there, so gating first would answer
 *     "you do not have permission" for a delete that already worked (measured on the human route,
 *     checklist R3 — a second DELETE answered 403, not 404). The inverse case is pinned too: a 403
 *     from the gate on a row that DOES exist must not be laundered into `already_removed`.
 *  2. The artifact guard comes LAST, so the row's kind is not leaked to a member who may not touch
 *     it, and it names `delete_artifact` through its own i18n key.
 *  3. No audit row for a call that deleted nothing — an audit log recording deletions that did not
 *     happen is worse than one recording only the real ones.
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
    ensureCanDeleteTouchPoint: vi.fn(),
    deleteTpById: vi.fn(),
  },
}))

vi.mock('../../../core/helpers/agent-audit', () => ({
  recordShortLinkAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/delete-short-link/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { recordShortLinkAudit } from '../../../core/helpers/agent-audit'
import {
  ForbiddenError,
  PermissionError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const TP_ID = '22222222-2222-4222-8222-222222222222'

const makeClaims = (scopes: string[], surface?: 'mcp' | 'chat', clientId?: string) => ({
  org_id: ORG,
  user_id: USER,
  email: 'agent@example.com',
  plan: 'pro',
  scopes,
  ai_budget: 0,
  iss: 'li2-app',
  aud: 'li2-ai',
  ...(surface ? { surface } : {}),
  ...(clientId ? { client_id: clientId } : {}),
})

const createMockRequest = (body?: unknown) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/delete-short-link'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

/** A `LinkDetailsRow` as the single-row lookup returns it. */
const row = (overrides: Record<string, unknown> = {}) => ({
  id: TP_ID,
  name: 'Bảng giá tháng 10',
  slug: 'bang-gia-t10',
  short_code: '6LAA3',
  short_url: 'https://example.com/bang-gia-t10',
  content_type: 'URL',
  content_value: 'https://example.com/pricing',
  access_control: null,
  enabled: true,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-18T09:00:00.000Z',
  ...overrides,
})

describe('POST /api/agent/tools/delete-short-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(
      makeClaims(['read', 'write'], 'mcp', 'client_claude_desktop') as never
    )
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(row() as never)
    vi.mocked(touchPointService.ensureCanDeleteTouchPoint).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.deleteTpById).mockResolvedValue(1 as never)
  })

  it('⭐ a read-only token is refused structurally, before anything is read', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    const response = await call(createMockRequest({ id: TP_ID }))

    expect(response.status).toBe(403)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
    expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest({ id: TP_ID })
    const response = await call(request)

    expect(response.status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
  })

  it('deletes with the org from the TOKEN and the user from the context', async () => {
    const response = await call(createMockRequest({ id: TP_ID }))

    expect(response.status).toBe(200)
    expect(touchPointService.getByIdForOrg).toHaveBeenCalledWith(ORG, TP_ID)
    expect(touchPointService.ensureCanDeleteTouchPoint).toHaveBeenCalledWith(ORG, TP_ID, USER)
    expect(touchPointService.deleteTpById).toHaveBeenCalledWith(ORG, TP_ID, USER)
  })

  it('answers the contract block with already_removed: false on a real delete', async () => {
    const body = await (await call(createMockRequest({ id: TP_ID }))).json()

    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('delete_short_link', body.data)
    expect(body.data).toEqual({ id: TP_ID, status: 'deleted', already_removed: false })
    // ⛔ No URL in the response: the ending is gone, so a model handed one would print a dead link.
    expect(JSON.stringify(body.data)).not.toContain('http')
  })

  describe('the second delete', () => {
    it('⭐ an id that matches no link is a 200 with already_removed: true, never a 403', async () => {
      // The gate collapses "no such row" into "you may not" (checklist R3: the human route answers
      // 403 on a second DELETE). Reading first is what keeps a retry of a successful delete a
      // success — the one answer an idempotent tool must never get wrong.
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)

      const response = await call(createMockRequest({ id: TP_ID }))

      expect(response.status).toBe(200)
      expect((await response.json()).data).toEqual({
        id: TP_ID,
        status: 'deleted',
        already_removed: true,
      })
      expect(touchPointService.ensureCanDeleteTouchPoint).not.toHaveBeenCalled()
      expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
    })

    it('⭐ writes NO audit row, because nothing changed', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)
      await call(createMockRequest({ id: TP_ID }))

      expect(recordShortLinkAudit).not.toHaveBeenCalled()
    })
  })

  it('⭐ a 403 from the delete gate stays a 403 — it is NOT laundered into already_removed', async () => {
    // The inverse of the case above, and the reason the two steps cannot be collapsed: the row EXISTS
    // and the caller may not touch it. Reporting "already removed" here would tell the user a link
    // that is still live and still resolving had been deleted.
    vi.mocked(touchPointService.ensureCanDeleteTouchPoint).mockRejectedValue(new ForbiddenError())

    const response = await call(createMockRequest({ id: TP_ID }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.i18nMessage.key).toBe('common:messages.error.forbidden')
    expect(body.data?.already_removed).toBeUndefined()
    expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
    expect(recordShortLinkAudit).not.toHaveBeenCalled()
  })

  it('surfaces the ROLE refusal from deleteTpById as 403 + permission_error', async () => {
    // `deleteTpById` resolves DELETE_TOUCH_POINT, which the grant's binary `write` scope says
    // nothing about — so a token allowed to create can still be refused here.
    vi.mocked(touchPointService.deleteTpById).mockRejectedValue(new PermissionError())

    const response = await call(createMockRequest({ id: TP_ID }))

    expect(response.status).toBe(403)
    expect((await response.json()).i18nMessage.key).toBe('common:messages.error.permission_error')
    expect(recordShortLinkAudit).not.toHaveBeenCalled()
  })

  describe('the ARTIFACT guard', () => {
    it('⭐ refuses an artifact touch point with 404 + its own key, and deletes NOTHING', async () => {
      // Hard-deleting it would orphan the `artifacts` row (`touch_point_id` is SET NULL, checklist
      // R2/R7) and cascade away the slugs its published page is served under.
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )

      const response = await call(createMockRequest({ id: TP_ID }))
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.i18nMessage.key).toBe('agent:short_link.is_artifact')
      expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
      expect(recordShortLinkAudit).not.toHaveBeenCalled()
      // ⛔ And nothing about the row crosses: no destination, no short_url, no name.
      expect(JSON.stringify(body)).not.toContain('bang-gia-t10')
      expect(JSON.stringify(body)).not.toContain('example.com')
    })

    it('⭐ runs AFTER the delete gate, so the row kind is not leaked to a member who may not see it', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )
      vi.mocked(touchPointService.ensureCanDeleteTouchPoint).mockRejectedValue(new ForbiddenError())

      const response = await call(createMockRequest({ id: TP_ID }))

      expect(response.status).toBe(403)
      expect((await response.json()).i18nMessage.key).not.toBe('agent:short_link.is_artifact')
    })
  })

  it('⭐ writes ONE audit row carrying the agent client_id', async () => {
    // `deleteTpById` logs an event of its own, but with no metadata at all (checklist S1) — so
    // without this row there is no answer to "which agent deleted this link".
    await call(createMockRequest({ id: TP_ID }))

    expect(recordShortLinkAudit).toHaveBeenCalledTimes(1)
    expect(recordShortLinkAudit).toHaveBeenCalledWith({
      orgId: ORG,
      userId: USER,
      targetId: TP_ID,
      action: 'delete',
      tool: 'delete_short_link',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
      logFields: { shortLinkId: TP_ID },
    })
  })

  it('a token with no client_id still deletes and still audits', async () => {
    // Every chat-panel token omits the claim, and an audit row without it beats no row at all.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write'], 'mcp') as never)

    expect((await call(createMockRequest({ id: TP_ID }))).status).toBe(200)
    expect(vi.mocked(recordShortLinkAudit).mock.calls[0][0].clientId).toBeUndefined()
  })

  it('does NOT audit a delete that failed in the service', async () => {
    vi.mocked(touchPointService.deleteTpById).mockRejectedValue(new Error('postgrest exploded'))

    const response = await call(createMockRequest({ id: TP_ID }))

    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(recordShortLinkAudit).not.toHaveBeenCalled()
  })

  it('refuses a malformed body with 400 and never reads or deletes anything', async () => {
    for (const body of [
      undefined,
      {},
      // ⛔ No slug form: a tolerant identifier is fine for reading and unacceptable for a hard delete.
      { slug: 'bang-gia-t10' },
      { id: 'bang-gia-t10' },
      // `.strict()`: the MCP layer must have stripped `org_id`, and this is what proves it did.
      { id: TP_ID, org_id: ORG },
      // ⛔ No `confirm` flag in the contract — a model sets its own flags (checklist §D).
      { id: TP_ID, confirm: true },
    ]) {
      const response = await call(createMockRequest(body))
      expect(response.status, JSON.stringify(body)).toBe(400)
    }
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
    expect(touchPointService.deleteTpById).not.toHaveBeenCalled()
    expect(recordShortLinkAudit).not.toHaveBeenCalled()
  })
})
