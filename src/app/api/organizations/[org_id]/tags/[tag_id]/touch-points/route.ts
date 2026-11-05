import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getQueryParams, queryBuilderByParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { getSession } from '@/shared/lib/auth/session'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { memberRepo } from '@/core/repositories/member.repository'
import { collectionPermissionService } from '@/core/services/collection-permission.service'

import { withAuth } from '@/shared/lib/middlewares/with-auth'

export type TouchPoint = Tables<'touch_points'>
export type GetTouchPointObject = Tables<'touch_points'> & {
  tp_tag_links: {
    tag_id: string
    tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>
  }[]
  profiles: Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>
}
export const GET = withAuth<{ org_id: string; tag_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      const scope = await getPermissionScopeOrThrow(
        params.org_id,
        ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
      )

      const userId = context.userId

    const supabase = await createServiceClient()
    let query = supabase
      .from('touch_points')
      .select(
        `
          *,
          profiles ( id, name, email ),
          tp_tag_links (
            tag_id,
            tags ( id, name, color )
          )
        `,
        { count: 'exact' }
      )
      .eq('organization_id', params.org_id)

    // Apply collection-based permission filtering
    const isOwner = await memberRepo.isOrganizationOwner(params.org_id, userId)

    if (!isOwner) {
      // Get accessible collections for non-owners
      const accessibleCollectionIds = await collectionPermissionService.getAccessibleCollectionIds(
        params.org_id,
        userId
      )

      if (scope === RolePermissionScope.ALL) {
        // Include TPs from accessible collections OR all uncategorized
        if (accessibleCollectionIds.length > 0) {
          query = query.or(
            `collection_id.in.(${accessibleCollectionIds.join(',')}),collection_id.is.null`
          )
        } else {
          query = query.is('collection_id', null)
        }
      } else if (scope === RolePermissionScope.OWN) {
        // Include TPs from accessible collections OR user's own uncategorized
        if (accessibleCollectionIds.length > 0) {
          query = query.or(
            `collection_id.in.(${accessibleCollectionIds.join(',')}),and(collection_id.is.null,user_id.eq.${userId})`
          )
        } else {
          query = query.is('collection_id', null).eq('user_id', userId)
        }
      }
    }

    const queryParams = getQueryParams(request) as SearchFilterPagination
    console.log('queryParams', queryParams)
    const { data: taggedTouchPoints, error: tagError } = await supabase
      .from('tp_tag_links')
      .select('tp_id')
      .eq('tag_id', params.tag_id)
    if (tagError) {
      throw tagError
    }
    const taggedIds = taggedTouchPoints.map((tp) => tp.tp_id)
    if (taggedIds.length > 0) {
      query = query.not('id', 'in', `(${taggedIds.join(',')})`)
    }

    if (queryParams?.search) {
      query = query.ilike('name', `%${queryParams.search}%`)
    }
    query = queryBuilderByParams(query, queryParams)
    const { data, error, count } = await query.returns<GetTouchPointObject[]>()
    if (error) {
      throw error
    }
    return NextResponse.json({ data, rowCount: count })
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
  }
)

export const POST = withAuth<{ org_id: string; tag_id: string }>(
  async (request: NextRequest, { params }) => {
  try {
    await ensurePolicy(params.org_id, nonScopePolicies.add_tag)
    const supabase = await createServiceClient()
    const body = await request.json()
    const touchPointIds: string[] = body.touch_point_ids
    const { data: tp_details, error: tp_details_error } = await supabase.rpc('get_tp_details', {
      tp_ids: touchPointIds,
    })
    if (tp_details_error) {
      throw tp_details_error
    }
    const allowedTpIds: string[] = []
    for (const tp of tp_details) {
      try {
        await ensureOrgPlan(params.org_id, PLAN_LIMIT_KEYS.MAX_TAGS_PER_TP, {
          expectedValue: tp.total_tag + 1,
          errorMessage: `Touch point ${tp.tp_id} exceeded the maximum limit`,
        })
        allowedTpIds.push(tp.tp_id)
      } catch (error) {}
    }

    if (allowedTpIds.length < 1) {
      throw new BadRequestError('Touch point limit exceeded', {
        key: 'common:messages.error.field_exceed_number_limit',
        params: {
          field: '$t(module.tag)',
          limit: '$t(module.touchpoint)',
        },
      })
    }

    const insertData = allowedTpIds.map((tp_id) => ({
      tag_id: params.tag_id,
      tp_id,
    }))

    const { data, error } = await supabase.from('tp_tag_links').insert(insertData).select()

    if (error) {
      throw error
    }

    return APIResponse.created({
      data: data,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.tag_add_tp',
        params: {
          tag_name: '',
          tp_count: allowedTpIds.length,
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

export const DELETE = withAuth<{ org_id: string; tag_id: string }>(
  async (request: NextRequest, { params }) => {
  try {
    const body = await request.json()
    const touchPointIds: string[] = body.ids
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('tp_tag_links')
      .delete()
      .in('tp_id', touchPointIds)
      .eq('tag_id', params.tag_id)
    if (error) {
      throw error
    }
    // return NextResponse.json({ message: 'Success' })
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_from',
        params: {
          field: 'Tag',
          field_name: '',
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
