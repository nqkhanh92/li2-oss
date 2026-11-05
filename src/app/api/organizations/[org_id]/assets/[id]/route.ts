import { createClient } from '@/infrastructure/database/supabase/server'
import { assetFormSchema } from '@/shared/schemas/assets'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export const GET = withAuth<{ org_id: string; id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_ASSETS)

    try {
      const supabase = await createClient()
      const { data: asset, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        throw error
      }
      return NextResponse.json(asset)
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error?.message).toResponse()
    }
  }
)

export const PATCH = withAuth<{ org_id: string; id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_ASSETS)

    try {
      const body = await request.json()
      const data = assetFormSchema.parse(body)
      const supabase = await createClient()
      const { data: currentAsset } = await supabase
        .from('assets')
        .select('is_warranty')
        .eq('id', params.id)
        .single()
      if (currentAsset?.is_warranty === false) {
        const { error } = await supabase
          .from('assets')
          .update({ ...data })
          .eq('id', params.id)
        if (error) {
          throw error
        }
        return NextResponse.json({ message: 'Touch Point updated successfully' })
      }
      throw new Error('Asset is under warranty, cannot be updated')
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error?.message).toResponse()
    }
  }
)

export const DELETE = withAuth<{ org_id: string; id: string }>(
  async (request: NextRequest, { params }) => {
    // Kiểm THÀNH VIÊN + QUYỀN. `withAuth` chỉ kiểm có session, không kiểm người
    // gọi thuộc org nào — xem `docs/audit-route-quyen-2026-10-26.md`.
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_ASSETS)

    try {
      const supabase = await createClient()
      const { error } = await supabase.from('assets').delete().eq('id', params.id)
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
