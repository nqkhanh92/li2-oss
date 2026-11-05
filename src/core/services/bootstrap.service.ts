import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { anonTouchPointService } from './anon-touch-point.service'
import { organizationService } from './organization.service'
import { touchPointService } from './touch-point.service'
import {
  AllTouchPointVariants,
  TouchPointContentType,
  TouchPointVariants,
  TouchPointVariantsContent,
} from '@/features/touch-points/types'
import { profileService } from './profile.service'
import { availableEvents } from '@/features/bootstrap/stores/bootstrap-store'
import dayjs from '@/shared/lib/dayjs'
import { redis } from '@/infrastructure/cache/redis'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { z } from 'zod'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { SHORT_ID_OFFSET } from '@/shared/constants/utils'
import { encode } from 'base62'
import { Tables, TablesInsert } from '@/shared/types/database.types'
import { logger } from '@/infrastructure/logging/logger'
import { hybridAuditLogger } from '@/shared/lib/logs/hybrid-audit-logger'
import { supabaseService } from '@/infrastructure/database/supabase'
import { auditLogger } from '@/shared/lib/logs/audit-logger'
import { domainService } from './domain.service'

const log = logger.child({ module: 'bootstrap' })
export class BootstrapService {
  constructor() {}

  public async migrateFromAnonymous(userId: string, anonId: string, orgId: string) {
    //** Migrate touch points */
    const anonTouchPoints = await anonTouchPointService.getNonMigratedAnonTouchPointList(anonId)
    const domain = await domainService.findDefaultOrgDomain(orgId)

    const touchPoints = anonTouchPoints.map((tp, index) => {
      const variants_content = Object.values(TouchPointVariants).reduce(
        (acc, variant) => ({
          ...acc,
          [variant]: {
            enabled: tp.variants_content?.[variant]?.enabled || false,
            content_value: tp.variants_content?.[variant]?.content_value || tp.content_value,
          },
        }),
        {} as TouchPointVariantsContent
      )

      return {
        user_id: userId,
        organization_id: orgId,
        domain_id: domain?.id,
        name: `${tp.short_code}`,
        // slug: tp.short_code,
        short_url: `${domain?.domain || process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${tp.short_code}`,
        short_code: tp.short_code,
        short_id: tp.short_id,
        qr_customize_options: tp.qr_customize_options,
        variants_content: variants_content,
        content_type: tp.content_type,
        content_value: tp.content_value,
      }
    })
    const createdTps = await touchPointService.bulkCreateBasicTp(touchPoints)
    const anonTpIds = anonTouchPoints.map((tp) => tp.id)
    await anonTouchPointService.markMigrated(anonTpIds)

    await profileService.markCompletedEvents({
      userId,
      events: ['MIGRATE_FROM_ANONYMOUS'],
    })

    return createdTps
  }

