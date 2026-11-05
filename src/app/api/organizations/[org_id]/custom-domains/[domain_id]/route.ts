import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { updateCustomDomainSchema } from '@/shared/schemas/custom-domains'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { Tables } from '@/shared/types/database.types'
import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
export type CustomDomain = Tables<'domains'>

export const GET = withAuth<{ org_id: string; domain_id: string }>(
  async (request: NextRequest, { params }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)
      const supabase = await createServiceClient()
      // Tenant isolation: scope the lookup to the caller's org. Without this filter,
      // a Manager in org A could read a domain belonging to org B by supplying B's
      // domain_id in the URL — `ensurePolicy` only checks org_id, not domain ownership.
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('id', params.domain_id)
        .eq('organization_id', params.org_id)
        .maybeSingle()
      if (error) {
        throw error
      }
      if (!data) {
        throw new NotFoundError('Domain not found', {
          key: 'common:messages.error.not_found',
        })
      }
      return NextResponse.json(data)
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

export const PATCH = withAuth<{ org_id: string; domain_id: string }>(
  async (request: NextRequest, { params }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)

      const body = await request.json()
      const validatedData = updateCustomDomainSchema.parse(body)
      const supabase = await createServiceClient()

      // Deep link configuration is only allowed on verified, org-owned, NON-subdomain-claimed
      // domains (i.e., custom domains the customer actually owns). See deep-links-spec §5.0
      // for the eligibility rule. li2-be public endpoint is intentionally ungated — enforcement
      // lives at the API write layer (here) + UI.
      //
      // The guard also enforces tenant isolation: we select `organization_id` and confirm it
      // matches the URL's `org_id` before the update. `ensurePolicy` validates the caller has
      // `manage_domains` in `params.org_id`, but does not scope the domain row lookup to that
      // org — so without this check, a Manager in org A could PATCH a domain belonging to org B
      // by supplying org B's domain_id in the URL. Returning `NotFoundError` on mismatch avoids
      // disclosing the existence of the cross-org domain.
      if (validatedData.deep_link_apps !== undefined && validatedData.deep_link_apps !== null) {
        const { data: domain, error: fetchError } = await supabase
          .from('domains')
          .select('is_verified, is_subdomain_claimed, organization_id')
          .eq('id', params.domain_id)
          .single()

        if (fetchError || !domain || domain.organization_id !== params.org_id) {
          throw new NotFoundError('Domain not found', {
            key: 'common:messages.error.not_found',
          })
        }

        if (!domain.is_verified) {
          throw new BadRequestError('Deep link configuration requires a verified domain', {
            key: 'domain:deepLink.errors.domain_not_verified',
          })
        }

        if (domain.is_subdomain_claimed) {
          throw new BadRequestError(
            'Deep links are not available on claimed subdomains. Add a custom domain to enable deep links.',
            { key: 'domain:deepLink.errors.subdomain_not_eligible' }
          )
        }
      }

      // Defence in depth: scope the update to the caller's org. Even if someone bypasses
      // the guard above (e.g. a future schema expansion that doesn't include `deep_link_apps`),
      // the update can never write to a cross-org row.
      const query = supabase
        .from('domains')
        .update(validatedData)
        .eq('id', params.domain_id)
        .eq('organization_id', params.org_id)
      const { error } = await query
      if (error) {
        throw error
      }
      return APIResponse.updated({
        success: true,
        i18nMessage: {
          key: 'common:messages.success.updated_field',
          params: {
            field: 'Domain',
          },
        },
      })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new BadRequestError(error.message, {
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

export const DELETE = withAuth<{ org_id: string; domain_id: string }>(
  async (request: NextRequest, { params }) => {
    try {
      await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)
      const supabase = await createServiceClient()
      // Tenant isolation: scope the lookup to the caller's org. See GET handler
      // comment above for why `ensurePolicy` alone isn't enough.
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('id', params.domain_id)
        .eq('organization_id', params.org_id)
        .maybeSingle()
      if (error) {
        throw error
      }
      if (!data) {
        throw new NotFoundError('Domain not found', {
          key: 'common:messages.error.not_found',
        })
      }
      // Always route through li2-backend so it can clean up Cloudflare custom
      // hostname (cf_hostname_id) before the DB row is removed — even for
      // unverified domains that already completed phase 1 (CNAME check passed,
      // CF hostname created). Skipping this caused error 1406 on re-add.
      const shlinkService = new ShlinkService()
      await shlinkService.deleteDomain(data.id)
      return APIResponse.deleted({
        i18nMessage: {
          key: 'common:messages.success.deleted',
          params: {
            field: '$t(module.domain)',
          },
        },
      })
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
