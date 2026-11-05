import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { linkJourneyService } from '@/core/services/link-journey.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const searchParams = req.nextUrl.searchParams
    const tp_id = searchParams.get('tp_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!tp_id || !from || !to) {
      return NextResponse.json(
        { message: 'tp_id, from, and to query params are required', success: false },
        { status: 400 }
      )
    }

    const data = await linkJourneyService.getTrafficSummary(org_id, tp_id, from, to)
    return APIResponse.ok({ data })
  }
)
