import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the asynq-client module
vi.mock('../asynq-client', () => ({
  enqueueTask: vi.fn(() => Promise.resolve('task-id-123')),
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

describe('Funnel Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueFunnelRetroactiveTask', () => {
    it('should enqueue retroactive task with correct payload', async () => {
      const { enqueueFunnelRetroactiveTask } = await import('../funnel-queue')
      const { enqueueTask } = await import('../asynq-client')

      enqueueFunnelRetroactiveTask('funnel-001', 'org-001')

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(enqueueTask).toHaveBeenCalledWith(
        'task:funnel:retroactive',
        {
          funnel_id: 'funnel-001',
          organization_id: 'org-001',
        },
        {
          queue: 'default',
          maxRetry: 2,
          timeout: 300,
        }
      )
    })

    it('should not throw error if enqueue fails (fire-and-forget)', async () => {
      const { enqueueFunnelRetroactiveTask } = await import('../funnel-queue')
      const { enqueueTask } = await import('../asynq-client')

      // Mock enqueueTask to reject
      vi.mocked(enqueueTask).mockRejectedValueOnce(
        new Error('Redis connection failed')
      )

      // Should not throw - fire-and-forget pattern
      expect(() =>
        enqueueFunnelRetroactiveTask('funnel-002', 'org-002')
      ).not.toThrow()

      // Wait for async operation and error handling
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    it('should pass correct task type matching li2-worker constant', async () => {
      const { enqueueFunnelRetroactiveTask } = await import('../funnel-queue')
      const { enqueueTask } = await import('../asynq-client')

      enqueueFunnelRetroactiveTask('funnel-003', 'org-003')

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Task type must exactly match li2-worker's TASK_FUNNEL_RETROACTIVE = "task:funnel:retroactive"
      expect(enqueueTask).toHaveBeenCalledWith(
        'task:funnel:retroactive',
        expect.any(Object),
        expect.any(Object)
      )
    })
  })
})
