/**
 * ============================================================================
 * The ARTIFACT face of `agent-audit.ts` (WP1 §5; narrowed to a wrapper by SL-0 §2).
 * ============================================================================
 *
 * Every word of the reasoning — why `module: 'touch_point'`, why this is best-effort and never
 * awaited, why tool arguments must never reach `metadata` — now lives in `agent-audit.ts`, because
 * it applies identically to the short-link tools. Read that file.
 *
 * What is left here is the one thing that IS artifact-specific: `target_table: 'artifacts'`, and the
 * field name `artifactId`. Keeping the name and the shape means the four artifact routes and
 * `artifact-audit.test.ts` did not have to change for SL-0, which is the point: a short-link wave
 * must not be able to break the artifact wave's audit trail.
 */
import { recordAgentAudit, type AgentAuditEvent } from './agent-audit'

export interface ArtifactAuditEvent extends Omit<
  AgentAuditEvent,
  'targetId' | 'targetTable' | 'logFields'
> {
  artifactId: string
  /**
   * Overridable, defaulting to `'artifacts'`. The default is what every artifact tool wants; the
   * parameter exists because `artifact.service.ts` also reaches for `deleteTpById` when it cleans up
   * a half-minted touch point, and a row for THAT belongs to `touch_points`.
   */
  targetTable?: AgentAuditEvent['targetTable']
}

export function recordArtifactAudit(event: ArtifactAuditEvent): void {
  const { artifactId, targetTable = 'artifacts', ...rest } = event
  recordAgentAudit({
    ...rest,
    targetId: artifactId,
    targetTable,
    // Log-only: keeps `artifactId` in the error line this helper's callers already grep for.
    logFields: { artifactId },
  })
}
