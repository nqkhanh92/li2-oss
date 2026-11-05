/**
 * ============================================================================
 * MCP OAuth consent screen (plan Phase 3b, §4 / §4.1).
 * ============================================================================
 *
 * The one surface where a user decides what a third-party MCP client may do with their Li2 account.
 * `/api/mcp/oauth/authorize` validates the request and redirects here; the POST below is the only
 * caller of `issueAuthorizationCode`.
 *
 * ─── WHY THERE IS NO ORGANISATION PICKER ───────────────────────────────────────────────────────
 * The grant is USER-level (plan §4.1). `org_id` is an argument on every tool call, checked live at
 * mint time against the caller's memberships, so a picker here would be theatre: it could not bind
 * anything, and it would imply a limit the token does not carry. The organisation list below is
 * therefore INFORMATIONAL — it tells the user which orgs this client will be able to reach and which
 * of them are entitled, and the `MCP_ACCESS` badges are a snapshot, not a gate. Enforcement is per
 * call, and a plan that changes an hour after consent changes the answer an hour after consent.
 *
 * ─── WHY THIS IS A PLAIN HTML FORM ─────────────────────────────────────────────────────────────
 * No `'use client'`, no Radix checkbox, no server action. The last step of this flow is a redirect
 * to a third-party origin carrying an authorization code, which is exactly the navigation a native
 * form POST does correctly and reliably. A consent screen that stops working when hydration fails is
 * a consent screen that strands users mid-connect with no way back.
 */
import { redirect } from 'next/navigation'
import {
  isLoopbackRedirectUri,
  mcpOAuthService,
  mintConsentToken,
  OAuthProtocolError,
  type McpAuthorizationRequest,
} from '@/core/services/mcp-oauth.service'
import { organizationService } from '@/core/services/organization.service'
import { getOrganizationPlan } from '@/shared/lib/plan/plans'
import { getSession } from '@/shared/lib/auth/session'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { logger } from '@/infrastructure/logging/logger'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { AlertTriangle, Building2, Check, Globe, Laptop, Pencil, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'mcp-consent' })

const CONSENT_ACTION = '/api/mcp/oauth/consent'

type SearchParams = Record<string, string | string[] | undefined>

/** Only the parameters the authorization request is made of. Anything else on the URL — the
 *  `login_completed` flag `/auth/callback` appends, a tracking parameter — is dropped rather than
 *  fed back into validation or echoed into the form. */
const OAUTH_PARAM_KEYS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'resource',
] as const

function toOAuthParams(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of OAUTH_PARAM_KEYS) {
    const value = searchParams[key]
    if (typeof value === 'string') params.set(key, value)
  }
  return params
}

type OrgSummary = { id: string; name: string; hasMcpAccess: boolean }

/**
 * The host the authorization code will actually be delivered to.
 *
 * The URI is already proven registered by the time this runs, but it is still parsed defensively:
 * a throw here would replace a working consent screen with a 500 in the middle of a connect.
 */
function redirectHostname(redirectUri: string): string {
  try {
    return new URL(redirectUri).hostname
  } catch {
    return redirectUri
  }
}

/**
 * The user's organisations, each badged with whether its plan currently includes `MCP_ACCESS`.
 *
 * An entitlement lookup that fails is reported as "not entitled" rather than allowed to throw. This
 * list decides nothing — it is a preview of what Phase 4 will re-check on every call — so a plan
 * lookup hiccup must not be able to block a legitimate connect.
 */
async function loadOrganizations(userId: string): Promise<OrgSummary[]> {
  const orgs = await organizationService.getUserOrgs(userId)

  return Promise.all(
    (orgs ?? []).map(async (org) => {
      let hasMcpAccess = false
      try {
        const plan = await getOrganizationPlan(org.id)
        hasMcpAccess = (plan?.advanced_features_allowed ?? []).includes(
          ADVANCED_FEATURE_KEYS.MCP_ACCESS
        )
      } catch (error) {
        log.warn({ err: error, orgId: org.id }, '[mcp-consent] entitlement lookup failed')
      }
      return { id: org.id, name: org.name ?? 'Untitled organization', hasMcpAccess }
    })
  )
}

