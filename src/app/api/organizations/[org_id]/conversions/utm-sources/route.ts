import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { supabaseService } from '@/infrastructure/database/supabase'

export const GET = withAuth<{ org_id: string }>(async (_req, { params: { org_id } }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

  const { data: conversions } = await supabaseService
    .from('conversion_events')
    .select('click_id, session_id')
    .eq('organization_id', org_id)

  const clickIds = [...new Set((conversions ?? []).map((c) => c.click_id).filter(Boolean) as string[])]
  const noClickSessionIds = [...new Set(
    (conversions ?? []).filter((c) => !c.click_id && c.session_id).map((c) => c.session_id).filter(Boolean) as string[]
  )]

  const sources = new Set<string>()

  await Promise.all([
    // UTM from visits via click_id → li2_cid
    clickIds.length > 0
      ? supabaseService.from('visits').select('utm_tags').in('li2_cid', clickIds).not('utm_tags', 'is', null)
          .then(({ data }) => {
            for (const v of data ?? []) {
              const src = (v.utm_tags as Record<string, string> | null)?.utm_source
              if (src) sources.add(src)
            }
          })
      : Promise.resolve(),

    // UTM from sessions via session_id (fallback when no click_id)
    noClickSessionIds.length > 0
      ? supabaseService.from('sessions').select('utm_source').in('session_id', noClickSessionIds).not('utm_source', 'is', null)
          .then(({ data }) => {
            for (const s of data ?? []) {
              if (s.utm_source) sources.add(s.utm_source)
            }
          })
      : Promise.resolve(),
  ])

  return APIResponse.ok({ data: Array.from(sources).sort() })
})
