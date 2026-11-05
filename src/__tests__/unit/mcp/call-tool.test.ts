/**
 * ★★ `core/mcp/call-tool.ts` — the seam. THE highest-severity file in the MCP architecture.
 *
 * Every other phase reused an ACL that already existed (plan §1.1). This one is the single new
 * enforcement point, because the multi-org grant (§4.1) makes `org_id` a client-supplied TOOL
 * ARGUMENT. A mistake here is not a broken feature — it is one org reading another's analytics.
 *
 * ★ WHAT IS PINNED, AND WHY EACH WOULD BE INVISIBLE OTHERWISE:
 *
 * 1. **No oracle.** Four different failures return the SAME error object. Byte-equality is asserted
 *    rather than "each returns an error", because the leak is in the DIFFERENCE, not in the failure.
 *    A refactor that made "no such org" more helpful would pass any test that only checked for
 *    rejection — and would hand an agent a membership scanner over the whole `organizations` table.
 *
 * 2. **Membership before entitlement.** Reversing them re-opens that oracle through the back door:
 *    `org_not_entitled` for an org you are not in confirms the org exists. Pinned with an org that
 *    fails BOTH, asserting which error wins.
 *
 * 3. **A LIVE membership read, every call.** Plan §4.1 promises a user removed from an org loses it
 *    on the very next call. The obvious "reuse `ensureOrgMember`" refactor silently breaks that —
 *    it is Redis-cached for 30 minutes — and no test that mocks one call would notice.
 *
 * 4. **`org_id` is stripped before the hop.** Asserted on the REAL forwarded query string and body,
 *    never on intent. `create_short_link`'s branches are `.strict()`, so a leftover is a 400.
 *
 * ⚠️ WHAT THIS FILE CANNOT PROVE. Defense in depth (§1.1) — that the SERVICE layer independently
 * rejects a non-member org — is not testable here, because here the back hop is a stub. It is proven
 * against a real server with a real PASETO minted for a non-member; see the Phase 4b report.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

vi.mock('@/core/repositories/member.repository', () => ({
  memberRepo: { isMemberOfOrg: vi.fn() },
}))

vi.mock('@/core/repositories/profile.repository', () => ({
  profileRepo: { findEmailById: vi.fn() },
}))

vi.mock('@/core/repositories/organization.repository', () => ({
  organizationRepo: { getUserOrgs: vi.fn() },
}))

vi.mock('@/shared/lib/plan/plans', () => ({
  ensureOrgPlan: vi.fn(),
  getOrganizationPlan: vi.fn(),
}))

/**
 * ⚠️ A FULL factory, deliberately NOT `importOriginal`. `paseto.ts` parses
 * `AGENT_PASETO_PUBLIC_KEYS` ONCE at module load, and `vitest.config.ts` calls `loadEnvConfig`, so
 * loading the real module drags the real .env into the test. Nothing here needs a real signature —
 * what is under test is WHICH CLAIMS get minted, which the spy captures exactly.
 */
vi.mock('@/shared/lib/agent/paseto', () => ({
  mintAgentToken: vi.fn(() => ({
    token: 'v4.public.MINTED',
    expiresAt: '2026-01-01T00:00:00.000Z',
  })),
}))

import { callTool } from '@/core/mcp/call-tool'
import { __resetDocsCacheForTests } from '@/core/mcp/find-docs'
import { getMcpTool } from '@/core/mcp/tools'
import { McpToolError } from '@/core/mcp/errors'
import { memberRepo } from '@/core/repositories/member.repository'
import { profileRepo } from '@/core/repositories/profile.repository'
import { organizationRepo } from '@/core/repositories/organization.repository'
import { ensureOrgPlan, getOrganizationPlan } from '@/shared/lib/plan/plans'
import { mintAgentToken } from '@/shared/lib/agent/paseto'
import type { McpAccessTokenClaims } from '@/core/services/mcp-oauth.service'

const BASE = 'https://app.li2.test'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const ORG_C = 'cccccccc-1111-4111-8111-cccccccccccc'
const RANDOM_UUID = '99999999-1111-4111-8111-999999999999'

const CLAIMS: McpAccessTokenClaims = {
  userId: USER_ID,
  clientId: 'client_test',
  scopes: ['read', 'write'],
  expiresAt: '2099-01-01T00:00:00.000Z',
}

const tool = (name: string) => getMcpTool(name)!

let fetchMock: ReturnType<typeof vi.fn>

