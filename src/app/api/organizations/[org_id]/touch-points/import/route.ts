import { NextRequest } from 'next/server'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { getSession } from '@/shared/lib/auth/session'
import { createTouchpointImportTasksSchema } from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { formToJSON } from 'axios'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { simpleUploadFile } from '@/shared/lib/storage/upload'
import { touchPointImportTasksService } from '@/core/services/touchpoint_import_tasks.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext } from '@/shared/types/request'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'

export const POST = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    await ensureOrgMember(params.org_id)
    await ensureOrgPlan(params.org_id, ADVANCED_FEATURE_KEYS.IMPORT_TOUCHPOINTS)

    const formData = await request.formData()
    const json = formToJSON(formData)
    const validatedData = createTouchpointImportTasksSchema.parse(json)

    const insertImportTask = await touchPointImportTasksService.createTouchpointImportTasks(
      params.org_id,
      context.userId,
      validatedData
    )

    return APIResponse.created({
      data: insertImportTask,
      i18nMessage: {
        key: 'common:messages.success.created_import_task',
      },
    })
  }
)
