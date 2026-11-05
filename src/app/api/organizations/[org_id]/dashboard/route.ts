import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/infrastructure/database/supabase'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { getTimeZone } from '@/shared/utils/server/get-timezone'
import { logger } from '@/infrastructure/logging/logger'
import { memberRepo } from '@/core/repositories/member.repository'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { collectionPermissionService } from '@/core/services/collection-permission.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AppError } from '@/infrastructure/response/errors/domain.errors'

export type DashboardDataType = {
  typeVisits: { name: AllTouchPointVariants; count: number }[]
  totalVisits: number
  totalVisitWoWPercent: number
  totalUniqueVisits: number
  uniqueVisitWoWPercent: number
  topPerformingDates: { name: string; count: number }[]
  performanceOverTime: {
    today: { name: string; count: number }[]
    lastDay: { name: string; count: number }[]
    lastWeek: { name: string; count: number }[]
    lastMonth: { name: string; count: number }[]
  }
}
const log = logger.child({
  service: 'dashboard',
})

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: any }
  ) => {
    try {
      const timezone = getTimeZone()
      const userId = context.userId

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
          const scope = await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
          // If scope is ALL, user can see all uncategorized TPs
          // If scope is OWN, user can only see their own uncategorized TPs
          // Note: DB functions don't support OWN scope filtering for uncategorized yet
          // For now, only include uncategorized if scope is ALL
          includeNull = scope === RolePermissionScope.ALL || scope === RolePermissionScope.OWN
        } catch {
          // No VIEW_TOUCH_POINTS permission = no uncategorized access
          includeNull = false
        }
      }

      const { data, error } = await supabaseService
        .rpc('get_dashboard_analytics_v3', {
          _organization_id: params.org_id,
          _timezone: timezone,
          _collection_ids: collectionIds, // Pass array directly - Supabase JS handles serialization
          _include_null_collection: includeNull,
          _user_id: userId,
          _exclude_bot: true // Exclude bot traffic for accurate metrics
        })
        .single<DashboardDataType>()

      if (error) {
        throw error
      }      
      return NextResponse.json(data)
    } catch (error: unknown) {
      if (error instanceof BaseError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      log.error({ error })
      return new AppError('Something went wrong').toResponse()
    }
  }
)