/**
 * ⚠️ `mockImplementation`, not `mockResolvedValue`. A `Response` body is single-use: handing the same
 * object back twice makes the SECOND call fail on `.json()` with an unrelated error. Any test that
 * calls the seam more than once needs a fresh response each time.
 */
function backHopResponds(data: unknown, status = 200) {
  fetchMock.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({ data, success: status < 400, message: 'ok', requestId: 'req_x' }),
        { status, headers: { 'content-type': 'application/json' } }
      )
  )
}

/** The real request the seam made: URL + init, as the back hop would see it. */
function lastHop(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MCP_BACK_HOP_BASE_URL = BASE
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  // The happy path every test starts from: member, entitled, real identity.
  vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(true)
  vi.mocked(ensureOrgPlan).mockResolvedValue(undefined)
  vi.mocked(getOrganizationPlan).mockResolvedValue({ plan_key: 't2' } as never)
  vi.mocked(profileRepo.findEmailById).mockResolvedValue('owner@example.com')
  backHopResponds({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 1. NO ORACLE — the property the whole file exists for
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('the org axis leaks nothing', () => {
  /** The four ways a client can name an org it may not have. */
  async function denialFor(args: Record<string, unknown>): Promise<McpToolError> {
    const error = await callTool(tool('get_org_overview'), args, CLAIMS).catch((e) => e)
    expect(McpToolError.is(error)).toBe(true)
    return error as McpToolError
  }

  it('returns a BYTE-IDENTICAL error for missing, malformed, unknown and non-member org_id', async () => {
    const missing = await denialFor({})
    const notAUuid = await denialFor({ org_id: 'definitely-not-a-uuid' })

    // A UUID nobody owns, and a real org this user is not in, are the same story from outside.
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    const unknownOrg = await denialFor({ org_id: RANDOM_UUID })
    const notAMember = await denialFor({ org_id: ORG_C })

    const messages = [missing, notAUuid, unknownOrg, notAMember].map((e) => e.clientMessage)
    expect(new Set(messages).size).toBe(1)
    const reasons = [missing, notAUuid, unknownOrg, notAMember].map((e) => e.reason)
    expect(new Set(reasons)).toEqual(new Set(['org_access_denied']))
  })

  it('never lets a malformed org_id reach the database', async () => {
    // Without the UUID pre-check, Postgres answers a bad cast with 22P02 — which surfaces as a
    // DIFFERENT tool error and hands back exactly the distinction the test above denies.
    await denialFor({ org_id: 'not-a-uuid' })
    await denialFor({ org_id: '' })
    await denialFor({ org_id: 42 })
    await denialFor({ org_id: null })

    expect(memberRepo.isMemberOfOrg).not.toHaveBeenCalled()
  })

  it('never mints a token or hops for an org it refused', async () => {
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    await denialFor({ org_id: ORG_C })

    expect(mintAgentToken).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 2. ORDER — membership first, entitlement second
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('check order', () => {
  it('reports NON-MEMBERSHIP for an org that also lacks the entitlement', async () => {
    // The oracle through the back door: `org_not_entitled` for an org you are not in would confirm
    // the org exists. Membership must win, and must short-circuit before the plan is even read.
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    vi.mocked(ensureOrgPlan).mockRejectedValue(Object.assign(new Error('no plan'), { status: 402 }))

    const error = (await callTool(tool('get_org_overview'), { org_id: ORG_C }, CLAIMS).catch(
      (e) => e
    )) as McpToolError

    expect(error.reason).toBe('org_access_denied')
    expect(ensureOrgPlan).not.toHaveBeenCalled()
  })

  it('reports NOT ENTITLED once membership is proven — cleanly, never a 500', async () => {
    // Safe to be specific here: unreachable until membership is proven, and `list_orgs` publishes
    // the same fact to the same user anyway.
    vi.mocked(ensureOrgPlan).mockRejectedValue(
      Object.assign(new Error('PlanError'), { status: 402, name: 'PlanError' })
    )

    const error = (await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )) as McpToolError

    expect(McpToolError.is(error)).toBe(true)
    expect(error.reason).toBe('org_not_entitled')
    expect(ensureOrgPlan).toHaveBeenCalledWith(ORG_A, 'mcp_access')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does NOT report a Redis/driver outage as "not entitled"', async () => {
    // A thrown outage is not an entitlement answer. Calling it one tells the user to buy a plan they
    // already have, and hides the incident.
    vi.mocked(ensureOrgPlan).mockRejectedValue(new Error('ECONNREFUSED redis'))

    const error = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )
    expect(McpToolError.is(error)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 3. LIVENESS — the membership read is never cached
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('membership liveness (plan §4.1)', () => {
  it('re-reads membership on EVERY call', async () => {
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    await callTool(tool('get_top_links'), { org_id: ORG_A }, CLAIMS)
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)

    expect(memberRepo.isMemberOfOrg).toHaveBeenCalledTimes(3)
  })

  it('fails the very next call after the user is removed', async () => {
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)

    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    const error = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )

    expect((error as McpToolError).reason).toBe('org_access_denied')
  })

  it('goes through memberRepo, not the Redis-cached permission helper', async () => {
    // `ensureOrgMember` caches for 30 minutes. If a future refactor "reuses the existing helper",
    // the two tests above still pass under mocks but §4.1's promise is broken in production.
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    expect(memberRepo.isMemberOfOrg).toHaveBeenCalledWith(ORG_A, USER_ID)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 4. THE MINT — one token, this call only
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('per-call PASETO', () => {
  it('carries surface:mcp, the CHECKED org, ai_budget 0, and the real email + plan', async () => {
    await callTool(tool('get_analytics_summary'), { org_id: ORG_A, period_days: 7 }, CLAIMS)

    expect(mintAgentToken).toHaveBeenCalledTimes(1)
    expect(vi.mocked(mintAgentToken).mock.calls[0][0]).toEqual({
      org_id: ORG_A,
      user_id: USER_ID,
      // §1.3: NOT inert — `withAgentAuth` copies it into `AuthContext.email`. The grant tables store
      // no email, so it has to be looked up at mint time or the back hop logs an empty user.
      email: 'owner@example.com',
      plan: 't2',
      scopes: ['read', 'write'],
      // Meaningless for MCP: the customer pays for their own model tokens (plan §0).
      ai_budget: 0,
      // The claim the whole of Phase 1b exists for — without it the six routes gate on AI_CHAT.
      surface: 'mcp',
      // Wave 4 WP1: carried so a back-hop route can write "which agent did it" into an audit row.
      // Informational only — nothing on the far side authorizes on it.
      client_id: 'client_test',
    })
  })

  it('mints a FRESH token per call rather than reusing one', async () => {
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    expect(mintAgentToken).toHaveBeenCalledTimes(2)
  })

  it('mints with the org from the ARGUMENT, so two orgs in one session stay separate', async () => {
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    await callTool(tool('get_org_overview'), { org_id: ORG_C }, CLAIMS)

    const orgs = vi.mocked(mintAgentToken).mock.calls.map((c) => c[0].org_id)
    expect(orgs).toEqual([ORG_A, ORG_C])
  })

  it('still mints when the profile row has no email, rather than failing a working call', async () => {
    vi.mocked(profileRepo.findEmailById).mockResolvedValue(null)
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    expect(vi.mocked(mintAgentToken).mock.calls[0][0].email).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 5. THE HOP — org_id dies here
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('back hop', () => {
  it('strips org_id from a GET query string but keeps the real arguments', async () => {
    await callTool(tool('get_top_links'), { org_id: ORG_A, period_days: 30, limit: 5 }, CLAIMS)

    const { url } = lastHop()
    const query = new URL(url).searchParams
    expect(query.get('org_id')).toBeNull()
    expect(query.get('period_days')).toBe('30')
    expect(query.get('limit')).toBe('5')
    expect(url.startsWith(`${BASE}/api/agent/tools/top-links?`)).toBe(true)
  })

  it('strips org_id from the create_short_link BODY — the only tool that can prove it', async () => {
    // `createShortLinkInputSchema`'s branches are `.strict()`, so a leftover `org_id` is a 400 from
    // the route's own safeParse. The five read tools would silently ignore an extra param.
    await callTool(
      tool('create_short_link'),
      { org_id: ORG_A, mode: 'single', destination_url: 'https://example.com', name: 'Hi' },
      CLAIMS
    )

    const { url, init } = lastHop()
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ mode: 'single', destination_url: 'https://example.com', name: 'Hi' })
    expect('org_id' in body).toBe(false)
    expect(url).toBe(`${BASE}/api/agent/tools/create-short-link`)
    expect(init.method).toBe('POST')
  })

  it('presents the minted token as the bearer', async () => {
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    const headers = lastHop().init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer v4.public.MINTED')
  })

  it('omits an absent optional argument instead of sending the string "undefined"', async () => {
    // The routes' Zod schemas apply defaults for an ABSENT key; a literal "undefined" would have to
    // be parsed as a value and would fail.
    await callTool(tool('get_top_links'), { org_id: ORG_A, period_days: undefined }, CLAIMS)
    expect(new URL(lastHop().url).searchParams.has('period_days')).toBe(false)
  })

  it('unwraps .data and drops the APIResponse envelope', async () => {
    backHopResponds({ org_name: 'Acme', plan: 't2', touch_point_count: 3 })
    const result = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)

    const text = result.content[0].text
    expect(JSON.parse(text)).toEqual({ org_name: 'Acme', plan: 't2', touch_point_count: 3 })
    // `requestId` and `processing_time_ms` are internal plumbing, not a third-party contract.
    expect(text).not.toContain('requestId')
    expect(text).not.toContain('processing_time_ms')
  })

  it('never derives the base URL from anything but config', async () => {
    // A `Host`-derived base would let a forged header redirect a freshly minted PASETO — for a real
    // user and a real org — to a server of the caller's choosing.
    process.env.MCP_BACK_HOP_BASE_URL = 'https://elsewhere.test/'
    await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)
    // Trailing slash normalized, so the path never doubles up.
    expect(lastHop().url).toBe('https://elsewhere.test/api/agent/tools/org-overview')
  })

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [400, 'rejected'],
    [500, 'upstream_unavailable'],
    [401, 'upstream_unavailable'],
  ])('maps a back-hop %i onto %s without forwarding its body', async (status, reason) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'INTERNAL: org_members.user_id violated' }), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    )

    const error = (await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )) as McpToolError

    expect(error.reason).toBe(reason)
    expect(error.clientMessage).not.toContain('org_members')
  })

  it('turns a network failure into a clean tool error', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    const error = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )

    expect(McpToolError.is(error)).toBe(true)
    expect((error as McpToolError).clientMessage).not.toContain('ECONNREFUSED')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 6. THE LOCAL TOOLS — off the org axis entirely
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// structuredContent (P0.4)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('structuredContent — the block an outputSchema obliges (P0.4)', () => {
  it('⭐ sends the payload as structuredContent AND as text, identical in both', async () => {
    // The spec requires the structured block from any tool that publishes an `outputSchema`, and
    // asks for the text form as well so a client written before this field still reads the answer.
    // Identical content is the point: a client must never have to pick which one to trust.
    const payload = { org_name: 'Acme', plan: 't2', touch_point_count: 3 }
    backHopResponds(payload)

    const result = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)

    expect(result.structuredContent).toEqual(payload)
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent)
  })

  it('sends it for an mcp-local tool too — the seam, not the hop, attaches it', async () => {
    vi.mocked(organizationRepo.getUserOrgs).mockResolvedValue([{ id: ORG_A, name: 'Acme' }] as never)
    vi.mocked(getOrganizationPlan).mockResolvedValue({
      plan_key: 't2',
      advanced_features_allowed: ['mcp_access'],
    } as never)

    const result = await callTool(tool('list_orgs'), {}, CLAIMS)

    expect(result.structuredContent).toEqual(JSON.parse(result.content[0].text))
    expect(
      (result.structuredContent as { organizations: unknown[] }).organizations
    ).toHaveLength(1)
  })

  it('⛔ an ERROR result carries no structuredContent — an error is not of the tool schema', async () => {
    // A validating client would reject the block on the one path where it most needs to read the
    // message, because an error payload has nothing to do with the tool's declared answer shape.
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    const thrown: unknown = await callTool(
      tool('get_org_overview'),
      { org_id: RANDOM_UUID },
      CLAIMS
    ).catch((caught: unknown) => caught)
    expect(McpToolError.is(thrown)).toBe(true)
    const errorResult = (thrown as McpToolError).toToolResult()

    expect(errorResult.isError).toBe(true)
    expect('structuredContent' in errorResult).toBe(false)
  })

  it('omits it when the payload is not a JSON object — a schema cannot describe a bare value', async () => {
    // No tool answers this way today; every `outputSchema` is object-rooted. The guard exists so a
    // future one that returns an array degrades to the text block instead of shipping a
    // structuredContent that violates its own schema.
    backHopResponds([1, 2, 3])
    const result = await callTool(tool('get_org_overview'), { org_id: ORG_A }, CLAIMS)

    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0].text).toBe('[1,2,3]')
  })
})

