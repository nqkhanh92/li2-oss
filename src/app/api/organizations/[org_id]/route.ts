import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { organizationFormSchema, updateOrganizationSchema } from '@/shared/schemas/organizations'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { nonScopePolicies, policies } from '@/shared/lib/permission/policy'
import { deletePlanCache } from '@/shared/lib/plan/plans'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { organizationService } from '@/core/services/organization.service'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  await ensureOrgMember(params.org_id)
  const supabase = await createServiceClient()
  const { data: org, error } = await supabase.rpc('get_organization_details', {
    org_id: params.org_id,
  })
  if (error) {
    throw error
  }
  return NextResponse.json(org[0])
})

export const PATCH = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)
    const body = await request.json()
    const validatedData = updateOrganizationSchema.parse(body)
    await organizationService.updateOrganization(params.org_id, validatedData)
    return APIResponse.ok({
      message: 'Update organization details successfully!',
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: '$t(common:module.organization)',
        },
      },
    })
  }
)

export const DELETE = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.delete_organization)
    const supabase = await createServiceClient()
    const { error } = await supabase.from('organizations').delete().eq('id', params.org_id)
    if (error) {
      throw error
    }
    await deletePlanCache()

    return NextResponse.json({ message: 'Delete successfully!' })
  }
)
