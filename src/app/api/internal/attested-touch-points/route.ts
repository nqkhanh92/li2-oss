import { NextRequest, NextResponse } from 'next/server'
import { compose } from '@/shared/lib/middlewares/compose'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { withServiceAuth } from '@/shared/lib/middlewares/with-service-auth'
import { ServiceAuthContext } from '@/shared/types/request'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { anonTouchPointService } from '@/core/services/anon-touch-point.service'
import { TouchPointVariants } from '@/features/touch-points/types'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { validate as isUuid } from 'uuid'

/**
 * Internal service-to-service route for the deep-link sample app.
 *
 * li2-be calls this AFTER verifying Apple App Attest + DeviceCheck quota, to mint
 * a short-lived (default 24h) ephemeral link. Reuses the (dormant) anon-touch-point
 * machinery: links land in `anon_touch_points` (`f-` slug, no org — inherently
 * isolated from real `touch_points`). Authenticated by `withServiceAuth` (x-api-key),
 * NOT the public cookie-based `withAnonAuth`. The public anon route is untouched.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

const POST_IMPL = async (request: NextRequest, context: ServiceAuthContext) => {
  try {
    const body = await request.json()
    const { url, anonId, qr, ttlMs } = body ?? {}

    if (!url || typeof url !== 'string') {
      throw new BadRequestError('url is required')
    }
    // anonId is derived device-side as uuidv5(App Attest keyId) — must be a valid UUID.
    if (!anonId || typeof anonId !== 'string' || !isUuid(anonId)) {
      throw new BadRequestError('anonId must be a valid UUID')
    }

    const parsed = touchPointAnonSchema.safeParse({
      content_value: url,
      variants_content: qr
        ? { [TouchPointVariants.QR]: { enabled: true, content_value: url } }
        : undefined,
    })
    if (!parsed.success) {
      throw new BadRequestError('Invalid touch point data')
    }

    const expiresInMs =
      typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS

    const inserted = await anonTouchPointService.createAnonTouchPoint(
      parsed.data,
      { anonId, ip: context.ipAddress },
      { expiresInMs }
    )

    return NextResponse.json({
      short_url: inserted.short_url,
      slug: inserted.short_code,
      qr_customize_options: inserted.qr_customize_options ?? null,
      deleted_at: inserted.deleted_at,
    })
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}

export const POST = compose(withCors, withServiceAuth)(POST_IMPL)

export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }))
