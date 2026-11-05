import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { funnelService } from '@/core/services/funnel.service'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth<{ org_id: string; funnel_id: string; position: string }>(
  async (req: NextRequest, { params: { org_id, funnel_id, position } }) => {
    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { message: 'from and to query params are required (YYYY-MM-DD)', success: false },
        { status: 400 }
      )
    }

    const filter = searchParams.get('filter') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const stepPosition = parseInt(position, 10)

    if (isNaN(stepPosition) || stepPosition < 1) {
      return NextResponse.json(
        { message: 'position must be a positive integer', success: false },
        { status: 400 }
      )
    }

    if (!['all', 'proceeded', 'dropped_off'].includes(filter)) {
      return NextResponse.json(
        { message: 'filter must be one of: all, proceeded, dropped_off', success: false },
        { status: 400 }
      )
    }

    const result = await funnelService.getStepVisitors(org_id, funnel_id, stepPosition, {
      from,
      to,
      filter,
      page,
      limit,
    })

    return APIResponse.ok({ data: result })
  }
)
