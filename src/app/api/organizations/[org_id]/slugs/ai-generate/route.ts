import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { NextRequest } from 'next/server'
import { aiProviderService } from '@/core/services/ai-provider.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { touchPointService } from '@/core/services/touch-point.service'
import { AuthContext } from '@/shared/types/request'
import { redis } from '@/infrastructure/cache/redis'
import { getLocale } from '@/shared/utils/server/get-locale'

export const POST = withAuth<{ org_id: string }>(
  async (
    request: NextRequest,
    { params, context }: { params: { org_id: string }; context: AuthContext }
  ) => {
    const { org_id } = params
    const { url, touch_point_id, regenerate } = await request.json()
    const locale = getLocale()

    if (!regenerate) {
      const cachedSlug = await redis.get(`slug-optimize:${url}`)
      if (cachedSlug) {
        return APIResponse.ok({
          data: JSON.parse(cachedSlug),
          message: 'Slug generated successfully',
          i18nMessage: { key: 'common:messages.success.slug_generated' },
        })
      }
    }

    const slug = await aiProviderService.generateSlug(org_id, url, locale)

    if (slug.provider_used !== 'fallback' && touch_point_id) {
      const suggested_slugs = [slug.slug, ...(slug.alternatives || [])]
      await touchPointService.updateRawData(
        org_id,
        touch_point_id,
        { suggested_slugs },
        context.userId
      )
    }

    redis.set(`slug-optimize:${url}`, JSON.stringify(slug), 'EX', 60 * 60)
    return APIResponse.ok({
      data: slug,
      message: 'Slug generated successfully',
      i18nMessage: { key: 'common:messages.success.slug_generated' },
    })
  }
)
