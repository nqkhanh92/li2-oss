import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { conversionSetupService } from '@/core/services/conversion-setup.service'
import { SmartSetupError } from '@/core/services/smart-setup.service'
import { z } from 'zod'

const analyzeConversionsRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  locale: z.enum(['en', 'vi']).default('en'),
})

export const POST = withRateLimit<{ org_id: string }>(RateLimitPresets.STRICT)(
  withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
    const body = await req.json()
    const parsed = analyzeConversionsRequestSchema.safeParse(body)

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid request body')
    }

    const { url, locale } = parsed.data

    try {
      const result = await conversionSetupService.analyze(org_id, url, locale)
      return APIResponse.ok({ data: result })
    } catch (error) {
      if (error instanceof SmartSetupError) {
        throw new BadRequestError(error.message)
      }
      throw error
    }
  })
)
