import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { smartSetupService, SmartSetupError } from '@/core/services/smart-setup.service'
import { analyzeRequestSchema } from '@/shared/schemas/smart-setup'

export const POST = withRateLimit<{ org_id: string }>(RateLimitPresets.STRICT)(
  withAuth<{ org_id: string }>(async (req, { params: { org_id }, context: _ }) => {
    const body = await req.json()
    const parsed = analyzeRequestSchema.safeParse(body)

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid request body')
    }

    const { url, locale, force } = parsed.data

    try {
      const result = await smartSetupService.analyze(org_id, url, locale, force)
      return APIResponse.ok({ data: result })
    } catch (error) {
      if (error instanceof SmartSetupError) {
        throw new BadRequestError(error.message)
      }
      throw error
    }
  })
)
