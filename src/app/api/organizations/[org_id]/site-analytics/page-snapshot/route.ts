import { NextRequest, NextResponse } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { sessionRecordingService } from '@/core/services/session-recording.service'

export const GET = withAuth<{ org_id: string }>(
  async (req: NextRequest, { params: { org_id } }) => {
    const hostname = req.nextUrl.searchParams.get('hostname')
    const page_path = req.nextUrl.searchParams.get('page_path')
    const device_type = req.nextUrl.searchParams.get('device_type') ?? undefined
    const target_vp = req.nextUrl.searchParams.get('target_viewport_width')

    if (!hostname || !page_path) {
      return NextResponse.json(
        { message: 'hostname and page_path query params are required', success: false },
        { status: 400 },
      )
    }

    const data = await sessionRecordingService.findPageSnapshots(
      org_id, hostname, page_path, device_type,
      target_vp ? parseInt(target_vp, 10) : undefined,
    )
    return APIResponse.ok({ data })
  },
)
