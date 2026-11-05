import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { SmartSetupError } from '@/core/services/smart-setup.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { smartSetupService } from '@/core/services/smart-setup.service'

export const GET = withRateLimit<{ org_id: string }>(RateLimitPresets.STANDARD)(
  withAuth<{ org_id: string }>(async (_req, { params: { org_id } }) => {
    try {
      const data = await smartSetupService.getStatus(org_id)
      return APIResponse.ok({ data })
    } catch (error) {
      if (error instanceof SmartSetupError) {
        throw new BadRequestError(error.message)
      }
      throw error
    }
  })
)
