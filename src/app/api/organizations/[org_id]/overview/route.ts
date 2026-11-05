import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/infrastructure/database/supabase'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import { logger } from '@/infrastructure/logging/logger'
import { memberRepo } from '@/core/repositories/member.repository'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { PermissionPolicy } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { collectionPermissionService } from '@/core/services/collection-permission.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { getOrganizationPlan, getOrgQuota } from '@/shared/lib/plan/plans'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { PAID_PLAN_KEYS } from '@/shared/types/plan-permission'
import type {
  OverviewData,
  OverviewPlanUsage,
} from '@/features/overview/types'

const log = logger.child({
  service: 'overview',
})

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    try {
      const timezone = getTimeZone()
      const userId = context.userId

      // Check VIEW_DASHBOARD permission (no-scope permission — use ensurePolicy, not getPermissionScopeOrThrow)
      await ensurePolicy(params.org_id, new PermissionPolicy(ROLE_PERMISSION_KEYS.VIEW_DASHBOARD))

      // Determine if user is on a Pro (tier1+) plan
      const orgPlan = await getOrganizationPlan(params.org_id)
      const isPro = orgPlan != null && PAID_PLAN_KEYS.includes(orgPlan.plan_key)

      const hideWebsite = disabledFeatures.BEHAVIOR_ANALYTICS
      const hideConversions = disabledFeatures.ATTRIBUTION

      // Determine collection filtering based on user permissions
      let collectionIds: string[] | undefined = undefined
      let includeNull = true

      // Check if user is Owner (bypass all restrictions)
      const isOwner = await memberRepo.isOrganizationOwner(params.org_id, userId)

      if (!isOwner) {
        // All non-owners get filtered by accessible collections
        collectionIds = await collectionPermissionService.getAccessibleCollectionIds(
          params.org_id,
          userId,
          isOwner
        )

        // Determine includeNull based on VIEW_TOUCH_POINTS permission and scope
        try {
          const scope = await getPermissionScopeOrThrow(
            params.org_id,
            ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
          )
          includeNull = scope === RolePermissionScope.ALL || scope === RolePermissionScope.OWN
        } catch {
          // No VIEW_TOUCH_POINTS permission = no uncategorized access
          includeNull = false
        }
      }
      
      const { data, error } = await supabaseService.rpc('get_overview_data', {
          _organization_id: params.org_id,
          _timezone: timezone,
          _collection_ids: collectionIds,
          _include_null_collection: includeNull,
          _user_id: isOwner ? undefined : userId,
          _exclude_bot: true,
          // The RPC exposes one boolean, so it can only skip the work when both groups are off.
          // TODO: when exactly one group is hidden the RPC still computes the hidden side and
          // the response below throws it away. Splitting _include_pro into _include_website and
          // _include_conversions needs a migration on get_overview_data, so it is left for later.
          _include_pro: isPro && !(hideWebsite && hideConversions),
        })

      if (error) {
        throw error
      }

      // Build plan usage section
      const orgQuota = await getOrgQuota(params.org_id)
      const planUsage: OverviewPlanUsage = {
        planName: orgPlan?.name ?? '',
        planKey: orgPlan?.plan_key ?? '',
        expiresAt: orgPlan?.expires_at ?? null,
        quotas: [
          {
            label: 'links',
            used: orgQuota?.monthly_touch_points ?? 0,
            max: orgPlan?.max_tps_per_month ?? 0,
          },
          {
            label: 'members',
            used: orgQuota?.members ?? 0,
            max: orgPlan?.max_members_per_org ?? 0,
          },
          {
            label: 'domains',
            used: orgQuota?.domains ?? 0,
            max: orgPlan?.max_domains_per_org ?? 0,
          },
          {
            label: 'spaces',
            used: orgQuota?.collections ?? 0,
            max: orgPlan?.max_collections_per_org ?? 0,
          },
        ],
      }

      const base = data as unknown as Omit<OverviewData, 'planUsage'>

      // Strip every hidden metric here: one group can be off while the other stays on,
      // and the RPC cannot express that
      const response: OverviewData = {
        ...base,
        trend: base.trend.map((point) => ({
          ...point,
          pageviews: hideWebsite ? 0 : point.pageviews,
          conversions: hideConversions ? 0 : point.conversions,
        })),
        website: hideWebsite ? null : base.website,
        conversions: hideConversions ? null : base.conversions,
        planUsage,
      }

      return NextResponse.json(response)
    } catch (error: unknown) {
      if (error instanceof BaseError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      log.error({ error })
      return new AppError('Something went wrong').toResponse()
    }
  }
)
