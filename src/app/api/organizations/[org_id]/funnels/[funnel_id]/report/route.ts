import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { funnelService } from '@/core/services/funnel.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string; funnel_id: string }>(
  async (req: NextRequest, { params: { org_id, funnel_id } }) => {
    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { message: 'from and to query params are required (YYYY-MM-DD)', success: false },
        { status: 400 }
      )
    }

    const report = await funnelService.getReport(org_id, funnel_id, from, to)

    return APIResponse.ok({
      data: report,
    })
  }
)
