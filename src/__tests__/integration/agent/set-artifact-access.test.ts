/**
 * POST /api/agent/tools/set-artifact-access — back-hop target of MCP `set_artifact_access` (WP2 §1).
 *
 * The route is thin: every rule that decides the answer (the `add_touch_point` policy, the 8–128
 * code-point password check, the env gate on `google`, the `access_version` optimistic lock, scrypt
 * hashing) belongs to `artifactService.setAccess`. What is pinned here is what the ROUTE adds — the
 * write scope, the surface plan gate, the `.strict()` body, `password_set_at` in the projection, the
 * audit row carrying the agent's `client_id` — and the one property the whole feature rests on:
 * NOTHING ABOUT THE PASSWORD COMES BACK OUT.
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
  artifactService: { setAccess: vi.fn() },
}))

vi.mock('../../../core/helpers/artifact-audit', () => ({
  recordArtifactAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/set-artifact-access/route'
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
const PASSWORD = 'bang-gia-2026'

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

const lockedDto = (overrides: Record<string, unknown> = {}) => ({
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
  updated_at: '2026-10-19T08:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'password',
  password_set_at: '2026-10-19T08:00:00.000Z',
  // ⛔ The hash is NOT part of `ArtifactDTO` — `toDTO` never spreads the row. It is put here anyway
  // so the assertion below is testing something: if a future projection ever spread the DTO, this
  // string would travel and the test would catch it.
  password_hash: 'scrypt$14$8$5$salt$key',
  viewer_count: null,
  visits: 12,
  serve_url: 'https://artifact.li2.ai/acme/bang-gia-t10',
  preview_url: 'https://app.li2.ai/a/tok',
  download_url: 'https://app.li2.ai/a/tok/download',
  short_url: 'https://s.li2.ai/bang-gia-t10',
  path_qr_code: 'https://supa.example/storage/v1/object/public/qr.svg',
  ...overrides,
})

const createMockRequest = (body?: unknown) =>
  ({
    method: 'POST',
    headers: new Headers({ authorization: 'Bearer fake-token' }),
    nextUrl: new URL('http://localhost:3000/api/agent/tools/set-artifact-access'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

const validBody = () => ({ artifact_id: ARTIFACT_ID, mode: 'password', password: PASSWORD })

describe('POST /api/agent/tools/set-artifact-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(
      makeClaims(['read', 'write'], 'mcp', 'client_claude_desktop') as never
    )
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.setAccess).mockResolvedValue(lockedDto() as never)
  })

  it('⭐ a read-only token is refused structurally, before the service', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(403)
    expect(artifactService.setAccess).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest(validBody())
    const res = await call(request)
    expect(res.status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.setAccess).not.toHaveBeenCalled()
  })

  it('calls setAccess with the org from the TOKEN, the user from the context, and the mode as access_mode', async () => {
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(200)
    expect(artifactService.setAccess).toHaveBeenCalledWith(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: PASSWORD,
    })
  })

  it('forwards no password at all when the mode does not need one', async () => {
    vi.mocked(artifactService.setAccess).mockResolvedValue(
      lockedDto({ access_mode: 'private', password_set_at: null }) as never
    )
    await call(createMockRequest({ artifact_id: ARTIFACT_ID, mode: 'private' }))
    expect(artifactService.setAccess).toHaveBeenCalledWith(ORG, USER, ARTIFACT_ID, {
      access_mode: 'private',
      password: undefined,
    })
  })

  it('answers the shared artifact block plus password_set_at', async () => {
    const body = await (await call(createMockRequest(validBody()))).json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('set_artifact_access', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'live',
      name: 'Bảng giá T10',
      access_mode: 'password',
      short_url: 'https://s.li2.ai/bang-gia-t10',
      serve_url: 'https://artifact.li2.ai/acme/bang-gia-t10',
      qr_url: 'https://supa.example/storage/v1/object/public/qr.svg',
      size_bytes: 27,
      updated_at: '2026-10-19T08:00:00.000Z',
      password_set_at: '2026-10-19T08:00:00.000Z',
    })
  })

  it('⛔ NEVER echoes the password or its hash, anywhere in the response', async () => {
    // The whole point of the tool. The DTO above deliberately carries a `password_hash` the real DTO
    // does not have, so this assertion fails if any projection starts spreading the object.
    const response = await call(createMockRequest(validBody()))
    const raw = await response.clone().text()
    expect(raw).not.toContain(PASSWORD)
    expect(raw).not.toContain('scrypt')
    expect(raw).not.toContain('password_hash')
    // `password_set_at` IS allowed: a timestamp says "a password is set" without being one.
    expect(raw).toContain('password_set_at')
  })

  it('reports null password_set_at for a mode that has no password', async () => {
    vi.mocked(artifactService.setAccess).mockResolvedValue(
      lockedDto({ access_mode: 'public', password_set_at: null }) as never
    )
    const body = await (
      await call(createMockRequest({ artifact_id: ARTIFACT_ID, mode: 'public' }))
    ).json()
    expect(body.data.access_mode).toBe('public')
    expect(body.data.password_set_at).toBeNull()
  })

  it('⭐ writes ONE audit row carrying the agent client_id, and no arguments', async () => {
    await call(createMockRequest(validBody()))
    expect(recordArtifactAudit).toHaveBeenCalledTimes(1)
    expect(recordArtifactAudit).toHaveBeenCalledWith({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'update',
      tool: 'set_artifact_access',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
    })
    // ⛔ Not the mode, not the password: `recordArtifactAudit`'s header forbids tool arguments in
    // `metadata`, and a password in an audit row would outlive the request by design.
    expect(JSON.stringify(vi.mocked(recordArtifactAudit).mock.calls[0][0])).not.toContain(PASSWORD)
  })

  it('does NOT audit a change that failed', async () => {
    vi.mocked(artifactService.setAccess).mockRejectedValue(
      new NotFoundError('Artifact not found', { key: 'common:messages.error.not_found' })
    )
    const res = await call(createMockRequest(validBody()))
    expect(res.status).toBe(404)
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a missing password',
      400,
      new BadRequestError('Password is required for access_mode=password', {
        key: 'common:messages.error.field_required',
        params: { field: '$t(label.password)' },
      }),
      'common:messages.error.field_required',
    ],
    [
      'a password outside 8-128',
      400,
      new BadRequestError('Password length out of range', {
        key: 'common:messages.error.field_invalid',
        params: { field: '$t(label.password)' },
      }),
      'common:messages.error.field_invalid',
    ],
    [
      'google with no OAuth client configured',
      400,
      new BadRequestError('Google sign-in is not configured for artifacts', {
        key: 'common:messages.error.field_invalid',
        params: { field: 'access_mode' },
      }),
      'common:messages.error.field_invalid',
    ],
    [
      'the access_version lock losing a race',
      409,
      new ConflictError('Artifact access changed concurrently', {
        key: 'artifact:access.conflict',
      }),
      'artifact:access.conflict',
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
      // The route adds no error handling of its own; what matters is that the KEY survives, because
      // `artifact-refusals.ts` branches on it and the status bucket alone would point at the wrong
      // fix (a 400 reads as "re-read the schema", a 403 as "quota").
      vi.mocked(artifactService.setAccess).mockRejectedValue(error)
      const res = await call(createMockRequest(validBody()))
      expect(res.status).toBe(status)
      expect((await res.json()).i18nMessage.key).toBe(key)
    }
  )

  it('refuses a malformed body with 400 and never calls the service', async () => {
    for (const body of [
      undefined,
      {},
      { mode: 'public' },
      { artifact_id: 'bang-gia', mode: 'public' },
      { artifact_id: ARTIFACT_ID },
      { artifact_id: ARTIFACT_ID, mode: 'open-to-all' },
      // `.strict()`: the MCP layer must have stripped `org_id`, and this is what proves it did.
      { artifact_id: ARTIFACT_ID, mode: 'public', org_id: ORG },
      // A model must not be able to steer the optimistic lock.
      { artifact_id: ARTIFACT_ID, mode: 'public', access_version: 9 },
    ]) {
      const res = await call(createMockRequest(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(artifactService.setAccess).not.toHaveBeenCalled()
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })
})
