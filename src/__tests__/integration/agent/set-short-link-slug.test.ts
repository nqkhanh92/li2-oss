/**
 * POST /api/agent/tools/set-short-link-slug — back-hop target of `set_short_link_slug` (SL-2 §2).
 *
 * Four things are pinned, and the two about the QR are the ones that cost real money to get wrong:
 *
 *  1. READ → EDIT GATE → ARTIFACT CHECK, the same order and the same reasons as `update_short_link`.
 *  2. The write goes through `updateAndReturn`, NOT `updateTpSlug`: the latter writes the slug and
 *     stops, leaving the stored QR image encoding the previous address (checklist B8). The re-render
 *     lives in `updateAndReturn`'s QR branch, which only runs when the call asks for it.
 *  3. The existing `qr_customize_options` are sent straight back, because that branch renders FROM
 *     the options it receives — calling it with none would silently reset the colours and logo the
 *     owner chose, as a side effect of a rename. This is the half `artifactService.changeSlug`
 *     documents at length and the half a copy of it would be most likely to drop.
 *  4. …and where this route must DEPART from `changeSlug`: an artifact's touch point is QR-only, a
 *     short link is not. The service assigns `variants_content` with no merge, so the QR branch is
 *     requested only for a link that ALREADY has a QR, and the block is merged over the stored one.
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
    getTouchPointDetail: vi.fn(),
    ensureCanEditTouchPoint: vi.fn(),
    updateAndReturn: vi.fn(),
  },
}))

vi.mock('../../../core/helpers/agent-audit', () => ({
  recordShortLinkAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/set-short-link-slug/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { touchPointService } from '../../../core/services/touch-point.service'
import { recordShortLinkAudit } from '../../../core/helpers/agent-audit'
import { ForbiddenError, PlanError } from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const TP_ID = '22222222-2222-4222-8222-222222222222'
const NEW_SLUG = 'bang-gia-t11'

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
    nextUrl: new URL('http://localhost:3000/api/agent/tools/set-short-link-slug'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

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

/** The columns the QR decision needs, which `LinkDetailsRow` deliberately does not carry. */
const detail = (overrides: Record<string, unknown> = {}) => ({
  ...row(),
  variants_content: { LINK: { enabled: true }, QR: { enabled: true } },
  qr_customize_options: { dotsOptions: { color: '#e11d48' }, image: 'logo.png' },
  ...overrides,
})

