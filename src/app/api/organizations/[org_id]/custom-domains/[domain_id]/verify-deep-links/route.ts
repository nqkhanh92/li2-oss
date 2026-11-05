import { NextRequest } from 'next/server'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { parseDeepLinkConfig } from '@/shared/schemas/custom-domains'
import { deepLinkVerificationService } from '@/ee/core/services/deep-link-verification.service'

export const GET = withAuth<{ org_id: string; domain_id: string }>(
  async (_request: NextRequest, { params }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)

      const supabase = await createServiceClient()
      const { data: domain, error } = await supabase
        .from('domains')
        .select('domain, deep_link_apps, is_verified, organization_id')
        .eq('id', params.domain_id)
        .eq('organization_id', params.org_id)
        .maybeSingle()

      if (error) throw error

      if (!domain) {
        throw new NotFoundError('Domain not found', { key: 'common:messages.error.not_found' })
      }

      if (!domain.is_verified) {
        throw new BadRequestError(
          'Cannot verify deep links on an unverified domain',
          { key: 'domain:deepLink.errors.domain_not_verified' }
        )
      }

      const config = parseDeepLinkConfig(domain.deep_link_apps)

      if (!config || !config.enabled || config.apps.length === 0) {
        throw new BadRequestError(
          'No deep link configuration found for this domain',
          { key: 'domain:deepLink.errors.no_config' }
        )
      }

      const result = await deepLinkVerificationService.verify(domain.domain, config)

      return APIResponse.ok({ data: result })
    } catch (error: unknown) {
      if (error instanceof BaseError) return error.toResponse()
      return new AppError((error as Error).message).toResponse()
    }
  }
)
