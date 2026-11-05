import { Database } from '@/shared/types/database.types'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/database/supabase/server'
import { getQueryParams, queryBuilder } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { assetFormSchema } from '@/shared/schemas/assets'
import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import axios from 'axios'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

interface AssetActivateNFC {
  created_at: Date
  creator: string
  editor: string
  id: string
  serial_number: string
  short_url: string
  status: number
  updated_at: Date
  user_id: string
}
export type Assets = Database['public']['Tables']['assets']['Row']

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_ASSETS)

  const supabase = await createClient()
  let query = supabase.from('assets').select('*', { count: 'exact' })
  query = queryBuilder(query, request)
  const queryParams = getQueryParams(request) as unknown as SearchFilterPagination
  if (queryParams?.search) {
    query = query.ilike('name', `%${queryParams.search}%`)
  }
  const { data, error, count } = await query.returns<Assets[]>()
  if (error) {
    throw error
  }
  return NextResponse.json({ data, rowCount: count })
})

export const POST = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_ASSETS)

  const supabase = await createClient()
  const body = await request.json()
  const validatedData = assetFormSchema.parse(body)
  const shlink_service = new ShlinkService()
  if (validatedData.type !== 'NFC') {
    throw new Error('Unsupported asset type. Only NFC is supported')
  }
  const activate_response = await shlink_service.activateNFC(validatedData.serial_number)
  if (activate_response.code !== 200) {
    throw new AppError('Failed to activate NFC card', {
      key: 'common:messages.error.failed_to_doing_item',
      params: {
        doing: '$t(action.activate)',
        item: '$t(label.nfc_card)',
      },
    })
  }
  const activatedData: AssetActivateNFC = activate_response.data
  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...validatedData,
      organization_id: params.org_id,
      short_url: activatedData.short_url,
      is_warranty: false,
    })
    .select()
    .single()
  if (error) {
    throw error
  }
  return NextResponse.json({
    success: true,
    message: `Asset ${validatedData.type} created`,
  })
})
