import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'

export class OrgCreditRepository extends BaseRepository<'org_credits'> {
  constructor() {
    super('org_credits')
  }

  async getOrgCredit(orgId: string) {
    return await this.query().select('ai_credits_balance, ai_credits_used_this_month').eq('org_id', orgId).single()
  }
}
export const orgCreditRepo =
  process.env.NODE_ENV !== 'production'
    ? new OrgCreditRepository()
    : globalThis._orgCreditRepo ?? (globalThis._orgCreditRepo = new OrgCreditRepository())
