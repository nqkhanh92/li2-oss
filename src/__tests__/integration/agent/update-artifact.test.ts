/**
 * POST /api/agent/tools/update-artifact — back-hop target of MCP `update_artifact` (spec R6).
 * Same mocking posture as publish-artifact.test.ts: real `withAgentAuth`, mocked service, no DB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
  artifactService: { createAndPublish: vi.fn(), replaceContent: vi.fn() },
}))

import { POST } from '../../../app/api/agent/tools/update-artifact/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { artifactService } from '../../../core/services/artifact.service'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

const makeClaims = (scopes: string[]) => ({
  org_id: ORG,
  user_id: USER,
  email: 'agent@example.com',
  plan: 'pro',
  scopes,
  ai_budget: 0,
  iss: 'li2-app',
  aud: 'li2-ai',
  surface: 'mcp',
})

const createMockRequest = ({
  body,
  contentLength,
}: { body?: unknown; contentLength?: number } = {}) => {
  const headers = new Headers({ authorization: 'Bearer fake-token' })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return {
    method: 'POST',
    headers,
    nextUrl: new URL('http://localhost:3000/api/agent/tools/update-artifact'),
    json: vi.fn(async () => body),
  } as unknown as Parameters<typeof POST>[0] & { json: ReturnType<typeof vi.fn> }
}

const call = (request: ReturnType<typeof createMockRequest>) =>
  POST(request, { params: {} } as never)

const replaced = () => ({
  id: ARTIFACT_ID,
  organization_id: ORG,
  user_id: USER,
  name: 'Bảng giá T10',
  kind: 'html',
  status: 'live',
  serve_token: 'tok',
  content_type: 'text/html',
  size_bytes: 31,
  created_at: '2026-10-05T00:00:00.000Z',
  updated_at: '2026-10-05T01:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  serve_url: 'https://app.li2.ai/a/tok',

  preview_url: 'https://app.li2.ai/a/tok',
  download_url: 'https://app.li2.ai/a/tok/download',
  short_url: 'https://s.li2.ai/bang-gia',
  path_qr_code: 'https://supa.example/storage/v1/object/public/proxi-public-user-upload/qr',
  previous_size_bytes: 27,
})

const HTML = '<!doctype html><h1>v2</h1>'
const validBody = () => ({ artifact_id: ARTIFACT_ID, html: HTML })

describe('POST /api/agent/tools/update-artifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write']) as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.replaceContent).mockResolvedValue(replaced() as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("['read'] token → 403 before the service", async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read']) as never)
    const res = await call(createMockRequest({ body: validBody() }))
    expect(res.status).toBe(403)
    expect(artifactService.replaceContent).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS before parsing the body', async () => {
    const request = createMockRequest({ body: validBody() })
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const res = await call(request)

    expect(res.status).toBe(403)
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG, 'mcp_access')
    expect(request.json).not.toHaveBeenCalled()
  })

  it('layer 0: content-length 12 MB → 413, json() never called, no service', async () => {
    const request = createMockRequest({ body: validBody(), contentLength: 12 * 1024 * 1024 })
    const res = await call(request)

    expect(res.status).toBe(413)
    expect((await res.json()).i18nMessage.params.declared_bytes).toBe(12 * 1024 * 1024)
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.replaceContent).not.toHaveBeenCalled()
  })

  it.each([
    ['missing artifact_id', { html: HTML }],
    ['artifact_id not a uuid', { artifact_id: 'abc', html: HTML }],
    ['missing html', { artifact_id: ARTIFACT_ID }],
    ['leftover org_id (strict)', { ...validBody(), org_id: ORG }],
    ['name is not accepted here', { ...validBody(), name: 'new name' }],
    ['unparsable body', undefined],
  ])('%s → 400, service not called', async (_label, body) => {
    const res = await call(createMockRequest({ body }))
    expect(res.status).toBe(400)
    expect(artifactService.replaceContent).not.toHaveBeenCalled()
  })

  it('whitespace-only html → 400 agent:artifact.html_empty', async () => {
    const res = await call(createMockRequest({ body: { artifact_id: ARTIFACT_ID, html: '   ' } }))
    expect(res.status).toBe(400)
    expect((await res.json()).i18nMessage.key).toBe('agent:artifact.html_empty')
    expect(artifactService.replaceContent).not.toHaveBeenCalled()
  })

  it('calls replaceContent(org from token, user, artifact_id, { file index.html sized in UTF-8 bytes })', async () => {
    const html = '<h1>Xin chào v2</h1>'
    const res = await call(createMockRequest({ body: { artifact_id: ARTIFACT_ID, html } }))

    expect(res.status).toBe(200)
    const [orgArg, userArg, idArg, input] = vi.mocked(artifactService.replaceContent).mock.calls[0]
    expect(orgArg).toBe(ORG)
    expect(userArg).toBe(USER)
    expect(idArg).toBe(ARTIFACT_ID)
    expect(input.file.name).toBe('index.html')
    expect(input.file.size).toBe(Buffer.byteLength(html, 'utf8'))
    expect(Buffer.from(await input.file.arrayBuffer()).toString('utf8')).toBe(html)
  })

  it('200 + the 9 shared fields + previous_size_bytes; short_url / serve_url / qr_url are the stored ones', async () => {
    const res = await call(createMockRequest({ body: validBody() }))

    expect(res.status).toBe(200)
    const body = await res.json()
    // Wave 4 WP1 added `access_mode` and `updated_at` to the shared block. Additive: the link, the
    // QR and the name are still the ones that were already there — that is the whole promise of
    // replacing content rather than republishing.
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('update_artifact', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'live',
      name: 'Bảng giá T10',
      access_mode: 'public',
      short_url: 'https://s.li2.ai/bang-gia',
      serve_url: 'https://app.li2.ai/a/tok',
      qr_url: 'https://supa.example/storage/v1/object/public/proxi-public-user-upload/qr',
      size_bytes: 31,
      // The replace bumped it — this is the field that lets an agent say when the page last changed.
      updated_at: '2026-10-05T01:00:00.000Z',
      previous_size_bytes: 27,
    })
    expect(body.data.preview_url).toBeUndefined()
  })

  it('surfaces service errors with status + i18nMessage (404 removed, 409 status, 403 quota)', async () => {
    const cases: [Error, number, string][] = [
      [new NotFoundError('taken down', { key: 'artifact:errors.removed' }), 404, 'artifact:errors.removed'],
      [new ConflictError('held', { key: 'artifact:update.status_refuses' }), 409, 'artifact:update.status_refuses'],
      [
        new ForbiddenError('quota', {
          key: 'common:messages.error.field_exceed_limit',
          params: { field: '$t(label.storage)', limit: 30, need_bytes: 1, free_bytes: 0 },
        }),
        403,
        'common:messages.error.field_exceed_limit',
      ],
    ]
    for (const [error, status, key] of cases) {
      vi.mocked(artifactService.replaceContent).mockRejectedValue(error)
      const res = await call(createMockRequest({ body: validBody() }))
      expect(res.status).toBe(status)
      expect((await res.json()).i18nMessage.key).toBe(key)
    }
  })
})
