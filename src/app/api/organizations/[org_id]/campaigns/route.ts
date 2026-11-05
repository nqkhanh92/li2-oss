import { TouchPointInteractionNode } from '@/ee/features/campaigns/builder/nodes/triggers/touch-point-interaction'
import { NodeType } from '@/ee/features/campaigns/builder/nodes/type'
import { generateTriggerCentricPaths } from '@/shared/lib/campaign-builder'
import { createClient } from '@/infrastructure/database/supabase/server'
import { getQueryParams, queryBuilder } from '@/shared/lib/utils'
import { campaignFormSchema } from '@/shared/schemas/campaigns'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import { SearchFilterPagination } from '@/shared/types'
import { Database } from '@/shared/types/database.types'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export type Campaign = Database['public']['Tables']['campaigns']['Row']

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const supabase = await createClient()
      let query = supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .eq('organization_id', params.org_id)
      query = queryBuilder(query, request)
      const queryParams = getQueryParams(request) as unknown as SearchFilterPagination
      if (queryParams?.search) {
        query = query.ilike('name', `%${queryParams.search}%`)
      }
      const { data, error, count } = await query.returns<Campaign[]>()
      if (error) {
        throw error
      }
      return NextResponse.json({ data, rowCount: count })
    } catch (error) {
      console.log({ error })
      return NextResponse.json({ error }, { status: 500 })
    }
  }
)

export const POST = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const supabase = await createClient()
      const data = await request.json()
      const validatedData = campaignFormSchema.parse(data)
      const preCombination = generateTriggerCentricPaths(validatedData.nodes, validatedData.edges)
      const triggerNodes = validatedData.nodes.filter(
        (node: NodeType<any>) => node.data.group === 'trigger'
      )
      let affected_tag_ids: string[] = []
      if (triggerNodes.length > 0) {
        affected_tag_ids = Array.from(
          new Set(
            triggerNodes.flatMap(
              (node: TouchPointInteractionNode) => node.data.attributes.affected_tags
            )
          )
        )
      }
      const { error: campaign_error, data: campaign } = await supabase
        .from('campaigns')
        .insert({
          ...validatedData,
          organization_id: params.org_id,
          affected_tag_ids,
          pre_combination: preCombination as any,
        })
        .select()
        .single()
      if (campaign_error) {
        throw campaign_error
      }
      return NextResponse.json({
        data: campaign,
        message: 'Campaign created successfully',
      })
    } catch (error: any) {
      console.log({ error })
      return NextResponse.json(
        { error: true, message: error?.message || 'Something went wrong' },
        { status: 500 }
      )
    }
  }
)

// DELETE BULK
export const DELETE = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await ensurePolicy(params.org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS])

    try {
      const supabase = await createClient()
      const body = await request.json()
      const ids = body.ids
      const { error } = await supabase.from('campaigns').delete().in('id', ids)
      if (error) {
        throw error
      }
      return NextResponse.json({
        success: true,
        message: `Deleted ${ids.length} campaign${ids.length > 1 ? 's' : ''}`,
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: true, message: error?.message || 'Something went wrong' },
        { status: 500 }
      )
    }
  }
)
