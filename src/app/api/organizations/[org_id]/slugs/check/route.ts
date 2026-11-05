import { NextRequest } from 'next/server'
import { slugService } from '@/core/services/slug.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { z } from 'zod'
import { APIResponse } from '@/infrastructure/response/ok/base'

const checkSlugSchema = z.object({
  slug: z.string().min(1),
})

export const POST = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  const body = await request.json()
  const { slug } = checkSlugSchema.parse(body)

  const result = await slugService.checkSlugExists(slug)

  return APIResponse.ok({ data: result })
})
