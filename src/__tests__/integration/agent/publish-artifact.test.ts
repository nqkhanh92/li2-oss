/**
 * POST /api/agent/tools/publish-artifact — back-hop target of MCP `publish_artifact` (spec R5).
 *
 * "Integration" in the sense of the sibling tests: the real `withAgentAuth` runs (scope gate, surface
 * resolution), only token verification, plan gate, membership and the artifact SERVICE are mocked.
 * Nothing here touches a database.
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
  artifactService: { createAndPublish: vi.fn(), replaceContent: vi.fn(), getForOrg: vi.fn() },
}))

/**
 * WP3: the route imports the Redis client for `idempotency_key`. Mocked because the real module
 * constructs an ioredis client at import time — importing it would open a socket from every test in
 * this file, including the ones that send no key and must not touch Redis at all.
 */
vi.mock('../../../infrastructure/cache/redis', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
}))

import { POST } from '../../../app/api/agent/tools/publish-artifact/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { artifactService } from '../../../core/services/artifact.service'
import { redis } from '../../../infrastructure/cache/redis'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { ARTIFACT_MAX_BYTES } from '../../../core/types/artifact.type'
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

type MockRequest = { json: ReturnType<typeof vi.fn> }

const createMockRequest = ({
  body,
  contentLength,
}: { body?: unknown; contentLength?: number } = {}) => {
  const headers = new Headers({ authorization: 'Bearer fake-token' })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return {
    method: 'POST',
    headers,
    nextUrl: new URL('http://localhost:3000/api/agent/tools/publish-artifact'),
    json: vi.fn(async () => body),
  } as unknown as Parameters<typeof POST>[0] & MockRequest
}

const call = (request: ReturnType<typeof createMockRequest>) =>
  POST(request, { params: {} } as never)

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
  updated_at: '2026-10-05T00:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  serve_url: 'https://app.li2.ai/a/tok',

  preview_url: 'https://app.li2.ai/a/tok',
  download_url: 'https://app.li2.ai/a/tok/download',
  short_url: 'https://s.li2.ai/bang-gia',
  path_qr_code: 'https://supa.example/storage/v1/object/public/proxi-public-user-upload/qr',
})

const HTML = '<!doctype html><h1>v1</h1>'
const validBody = () => ({ name: 'Bảng giá T10', html: HTML })

