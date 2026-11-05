import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const checkAvailabilitySchema = z.object({
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      'Invalid subdomain format'
    ),
  baseDomain: z.string(),
})

export const POST = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    try {
      const body = await request.json()
      const { subdomain, baseDomain } = checkAvailabilitySchema.parse(body)

      const fullDomain = `${subdomain}.${baseDomain}`
      const supabase = await createServiceClient()

      // Check if the domain already exists and is verified
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id, is_verified')
        .eq('name', fullDomain)
        .maybeSingle()

      const available = !existingDomain || !existingDomain.is_verified

      return APIResponse.ok({
        data: { available },
      })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new AppError('Invalid request data', {
          key: 'common:messages.error.validation_failed',
        }).toResponse()
      }
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
