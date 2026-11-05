import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { linkJourneyService } from '@/core/services/link-journey.service'

export const GET = withAuth<{ org_id: string }>(async (_req, { params: { org_id } }) => {
  const data = await linkJourneyService.getTouchPoints(org_id)
  return APIResponse.ok({ data })
})
