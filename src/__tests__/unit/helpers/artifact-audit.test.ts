/**
 * `core/helpers/artifact-audit.ts` — one audit row per agent-driven artifact mutation (WP1 §5).
 *
 * Two properties, and the second one is the reason this file exists rather than an inline call:
 *   1. the row carries the OAuth `client_id`, which is the only way to answer "which agent did it";
 *   2. a failure to record it CANNOT fail the request — the action has already happened.
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

import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const USER = '11111111-1111-4111-8111-111111111111'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

describe('recordArtifactAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // `clearAllMocks` clears CALLS, not implementations — without this the throwing implementation
    // one test installs would leak into every test after it and pass them for the wrong reason.
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => undefined)
  })

  it('⭐ records the artifact id and the agent client_id', async () => {
    recordArtifactAudit({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'delete',
      tool: 'delete_artifact',
      clientId: 'client_claude_desktop',
      surface: 'mcp',
    })

    expect(orgAuditLogService.logEvent).toHaveBeenCalledWith({
      organization_id: ORG,
      user_id: USER,
      // `touch_point` and not a new `'artifact'` module: `ModuleType` is a closed union read by the
      // audit-log UI's filters and by li2-worker's inserter. `target_table` is what distinguishes
      // these rows, and an artifact publishes itself AS a touch point.
      module: 'touch_point',
      action: 'delete',
      target_id: ARTIFACT_ID,
      target_table: 'artifacts',
      metadata: { tool: 'delete_artifact', client_id: 'client_claude_desktop', surface: 'mcp' },
    })
  })

  it('omits what it was not given rather than writing nulls', () => {
    recordArtifactAudit({ orgId: ORG, userId: USER, artifactId: ARTIFACT_ID, action: 'update' })
    expect(vi.mocked(orgAuditLogService.logEvent).mock.calls[0][0].metadata).toEqual({})
  })

  it('⛔ carries NO tool arguments — a password travels in those', () => {
    // `/api/mcp` commits in its header to not logging arguments, and WP2's `set_artifact_access`
    // takes a password in them. Only ids and fixed strings may cross; this asserts the shape is
    // closed rather than a spread of whatever the caller had.
    recordArtifactAudit({
      orgId: ORG,
      userId: USER,
      artifactId: ARTIFACT_ID,
      action: 'update',
      tool: 'set_artifact_access',
      clientId: 'client_x',
      surface: 'mcp',
    })
    const event = vi.mocked(orgAuditLogService.logEvent).mock.calls[0][0]
    expect(Object.keys(event.metadata!).sort()).toEqual(['client_id', 'surface', 'tool'])
    expect(JSON.stringify(event)).not.toMatch(/password|html/i)
  })

  it('⭐ swallows a throwing audit layer and logs it — the delete already happened', () => {
    // `logEvent` is fire-and-forget today, but a Redis client throwing SYNCHRONOUSLY on a closed
    // connection would otherwise turn a completed delete into a 500 for the caller.
    vi.mocked(orgAuditLogService.logEvent).mockImplementation(() => {
      throw new Error('redis connection closed')
    })

    expect(() =>
      recordArtifactAudit({ orgId: ORG, userId: USER, artifactId: ARTIFACT_ID, action: 'delete' })
    ).not.toThrow()

    // Silently losing the row would be the other failure: this is the line that makes it findable.
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][0]).toMatchObject({ artifactId: ARTIFACT_ID, action: 'delete' })
  })

  it('returns void, so it can never be awaited into the request path', () => {
    expect(
      recordArtifactAudit({ orgId: ORG, userId: USER, artifactId: ARTIFACT_ID, action: 'create' })
    ).toBeUndefined()
  })
})
