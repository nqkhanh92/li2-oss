import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OrgAuditLog } from '@/core/services/org-audit-log.service'

// Mock the asynq-client module
vi.mock('../asynq-client', () => ({
  enqueueTask: vi.fn(() => Promise.resolve()),
  isQueueHealthy: vi.fn(() => Promise.resolve(true)),
}))

// Mock the infrastructure/logging module
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    })),
  },
}))

describe('Audit Log Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueAuditLog', () => {
    it('should enqueue audit log without throwing error', async () => {
      // Import after mocking
      const { enqueueAuditLog } = await import('../audit-log-queue')
      const { enqueueTask } = await import('../asynq-client')

      const testEvent: OrgAuditLog = {
        organization_id: 'org-123',
        user_id: 'user-456',
        module: 'tag',
        action: 'create',
        target_id: 'tag-789',
        target_name: 'Test Tag',
        target_table: 'tags',
      }

      // Should not throw even if enqueueTask resolves
      expect(() => enqueueAuditLog(testEvent)).not.toThrow()

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Verify enqueueTask was called
      expect(enqueueTask).toHaveBeenCalledWith(
        'task:audit_log:create',
        expect.objectContaining({
          ...testEvent,
          created_at: expect.any(String),
        }),
        {
          queue: 'audit_logs',
          maxRetry: 3,
          timeout: 30,
        }
      )
    })

    it('should not throw error if enqueue fails', async () => {
      const { enqueueAuditLog } = await import('../audit-log-queue')
      const { enqueueTask } = await import('../asynq-client')

      // Mock enqueueTask to reject
      vi.mocked(enqueueTask).mockRejectedValueOnce(
        new Error('Redis connection failed')
      )

      const testEvent: OrgAuditLog = {
        organization_id: 'org-123',
        module: 'tag',
        action: 'create',
      }

      // Should not throw - fire-and-forget pattern
      expect(() => enqueueAuditLog(testEvent)).not.toThrow()

      // Wait for async operation and error handling
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  })

  describe('enqueueBulkAuditLogs', () => {
    it('should enqueue multiple audit logs', async () => {
      const { enqueueBulkAuditLogs } = await import('../audit-log-queue')
      const { enqueueTask } = await import('../asynq-client')

      const testEvents: OrgAuditLog[] = [
        {
          organization_id: 'org-123',
          module: 'tag',
          action: 'create',
          target_id: 'tag-1',
        },
        {
          organization_id: 'org-123',
          module: 'tag',
          action: 'create',
          target_id: 'tag-2',
        },
      ]

      expect(() => enqueueBulkAuditLogs(testEvents)).not.toThrow()

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Verify enqueueTask was called twice
      expect(enqueueTask).toHaveBeenCalledTimes(2)
    })

    it('should handle empty array', async () => {
      const { enqueueBulkAuditLogs } = await import('../audit-log-queue')
      const { enqueueTask } = await import('../asynq-client')

      expect(() => enqueueBulkAuditLogs([])).not.toThrow()

      // Verify enqueueTask was not called
      expect(enqueueTask).not.toHaveBeenCalled()
    })
  })
})
