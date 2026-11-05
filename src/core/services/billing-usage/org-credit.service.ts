import {
  orgCreditRepo,
  OrgCreditRepository,
} from '@/core/repositories/billing-usage/org-credit.repository'
import { BaseService } from '../base.service'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { supabaseService } from '@/infrastructure/database/supabase'

export class OrgCreditService extends BaseService<OrgCreditRepository> {
  async getOrgCredit(orgId: string) {
    const { data, error } = await this.repo.getOrgCredit(orgId)
    if (error) throw new AppError('Org credit not found', {
      key: 'common:messages.error.org_credit_not_found',
    })
    return data
  }

  async reduceOrgCredit(orgId: string, amount: number) {
    return await supabaseService.rpc('reduce_ai_credits', {
      p_org_id: orgId,
      p_amount: amount,
    })
  }
}

export const orgCreditService =
  process.env.NODE_ENV !== 'production'
    ? new OrgCreditService(orgCreditRepo)
    : globalThis._orgCreditService ??
      (globalThis._orgCreditService = new OrgCreditService(orgCreditRepo))
