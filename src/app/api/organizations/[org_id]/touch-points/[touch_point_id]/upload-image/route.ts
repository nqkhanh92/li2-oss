import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { touchPointService } from '@/core/services/touch-point.service'
import { uploadFile, simpleUploadFile } from '@/shared/lib/storage/upload'
import { allowedMetaTagImageFormat } from '@/shared/schemas/touch-points'

const uploadImageSchema = z.object({
  type: z.enum(['qr_logo', 'meta_tag_image']),
})

export const POST = withAuth<{ org_id: string; touch_point_id: string }>(
  async (request: NextRequest, { params, context }) => {
    await touchPointService.ensureCanEditTouchPoint(
      params.org_id,
      params.touch_point_id,
      context.userId
    )

    const formData = await request.formData()
    const type = formData.get('type')
    const file = formData.get('file')

    const { type: imageType } = uploadImageSchema.parse({ type })

    if (!(file instanceof File)) {
      throw new BadRequestError('file is required')
    }

    let url: string

    if (imageType === 'qr_logo') {
      const { uploadRespone } = await uploadFile({
        folder: 'qr-logo',
        logo_type: 'qr-logo',
        file,
      })
      url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadRespone?.fullPath}`
    } else {
      const uploadRespone = await simpleUploadFile({
        folder: 'meta-tags',
        file,
        allowedTypes: allowedMetaTagImageFormat,
      })
      url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadRespone?.fullPath}`
    }

    return APIResponse.ok({ data: { url } })
  }
)
