import { UserPlan } from '@/shared/providers/plan-provider'
import { BaseRepository } from './base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
// import { log } from 'console'
// import { AppError } from '@/infrastructure/response/errors/domain.errors'

export class UserPlanRepository extends BaseRepository<'user_plans'> {
  constructor() {
    super('user_plans')
  }

  async findOne(userId?: string) {
    let query = supabaseService.from('user_plans').select('*, plans(*)')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    const { data: plan, error } = await query.returns<UserPlan>().single()
    if (error) {
      throw error
    }
    return plan
  }

  async update(
    user_id: string,
    _data: {
      expires_at: string | null
      plan_id: string | null
      subscribed_at: string | null
    }
  ) {
    const { data: updatedProfile, error } = await supabaseService
      .from('user_plans')
      .update({
        plan_id: _data.plan_id,
        expires_at: _data.expires_at,
        subscribed_at: _data.subscribed_at,
      })
      .eq('user_id', user_id)
      .select('*, plans(*)')
      .returns<UserPlan>()
      .single()
    if (error) {
      throw error
    }
    return updatedProfile
  }
}
export const userPlanRepo = globalThis._userPlanRepo ?? new UserPlanRepository()

if (process.env.NODE_ENV !== 'production') globalThis._userPlanRepo = userPlanRepo
