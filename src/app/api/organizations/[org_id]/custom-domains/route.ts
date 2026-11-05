import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { nonScopePolicies, policies } from '@/shared/lib/permission/policy'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { createClient } from '@/infrastructure/database/supabase/client'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { getQueryParams, queryBuilder } from '@/shared/lib/utils'
import { createTagSchema } from '@/shared/schemas/tags'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { RolePermissionScope, ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { getSession } from '@/shared/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'
import { createCustomDomainSchema } from '@/shared/schemas/custom-domains'
import { v4 as uuidv4 } from 'uuid'
import { parse } from 'tldts'
import { redis } from '@/infrastructure/cache/redis'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'

export type CustomDomain = Tables<'domains'>
export const GET = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)
      const supabase = await createServiceClient()
      let query = supabase.from('domains').select('*').eq('organization_id', params.org_id)

      query = queryBuilder(query, request)
      const queryParams = getQueryParams(request) as SearchFilterPagination
      if (queryParams?.search) {
        query = query.ilike('name', `%${queryParams.search}%`)
      }
      const { data, error, count } = await query.returns<CustomDomain[]>()
      if (error) {
        throw error
      }
      return APIResponse.ok({ data, rowCount: count })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

export async function POST(request: NextRequest, { params }: { params: { org_id: string } }) {
  try {
    await ensureOrgPlan(params.org_id, PLAN_LIMIT_KEYS.MAX_DOMAINS_PER_ORG)
    await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)
    const session = await getSession()

    const supabase = await createServiceClient()
    const body = await request.json()
    const validatedData = createCustomDomainSchema.parse(body)
    const { domain, hostname, subdomain } = parse(validatedData.domain, {
      validateHostname: true,
    })
    if (!domain || !hostname) {
      throw new AppError('Invalid domain')
    }
    const { count } = await supabase
      .from('domains')
      .select('id', { count: 'exact' })
      .eq('name', hostname)
      .or('is_verified.eq.true,organization_id.eq.' + params.org_id)
      .single()
    if (count && count > 0) {
      throw new AppError('Domain already in use', {
        key: 'common:messages.error.field_in_use',
        params: {
          field: '$t(module.domain)',
        },
      })
    }

    const txtName = subdomain
      ? '_proxify-shortlink-verification_' + hostname
      : '_proxify-shortlink-verification.' + domain
    const txtCode = uuidv4()
    const { data: insertedDomain, error } = await supabase
      .from('domains')
      .insert({
        ...validatedData,
        domain: hostname,
        txt_name: txtName,
        txt_code: txtCode,
        organization_id: params.org_id,
        user_id: session!.sub,
        name: hostname,
      })
      .select()
      .single()
    if (error) {
      throw error
    }

    await redis.rpush(
      REDIS_KEYS.DOMAIN.VERIFY,
      JSON.stringify({
        domain_id: insertedDomain.id,
        user_id: insertedDomain.user_id,
      })
    )
    return APIResponse.created({
      data: insertedDomain,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: {
          field: '$t(module.domain)',
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

// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { org_id: string } }
// ) {
//   try {
//     await ensurePolicy(params.org_id, nonScopePolicies.manage_organization);

//     const supabase = await createServiceClient();
//     const body = await request.json();
//     const ids = body.ids;
//     let query = supabase
//       .from("domains")
//       .delete({ count: "exact" })
//       .in("id", ids);
//     const { error, count } = await query;
//     if (error || count === null) {
//       throw error;
//     }

//     if (count < ids.length) {
//       return NextResponse.json({
//         success: true,
//         message: `Deleted (${count}/${ids.length}) domain${
//           count > 1 ? "s" : ""
//         } (some domains could not be deleted due to permission restrictions)`,
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       message: `Deleted ${count} domain${count > 1 ? "s" : ""}`,
//     });
//   } catch (error: any) {
//     if (error instanceof BaseError) {
//       return error.toResponse();
//     }
//     return new AppError(error.message).toResponse();
//   }
// }
