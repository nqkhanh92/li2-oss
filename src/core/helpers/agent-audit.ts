/**
 * ============================================================================
 * One audit row per mutation that came through an agent (WP1 §5, generalised by SL-0 §2).
 * ============================================================================
 *
 * WHY IT EXISTS: neither `artifact.service.ts` nor the short-link write path records WHICH AGENT
 * acted. `createTouchPoint` does call `generateChangesAndLogEvent`, but with no `metadata` at all
 * (checklist S1), so a row created by a third-party MCP client is indistinguishable from one a human
 * created in the dashboard. On this instance the audit log is the only trail there is
 * (`audit-log-lihi-khong-ghi`), and "which agent deleted this" has to be answerable.
 *
 * ⚠️ `module: 'touch_point'`, NOT a new `'artifact'` or `'short_link'` module, and the choice is
 * forced: `ModuleType` (`core/types/org-audit-log.type.ts`) is a closed union consumed by the
 * audit-log UI's filters and by li2-worker's inserter. Adding a member means a change in two other
 * places and an unknown value for every existing reader. `target_table` plus `metadata.surface` is
 * what distinguishes these rows — and an artifact publishes itself AS a touch point, so the module
 * is not a lie for either caller.
 *
 * ★ WHY `targetTable` IS A PARAMETER (SL-0 §2). It was hard-coded `'artifacts'`, which is right for
 * the artifact tools and wrong for the short-link tools: the row they mutate IS the touch point, and
 * an audit entry pointing a reader at the `artifacts` table for an id that is not in it is worse
 * than no entry. One helper with one parameter keeps "an agent mutation is audited" a single rule;
 * `artifact-audit.ts` is the wrapper that supplies the artifact default.
 *
 * ⚠️ BEST EFFORT, and structurally so. `orgAuditLogService.logEvent` is already fire-and-forget (it
 * enqueues to Redis and returns `void`), but "already" is not a guarantee: a Redis client that
 * throws SYNCHRONOUSLY on a closed connection would turn a successful delete into a 500 for the
 * caller — the action having already happened. Hence the try/catch, and hence the rule that this
 * function returns `void` and is never awaited.
 *
 * ⛔ NEVER PUT TOOL ARGUMENTS IN `metadata`. `/api/mcp`'s header commits to not logging arguments,
 * and `set_artifact_access` carries a password in them. Only ids and the fixed strings below cross.
 */
import { orgAuditLogService } from '@/core/services/org-audit-log.service'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'agent-audit' })

export interface AgentAuditEvent {
  orgId: string
  userId: string
  /** The row that changed: an `artifacts.id` or a `touch_points.id`, matching `targetTable`. */
  targetId: string
  /**
   * The table `targetId` is a primary key of. Required here; defaulted by the wrappers.
   *
   * A closed union of the two tables the agent tools mutate, not a `string`: `logEvent` types this
   * field as a table name of the public schema, so a typo would otherwise reach the audit log and
   * point a reader at nothing. Widen it when a third kind of resource gets agent tools.
   */
  targetTable: 'artifacts' | 'touch_points'
  /** Matches `ActionType`. `delete` for a removal, `update` for a field change. */
  action: 'create' | 'update' | 'delete'
  /** Which MCP tool did it — a name from `MCP_TOOL_NAMES`, never free text from a caller. */
  tool?: string
  /** The OAuth client of the connected agent, from `McpAccessTokenClaims.clientId`. */
  clientId?: string
  /** `'mcp'` for a third-party client, `'chat'` for li2-ai's panel, absent for the dashboard. */
  surface?: string
  /**
   * SL-2: which TOOL FIELDS the call moved — `['destination_url', 'expires_at']`, not column names.
   *
   * ⛔ STILL NOT ARGUMENTS, and the distinction is the whole reason this is a separate field rather
   * than a free `metadata` bag. `/api/mcp` commits to not logging tool arguments, and
   * `update_short_link` carries a link password in its own. A list of field NAMES says what an
   * investigation needs — "this client changed the destination" — while carrying no value.
   *
   * Omitted from the row when empty: `update_short_link` succeeds with `changed: []` when every
   * value sent was already in place, and `changed: []` in an audit row reads as data loss rather
   * than as "nothing moved".
   */
  changed?: string[]
  /**
   * Extra fields for the ERROR LOG ONLY — never for the audit row, which is why they are a separate
   * bag rather than a loose rest spread. A wrapper uses it to name the id in its own vocabulary
   * (`artifactId`), so a log line stays greppable by the word the calling code uses.
   */
  logFields?: Record<string, unknown>
}

export function recordAgentAudit(event: AgentAuditEvent): void {
  try {
    orgAuditLogService.logEvent({
      organization_id: event.orgId,
      user_id: event.userId,
      module: 'touch_point',
      action: event.action,
      target_id: event.targetId,
      target_table: event.targetTable,
      metadata: {
        ...(event.tool ? { tool: event.tool } : {}),
        ...(event.clientId ? { client_id: event.clientId } : {}),
        ...(event.surface ? { surface: event.surface } : {}),
        ...(event.changed?.length ? { changed: event.changed } : {}),
      },
    })
  } catch (error) {
    // The action already happened. Losing its audit row is bad; undoing nothing and answering 500 to
    // a caller whose change really did land is worse.
    log.error(
      {
        err: error,
        targetId: event.targetId,
        targetTable: event.targetTable,
        action: event.action,
        ...(event.logFields ?? {}),
      },
      'Could not record agent audit entry'
    )
  }
}

/** The short-link tools' wrapper: same row, pointed at the table their id actually lives in. */
export function recordShortLinkAudit(event: Omit<AgentAuditEvent, 'targetTable'>): void {
  recordAgentAudit({ ...event, targetTable: 'touch_points' })
}
