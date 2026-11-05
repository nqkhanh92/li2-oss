import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import {
  availableEvents,
  AvailableEvents,
  availableEventsList,
} from '@/features/bootstrap/stores/bootstrap-store'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { getAnonContext } from '@/shared/lib/middlewares/with-anon-auth'
import { bootstrapService } from '@/core/services/bootstrap.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { logger } from '@/infrastructure/logging/logger'
import { organizationService } from '@/core/services/organization.service'

const log = logger.child({ module: 'bootstrap' })
export const POST = withAuth(async (request: NextRequest, { context }) => {
  const { event }: { event: AvailableEvents } = await request.json()
  if (!availableEventsList.includes(event)) {
    throw new BadRequestError('Event not found')
  }
  switch (event) {
    case availableEvents.FIRST_200_PREMIUM_GRANT:
      break
    case availableEvents.MIGRATE_FROM_ANONYMOUS: {
      const { userId } = context
      const { anonId } = await getAnonContext()
      if (!anonId) {
        throw new BadRequestError('Anon ID not found')
      }
      const { data: org, error } = await organizationService.getFirstOrgByUserId(userId)
      if (error) {
        log.error({...error})
        throw new BadRequestError('Organization not found')
      }
      const migratedAnonTp = await bootstrapService.migrateFromAnonymous(userId, anonId, org.id)
      const migratedUnsavedTp = await bootstrapService.migrateFromUnsavedAnon(
        anonId,
        userId,
        org.id
      )

      const count = (migratedAnonTp?.length || 0) + (migratedUnsavedTp ? 1 : 0)
      return APIResponse.ok({
        message: 'Migrate from anonymous successfully',
        data: {
          migrated_count: count,
          org_id: org.id,
          migrated_anon_tp: [...migratedAnonTp].filter(Boolean),
          migrated_unsaved_tp: [migratedUnsavedTp].filter(Boolean),
        },
        i18nMessage: {
          key: 'common:messages:success:migrate_anon',
        },
      })
    }
    case availableEvents.LOGIN_COMPLETED: {
      break
    }
    default:
      break
  }

  return APIResponse.ok({ event })
})
