import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Regression test for the AGENT back-hop permission trap (Phase 3a).
//
// WHY THIS EXISTS: create_short_link is the first agent write tool. Its back-hop calls
// createTouchPoint/bulkCreateBasicTp, which call ensurePolicy -> getUserOrgPermissions. That function
// used to read ONLY the Casdoor browser session (getSession); an agent (RequestRole.AGENT) has no
// browser session, so it returned undefined -> ensurePolicy DENIED -> every write 403'd in prod. The
// 3a.0 route test mocked the whole touchPointService, so this real path was never exercised and the
// bug shipped green. This test drives the REAL permissions.ts under an AGENT requestContext (session
// null, userId set) so the trap can never silently reopen.

vi.mock('server-only', () => ({}))

vi.mock('../../../shared/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

// Redis cache miss by default; permissions.ts also writes back on the DB path (no-op here).
vi.mock('../../../infrastructure/cache/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}))

vi.mock('../../../infrastructure/database/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

import {
  ensurePolicy,
  ensureOrgMember,
  getPermissionScopeOrThrow,
} from '../../../shared/lib/permission/permissions'
import { nonScopePolicies } from '../../../shared/lib/permission/policy'
import { getSession } from '../../../shared/lib/auth/session'
import { redis } from '../../../infrastructure/cache/redis'
import { createServiceClient } from '../../../infrastructure/database/supabase/server'
import { requestContext, RequestRole } from '../../../shared/types/request'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '../../../shared/types/role-permission'
import { PermissionError } from '../../../infrastructure/response/errors/domain.errors'

const ORG_ID = '123e4567-e89b-12d3-a456-426614174000'
const AGENT_USER_ID = '223e4567-e89b-12d3-a456-426614174111'

/** Build a supabase mock whose .single() resolves to the given org_members row (or error). */
const mockSupabaseReturning = (row: unknown, error: unknown = null) => {
  const query: any = {}
  query.select = vi.fn().mockReturnValue(query)
  query.eq = vi.fn().mockReturnValue(query)
  query.single = vi.fn().mockResolvedValue({ data: row, error })
  const client = { from: vi.fn().mockReturnValue(query) }
  vi.mocked(createServiceClient).mockResolvedValue(client as any)
  return client
}

/** Run fn inside an AGENT requestContext store (session-less, userId present) — the prod condition. */
const asAgent = <T>(userId: string | undefined, fn: () => Promise<T>): Promise<T> =>
  requestContext.run(
    { role: RequestRole.AGENT, userId, requestId: 'req_test' } as any,
    fn
  )

describe('permissions under RequestRole.AGENT (no browser session)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The defining condition of an agent back-hop: getSession() finds no browser session.
    vi.mocked(getSession).mockResolvedValue(null as any)
    vi.mocked(redis.get).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ensurePolicy(add_touch_point) PASSES when the minting agent user has the permission', async () => {
    // WHY: this is the exact call create_short_link makes. Before the fallback it threw 403 for every
    // agent write. The agent user id lives in requestContext (put there by withAgentAuth), so the
    // permission lookup must resolve against org_members for THAT user.
    mockSupabaseReturning({
      roles: {
        permissions: [
          { permission_key: ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT, scope: RolePermissionScope.ALL },
        ],
      },
    })

    await expect(
      asAgent(AGENT_USER_ID, () => ensurePolicy(ORG_ID, nonScopePolicies.add_touch_point))
    ).resolves.toBeUndefined()

    // Proof it resolved via the requestContext userId, not a session: the org_members query was
    // filtered by the agent user id.
    const client = await vi.mocked(createServiceClient).mock.results[0].value
    expect(client.from).toHaveBeenCalledWith('org_members')
    expect(client.from('org_members').eq).toHaveBeenCalledWith('user_id', AGENT_USER_ID)
  })

  it('ensurePolicy DENIES (403) when the agent user lacks the permission — RBAC still enforced', async () => {
    // WHY: the fallback must not become a blanket allow. A Viewer/insufficient role still 403s, exactly
    // as it would in the browser UI. This is the guardrail that keeps the fix honest.
    mockSupabaseReturning({
      roles: { permissions: [{ permission_key: 'view_touch_points', scope: RolePermissionScope.OWN }] },
    })

    await expect(
      asAgent(AGENT_USER_ID, () => ensurePolicy(ORG_ID, nonScopePolicies.add_touch_point))
    ).rejects.toBeInstanceOf(PermissionError)
  })

  it('getPermissionScopeOrThrow resolves the scope for the agent user', async () => {
    // WHY: read tools / scoped writes rely on scope resolution too; it shares the same broken path.
    mockSupabaseReturning({
      roles: {
        permissions: [
          { permission_key: ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS, scope: RolePermissionScope.ALL },
        ],
      },
    })

    const scope = await asAgent(AGENT_USER_ID, () =>
      getPermissionScopeOrThrow(ORG_ID, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
    )
    expect(scope).toBe(RolePermissionScope.ALL)
  })

  it('ensureOrgMember passes for an agent user who is a real org member', async () => {
    // WHY: mint gates on ensureOrgMember with a browser session; the back-hop re-checks membership
    // under AGENT and must reach the same conclusion for the same user.
    mockSupabaseReturning({ roles: { permissions: [] } })

    await expect(
      asAgent(AGENT_USER_ID, () => ensureOrgMember(ORG_ID))
    ).resolves.toBeUndefined()
  })

  it('still DENIES when there is neither a session NOR a userId in context', async () => {
    // WHY: the fallback is userId-gated, not an unconditional bypass. With no identity at all, the
    // permission layer must still refuse — no anonymous writes.
    await expect(
      asAgent(undefined, () => ensurePolicy(ORG_ID, nonScopePolicies.add_touch_point))
    ).rejects.toBeInstanceOf(PermissionError)
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})