describe('list_orgs (seam exception #1)', () => {
  it('is bounded by the GRANT user and takes no org_id', async () => {
    vi.mocked(organizationRepo.getUserOrgs).mockResolvedValue([
      { id: ORG_C, name: 'Zulu' },
      { id: ORG_A, name: 'Acme' },
    ] as never)
    vi.mocked(getOrganizationPlan).mockImplementation(
      async (orgId: string) =>
        ({
          plan_key: 't2',
          advanced_features_allowed: orgId === ORG_A ? ['mcp_access'] : [],
        }) as never
    )

    const result = await callTool(tool('list_orgs'), {}, CLAIMS)

    expect(organizationRepo.getUserOrgs).toHaveBeenCalledWith(USER_ID)
    expect(JSON.parse(result.content[0].text).organizations).toEqual([
      // Sorted by name: PostgREST promises no order, and a list that reshuffles between calls burns
      // the client's prompt cache.
      { id: ORG_A, name: 'Acme', has_mcp_access: true },
      { id: ORG_C, name: 'Zulu', has_mcp_access: false },
    ])
    // No org axis: nothing to check membership against, nothing to mint, nothing to hop to.
    expect(memberRepo.isMemberOfOrg).not.toHaveBeenCalled()
    expect(mintAgentToken).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('badges an org whose plan cannot be resolved as has_mcp_access:false, not an error', async () => {
    // The badge is advisory. An org that cannot resolve a plan cannot pass the gate on the next call
    // either, so `false` is the honest answer — and one broken org must not kill the whole list.
    vi.mocked(organizationRepo.getUserOrgs).mockResolvedValue([
      { id: ORG_A, name: 'Acme' },
    ] as never)
    vi.mocked(getOrganizationPlan).mockRejectedValue(new Error('db down'))

    const result = await callTool(tool('list_orgs'), {}, CLAIMS)
    expect(JSON.parse(result.content[0].text).organizations[0].has_mcp_access).toBe(false)
  })

  it('explains an empty list instead of returning a bare []', async () => {
    vi.mocked(organizationRepo.getUserOrgs).mockResolvedValue([] as never)
    const result = await callTool(tool('list_orgs'), {}, CLAIMS)
    expect(JSON.parse(result.content[0].text).note).toContain('not a member of any organization')
  })
})

describe('the docs pair (seam exception #3 — both halves)', () => {
  const MANIFEST_LINE =
    '- [Deep Links](https://docs.li2.ai/vi/deep-links.md): Setting up deep links.'

  // ⚠️ The manifest cache is module-level, so without this the second test in this block silently
  // reuses the first one's fetch and its call-count assertions stop meaning anything.
  beforeEach(() => __resetDocsCacheForTests())

  it('find_li2_docs touches no identity, no org and no back hop', async () => {
    fetchMock.mockResolvedValue(new Response(MANIFEST_LINE, { status: 200 }))

    const result = await callTool(tool('find_li2_docs'), { query: 'deep links' }, CLAIMS)

    // `.md` is preserved deliberately: the extensionless page is a client-rendered HTML shell the
    // model cannot read, so stripping it would hand back a URL that 200s and says nothing.
    expect(JSON.parse(result.content[0].text).results[0].url).toBe(
      'https://docs.li2.ai/vi/deep-links.md'
    )
    expect(memberRepo.isMemberOfOrg).not.toHaveBeenCalled()
    expect(mintAgentToken).not.toHaveBeenCalled()
    // The one fetch it made is the PUBLIC docs manifest — no bearer, and not our own origin.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://docs.li2.ai/llms.txt')
    expect((init.headers as Record<string, string>).authorization).toBeUndefined()
  })

  it('get_doc_page does the same, and fetches only a URL WE built', async () => {
    // Same posture as its sibling (plan §4.3: one exception, two tools). The extra property here is
    // that the page URL is never the caller's string — it comes out of our own manifest parse.
    fetchMock.mockImplementation(async (url: string) =>
      url === 'https://docs.li2.ai/llms.txt'
        ? new Response(MANIFEST_LINE, { status: 200 })
        : new Response('# Deep Links\n\n<Info>Body text.</Info>', { status: 200 })
    )

    const result = await callTool(tool('get_doc_page'), { path: '/vi/deep-links.md' }, CLAIMS)
    const payload = JSON.parse(result.content[0].text)

    expect(payload.content).toContain('Body text.')
    expect(payload.content).not.toContain('<Info>')
    expect(memberRepo.isMemberOfOrg).not.toHaveBeenCalled()
    expect(mintAgentToken).not.toHaveBeenCalled()
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toEqual(['https://docs.li2.ai/llms.txt', 'https://docs.li2.ai/vi/deep-links.md'])
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).authorization).toBeUndefined()
    }
  })

  it('refuses a path the manifest does not list, without a second fetch', async () => {
    fetchMock.mockResolvedValue(new Response(MANIFEST_LINE, { status: 200 }))

    const error = await callTool(
      tool('get_doc_page'),
      { path: 'https://evil.example/steal.md' },
      CLAIMS
    ).catch((e) => e)

    expect(McpToolError.is(error)).toBe(true)
    // Only the manifest was fetched. This is the seam-level restatement of §4.3's core property:
    // nothing a caller says can cause a request to be made.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://docs.li2.ai/llms.txt')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 7. THE ARTIFACT TOOLS — the one controlled body read (wave 3, spec R8)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('publish_artifact / update_artifact over the back hop', () => {
  const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

  function upstreamRefuses(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('strips org_id from BOTH json bodies — their schemas are .strict(), so a leftover is a 400', async () => {
    await callTool(
      tool('publish_artifact'),
      { org_id: ORG_A, name: 'Bảng giá', html: '<h1>v1</h1>' },
      CLAIMS
    )
    let { url, init } = lastHop()
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Bảng giá', html: '<h1>v1</h1>' })
    expect(url).toBe(`${BASE}/api/agent/tools/publish-artifact`)
    expect(init.method).toBe('POST')

    await callTool(
      tool('update_artifact'),
      { org_id: ORG_A, artifact_id: ARTIFACT_ID, html: '<h1>v2</h1>' },
      CLAIMS
    )
    ;({ url, init } = lastHop())
    expect(JSON.parse(init.body as string)).toEqual({
      artifact_id: ARTIFACT_ID,
      html: '<h1>v2</h1>',
    })
    expect(url).toBe(`${BASE}/api/agent/tools/update-artifact`)
  })

  it('still mints with surface:mcp and still checks membership + entitlement first', async () => {
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    const error = await callTool(
      tool('publish_artifact'),
      { org_id: ORG_C, name: 'x', html: '<p>x</p>' },
      CLAIMS
    ).catch((e) => e)
    expect((error as McpToolError).reason).toBe('org_access_denied')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a 4xx with an i18nMessage goes through the artifact mapper — numbers in, upstream text NOT', async () => {
    fetchMock.mockResolvedValue(
      upstreamRefuses(403, {
        error: true,
        message: 'SECRET internal detail: org_members.user_id',
        i18nMessage: {
          key: 'common:messages.error.field_exceed_limit',
          params: {
            field: '$t(label.storage)',
            limit: 30,
            used_bytes: 28.3 * 1048576,
            need_bytes: 4 * 1048576,
            free_bytes: 1.7 * 1048576,
          },
        },
      })
    )

    const error = (await callTool(
      tool('publish_artifact'),
      { org_id: ORG_A, name: 'x', html: '<p>x</p>' },
      CLAIMS
    ).catch((e) => e)) as McpToolError

    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).toBe(
      'This organization has used 28.3 MB of 30 MB. This file needs 4.0 MB. Delete an artifact in the li2 dashboard to free space.'
    )
    expect(error.clientMessage).not.toContain('SECRET')
    expect(error.clientMessage).not.toContain('org_members')
  })

  it('the quota_live refusal reads "Nothing was created"', async () => {
    fetchMock.mockResolvedValue(
      upstreamRefuses(403, {
        error: true,
        message: 'Live artifact quota exceeded',
        i18nMessage: { key: 'artifact:errors.quota_live', params: { limit: 3 } },
      })
    )
    const error = (await callTool(
      tool('publish_artifact'),
      { org_id: ORG_A, name: 'x', html: '<p>x</p>' },
      CLAIMS
    ).catch((e) => e)) as McpToolError
    expect(error.clientMessage).toContain('Nothing was created')
    expect(error.clientMessage).toContain('3 published artifacts')
  })

  it('a 4xx the mapper does not know falls back to the status bucket, body still not forwarded', async () => {
    fetchMock.mockResolvedValue(
      upstreamRefuses(409, {
        error: true,
        message: 'SECRET: slug taken by org 123',
        i18nMessage: { key: 'common:messages.error.slug_is_taken' },
      })
    )
    const error = (await callTool(
      tool('publish_artifact'),
      { org_id: ORG_A, name: 'x', html: '<p>x</p>', slug: 'bang-gia-t10' },
      CLAIMS
    ).catch((e) => e)) as McpToolError
    expect(error.reason).toBe('conflict')
    expect(error.clientMessage).toContain('slug already in use')
    expect(error.clientMessage).not.toContain('SECRET')
  })

  it('a 4xx whose body is not JSON still lands on the status bucket, never a 500', async () => {
    fetchMock.mockResolvedValue(new Response('<html>nginx 413</html>', { status: 413 }))
    const error = (await callTool(
      tool('update_artifact'),
      { org_id: ORG_A, artifact_id: ARTIFACT_ID, html: '<p>x</p>' },
      CLAIMS
    ).catch((e) => e)) as McpToolError
    expect(McpToolError.is(error)).toBe(true)
    expect(error.reason).toBe('rejected')
  })

  it('does NOT read the 4xx body of the ANALYTICS tools — unchanged by construction', async () => {
    // ⚠️ This test used to name `create_short_link`. SL-0 moved that tool onto the body-reading
    // list ON PURPOSE (checklist S1: a taken slug, a plan limit and a blacklisted destination all
    // collapsed into one status bucket), so the tool that proves the narrow rule has to be one that
    // is still outside the list. `get_top_links` is: it has no refusal that needs a cause.
    const response = upstreamRefuses(403, {
      i18nMessage: { key: 'artifact:errors.quota_live', params: { limit: 3 } },
    })
    const json = vi.spyOn(response, 'json')
    fetchMock.mockResolvedValue(response)

    const error = (await callTool(tool('get_top_links'), { org_id: ORG_A }, CLAIMS).catch(
      (e) => e
    )) as McpToolError

    expect(json).not.toHaveBeenCalled()
    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).not.toContain('Nothing was created')
  })

  it('⭐ DOES read the 4xx body of create_short_link now, and ignores an artifact-only key', async () => {
    // Two facts in one test, and the second is the guard on the first: widening the LIST must not
    // widen what a key MEANS. An artifact quota key arriving for a short-link tool maps to nothing,
    // so the answer is the plain status bucket — not the artifact sentence, and not a crash.
    const response = upstreamRefuses(403, {
      i18nMessage: { key: 'artifact:errors.quota_live', params: { limit: 3 } },
    })
    const json = vi.spyOn(response, 'json')
    fetchMock.mockResolvedValue(response)

    const error = (await callTool(
      tool('create_short_link'),
      { org_id: ORG_A, mode: 'single', destination_url: 'https://example.com' },
      CLAIMS
    ).catch((e) => e)) as McpToolError

    expect(json).toHaveBeenCalled()
    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).not.toContain('published artifacts')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 8. get_artifact / list_artifacts / delete_artifact over the back hop (wave 4 WP1)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('the three wave-4 artifact tools over the back hop', () => {
  const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

  function upstreamRefuses(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('sends the two reads as GET query strings with org_id stripped', async () => {
    await callTool(tool('get_artifact'), { org_id: ORG_A, slug: 'bang-gia-t10' }, CLAIMS)
    let { url, init } = lastHop()
    expect(url).toBe(`${BASE}/api/agent/tools/get-artifact?slug=bang-gia-t10`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()

    await callTool(tool('list_artifacts'), { org_id: ORG_A, limit: 50 }, CLAIMS)
    ;({ url, init } = lastHop())
    expect(url).toBe(`${BASE}/api/agent/tools/list-artifacts?limit=50`)
    // ⛔ `org_id` is an MCP-layer concept: the org travels in the PASETO, and a leftover would be
    // forwarded as a query param the route's `.strict()` schema rejects.
    expect(url).not.toContain('org_id')
    expect(url).not.toContain(ORG_A)
  })

  it('omits an absent optional rather than forwarding the string "undefined"', async () => {
    // `listArtifactsInputSchema` applies `limit`'s default for an ABSENT key only; the string
    // "undefined" would be a 400 and a cursor of "undefined" would silently mean page 1.
    await callTool(tool('list_artifacts'), { org_id: ORG_A }, CLAIMS)
    expect(lastHop().url).toBe(`${BASE}/api/agent/tools/list-artifacts`)
  })

  it('sends delete_artifact as a POST json body with org_id stripped', async () => {
    await callTool(tool('delete_artifact'), { org_id: ORG_A, artifact_id: ARTIFACT_ID }, CLAIMS)
    const { url, init } = lastHop()
    expect(url).toBe(`${BASE}/api/agent/tools/delete-artifact`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ artifact_id: ARTIFACT_ID })
  })

  it('still checks membership and entitlement first for all three', async () => {
    vi.mocked(memberRepo.isMemberOfOrg).mockResolvedValue(false)
    for (const name of ['get_artifact', 'list_artifacts', 'delete_artifact']) {
      const error = await callTool(
        tool(name),
        { org_id: ORG_C, artifact_id: ARTIFACT_ID },
        CLAIMS
      ).catch((e) => e)
      expect((error as McpToolError).reason, name).toBe('org_access_denied')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('⭐ a second delete comes back a SUCCESS with already_removed: true, not an error', async () => {
    // The row is already a tombstone, so the back hop answers 404 — exactly as the human-facing
    // DELETE always has. To the agent that 404 means "what you asked for is already true", and
    // reporting a failure would make a retried delete look broken.
    fetchMock.mockResolvedValue(
      upstreamRefuses(404, {
        error: true,
        message: 'SECRET: artifacts.status = removed',
        i18nMessage: { key: 'artifact:errors.removed' },
      })
    )

    const result = await callTool(
      tool('delete_artifact'),
      { org_id: ORG_A, artifact_id: ARTIFACT_ID },
      CLAIMS
    )

    expect(JSON.parse(result.content[0].text)).toEqual({
      artifact_id: ARTIFACT_ID,
      status: 'removed',
      already_removed: true,
    })
    // Still no upstream text, even on the path that reads the body and succeeds.
    expect(result.content[0].text).not.toContain('SECRET')
  })

  it('⛔ a bare 404 on delete stays an ERROR — a typo must never read as "already deleted"', async () => {
    // The two cases were the SAME key before wave 4 (checklist C4). If this ever flips, deleting a
    // mistyped id — or an id in another org — reports success for a row that was never touched.
    fetchMock.mockResolvedValue(
      upstreamRefuses(404, {
        error: true,
        i18nMessage: {
          key: 'common:messages.error.not_found',
          params: { field: '$t(label.artifact)' },
        },
      })
    )
    const error = (await callTool(
      tool('delete_artifact'),
      { org_id: ORG_A, artifact_id: ARTIFACT_ID },
      CLAIMS
    ).catch((e) => e)) as McpToolError

    expect(McpToolError.is(error)).toBe(true)
    expect(error.reason).toBe('not_found')
    expect(error.clientMessage).toContain('Nothing was deleted')
  })

  it('a 403 from the role gate says ROLE, not quota', async () => {
    fetchMock.mockResolvedValue(
      upstreamRefuses(403, {
        error: true,
        message: "SECRET: You don't have permission to do this action",
        i18nMessage: { key: 'common:messages.error.permission_error' },
      })
    )
    const error = (await callTool(
      tool('delete_artifact'),
      { org_id: ORG_A, artifact_id: ARTIFACT_ID },
      CLAIMS
    ).catch((e) => e)) as McpToolError

    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).toMatch(/role in this organization/)
    expect(error.clientMessage).not.toContain('SECRET')
  })

  it('a 404 on get_artifact names both lookup keys and offers list_artifacts', async () => {
    fetchMock.mockResolvedValue(
      upstreamRefuses(404, {
        error: true,
        i18nMessage: {
          key: 'common:messages.error.not_found',
          params: { field: '$t(label.artifact)' },
        },
      })
    )
    const error = (await callTool(
      tool('get_artifact'),
      { org_id: ORG_A, slug: 'khong-co-dau' },
      CLAIMS
    ).catch((e) => e)) as McpToolError

    expect(error.reason).toBe('not_found')
    expect(error.clientMessage).toContain('list_artifacts')
    expect(error.clientMessage).not.toMatch(/another org/i)
  })

  it('passes a successful read through untouched — only `.data` crosses', async () => {
    backHopResponds({ items: [{ artifact_id: ARTIFACT_ID, short_url: null }], next_cursor: 'eyJ' })
    const result = await callTool(tool('list_artifacts'), { org_id: ORG_A }, CLAIMS)

    expect(JSON.parse(result.content[0].text)).toEqual({
      items: [{ artifact_id: ARTIFACT_ID, short_url: null }],
      next_cursor: 'eyJ',
    })
    // The envelope stays behind: `requestId` and friends are internal plumbing.
    expect(result.content[0].text).not.toContain('requestId')
  })
})
