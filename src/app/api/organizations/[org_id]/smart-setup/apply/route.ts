import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { smartSetupService, SmartSetupError } from '@/core/services/smart-setup.service'
import { applyRequestSchema } from '@/shared/schemas/smart-setup'

export const POST = withRateLimit<{ org_id: string }>(RateLimitPresets.STRICT)(
  withAuth<{ org_id: string }>(async (req, { params: { org_id }, context }) => {
    const body = await req.json()
    const parsed = applyRequestSchema.safeParse(body)

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid request body')
    }

    const { cache_id, selected_funnels, selected_event_rules } = parsed.data

    try {
      const result = await smartSetupService.apply(
        org_id,
        context.userId,
        cache_id,
        selected_funnels,
        selected_event_rules
      )
      return APIResponse.created({
        data: result,
        i18nMessage: { key: 'smart-setup:messages.applied', defaultMessage: 'Setup applied successfully' },
      })
    } catch (error) {
      if (error instanceof SmartSetupError) {
        throw new BadRequestError(error.message)
      }
      throw error
    }
  })
)
