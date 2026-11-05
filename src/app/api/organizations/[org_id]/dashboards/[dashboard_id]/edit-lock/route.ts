import { dashboardEditLockService } from '@/core/services/dashboard-edit-lock.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { z } from 'zod'

const editLockSchema = z.object({
  action: z.enum(['acquire', 'heartbeat', 'release']),
})

export const POST = withAuth<{ org_id: string; dashboard_id: string }>(
  async (request, { params, context }) => {
    // sendBeacon sends text/plain — fallback to request.text() + JSON.parse
    const contentType = request.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? await request.json()
      : JSON.parse(await request.text())
    const { action } = editLockSchema.parse(body)
    const { org_id, dashboard_id } = params

    switch (action) {
      case 'acquire': {
        const result = await dashboardEditLockService.acquire(
          org_id, dashboard_id, context.userId, context.email
        )
        return APIResponse.ok({ data: result })
      }
      case 'heartbeat': {
        const result = await dashboardEditLockService.heartbeat(dashboard_id, context.userId)
        return APIResponse.ok({ data: result })
      }
      case 'release': {
        const result = await dashboardEditLockService.release(dashboard_id, context.userId)
        return APIResponse.ok({ data: result })
      }
    }
  }
)
