import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { siteAnalyticsService } from '@/core/services/site-analytics.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { message: 'from and to query params are required', success: false },
        { status: 400 },
      )
    }

    const data = await siteAnalyticsService.getSessions(org_id, from, to)

    return APIResponse.ok({ data })
  },
)
