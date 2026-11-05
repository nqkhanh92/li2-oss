import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
// import { nonScopePolicies } from '@/shared/lib/permission/policy'
// import { ensureOrgPlan } from '@/shared/lib/plan/plans'
// import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { getQueryParams } from '@/shared/lib/utils'
import { createUTMTemplateSchema } from '@/shared/schemas/utm-templates'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
// import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getSession } from '@/shared/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'

import { withAuth } from '@/shared/lib/middlewares/with-auth'

import { utmTemplateService } from '@/core/services/utm-template.service'

export type UTMTemplate = Tables<'utm_templates'>

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const scope = await getPermissionScopeOrThrow(
        params.org_id,
        ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES
      )
      const queryParams = getQueryParams(request) as SearchFilterPagination

      const { data, rowCount } = await utmTemplateService.getTemplatesByOrg(params.org_id, { scope, userId: context.userId, queryParams })
      return NextResponse.json({ data, rowCount })

    } catch (error: any) {
      console.log({ error })
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {

      const scope = await getPermissionScopeOrThrow(
        params.org_id,
        ROLE_PERMISSION_KEYS.ADD_UTM_TEMPLATE
      )

      const body = await request.json()
      const validatedData = createUTMTemplateSchema.parse(body)

      const insertedTemplate = await utmTemplateService.createTemplate(
        params.org_id,      
        validatedData,
        { scope, userId: context.userId }
      )      
    
      return APIResponse.created({
        data: insertedTemplate,
        success: true,
        i18nMessage: {
          key: 'common:messages.success.created_field',
          params: {
            field: 'UTM Template',
          },
        },
      })

    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

export const DELETE = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const scope = await getPermissionScopeOrThrow(
        params.org_id,
        ROLE_PERMISSION_KEYS.DELETE_UTM_TEMPLATE
      )
      const body = await request.json()
      const ids = body.ids

      const count = await utmTemplateService.deleteTemplates(      
        params.org_id,
        ids,
        { scope, userId: context.userId }
      )    

      if (count < ids.length) {
        return APIResponse.deleted({
          success: true,
          i18nMessage: {
            key: 'common:messages.success.deleted_count_restricted',
            params: {
              field: 'UTM Template',
              count: `${count}/${ids.length}`,
            },
          },
        })
      }

      return APIResponse.deleted({
        success: true,
        i18nMessage: {
          key: 'common:messages.success.deleted_count',
          params: {
            field: 'UTM Template',
            count,
          },
        },
      })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)