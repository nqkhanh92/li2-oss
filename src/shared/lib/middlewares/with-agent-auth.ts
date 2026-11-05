/**
 * AI Agent Platform — back-hop middleware (Phase 0, architecture §3 boundary 2).
 *
 * Verifies the PASETO agent token forwarded by li2-ai and rebuilds the SAME AuthContext shape
 * `withAuth` produces, so existing core/services run unchanged. The agent's org_id + scopes (which
 * are NOT part of AuthContext) are passed to the handler alongside the context.
 *
 * ⚠️ role = RequestRole.AGENT, never SERVICE. The SERVICE role bypasses plan/permission checks in
 * four places (plans.ts:129, permissions.ts:61/76/85); AGENT must flow the enforcing branch. The
 * checks are all `=== RequestRole.SERVICE`, so AGENT falls through to enforcement automatically.
 */
import { AuthContext, requestContext, RequestRole } from '@/shared/types/request'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { logger } from '@/infrastructure/logging/logger'
import { logRequest } from './log-request'
import {
  AgentScope,
  AgentSurface,
  resolveAgentSurface,
  verifyAgentToken,
} from '@/shared/lib/agent/paseto'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'

const log = logger.child({ service: 'with-agent-auth' })

type NextRouteContext = { params: Record<string, string | string[]> }

/** What the agent back hop exposes to the tool handler. */
export type AgentRequestInfo = {
  orgId: string
  scopes: AgentScope[]
  /** Already defaulted — a token without the claim arrives here as 'chat'. Never optional. */
  surface: AgentSurface
  /**
   * The MCP client_id, when the token came from `/api/mcp` (WP1 §5). Audit/logging only — no route
   * may authorize on it, and `undefined` is normal (every chat token omits the claim).
   */
  clientId?: string
}

type AgentHandlerCtx<P> = {
  params: P
  context: AuthContext // identical shape to withAuth: { userId, email, role, requestId }
  agent: AgentRequestInfo
}

type AgentRouteHandler<P> = (
  req: NextRequest,
  ctx: AgentHandlerCtx<P>
) => Promise<NextResponse | Response>

function extractBearer(request: NextRequest): string {
  const header = request.headers.get('authorization')
  if (!header) throw new UnauthorizedError()
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) throw new UnauthorizedError()
  return match[1].trim()
}

/**
 * Wrap an agent tool route. `requiredScopes` are enforced STRUCTURALLY here, before the handler runs
 * — so a tool can never accidentally execute with a token that lacks its scope (the read/write gate
 * is not left to per-route discipline). A read tool passes ['read']; a future write tool ['write'].
 */
export const withAgentAuth = <P>(requiredScopes: AgentScope[], handler: AgentRouteHandler<P>) => {
  return async (request: NextRequest, params: NextRouteContext): Promise<NextResponse> => {
    const startTime = Date.now()
    let response: NextResponse

    try {
      const token = extractBearer(request)

      let claims
      try {
        claims = verifyAgentToken(token)
      } catch {
        // Any verification failure (sig/exp/iss/aud/kid) -> 401. Do not leak the reason.
        throw new UnauthorizedError()
      }

      const agent: AgentRequestInfo = {
        orgId: claims.org_id,
        scopes: claims.scopes,
        surface: resolveAgentSurface(claims),
        clientId: typeof claims.client_id === 'string' ? claims.client_id : undefined,
      }

      // Structural scope gate — every required scope must be present in the token.
      const missing = requiredScopes.filter((s) => !agent.scopes.includes(s))
      if (missing.length > 0) throw new ForbiddenError()

      const requestId = `req_${uuidv4()}`
      const context: AuthContext = {
        userId: claims.user_id,
        email: claims.email,
        role: RequestRole.AGENT,
        requestId,
      }
      requestContext.enterWith(context)

      // Defense in depth: the mint sites (agent/session, mcp/call-tool) both check membership, but
      // until this line that was the ONLY layer — four read routes take orgId straight from the
      // token and call org-scoped services that never see a userId, so a token minted for a
      // non-member org returned Owner-identical data. Must sit AFTER enterWith: getUserOrgPermissions
      // resolves the actor from requestContext when there is no browser session.
      await ensureOrgMember(agent.orgId)

      const raw = await handler(request, {
        params: params.params as P,
        context,
        agent,
      })

      // Response normalization — mirrors with-auth.ts.
      // TODO(agent-phase-later): this block + the catch below are ~70 lines duplicated verbatim from
      // with-auth.ts. Extract shared normalizeResponse()/handleMiddlewareError() helpers (also kills
      // the unreachable `else if (error instanceof AppError)` branch — AppError extends BaseError, so
      // the BaseError branch catches first in both files). Deferred: with-auth.ts wraps 178 routes →
      // its own PR + review, not this feature branch.
      if (raw instanceof Response) {
        const contentType = raw.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const originalData = await raw.json()
          const safeHeaders = new Headers()
          for (const [key, value] of raw.headers.entries()) {
            if (key.toLowerCase() === 'content-length') continue
            safeHeaders.set(key, value)
          }
          response = NextResponse.json(
            { ...originalData, requestId, processing_time_ms: Date.now() - startTime },
            { status: raw.status, headers: safeHeaders }
          )
        } else if (raw instanceof NextResponse) {
          response = raw
        } else {
          response = new NextResponse(raw.body, { status: raw.status, headers: raw.headers })
        }
      } else {
        response = raw
      }
    } catch (error: any) {
      const isAuthError = error instanceof UnauthorizedError
      const isBaseError = error instanceof BaseError

      if (isBaseError) {
        if (!isAuthError) {
          const isClientError = error.status >= 400 && error.status < 500
          if (isClientError) {
            log.warn({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          } else {
            log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
          }
        }
        response = (error as BaseError).toResponse()
      } else if (error instanceof AppError) {
        log.error({ route: request.url, err: error, duration_ms: Date.now() - startTime })
        response = error.toResponse()
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        response = new AppError(message).toResponse()
      }
    }

    logRequest(request, response.status, startTime)
    return response
  }
}