describe('POST /api/agent/tools/publish-artifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.createAndPublish).mockResolvedValue(liveDto() as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("['read'] token → 403 from the structural gate, before the service", async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)

    const res = await call(createMockRequest({ body: validBody() }))

    expect(res.status).toBe(403)
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS for surface:mcp, BEFORE the body is parsed', async () => {
    const request = createMockRequest({ body: validBody() })
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError())

    const res = await call(request)

    expect(res.status).toBe(403)
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG, 'mcp_access')
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('a token without a surface claim (chat) gates on AI_CHAT', async () => {
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write']) as never)
    await call(createMockRequest({ body: validBody() }))
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG, 'ai_chat')
  })

  it('layer 0: content-length 12 MB → 413 with declared_bytes, json() never called, no service', async () => {
    const declared = 12 * 1024 * 1024
    const request = createMockRequest({ body: validBody(), contentLength: declared })

    const res = await call(request)

    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.i18nMessage.key).toBe('common:messages.error.field_exceed_limit')
    expect(body.i18nMessage.params).toMatchObject({
      field: '$t(label.file)',
      limit: ARTIFACT_MAX_BYTES / 1024 / 1024,
      declared_bytes: declared,
    })
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('a content-length within the headroom passes layer 0', async () => {
    const res = await call(
      createMockRequest({ body: validBody(), contentLength: ARTIFACT_MAX_BYTES + 200 })
    )
    expect(res.status).toBe(201)
  })

  it.each([
    ['missing name', { html: HTML }],
    ['missing html', { name: 'x' }],
    ['leftover org_id (strict)', { ...validBody(), org_id: ORG }],
    ['unknown field', { ...validBody(), foo: 1 }],
    ['name too long', { name: 'a'.repeat(65), html: HTML }],
    ['domain_id not a uuid', { ...validBody(), domain_id: 'my-domain' }],
    ['slug with uppercase', { ...validBody(), slug: 'Bang-Gia' }],
    ['not an object', 'just a string'],
    ['unparsable body', undefined],
  ])('%s → 400, service not called', async (_label, body) => {
    const res = await call(createMockRequest({ body }))
    expect(res.status).toBe(400)
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it.each([['empty string', ''], ['whitespace only', '  \n\t ']])(
    'html %s → 400 agent:artifact.html_empty, service not called',
    async (_label, html) => {
      const res = await call(createMockRequest({ body: { name: 'x', html } }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.i18nMessage.key).toBe('agent:artifact.html_empty')
      expect(artifactService.createAndPublish).not.toHaveBeenCalled()
    }
  )

  it('calls createAndPublish with (org from token, user, { name, file index.html sized in UTF-8 bytes, slug, domain_id })', async () => {
    const html = '<h1>Xin chào</h1>'
    const domainId = '44444444-4444-4444-8444-444444444444'

    const res = await call(
      createMockRequest({
        body: { name: '  Bảng giá T10 ', html, slug: 'bang-gia-t10', domain_id: domainId },
      })
    )

    expect(res.status).toBe(201)
    expect(artifactService.createAndPublish).toHaveBeenCalledTimes(1)
    const [orgArg, userArg, input] = vi.mocked(artifactService.createAndPublish).mock.calls[0]
    expect(orgArg).toBe(ORG)
    expect(userArg).toBe(USER)
    expect(input.name).toBe('Bảng giá T10') // trimmed by the schema
    expect(input.slug).toBe('bang-gia-t10')
    expect(input.domain_id).toBe(domainId)
    expect(input.file.name).toBe('index.html')
    // Bytes, not characters: the accented page is 20 bytes for 17 characters.
    expect(input.file.size).toBe(Buffer.byteLength(html, 'utf8'))
    expect(input.file.size).not.toBe(html.length)
    expect(Buffer.from(await input.file.arrayBuffer()).toString('utf8')).toBe(html)
  })

  it('omits slug and domain_id when absent; slug "" becomes undefined', async () => {
    await call(createMockRequest({ body: { ...validBody(), slug: '' } }))
    const [, , input] = vi.mocked(artifactService.createAndPublish).mock.calls[0]
    expect(input.slug).toBeUndefined()
    expect(input.domain_id).toBeUndefined()
  })

  it('201 + exactly the 9 fields of the shared block, qr_url = path_qr_code verbatim', async () => {
    const res = await call(createMockRequest({ body: validBody() }))

    expect(res.status).toBe(201)
    const body = await res.json()
    // Wave 4 WP1 widened the block from 7 fields to 9: `access_mode` ("is this page public?") and
    // `updated_at` ("when did it last change?") are questions an agent is routinely asked and could
    // not previously answer. ADDITIVE only — every wave-3 field keeps its name and its value.
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('publish_artifact', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'live',
      name: 'Bảng giá T10',
      access_mode: 'public',
      short_url: 'https://s.li2.ai/bang-gia',
      serve_url: 'https://app.li2.ai/a/tok',
      qr_url: 'https://supa.example/storage/v1/object/public/proxi-public-user-upload/qr',
      size_bytes: 27,
      updated_at: '2026-10-05T00:00:00.000Z',
    })
    // ⛔ STILL A CLOSED LIST. `preview_url` and `download_url` are NOT in it: they point at
    // `/a/<token>` on the app's own origin, which is not the address to share (decision 17/10), and
    // a model handed two URLs for the same page prints the wrong one.
    expect(body.data.preview_url).toBeUndefined()
    expect(body.data.download_url).toBeUndefined()
    // Nothing internal leaks through the projection.
    expect(JSON.stringify(body.data)).not.toContain('serve_token')
    expect(JSON.stringify(body.data)).not.toContain('storage_path')
  })

  it('a DTO without short_url now answers 200 with null, not a 500 (WP1 §2)', async () => {
    // The old guard threw a 500 on a null `short_url`, reasoning that `publish()` always overlays the
    // touch point it just minted. That held while publish/update were the only callers; wave 4's
    // `get_artifact` and `list_artifacts` legitimately return a DRAFT, which has no touch point at
    // all — and a 500 for an artifact the user can see in their dashboard is the wrong answer. The
    // contract declares the field nullable and every tool description says so.
    vi.mocked(artifactService.createAndPublish).mockResolvedValue({
      ...liveDto(),
      short_url: null,
      path_qr_code: null,
    } as never)
    const res = await call(createMockRequest({ body: validBody() }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.short_url).toBeNull()
    expect(body.data.qr_url).toBeNull()
  })

  it('surfaces service errors with their status and i18nMessage (403 quota, 409 slug)', async () => {
    vi.mocked(artifactService.createAndPublish).mockRejectedValue(
      new ForbiddenError('Live artifact quota exceeded', {
        key: 'artifact:errors.quota_live',
        params: { limit: 3 },
      })
    )
    let res = await call(createMockRequest({ body: validBody() }))
    expect(res.status).toBe(403)
    expect((await res.json()).i18nMessage).toEqual({
      key: 'artifact:errors.quota_live',
      params: { limit: 3 },
      defaultMessage: 'Live artifact quota exceeded',
    })

    vi.mocked(artifactService.createAndPublish).mockRejectedValue(
      new ConflictError('Slug was taken', { key: 'common:messages.error.slug_is_taken' })
    )
    res = await call(createMockRequest({ body: validBody() }))
    expect(res.status).toBe(409)
  })
})

/**
 * WP3 — `idempotency_key` as the ROUTE sees it. The protocol itself is covered exhaustively in
 * `src/__tests__/unit/helpers/artifact-idempotency.test.ts` against an in-memory client; what is
 * asserted here is only what the route is responsible for: the three branches it chooses between,
 * and the fact that a call WITHOUT a key never reaches Redis.
 */
describe('POST /api/agent/tools/publish-artifact — idempotency_key (WP3)', () => {
  const KEY = 'publish-bang-gia-t10'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write'], 'mcp') as never)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.createAndPublish).mockResolvedValue(liveDto() as never)
    vi.mocked(redis.set).mockResolvedValue('OK' as never)
    vi.mocked(redis.get).mockResolvedValue(null as never)
    vi.mocked(redis.del).mockResolvedValue(1 as never)
  })

  it('no key → Redis is not touched at all, and the answer is the unchanged 201', async () => {
    const res = await call(createMockRequest({ body: validBody() }))

    expect(res.status).toBe(201)
    expect(redis.set).not.toHaveBeenCalled()
    expect(redis.get).not.toHaveBeenCalled()
    expect(redis.del).not.toHaveBeenCalled()
    // A fresh publish carries NO flag — the field exists only on a replay (see the type's comment).
    expect((await res.json()).data.idempotent_replay).toBeUndefined()
  })

  it('a free key → claims, publishes, then records the artifact_id against the key', async () => {
    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    expect(res.status).toBe(201)
    expect(artifactService.createAndPublish).toHaveBeenCalledTimes(1)
    // claim, then complete — in that order, and the claim is before the service call.
    expect(vi.mocked(redis.set).mock.calls[0].slice(1)).toEqual([
      'pending',
      'EX',
      86_400,
      'NX',
    ])
    expect(vi.mocked(redis.set).mock.calls[1].slice(1)).toEqual([ARTIFACT_ID, 'KEEPTTL'])
    expect(redis.del).not.toHaveBeenCalled()
  })

  it('a key that already published → 200 with the SAME artifact, idempotent_replay, no publish', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as never) // SET NX lost
    vi.mocked(redis.get).mockResolvedValue(ARTIFACT_ID as never)
    vi.mocked(artifactService.getForOrg).mockResolvedValue(liveDto() as never)

    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    expect(res.status).toBe(200) // not 201: this call created nothing
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
    expect(artifactService.getForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    const body = await res.json()
    expect(body.data.artifact_id).toBe(ARTIFACT_ID)
    expect(body.data.idempotent_replay).toBe(true)
    // The shared block is intact alongside the flag — a replay is a full answer, not a stub.
    expect(body.data.short_url).toBe('https://s.li2.ai/bang-gia')
  })

  it('a replay whose artifact was deleted afterwards → 404 with its OWN key, never a re-publish', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as never)
    vi.mocked(redis.get).mockResolvedValue(ARTIFACT_ID as never)
    vi.mocked(artifactService.getForOrg).mockRejectedValue(
      new NotFoundError('Artifact not found', { key: 'common:messages.error.not_found' })
    )

    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    expect(res.status).toBe(404)
    expect((await res.json()).i18nMessage.key).toBe('agent:artifact.idem_artifact_gone')
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('a key still in flight → 409 with its own key, and nothing is published', async () => {
    vi.mocked(redis.set).mockResolvedValue(null as never)
    vi.mocked(redis.get).mockResolvedValue('pending' as never)

    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    expect(res.status).toBe(409)
    expect((await res.json()).i18nMessage.key).toBe('agent:artifact.idem_in_progress')
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('Redis down WITH a key → 503 and the publish is never attempted (fail CLOSED)', async () => {
    vi.mocked(redis.set).mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) as never
    )

    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    expect(res.status).toBe(503)
    expect((await res.json()).i18nMessage.key).toBe('agent:artifact.idem_unavailable')
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })

  it('Redis down WITHOUT a key → 201, because that call never promised idempotency', async () => {
    vi.mocked(redis.set).mockRejectedValue(new Error('connect ECONNREFUSED') as never)

    const res = await call(createMockRequest({ body: validBody() }))

    expect(res.status).toBe(201)
  })

  it('a FAILED publish releases the key, so the same key can be retried after the user frees quota', async () => {
    vi.mocked(artifactService.createAndPublish).mockRejectedValue(
      new ForbiddenError('Live artifact quota exceeded', {
        key: 'artifact:errors.quota_live',
        params: { limit: 3 },
      })
    )

    const res = await call(createMockRequest({ body: { ...validBody(), idempotency_key: KEY } }))

    // The publish's own error reaches the caller unchanged — the release must not mask it.
    expect(res.status).toBe(403)
    expect((await res.json()).i18nMessage.key).toBe('artifact:errors.quota_live')
    expect(redis.del).toHaveBeenCalledTimes(1)
  })

  it('a malformed key is a 400 from the schema, before Redis and before the service', async () => {
    const res = await call(
      createMockRequest({ body: { ...validBody(), idempotency_key: 'has spaces' } })
    )

    expect(res.status).toBe(400)
    expect(redis.set).not.toHaveBeenCalled()
    expect(artifactService.createAndPublish).not.toHaveBeenCalled()
  })
})
