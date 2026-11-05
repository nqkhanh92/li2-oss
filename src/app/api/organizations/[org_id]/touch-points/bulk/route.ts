import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { z } from 'zod'
import { TablesInsert } from '@/shared/types/database.types'
import { domainService } from '@/core/services/domain.service'
import { touchPointService } from '@/core/services/touch-point.service'
import { encode } from 'base62'
import { SHORT_ID_OFFSET } from '@/shared/constants/utils'
import { TouchPointContentType } from '@/features/touch-points/types'

const bulkCreateBasicTpSchema = z.object({
  destinations: z.array(z.string().url()),
})

export const POST = withAuth<{ org_id: string }>(
  async (request, { context, params: { org_id } }) => {
    const body = await request.json()
    const validatedData = bulkCreateBasicTpSchema.parse(body)
    const userId = context.userId

    const domain = await domainService.findDefaultOrgDomain(org_id)
    const shortIds = await touchPointService.getNextShortIds(validatedData.destinations.length)

    const touchPoints: TablesInsert<'touch_points'>[] = validatedData.destinations.map(
      (destination, index) => {
        const shortCode = encode(shortIds[index].id + SHORT_ID_OFFSET)
        return {
          organization_id: org_id,
          user_id: userId,
          name: shortCode,
          content_type: TouchPointContentType.URL,
          content_value: destination,
          short_id: shortIds[index].id,
          short_code: shortCode,
          short_url: `${domain?.domain || process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${shortCode}`,
        }
      }
    )
    const createdTouchPoints = await touchPointService.bulkCreateBasicTp(touchPoints)

    return APIResponse.created({ data: createdTouchPoints })
  }
)
