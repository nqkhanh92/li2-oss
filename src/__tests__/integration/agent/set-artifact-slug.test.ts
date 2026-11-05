/**
 * POST /api/agent/tools/set-artifact-slug — back-hop target of MCP `set_artifact_slug` (WP2 §2).
 *
 * `artifactService.changeSlug` owns everything that decides the answer: the `add_touch_point`
 * policy, the live-only rule (a draft is a 409), re-validating the slug, the plan's
 * `MAX_SLUGS_PER_TP` cap, the `slug_is_taken` mapping of a unique violation, re-rendering the QR and
 * bumping `updated_at`. Pinned here: the write scope, the plan gate, the `.strict()` body, the
 * projection, the audit row — and that each refusal keeps the i18n key the MCP mapper branches on,
 * because for this tool the status buckets are actively wrong (a 409 is usually "still a draft", not
 * "slug taken").
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

vi.mock('../../../core/services/artifact.service', () => ({
  artifactService: { changeSlug: vi.fn() },
}))

vi.mock('../../../core/helpers/artifact-audit', () => ({
  recordArtifactAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/set-artifact-slug/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { artifactService } from '../../../core/services/artifact.service'
import { recordArtifactAudit } from '../../../core/helpers/artifact-audit'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  PermissionError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'
const NEW_SLUG = 'bang-gia-t10'

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

const renamedDto = () => ({
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
  updated_at: '2026-10-19T09:30:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 12,
  serve_url: `https://artifact.li2.ai/acme/${NEW_SLUG}`,
  preview_url: 'https://app.li2.ai/a/tok',
  download_url: 'https://app.li2.ai/a/tok/download',
  short_url: `https://s.li2.ai/${NEW_SLUG}`,
  path_qr_code: 'https://supa.example/storage/v1/object/public/qr.svg',
})

const createMockRequest = (body?: unknown) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/set-artifact-slug'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

const validBody = () => ({ artifact_id: ARTIFACT_ID, slug: NEW_SLUG })

describe('POST /api/agent/tools/set-artifact-slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(
      makeClaims(['read', 'write'], 'mcp', 'client_claude_desktop') as never
    )
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.changeSlug).mockResolvedValue(renamedDto() as never)
  })

  it('⭐ a read-only token is refused structurally, before the service', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(403)
    expect(artifactService.changeSlug).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest(validBody())
    const res = await call(request)
    expect(res.status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.changeSlug).not.toHaveBeenCalled()
  })

  it('renames with the org from the TOKEN and the user from the context', async () => {
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(200)
    expect(artifactService.changeSlug).toHaveBeenCalledWith(ORG, USER, ARTIFACT_ID, NEW_SLUG)
  })

  it('answers the shared artifact block, with the NEW short_url and serve_url', async () => {
    const body = await (await call(createMockRequest(validBody()))).json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('set_artifact_slug', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'live',
      name: 'Bảng giá T10',
      access_mode: 'public',
      short_url: `https://s.li2.ai/${NEW_SLUG}`,
      serve_url: `https://artifact.li2.ai/acme/${NEW_SLUG}`,
      qr_url: 'https://supa.example/storage/v1/object/public/qr.svg',
      size_bytes: 27,
      updated_at: '2026-10-19T09:30:00.000Z',
    })
    // No `password_set_at` here: this tool does not touch access, and the shared block carries only
    // what every artifact tool carries.
    expect(body.data.password_set_at).toBeUndefined()
  })

  it('⭐ the SECOND call with the same slug is a success, not a refusal', async () => {
    // The idempotency this tool advertises, and it is the SERVICE that provides it: `changeSlug`
    // compares the touch point's current slug and returns the DTO untouched before it can collide
    // with the `slugs` row it inserted itself. The route must not add a branch of its own.
    const first = await call(createMockRequest(validBody()))
    const second = await call(createMockRequest(validBody()))
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect((await second.json()).data.short_url).toBe(`https://s.li2.ai/${NEW_SLUG}`)
    expect(artifactService.changeSlug).toHaveBeenCalledTimes(2)
  })

  it('⭐ writes ONE audit row carrying the agent client_id', async () => {
    await call(createMockRequest(validBody()))
    expect(recordArtifactAudit).toHaveBeenCalledTimes(1)
    expect(recordArtifactAudit).toHaveBeenCalledWith({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'update',
      tool: 'set_artifact_slug',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
    })
  })

  it('a token with no client_id still renames and still audits', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write'], 'mcp') as never)
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(200)
    expect(vi.mocked(recordArtifactAudit).mock.calls[0][0].clientId).toBeUndefined()
  })

  it('does NOT audit a rename that failed', async () => {
    vi.mocked(artifactService.changeSlug).mockRejectedValue(
      new BadRequestError('Slug was taken', { key: 'common:messages.error.slug_is_taken' })
    )
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(400)
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a slug already in use anywhere in Li2',
      400,
      new BadRequestError('Slug was taken by another user, please choose another slug!', {
        key: 'common:messages.error.slug_is_taken',
      }),
      'common:messages.error.slug_is_taken',
    ],
    [
      "the plan's cap on slugs per touch point",
      403,
      new PlanError('This touch point reached the maximum number of slugs allowed', {
        key: 'common:messages.error.plan_errors.max_slugs_per_tp',
        params: {},
      }),
      'common:messages.error.plan_errors.max_slugs_per_tp',
    ],
    [
      'a draft that was never published',
      409,
      new ConflictError("Artifact status 'draft' does not allow replacing content", {
        key: 'artifact:update.status_refuses',
      }),
      'artifact:update.status_refuses',
    ],
    [
      'a role without add_touch_point',
      403,
      new PermissionError(),
      'common:messages.error.permission_error',
    ],
    [
      'a tombstone',
      404,
      new NotFoundError('Artifact has been taken down', { key: 'artifact:errors.removed' }),
      'artifact:errors.removed',
    ],
  ])(
    'surfaces %s as the status + i18n key the MCP mapper words',
    async (_label, status, error, key) => {
      vi.mocked(artifactService.changeSlug).mockRejectedValue(error)
      const res = await call(createMockRequest(validBody()))
      expect(res.status).toBe(status)
      expect((await res.json()).i18nMessage.key).toBe(key)
    }
  )

  it('refuses a malformed body with 400 and never calls the service', async () => {
    for (const body of [
      undefined,
      {},
      { slug: NEW_SLUG },
      { artifact_id: ARTIFACT_ID },
      { artifact_id: 'bang-gia', slug: NEW_SLUG },
      // The creation rules, enforced before the service: too short, uppercase, the `f-` prefix.
      { artifact_id: ARTIFACT_ID, slug: 'abc' },
      { artifact_id: ARTIFACT_ID, slug: 'Bang-Gia' },
      { artifact_id: ARTIFACT_ID, slug: 'f-secret' },
      // ⭐ An empty slug is a MISSING argument here, not "leave it alone" — the shared `slugSchema`
      // would otherwise hand the route `undefined` for the only thing it is being asked to set.
      { artifact_id: ARTIFACT_ID, slug: '' },
      // `.strict()`: the MCP layer must have stripped `org_id`.
      { artifact_id: ARTIFACT_ID, slug: NEW_SLUG, org_id: ORG },
    ]) {
      const res = await call(createMockRequest(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(artifactService.changeSlug).not.toHaveBeenCalled()
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })
})
