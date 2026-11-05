/**
 * POST /api/agent/tools/delete-artifact — back-hop target of MCP `delete_artifact` (wave 4 WP1 §4).
 *
 * The route is thin on purpose: the permission gate, the storage-then-tombstone order and the
 * "already removed" key all live in `artifactService.deleteForOrg`. What is pinned here is what the
 * route adds — the write scope, the surface plan gate, the `.strict()` body, the audit row, and the
 * fact that the route does NOT invent a 200 for a tombstone (that answer is assembled at the MCP
 * layer, so the human-facing DELETE keeps reporting what it always did).
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
  artifactService: { deleteForOrg: vi.fn() },
}))

vi.mock('../../../core/helpers/artifact-audit', () => ({
  recordArtifactAudit: vi.fn(),
}))

import { POST } from '../../../app/api/agent/tools/delete-artifact/route'
import { verifyAgentToken } from '../../../shared/lib/agent/paseto'
import { ensureOrgPlan } from '../../../shared/lib/plan/plans'
import { artifactService } from '../../../core/services/artifact.service'
import { recordArtifactAudit } from '../../../core/helpers/artifact-audit'
import {
  NotFoundError,
  PermissionError,
  PlanError,
} from '../../../infrastructure/response/errors/domain.errors'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

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
    nextUrl: new URL('http://localhost:3000/api/agent/tools/delete-artifact'),
    json: vi.fn(async () => body),
  }) as unknown as Parameters<typeof POST>[0]

const call = (request: Parameters<typeof POST>[0]) => POST(request, { params: {} } as never)

describe('POST /api/agent/tools/delete-artifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAgentToken).mockReturnValue(
      makeClaims(['read', 'write'], 'mcp', 'client_claude_desktop') as never
    )
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined as never)
    vi.mocked(artifactService.deleteForOrg).mockResolvedValue(undefined as never)
  })

  it('⭐ a read-only token is refused structurally, before the service', async () => {
    // The scope gate is `withAgentAuth(['write'])`, enforced before the handler body runs — and
    // `tools/list` never showed this tool to a read-only grant in the first place.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read'], 'mcp') as never)
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(403)
    expect(artifactService.deleteForOrg).not.toHaveBeenCalled()
  })

  it('gates on MCP_ACCESS before the body is even parsed', async () => {
    vi.mocked(ensureOrgPlan).mockRejectedValue(new PlanError('no mcp_access'))
    const request = createMockRequest({ artifact_id: ARTIFACT_ID })
    const res = await call(request)
    expect(res.status).toBe(403)
    expect(request.json).not.toHaveBeenCalled()
    expect(artifactService.deleteForOrg).not.toHaveBeenCalled()
  })

  it('deletes with the org from the TOKEN and the user from the context', async () => {
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(200)
    expect(artifactService.deleteForOrg).toHaveBeenCalledWith(ORG, USER, ARTIFACT_ID)
  })

  it('answers the contract block with already_removed: false on a real delete', async () => {
    const body = await (await call(createMockRequest({ artifact_id: ARTIFACT_ID }))).json()
    // ⭐ P0.4 — the payload a client receives as `structuredContent` must match the
    // `outputSchema` this tool publishes. See `__tests__/utils/mcp-output-schema.ts`.
    expectValidToolOutput('delete_artifact', body.data)
    expect(body.data).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'removed',
      already_removed: false,
    })
    // ⛔ No URL in the response: a model handed one would print a link to a page that now answers 410.
    expect(JSON.stringify(body.data)).not.toContain('http')
  })

  it('⭐ writes ONE audit row carrying the agent client_id', async () => {
    // Without it there is no answer to "which agent deleted this": the artifact service writes no
    // audit entry of its own, and the touch point this flow deliberately leaves alone was the only
    // thing that ever wrote one.
    await call(createMockRequest({ artifact_id: ARTIFACT_ID }))

    expect(recordArtifactAudit).toHaveBeenCalledTimes(1)
    expect(recordArtifactAudit).toHaveBeenCalledWith({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'delete',
      tool: 'delete_artifact',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
    })
  })

  it('a token with no client_id still deletes and still audits', async () => {
    // Every chat-panel token omits the claim, and an audit row without it beats no row at all.
    vi.mocked(verifyAgentToken).mockReturnValue(makeClaims(['read', 'write'], 'mcp') as never)
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(200)
    expect(vi.mocked(recordArtifactAudit).mock.calls[0][0].clientId).toBeUndefined()
  })

  it('does NOT audit a delete that failed', async () => {
    vi.mocked(artifactService.deleteForOrg).mockRejectedValue(
      new NotFoundError('Artifact not found', { key: 'common:messages.error.not_found' })
    )
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(404)
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })

  it('⭐ surfaces the tombstone as 404 + artifact:errors.removed, NOT as a 200', async () => {
    // The MCP layer is what turns this one key into `already_removed: true`. If the route answered
    // 200 here instead, the human-facing DELETE would start reporting success for a second delete —
    // a change under the user's eyes that nothing asked for.
    vi.mocked(artifactService.deleteForOrg).mockRejectedValue(
      new NotFoundError('Artifact has been taken down', { key: 'artifact:errors.removed' })
    )
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(404)
    expect((await res.json()).i18nMessage.key).toBe('artifact:errors.removed')
  })

  it('surfaces the role refusal as 403 + permission_error, for the mapper to word', async () => {
    // `deleteForOrg` resolves DELETE_TOUCH_POINT, which the grant's binary `write` scope says
    // nothing about — so a token allowed to publish can still be refused here.
    vi.mocked(artifactService.deleteForOrg).mockRejectedValue(new PermissionError())
    const res = await call(createMockRequest({ artifact_id: ARTIFACT_ID }))
    expect(res.status).toBe(403)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.permission_error')
  })

  it('refuses a malformed body with 400 and never calls the service', async () => {
    for (const body of [
      undefined,
      {},
      { artifact_id: 'bang-gia' },
      // `.strict()`: the MCP layer must have stripped `org_id`, and this is what proves it did.
      { artifact_id: ARTIFACT_ID, org_id: ORG },
      // ⛔ No `confirm` flag in the contract — a model sets its own flags (checklist §D).
      { artifact_id: ARTIFACT_ID, confirm: true },
    ]) {
      const res = await call(createMockRequest(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(artifactService.deleteForOrg).not.toHaveBeenCalled()
    expect(recordArtifactAudit).not.toHaveBeenCalled()
  })
})
