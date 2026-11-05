import {
  AppError,
  BadRequestError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { ShlinkService } from '@/infrastructure/external/shlink/shlink.service'
import { AxiosError } from 'axios'
import dayjs from 'dayjs'
import { NextRequest, NextResponse } from 'next/server'
import { BaseError } from '@/infrastructure/response/errors/base.error'

export async function POST(
  request: NextRequest,
  { params }: { params: { org_id: string; domain_id: string } }
) {
  try {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_domains)

    const supabase = await createServiceClient()
    // Tenant isolation: scope the lookup to the caller's org. Otherwise a
    // Manager in org A could trigger DNS verification (and its side effects —
    // nginx config, cert provisioning) on a domain belonging to org B.
    const { data: domain, error } = await supabase
      .from('domains')
      .select('*')
      .eq('id', params.domain_id)
      .eq('organization_id', params.org_id)
      .maybeSingle()
    if (error) {
      throw error
    }
    if (!domain) {
      throw new NotFoundError('Domain not found', {
        key: 'common:messages.error.not_found',
      })
    }
    if (domain.is_verified) {
      throw new BadRequestError('Domain is already verified')
    }
    if (dayjs(domain.last_failed_at).add(30, 'second') > dayjs()) {
      throw new BadRequestError('Please wait 30 seconds before verifying again')
    }

    const shlinkService = new ShlinkService()
    const data = await shlinkService.verifyDomain(domain.id)
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    if (error instanceof AxiosError) {
      return new BadRequestError('Failed to verify domain, please check your dns configuration!', {
        key: 'common:messages.error.field_failed_verify_dns',
        params: {
          field: '$t(module.domain)',
        },
      }).toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}
