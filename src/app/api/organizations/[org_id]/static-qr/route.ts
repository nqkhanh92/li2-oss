import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { NextRequest } from 'next/server'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { staticQrService } from '@/core/services/static-qr.service'
import { createStaticQrSchema } from '@/shared/schemas/static-qr'

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination

  const { data, count } = await staticQrService.findAll(org_id, queryParams)
  return APIResponse.ok({
    data,
    rowCount: count,
  })
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const body = await req.json()
  const validatedData = createStaticQrSchema.parse(body)

  const createdStaticQr = await staticQrService.create(org_id, validatedData as any)
  return APIResponse.created({
    data: createdStaticQr,
    success: true,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: {
        field: 'Static QR',
      },
    },
  })
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const { ids } = await req.json()

  await staticQrService.bulkDelete(org_id, ids)
  return APIResponse.deleted({
    i18nMessage: {
      key: 'common:messages.success.deleted',
      params: {
        field: 'Static QR',
      },
    },
  })
})