describe('POST /api/agent/tools/set-short-link-slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['write'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.ensureCanEditTouchPoint).mockResolvedValue(undefined as never)
    vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(row() as never)
    vi.mocked(touchPointService.getTouchPointDetail).mockResolvedValue(detail() as never)
    vi.mocked(touchPointService.updateAndReturn).mockResolvedValue(row() as never)
  })

  const validBody = () => ({ id: TP_ID, slug: NEW_SLUG })

  it('gates on the surface plan before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest(validBody())

    expect((await call(request)).status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
  })

  it('a read-only grant never reaches this write tool', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    expect((await call(createMockRequest(validBody()))).status).toBe(403)
    expect(touchPointService.getByIdForOrg).not.toHaveBeenCalled()
  })

  it('⭐ refuses a slug the dashboard would refuse, and writes nothing', async () => {
    // The shared `slugSchema`, so an agent cannot mint a slug a human could not.
    for (const slug of ['', 'short', 'f-legacy', 'Bang-Gia']) {
      const response = await call(createMockRequest({ id: TP_ID, slug }))
      expect(response.status, slug).toBe(400)
    }
    expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
  })

  describe('read → gate → artifact, in that order', () => {
    it('⭐ answers 404 for an unknown id — NOT a 403, and never writes', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(null as never)

      const response = await call(createMockRequest(validBody()))
      expect(response.status).toBe(404)
      expect(touchPointService.ensureCanEditTouchPoint).not.toHaveBeenCalled()
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })

    it('⭐ runs the EDIT gate and 403s when it refuses', async () => {
      vi.mocked(touchPointService.ensureCanEditTouchPoint).mockRejectedValue(new ForbiddenError())

      const response = await call(createMockRequest(validBody()))
      expect(response.status).toBe(403)
      expect(touchPointService.ensureCanEditTouchPoint).toHaveBeenCalledWith(ORG, TP_ID, USER)
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
    })

    it('⭐ refuses an artifact touch point with 404 and its own i18n key', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )

      const response = await call(createMockRequest(validBody()))
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.i18nMessage.key).toBe('agent:short_link.is_artifact')
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
      expect(JSON.stringify(body)).not.toContain('bang-gia-t10')
    })

    it('⭐ the artifact check runs AFTER the gate, so the row kind is not leaked', async () => {
      vi.mocked(touchPointService.getByIdForOrg).mockResolvedValue(
        row({ content_type: 'ARTIFACT' }) as never
      )
      vi.mocked(touchPointService.ensureCanEditTouchPoint).mockRejectedValue(new ForbiddenError())

      const body = await (await call(createMockRequest(validBody()))).json()
      expect(body.i18nMessage.key).not.toBe('agent:short_link.is_artifact')
    })
  })

  describe('the QR re-render', () => {
    it('⭐ goes through updateAndReturn and asks for the QR branch with the OWNER’s options', async () => {
      // `updateTpSlug` alone would leave the stored image encoding the old address (checklist B8),
      // and an empty options object would reset the colours and logo the owner chose.
      await call(createMockRequest(validBody()))

      expect(touchPointService.updateAndReturn).toHaveBeenCalledWith(
        ORG,
        TP_ID,
        {
          slug: NEW_SLUG,
          // MERGED, not replaced: the service assigns `variants_content` wholesale, so the literal
          // `{QR: …}` that `changeSlug` sends would switch this link's LINK variant off.
          variants_content: { LINK: { enabled: true }, QR: { enabled: true } },
          qr_customize_options: { dotsOptions: { color: '#e11d48' }, image: 'logo.png' },
        },
        USER
      )
    })

    it('⛔ does NOT turn a QR on for a link that has none', async () => {
      // Enabling it would be a config change nobody asked for, chargeable against the plan's
      // ALLOWED_TP_TYPES — and there is no image to refresh in the first place.
      vi.mocked(touchPointService.getTouchPointDetail).mockResolvedValue(
        detail({ variants_content: { LINK: { enabled: true } } }) as never
      )

      await call(createMockRequest(validBody()))

      expect(touchPointService.updateAndReturn).toHaveBeenCalledWith(
        ORG,
        TP_ID,
        { slug: NEW_SLUG },
        USER
      )
    })

    it('treats a QR variant that is present but switched off as no QR', async () => {
      vi.mocked(touchPointService.getTouchPointDetail).mockResolvedValue(
        detail({ variants_content: { QR: { enabled: false } } }) as never
      )

      await call(createMockRequest(validBody()))
      const patch = vi.mocked(touchPointService.updateAndReturn).mock.calls[0][2]
      expect(patch).not.toHaveProperty('variants_content')
    })
  })

  describe('asking for the slug the link already has', () => {
    it('⭐ succeeds, writes nothing, renders nothing and reads no detail row', async () => {
      // What `idempotent: true` in the registry claims. The service would also return early, but it
      // would not stop the QR re-render — and a re-render moves `updated_at`, busting every cached
      // QR image for a rename that is not one.
      const response = await call(createMockRequest({ id: TP_ID, slug: 'bang-gia-t10' }))
      const body = await response.json()

      expect(response.status).toBe(200)
      // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
      // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
      expectValidToolOutput('set_short_link_slug', body.data)
      expect(body.data.slug).toBe('bang-gia-t10')
      expect(touchPointService.updateAndReturn).not.toHaveBeenCalled()
      expect(touchPointService.getTouchPointDetail).not.toHaveBeenCalled()
      expect(recordShortLinkAudit).not.toHaveBeenCalled()
    })
  })

  describe('the answer and the audit row', () => {
    it('re-reads the row, so short_url and qr_url agree with the new slug', async () => {
      // `updateTpSlug` writes `slug` and `short_url` through its OWN update, so those columns are
      // only guaranteed to match the new ending when they are read back.
      vi.mocked(touchPointService.getByIdForOrg)
        .mockResolvedValueOnce(row() as never)
        .mockResolvedValueOnce(
          row({
            slug: NEW_SLUG,
            short_url: `https://example.com/${NEW_SLUG}`,
          }) as never
        )

      const body = await (await call(createMockRequest(validBody()))).json()

      expect(body.data.slug).toBe(NEW_SLUG)
      expect(body.data.short_url).toBe(`https://example.com/${NEW_SLUG}`)
      // No `changed` on this tool: there is exactly one field it can move.
      expect(body.data).not.toHaveProperty('changed')
    })

    it('records the tool, the client and the surface', async () => {
      await call(createMockRequest(validBody()))

      expect(recordShortLinkAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: ORG,
          userId: USER,
          targetId: TP_ID,
          action: 'update',
          tool: 'set_short_link_slug',
          surface: 'mcp',
          changed: ['slug'],
        })
      )
    })

    it('is written only AFTER the write succeeded', async () => {
      vi.mocked(touchPointService.updateAndReturn).mockRejectedValue(new ForbiddenError())

      expect((await call(createMockRequest(validBody()))).status).toBe(403)
      expect(recordShortLinkAudit).not.toHaveBeenCalled()
    })
  })
})
