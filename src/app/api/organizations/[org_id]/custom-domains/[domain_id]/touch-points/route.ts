import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { NextRequest } from 'next/server'
import { domainService } from '@/core/services/domain.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export const GET = withAuth<{ org_id: string; domain_id: string }>(
  async (request: NextRequest, { params }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)
    const supabase = await createServiceClient()
    const query = supabase
      .from('touch_points')
      .select('*')
      .eq('organization_id', params.org_id)
      .eq('domain_id', params.domain_id)

    const defaultDomain = await domainService.findDefaultSystemDomain()
    const { data, error } = await query
    if (error) {
      throw error
    }
    return APIResponse.ok({
      data,
      default_domain: defaultDomain?.domain,
    })
  }
)
