import { NextRequest } from 'next/server'
// import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { updateUTMTemplateSchema } from '@/shared/schemas/utm-templates'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
// import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
// import { policies } from '@/shared/lib/permission/policy'
import { AppError, PermissionError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AuthContext } from '@/shared/types/request'
// import { NextResponse } from 'next/server'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getSession } from '@/shared/lib/auth/session'

import { utmTemplateService } from '@/core/services/utm-template.service'
import { policies } from '@/shared/lib/permission/policy'

export const GET = withAuth<{ org_id: string; template_id: string }>(
  async (request: NextRequest, { params }) => {
    // await ensurePolicy(params.org_id, policies.view_utm_templates.all)
    // const supabase = await createServiceClient()
    // const { data, error } = await supabase
    //   .from('utm_templates')
    //   .select('*')
    //   .eq('organization_id', params.org_id)
    //   .eq('id', params.template_id)
    //   .single()
    // if (error) {
    //   throw error
    // }
    // return NextResponse.json(data)
    throw new Error('Not implemented')
  }
)

export const PATCH = withAuth<{ org_id: string; template_id: string }>(
  async (
    request: NextRequest,
    { params }: { params: { org_id: string; template_id: string }; context: AuthContext }
  ) => {
    try {
      // await ensurePolicy(params.org_id, policies.edit_utm_template.all)
      const scope = await getPermissionScopeOrThrow(
        params.org_id,
        ROLE_PERMISSION_KEYS.EDIT_UTM_TEMPLATE
      )

      const session = await getSession()
      const body = await request.json()
      const validatedData = updateUTMTemplateSchema.parse(body)

      await utmTemplateService.updateTemplate(params.org_id, params.template_id, validatedData, {
        scope,
        userId: session!.sub,
      })

      // const supabase = await createServiceClient()
      // const { error } = await supabase
      //   .from('utm_templates')
      //   .update(validatedData)
      //   .eq('id', params.template_id)
      //   .eq('organization_id', params.org_id)
      // if (error) {
      //   throw error
      // }

      return APIResponse.updated({
        data: validatedData,
        success: true,
        i18nMessage: {
          key: 'common:messages.success.updated_field',
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

export const DELETE = withAuth<{ org_id: string; template_id: string }>(
  async (request: NextRequest, { params, context }) => {
    const scope = await getPermissionScopeOrThrow(
      params.org_id,
      ROLE_PERMISSION_KEYS.DELETE_UTM_TEMPLATE
    )

    const deleted = await utmTemplateService.deleteTemplates(params.org_id, [params.template_id], {
      scope,
      userId: context.userId,
    })
    // const supabase = await createServiceClient()
    // const { error } = await supabase
    //   .from('utm_templates')
    //   .delete()
    //   .eq('id', params.template_id)
    //   .eq('organization_id', params.org_id)
    // if (error) {
    //   throw error
    // }
    if (deleted === 0) {
      throw new PermissionError('Not authorized to delete this UTM Template')
    }
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: {
          field: 'UTM Template',
        },
      },
    })
  }
)
