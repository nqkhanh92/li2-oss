import { analyticService } from '@/core/services/analytic.service';
import {
  AdvancedAnalyticQueryParams,
  AdvancedAnalyticTypes,
} from '@/core/types/analytics/advanced.type';
import { getQueryParams } from '@/shared/lib/utils';
import { getTimeZone } from '@/shared/utils/server/get-timezone';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/shared/lib/middlewares/with-auth';
import { ensurePolicy } from '@/shared/lib/permission/permissions';
import { nonScopePolicies } from '@/shared/lib/permission/policy';
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission';

export const GET = withAuth(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string; type: AdvancedAnalyticTypes }; context: any }
  ) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người gọi
    // thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS]);

    const { type } = params;
    const timezone = getTimeZone();
    const { period_days, tag_ids, touchpoint_ids, collection_ids } = getQueryParams(request);

    // Use service layer with permission filtering
    const data = await analyticService.getAdvancedAnalytics(
      params.org_id,
      type,
      {
        p_period_days: period_days,
        p_tag_ids: tag_ids,
        p_touchpoint_ids: touchpoint_ids,
        p_collection_ids: collection_ids,
        p_timezone: timezone,
        p_organization_id: params.org_id,
      },
      context.userId
    );

    return NextResponse.json(data);
  }
)
