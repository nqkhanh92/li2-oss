import { NextRequest } from 'next/server'
import { bulkCreateUtmCampaignTouchpointsSchema } from '@/shared/schemas/utm-campaigns'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { utmCampaignService } from '@/core/services/utm-campaign.service'
import { utmCampaignTouchpointsService } from '@/core/services/utm-campaign-touchpoints.service'

export const GET = withAuth<{ org_id: string; campaign_id: string }>(async (req, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

  const touchpoints = await utmCampaignService.getCampaignTouchpoints(
    params.org_id,
    params.campaign_id
  )
  return APIResponse.ok({
    data: touchpoints,
  })
})

export const POST = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; campaign_id: string } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const body = await request.json()
    const validatedData = bulkCreateUtmCampaignTouchpointsSchema.parse(body)

    const addedTouchpoints = await utmCampaignTouchpointsService.addTouchpointsToCampaign(
      params.org_id,
      params.campaign_id,
      validatedData.touchpoints
    )

    return APIResponse.created({
      data: addedTouchpoints,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.created_field',
        params: {
          field: 'Campaign Touchpoints',
        },
      },
    })
  }
)

export const PUT = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; campaign_id: string } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const body = await request.json()
    const validatedData = bulkCreateUtmCampaignTouchpointsSchema.parse(body)

    const replacedTouchpoints = await utmCampaignService.replaceCampaignTouchpoints(
      params.org_id,
      params.campaign_id,
      validatedData.touchpoints
    )

    return APIResponse.updated({
      data: replacedTouchpoints,
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: 'Campaign Touchpoints',
        },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }: { params: { org_id: string; campaign_id: string } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)

    const { touchpoint_ids } = await request.json()

    await utmCampaignService.removeTouchpointsFromCampaign(
      params.org_id,
      params.campaign_id,
      touchpoint_ids
    )

    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted',
        params: {
          field: 'Campaign Touchpoints',
        },
      },
    })
  }
)
