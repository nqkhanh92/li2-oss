import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { conversionSetupService } from '@/core/services/conversion-setup.service'
import { z } from 'zod'

const requestSchema = z.object({
  site_url: z.string().url('Invalid site URL'),
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const body = await req.json()
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid request body')
  }

  const result = await conversionSetupService.findSignupPage(org_id, parsed.data.site_url)
  return APIResponse.ok({ data: result })
})
