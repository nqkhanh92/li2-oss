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
    const device_type = searchParams.get('device_type')
    const grid_size = searchParams.get('grid_size')
    const hostname = searchParams.get('hostname')
    const target_width = searchParams.get('target_width')
    const tp_id = searchParams.get('tp_id')
    const target_height = searchParams.get('target_height')

    if (!page_path || !from || !to) {
      return NextResponse.json(
        { message: 'page_path, from, and to query params are required', success: false },
        { status: 400 }
      )
    }

    const data = await heatmapService.getClicks(
      org_id,
      page_path,
      from,
      to,
      device_type ?? undefined,
      grid_size ? parseInt(grid_size, 10) : undefined,
      hostname ?? undefined,
      target_width ? parseInt(target_width, 10) : undefined,
      tp_id ?? undefined,
      target_height ? parseInt(target_height, 10) : undefined
    )

    return APIResponse.ok({ data })
  }
)
