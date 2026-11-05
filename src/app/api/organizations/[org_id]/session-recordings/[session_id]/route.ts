import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { sessionRecordingService } from '@/core/services/session-recording.service'

export const GET = withAuth<{ org_id: string; session_id: string }>(
  async (_req, { params: { org_id, session_id } }) => {
    const data = await sessionRecordingService.findReplayData(org_id, session_id)
    return APIResponse.ok(data)
  }
)
