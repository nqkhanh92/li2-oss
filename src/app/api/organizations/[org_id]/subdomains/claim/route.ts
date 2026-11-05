import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { getSession } from '@/shared/lib/auth/session'
import { NextRequest } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { z } from 'zod'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AVAILABLE_DOMAINS } from '@/core/constants/claimable-domain'
import { claimSubdomainSchema } from '@/shared/schemas/custom-domains'

export const POST = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    await ensureOrgPlan(params.org_id, PLAN_LIMIT_KEYS.MAX_DOMAINS_PER_ORG)
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)

    const body = await request.json()
    const validatedData = claimSubdomainSchema.parse(body)

    const fullDomain = `${validatedData.subdomain}.${validatedData.baseDomain}`

    // TODO: Implement actual subdomain claiming logic
    // This is a placeholder implementation
    //
    // Steps to implement:
    // 1. Check if subdomain is available (check domains table)
    // 2. Create subdomain record in database
    // 3. Mark as verified (since it's a system subdomain, no DNS verification needed)
    // 4. Link to organization
    //
    // Example implementation:
    //
    const supabase = await createServiceClient()

    // Check if subdomain already exists
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('id')
      .eq('name', fullDomain)
      .maybeSingle()

    if (existingDomain) {
      throw new AppError('Subdomain already claimed', {
        key: 'domain:messages.error.subdomain_unavailable',
        params: { domain: fullDomain },
      })
    }

    // Create subdomain record
    const { data: claimedDomain, error } = await supabase
      .from('domains')
      .insert({
        name: fullDomain,
        domain: fullDomain,
        organization_id: params.org_id,
        user_id: context.userId,
        is_verified: true, // Auto-verified for system subdomains
        // is_subdomain: true,
        // base_domain: validatedData.base_domain,
        // subdomain: validatedData.subdomain,
        is_subdomain_claimed: true,
        txt_name: '',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return APIResponse.created({
      data: claimedDomain,
      i18nMessage: {
        key: 'domain:messages.success.subdomain_claimed',
        params: { domain: fullDomain },
      },
    })

    // Placeholder response
    // return APIResponse.created({
    //   data: {
    //     id: 'placeholder-id',
    //     name: fullDomain,
    //     domain: fullDomain,
    //     organization_id: params.org_id,
    //     user_id: context.userId,
    //     is_verified: true,
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString(),
    //   },
    //   i18nMessage: {
    //     key: 'domain:messages.success.subdomain_claimed',
    //     params: { domain: fullDomain },
    //   },
    // })
  }
)