  public async migrateFromUnsavedAnon(anonId: string, userId: string, orgId: string) {
    try {
      const data = await redis.get(`anon:${anonId}:tp:pending`)
      if (!data) return
      const savedTp = touchPointAnonSchema.safeParse(JSON.parse(data))
      if (!savedTp.success) {
        redis.del(`anon:${anonId}:tp:pending`)
        return
      }

      const nextShortId = await touchPointService.getNextShortId()
      const shortCode = encode(nextShortId + SHORT_ID_OFFSET)

      const domain = await domainService.findDefaultOrgDomain(orgId)
      const shortUrl = `${domain?.domain || process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${shortCode}`

      const variants_content = Object.values(TouchPointVariants).reduce(
        (acc, variant) => ({
          ...acc,
          [variant]: {
            enabled: savedTp.data.variants_content?.[variant]?.enabled || false,
            content_value:
              savedTp.data.variants_content?.[variant]?.content_value || savedTp.data.content_value,
          },
        }),
        {} as TouchPointVariantsContent
      )
      if (savedTp.data.variants_content?.QR?.enabled) {
        savedTp.data.qr_customize_options = {
          ...savedTp.data.qr_customize_options,
          rawData: shortUrl + '?t=1',
          data: shortUrl + '?t=1',
        }
      }

      const tp: TablesInsert<'touch_points'> = {
        // ...savedTp,
        user_id: userId,
        organization_id: orgId,
        domain_id: domain?.id,
        name: `${shortCode}`,
        // slug: shortCode,
        short_url: shortUrl,
        short_code: shortCode,
        short_id: nextShortId,
        qr_customize_options: savedTp.data.qr_customize_options,
        variants_content: variants_content,
        content_type: savedTp.data.content_type ?? TouchPointContentType.URL,
        content_value: savedTp.data.content_value,
      }
      const insertedTp = await touchPointService.createBasicTp(tp)
      redis.del(`anon:${anonId}:tp:pending`)

      return insertedTp
    } catch (error) {
      // redis.del(`anon:${anonId}:tp:pending`)
      return null
    }
  }
  public async attemptPremiumGrant(
    profile: Tables<'profiles'>,
    {
      requestId,
      ip,
      fp,
      userAgent,
    }: { requestId: string; ip: string; fp: string; userAgent: string }
  ) {
    //** Write premium attemp */
    hybridAuditLogger.logEvent(
      'auth/callback',
      {
        eventType: 'PREMIUM_GRANT_ATTEMPT',
        userId: profile.id,
        timestamp: new Date(),
        requestId,
        ipAddress: ip,
        userAgent,
        result: 'SUCCESS',
        metadata: {
          email: profile.email,
          name: profile.display_name,
          ip,
          fp,
        },
      },
      { shouldLogToDatabase: false }
    )

    redis.rpush(
      'email:send',
      JSON.stringify({
        to: profile.email,
        key: 'user:welcome',
        value: {
          Email: profile.email,
        },
        subject_value: [],
        request_id: requestId,
        user_id: profile.id,
      })
    )
    const { data: result, error: assignError } = await supabaseService.rpc(
      'grant_premium_to_first_200',
      {
        _user_id: profile.id,
        _user_email: profile.email!,
        _signup_ip: ip,
        _signup_fp: fp,
        _user_agent: userAgent,
        _request_id: requestId,
      }
    )
    const { success, reason, processing_time_ms } = (result || {}) as {
      success: boolean
      reason: string
      processing_time_ms: number
    }
    hybridAuditLogger.logEvent(
      'auth/callback',
      {
        eventType: assignError
          ? 'PREMIUM_GRANT_ERROR'
          : success
          ? 'PREMIUM_GRANT_SUCCESS'
          : 'PREMIUM_GRANT_FAILED',
        userId: profile.id,
        timestamp: new Date(),
        requestId,
        ipAddress: ip,
        userAgent,
        result: assignError ? 'ERROR' : success ? 'SUCCESS' : 'FAILED',
        reason: assignError ? assignError.message : reason,
        metadata: {
          email: profile.email,
          name: profile.display_name,
          ip,
          fp,
          processing_time_ms,
        },
      },
      { shouldLogToDatabase: false }
    )
    redis.rpush(
      'email:send',
      JSON.stringify({
        to: profile.email,
        key: 'user:plan:premium-trial',
        value: {
          Email: profile.email,
          ActivationDate: dayjs().format('DD MMM YYYY'),
          ExpiresAt: dayjs().add(12, 'month').format('DD MMM YYYY'),
        },
        subject_value: [],
        request_id: requestId,
        user_id: profile.id,
      })
    )
    auditLogger.logEvent('auth/callback', {
      eventType: 'EMAIL_NOTIFICATION_REQUESTED',
      userId: profile.id,
      timestamp: new Date(),
      requestId,
      result: 'SUCCESS',
      metadata: {
        to: profile.email,
        email_key: 'user:plan:premium-trial',
      },
    })
  }
}

export const bootstrapService =
  process.env.NODE_ENV !== 'production'
    ? new BootstrapService()
    : globalThis._bootstrapService ?? (globalThis._bootstrapService = new BootstrapService())
