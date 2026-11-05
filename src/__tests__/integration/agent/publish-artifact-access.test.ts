/**
 * POST /api/agent/tools/publish-artifact — the `access` BRANCH only (WP2 §3).
 *
 * ⚠️ A SEPARATE FILE FROM `publish-artifact.test.ts`, deliberately. That file pins the wave-3 and
 * WP3 behaviour of the same route and mocks the service with only the methods those need; this one
 * needs `setAccess` as well and asserts the two-call sequence. Splitting it keeps the two sets of
 * mocks from having to agree, and kept the two work packages from editing the same `vi.mock` block.
 *
 * What is pinned: the second service call happens with what the agent asked for, the response
 * reports the access the artifact REALLY has, a failure to lock leaves the page PUBLISHED and PUBLIC
 * with a `warning` and still a 201, and no password reaches the response. The sentences themselves
 * are tested against `accessWarningFor` directly at the bottom.
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
  artifactService: { createAndPublish: vi.fn(), setAccess: vi.fn(), getForOrg: vi.fn() },
}))

vi.mock('../../../core/helpers/artifact-audit', () => ({
  recordArtifactAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/publish-artifact/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { artifactService } from '../../../core/services/artifact.service'
import { recordArtifactAudit } from '../../../core/helpers/artifact-audit'
import { accessWarningFor } from '../../../core/helpers/artifact-agent-access'
import {
  BadRequestError,
  ConflictError,
  PermissionError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'
const PASSWORD = 'bang-gia-2026'
const HTML = '<!doctype html><h1>v1</h1>'

const makeClaims = (clientId?: string) => ({
  org_id: ORG,
  user_id: USER,
  email: 'agent@example.com',
  plan: 'pro',
  scopes: ['read', 'write'],
  ai_budget: 0,
  iss: 'li2-app',
  aud: 'li2-ai',
  surface: 'mcp',
  ...(clientId ? { client_id: clientId } : {}),
})

const dto = (overrides: Record<string, unknown> = {}) => ({
  id: ARTIFACT_ID,
  organization_id: ORG,
  user_id: USER,
  name: 'Bảng giá T10',
  kind: 'html',
  status: 'live',
  serve_token: 'tok',
  content_type: 'text/html',
  size_bytes: 27,
  created_at: '2026-10-19T08:00:00.000Z',
  updated_at: '2026-10-19T08:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 0,
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
    nextUrl: new URL('http://localhost:3000/api/agent/tools/publish-artifact'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

const bodyWith = (access?: unknown) => ({
  name: 'Bảng giá T10',
  html: HTML,
  ...(access ? { access } : {}),
})

describe('publish_artifact with an access block', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims('client_claude_desktop') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.createAndPublish).mockResolvedValue(dto() as never)
    vi.mocked(artifactService.setAccess).mockResolvedValue(
      dto({ access_mode: 'password', password_set_at: '2026-10-19T08:00:01.000Z' }) as never
    )
  })

  it('⭐ omitting access does NOT call setAccess — the wave-3 path is untouched', async () => {
    const res = await call(createMockRequest(bodyWith()))
    expect(res.status).toBe(201)
    expect(artifactService.createAndPublish).toHaveBeenCalledTimes(1)
    expect(artifactService.setAccess).not.toHaveBeenCalled()
    const body = await res.json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('publish_artifact', body.data)
    expect(body.data.access_mode).toBe('public')
    expect(body.data.warning).toBeUndefined()
  })

  it('publishes FIRST, then applies the access, in that order', async () => {
    const order: string[] = []
    vi.mocked(artifactService.createAndPublish).mockImplementation(async () => {
      order.push('publish')
      return dto() as never
    })
    vi.mocked(artifactService.setAccess).mockImplementation(async () => {
      order.push('access')
      return dto({ access_mode: 'password' }) as never
    })

    await call(createMockRequest(bodyWith({ mode: 'password', password: PASSWORD })))

    expect(order).toEqual(['publish', 'access'])
    expect(artifactService.setAccess).toHaveBeenCalledWith(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: PASSWORD,
    })
    // `createAndPublish` is NOT given the access block: its input type has no field for one.
    expect(vi.mocked(artifactService.createAndPublish).mock.calls[0][2]).not.toHaveProperty(
      'access'
    )
  })

  it('reports the access the artifact REALLY has, from the second call', async () => {
    const res = await call(createMockRequest(bodyWith({ mode: 'password', password: PASSWORD })))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.access_mode).toBe('password')
    expect(body.data.warning).toBeUndefined()
  })

  it('⛔ never echoes the password, even on the happy path', async () => {
    const res = await call(createMockRequest(bodyWith({ mode: 'password', password: PASSWORD })))
    expect(await res.clone().text()).not.toContain(PASSWORD)
  })

  it('audits the access change with the agent client_id', async () => {
    await call(createMockRequest(bodyWith({ mode: 'private' })))
    expect(recordArtifactAudit).toHaveBeenCalledWith({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'update',
      tool: 'publish_artifact',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
    })
  })

  it('⭐ a FAILED access change still answers 201, with a warning, and does NOT roll back', async () => {
    // The decision WP2 is built on: the artifact exists, its link works, and the honest answer is
    // "it is published but public". A 4xx here would tell the agent nothing was created.
    vi.mocked(artifactService.setAccess).mockRejectedValue(
      new BadRequestError('Password length out of range', {
        key: 'common:messages.error.field_invalid',
        params: { field: '$t(label.password)' },
      })
    )

    const res = await call(createMockRequest(bodyWith({ mode: 'password', password: 'short' })))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.artifact_id).toBe(ARTIFACT_ID)
    expect(body.data.access_mode).toBe('public')
    expect(body.data.warning).toContain('PUBLIC')
    expect(body.data.warning).toContain('set_artifact_access')
    expect(body.data.short_url).toBe('https://s.li2.ai/bang-gia-t10')
  })

  it('does not audit an access change that failed, and does not delete the artifact', async () => {
    vi.mocked(artifactService.setAccess).mockRejectedValue(new PermissionError())
    const res = await call(createMockRequest(bodyWith({ mode: 'private' })))
    expect(res.status).toBe(201)
    expect(recordArtifactAudit).not.toHaveBeenCalled()
    // Nothing in the route may undo the publish; a `deleteForOrg` is not even mocked here, so a
    // rollback attempt would throw and this assertion would never be reached.
    expect((await res.json()).data.warning).toContain('permission')
  })

  it('⛔ a warning NEVER contains the password that caused it', async () => {
    vi.mocked(artifactService.setAccess).mockRejectedValue(
      new BadRequestError('Password length out of range', {
        key: 'common:messages.error.field_invalid',
        params: { field: '$t(label.password)' },
      })
    )
    const res = await call(createMockRequest(bodyWith({ mode: 'password', password: PASSWORD })))
    expect(await res.clone().text()).not.toContain(PASSWORD)
  })

  it('rejects a malformed access block with 400, before anything is published', async () => {
    for (const access of [{}, { mode: 'open' }, { mode: 'public', confirm: true }]) {
      const res = await call(createMockRequest(bodyWith(access)))
      expect(res.status, JSON.stringify(access)).toBe(400)
    }
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
    expect(artifactService.setAccess).not.toHaveBeenCalled()
  })
})

describe('accessWarningFor — one sentence per reason, no upstream text', () => {
  const err = (key: string, field?: string) => ({
    i18nMessage: { key, params: field ? { field } : {} },
    message: 'SECRET upstream text that must never cross',
  })

  it('always says the page is PUBLIC, whatever went wrong', async () => {
    const reasons = [
      err('common:messages.error.field_required', '$t(label.password)'),
      err('common:messages.error.field_invalid', '$t(label.password)'),
      err('common:messages.error.field_invalid', 'access_mode'),
      err('common:messages.error.permission_error'),
      err('artifact:access.conflict'),
      err('artifact:errors.removed'),
      err('something:we.have.never.seen'),
      new ConflictError('no key at all'),
      undefined,
    ]
    for (const reason of reasons) {
      const warning = accessWarningFor(reason, 'password')
      expect(warning, String(reason)).toContain('PUBLIC')
      // ⛔ The upstream message is read by nothing — same rule as `artifact-refusals.ts`.
      expect(warning, String(reason)).not.toContain('SECRET')
    }
  })

  it('names the missing password, and the 8-128 range for a bad one', () => {
    expect(
      accessWarningFor(
        err('common:messages.error.field_required', '$t(label.password)'),
        'password'
      )
    ).toContain('needs a password')
    const tooShort = accessWarningFor(
      err('common:messages.error.field_invalid', '$t(label.password)'),
      'password'
    )
    expect(tooShort).toContain('8 to 128')
  })

  it('names the mode that is switched off, and offers the fallback', () => {
    const warning = accessWarningFor(
      err('common:messages.error.field_invalid', 'access_mode'),
      'google'
    )
    expect(warning).toContain('"google"')
    expect(warning).toContain('turned off on this Li2 server')
    expect(warning).toContain('set_artifact_access')
  })

  it('tells the user to ask an admin when the role is the problem, not to retry', () => {
    const warning = accessWarningFor(err('common:messages.error.permission_error'), 'private')
    expect(warning).toMatch(/role in this organization/i)
    // No point telling a model to retry a call its role will refuse again.
    expect(warning).not.toContain('set_artifact_access with the same')
  })
})