export default async function McpConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = toOAuthParams(searchParams)

  /**
   * The root middleware normally bounces a logged-out user to login with this whole URL preserved
   * (`saveRedirectPath`). This check is the second line: its `publicPath`/`saveRedirectPath` tests
   * are substring matches against the full URL, and an OAuth request carries attacker-influenced
   * query values. A consent screen must never render without knowing WHOSE consent it is collecting,
   * so it establishes that itself rather than inheriting the answer.
   */
  const session = await getSession()
  if (!session) {
    const target = `/mcp/consent${params.size ? `?${params.toString()}` : ''}`
    redirect(`/auth/login?redirect_to=${encodeURIComponent(target)}`)
  }

  let request: McpAuthorizationRequest
  try {
    /**
     * ★ RE-VALIDATED HERE, not trusted from `/authorize`. The user reached this page by following a
     * redirect and can edit the address bar; the parameters arriving here are as untrusted as the
     * ones that arrived there. Re-running the check also means the request rendered on screen is
     * provably the same request the POST will sign and issue against.
     */
    request = await mcpOAuthService.validateAuthorizationRequest(params)
  } catch (error) {
    /**
     * `.is()`, not `instanceof`. This page is an app-page bundle and the service it throws from may
     * be the copy compiled into a different route's bundle, so the two class objects are not the
     * same object. See `OAUTH_PROTOCOL_ERROR` in the service.
     *
     * ⚠️ `redirect()` throws a Next control-flow signal, so it must not run inside this catch's own
     * try — it is re-thrown deliberately and Next unwinds it into a real redirect.
     */
    if (OAuthProtocolError.is(error) && error.redirectTo) {
      // Client and redirect_uri are both proven, so RFC 6749 §4.1.2.1 allows reporting by redirect.
      redirect(error.redirectTo)
    }
    if (OAuthProtocolError.is(error)) return <ConsentProblem message={error.description} />
    log.error({ err: error }, '[mcp-consent] authorization request could not be validated')
    return <ConsentProblem message="This connection request could not be verified." />
  }

  const organizations = await loadOrganizations(session.id)
  const canRequestWrite = request.requestedScopes.includes('write')
  const entitledCount = organizations.filter((org) => org.hasMcpAccess).length

  /**
   * ★ THE HUMAN HALF OF THE LOOPBACK PORT RELAXATION.
   *
   * `redirectUriIsRegistered` ignores the port of a loopback URI, because RFC 8252 §7.3 requires it
   * and Claude Code cannot connect otherwise. The cost is that ANY process on this user's machine
   * can bind a port and satisfy the match. Nothing server-side can tell those two apart, so the user
   * reading this screen is the only remaining control — which is why the destination is shown here
   * and not left as an invisible protocol parameter.
   *
   * The warning is keyed on ALL registered URIs being loopback, not just the one in play: a client
   * that also has a real https callback is a hosted product whose identity is anchored to a domain,
   * and warning about it would train users to click through the warning that matters.
   */
  const redirectHost = redirectHostname(request.redirectUri)
  const isLocalOnlyClient =
    request.client.redirectUris.length > 0 &&
    request.client.redirectUris.every(isLoopbackRedirectUri)

  // Root <body> is `h-screen overflow-y-hidden` for the dashboard shell, so this page must own its
  // own scroll: fixed height + overflow-y-auto, and `my-auto` (not items-center) so a card taller
  // than the viewport starts at the top instead of being clipped at both ends.
  return (
    <main className="flex h-screen justify-center overflow-y-auto bg-slate-50 p-4">
      <div className="my-auto w-full max-w-lg">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Connect an application
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              {/* React escapes this. `client_name` is attacker-controlled: it comes straight from a
                DCR body or a fetched CIMD document and is never reviewed by anyone. */}
              <span className="break-words">{request.client.clientName}</span> wants to access your
              Li2 account
            </h1>
            <p className="text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-900">{session.email}</span>
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form method="POST" action={CONSENT_ACTION} className="space-y-6">
              {/* The request travels back verbatim so the POST validates the same input, then the
                signed token below proves it was not edited in between. */}
              {OAUTH_PARAM_KEYS.map((key) => {
                const value = params.get(key)
                return value === null ? null : (
                  <input key={key} type="hidden" name={key} value={value} />
                )
              })}
              <input
                type="hidden"
                name="consent_token"
                value={mintConsentToken(session.id, request)}
              />

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  This application will be able to
                </h2>

                {/* Conditional because a client may request `scope=write` on its own. Showing read as
                  granted when it was never requested would describe a grant we are not issuing. */}
                {request.requestedScopes.includes('read') && (
                  <div className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-900">
                        Read your links and analytics
                      </p>
                      <p className="text-sm text-slate-600">
                        In any organization you belong to, limited to what your role already lets
                        you see.
                      </p>
                    </div>
                  </div>
                )}

                {canRequestWrite && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                    {/*
                    ⚠️ PRE-TICKED BY DECISION (Kei, 2026-07-30) — this reverses plan §4's original
                    "write only on an explicit tick". The rationale is that MCP is not the chat panel:
                    a user who connects a client is deliberately wiring up a tool and expects it to
                    work, whereas the chat panel is a conversational surface where a per-action
                    approval card already exists.
                    The trade-off being accepted, stated plainly because it is not visible from here:
                    MCP writes have NO per-action approval anywhere downstream, so this box is the
                    only human gate, and it now defaults to open for every org the user belongs to
                    for the life of the grant. The copy below therefore has to describe what IS
                    granted rather than what could be — a user who unticks is choosing read-only.
                    Since wave 3 this same box also covers PUBLISHING PUBLIC CONTENT (publish_artifact /
                    update_artifact): no second scope was added, so a grant that already had `write`
                    sees the two tools without re-consent. The copy says "public" for that reason.
                  */}
                    <input
                      type="checkbox"
                      name="grant_write"
                      value="on"
                      defaultChecked
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-slate-300 accent-primary"
                    />
                    <div className="space-y-0.5">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        <Pencil className="h-4 w-4 text-slate-500" />
                        Create short links and publish pages
                      </p>
                      <p className="text-sm text-slate-600">
                        Pages published this way are public: anyone with the link can open them.
                        Allowed in{' '}
                        <span className="font-semibold">every organization you belong to</span>, not
                        just one, until you disconnect. Untick for read-only access.
                      </p>
                    </div>
                  </label>
                )}
              </section>

              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Your organizations
                </h2>
                <p className="text-sm text-slate-600">
                  Access is checked for each request, so this list reflects your plans right now.
                </p>

                {organizations.length === 0 ? (
                  <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
                    You do not belong to any organization yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
                    {organizations.map((org) => (
                      <li key={org.id} className="flex items-center justify-between gap-3 p-3">
                        <span className="truncate text-sm text-slate-900">{org.name}</span>
                        <Badge variant={org.hasMcpAccess ? 'success' : 'outline'} size="xs">
                          {org.hasMcpAccess ? 'MCP enabled' : 'Plan upgrade needed'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                {organizations.length > 0 && entitledCount === 0 && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    None of your organizations include MCP access yet. You can still connect, but
                    tool calls will fail until a plan includes it.
                  </p>
                )}
              </section>

              {/* Deliberately the LAST section: it is the fact most worth holding in mind at the
                moment the Allow button is pressed. */}
              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  {isLocalOnlyClient ? (
                    <Laptop className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Globe className="h-4 w-4 text-slate-500" />
                  )}
                  Where access is sent
                </h2>
                <p className="text-sm text-slate-600">
                  If you allow, Li2 sends the access code to{' '}
                  {/* React escapes this, and it is a hostname the client registered — never a value
                    lifted straight off the current URL. */}
                  <span className="break-all font-mono font-semibold text-slate-900">
                    {redirectHost}
                  </span>
                  . Do not continue if you do not recognise it.
                </p>

                {isLocalOnlyClient && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      This application runs on your own computer, so Li2 cannot verify who it is.
                      Only continue if you just started it yourself and are expecting this screen.
                    </span>
                  </p>
                )}
              </section>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {/* Denial is a real OAuth outcome, not a "go back" link: it redirects to the client
                  with `error=access_denied` so the client stops waiting (RFC 6749 §4.1.2.1). */}
                <Button type="submit" name="decision" value="deny" variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" name="decision" value="allow">
                  Allow access
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

/**
 * Shown only for failures that RFC 6749 §4.1.2.1 forbids reporting by redirect — an unknown client,
 * or a `redirect_uri` that is not registered. Sending the user onward in either case would be
 * handing them to a URI nobody has verified.
 */
function ConsentProblem({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            This connection request is not valid
          </h1>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-600">{message}</p>
          <p className="text-sm text-slate-600">
            Nothing has been shared. Start the connection again from the application you were using.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
