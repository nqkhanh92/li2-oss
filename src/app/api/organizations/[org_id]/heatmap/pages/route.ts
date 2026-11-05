import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { heatmapService } from '@/core/services/heatmap.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const tp_id = searchParams.get('tp_id')

    if (!from || !to) {
      return NextResponse.json(
        { message: 'from and to query params are required', success: false },
        { status: 400 }
      )
    }

    const data = await heatmapService.getTopPages(org_id, from, to, tp_id ?? undefined)

    return APIResponse.ok({ data })
  }
)
