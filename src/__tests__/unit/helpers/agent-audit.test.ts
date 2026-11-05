/**
 * `core/helpers/agent-audit.ts` — the audit helper after SL-0 §2 made `target_table` a parameter.
 *
 * `artifact-audit.test.ts` already covers the artifact face and still passes UNCHANGED, which is the
 * point of that wrapper. What is tested here is the part SL-0 added and nothing else could catch:
 * that the table travels, that the short-link wrapper picks the right one, and that the generic
 * helper kept the "can never fail the request" guarantee the artifact one was built on.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/core/services/org-audit-log.service', () => ({
  orgAuditLogService: { logEvent: vi.fn() },
}))

const logError = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: () => ({
      error: (...args: unknown[]) => logError(...args),
      warn: vi.fn(),
      info: vi.fn(),
    }),
  },
}))

import { recordAgentAudit, recordShortLinkAudit } from '@/core/helpers/agent-audit'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const TP_ID = '22222222-2222-4222-8222-222222222222'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

const lastRow = () => vi.mocked(orgAuditLogService.logEvent).mock.calls[0][0] as Record<string, any>

describe('recordAgentAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // `clearAllMocks` clears CALLS, not implementations — without this a throwing implementation
    // leaks into every test after it and passes them for the wrong reason.
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => undefined)
  })

  it('⭐ writes the target_table it was given, not a hard-coded one', () => {
    recordAgentAudit({
      orgId: ORG,
      userId: USER,
      targetId: TP_ID,
      targetTable: 'touch_points',
      action: 'update',
      tool: 'update_short_link',
      clientId: 'https://claude.ai/mcp',
      surface: 'mcp',
    })

    expect(lastRow()).toMatchObject({
      organization_id: ORG,
      user_id: USER,
      target_id: TP_ID,
      target_table: 'touch_points',
      action: 'update',
      metadata: { tool: 'update_short_link', client_id: 'https://claude.ai/mcp', surface: 'mcp' },
    })
  })

  it('⚠️ keeps module: touch_point for every caller — ModuleType is a closed union', () => {
    // A new `'short_link'` module would be an unknown value for the audit-log UI's filters and for
    // li2-worker's inserter. `target_table` is what distinguishes these rows.
    recordAgentAudit({
      orgId: ORG,
      userId: USER,
      targetId: ARTIFACT_ID,
      targetTable: 'artifacts',
      action: 'delete',
    })
    expect(lastRow().module).toBe('touch_point')
  })

  it('⛔ carries no tool arguments — only ids and the three fixed strings', () => {
    recordAgentAudit({
      orgId: ORG,
      userId: USER,
      targetId: TP_ID,
      targetTable: 'touch_points',
      action: 'update',
      tool: 'update_short_link',
    })
    // An absent clientId/surface must not become an explicit undefined in the row.
    expect(Object.keys(lastRow().metadata)).toEqual(['tool'])
  })

  it('⭐ never throws, even when the audit service throws synchronously', () => {
    // The mutation has already happened by the time this runs. A 500 here would report a failure
    // for a change that really did land — the worst of the available answers.
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => {
      throw new Error('redis connection is closed')
    })

    expect(() =>
      recordAgentAudit({
        orgId: ORG,
        userId: USER,
        targetId: TP_ID,
        targetTable: 'touch_points',
        action: 'delete',
      })
    ).not.toThrow()

    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][0]).toMatchObject({
      targetId: TP_ID,
      targetTable: 'touch_points',
      action: 'delete',
    })
  })
})

describe('the two wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => undefined)
  })

  it('recordShortLinkAudit points at touch_points', () => {
    recordShortLinkAudit({ orgId: ORG, userId: USER, targetId: TP_ID, action: 'delete' })
    expect(lastRow()).toMatchObject({ target_id: TP_ID, target_table: 'touch_points' })
  })

  it('⭐ recordArtifactAudit still defaults to artifacts — the wave-4 behaviour is unchanged', () => {
    recordArtifactAudit({ orgId: ORG, userId: USER, artifactId: ARTIFACT_ID, action: 'create' })
    expect(lastRow()).toMatchObject({ target_id: ARTIFACT_ID, target_table: 'artifacts' })
  })

  it('recordArtifactAudit can still override the table for a touch-point cleanup', () => {
    recordArtifactAudit({
      orgId: ORG,
      userId: USER,
      artifactId: TP_ID,
      targetTable: 'touch_points',
      action: 'delete',
    })
    expect(lastRow().target_table).toBe('touch_points')
  })

  it('the artifact wrapper keeps `artifactId` in the ERROR LOG but not in the row', () => {
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => {
      throw new Error('nope')
    })
    recordArtifactAudit({ orgId: ORG, userId: USER, artifactId: ARTIFACT_ID, action: 'delete' })
    expect(logError.mock.calls[0][0]).toMatchObject({ artifactId: ARTIFACT_ID })
  })
})
