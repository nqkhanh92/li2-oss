import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { heatmapService } from '@/core/services/heatmap.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const searchParams = req.nextUrl.searchParams
    const page_path = searchParams.get('page_path')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { message: 'from and to query params are required', success: false },
        { status: 400 }
      )
    }

    const device_type = searchParams.get('device_type')
    const hostname = searchParams.get('hostname')

    const data = await heatmapService.getScrollHeatmap(
      org_id,
      page_path ?? undefined,
      from,
      to,
      device_type ?? undefined,
      hostname ?? undefined
    )

    return APIResponse.ok({ data })
  }
)
