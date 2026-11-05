import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { conversionSetupService } from '@/core/services/conversion-setup.service'
import { SmartSetupError } from '@/core/services/smart-setup.service'
import { z } from 'zod'

const requestSchema = z.object({
  html: z.string().min(1).max(120_000, 'HTML payload too large (max 120 KB)'),
  url: z.string().url('Invalid page URL'),
  locale: z.enum(['en', 'vi']).default('en'),
})

export const POST = withRateLimit<{ org_id: string }>(RateLimitPresets.STRICT)(
  withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid request body')
    }

    const { html, url, locale } = parsed.data

    try {
      const result = await conversionSetupService.analyzeFromHtml(org_id, html, url, locale)
      return APIResponse.ok({ data: result })
    } catch (error) {
      if (error instanceof SmartSetupError) {
        throw new BadRequestError(error.message)
      }
      throw error
    }
  })
)
