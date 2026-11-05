import { createClient } from '@/infrastructure/database/supabase/server'
import { campaignFormSchema } from '@/shared/schemas/campaigns'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import { cookies } from 'next/headers'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError } from '@/infrastructure/response/errors/domain.errors'

import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export const GET = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const supabase = await createClient()
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', params.campaign_id)
        .single()

      if (error) {
        throw error
      }
      return NextResponse.json(campaign)
    } catch (error) {
      return NextResponse.json({ error }, { status: 500 })
    }
  }
)

export const PATCH = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const body = await request.json()
      const data = campaignFormSchema.parse(body) as z.infer<typeof campaignFormSchema>
      const supabase = await createClient()
      const { error } = await supabase.from('campaigns').update(data).eq('id', params.campaign_id)
      if (error) {
        throw error
      }

      return NextResponse.json({ message: 'Success' })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error?.message).toResponse()
    }
  }
)

export const DELETE = withAuth<{ org_id: string; campaign_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const supabase = await createClient()
      const { error } = await supabase.from('campaigns').delete().eq('id', params.campaign_id)
      if (error) {
        throw error
      }
      return NextResponse.json({ message: 'Deleted' })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error?.message).toResponse()
    }
  }
)
