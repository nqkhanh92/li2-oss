import { redirect } from 'next/navigation'
import { supabaseService } from '@/infrastructure/database/supabase'
import { BillingPage } from '@/ee/features/billing/components/billing-page'
import { BillingManagerPage } from '@/ee/features/billing/components/billing-manager-page'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { getSession } from '@/shared/lib/auth/session'
import { type CreateOrderResponse } from '@/ee/features/billing/hooks/mutation'

export const metadata = { title: 'Upgrade Plan' }

type Props = {
  searchParams: Promise<{ plan?: string }>
}

type Plan = {
  id: string; name: string; plan_key: string; amount: string; yearly_amount: string
}

export default async function BillingPageRoute({ searchParams }: Props) {
  const { plan: planKey = 't1' } = await searchParams
  const session = await getSession()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawPlan, error } = await (supabaseService as any)
    .from('plans')
    .select(
      'id, name, plan_key, amount, yearly_amount, max_orgs_per_user, max_members_per_org, max_domains_per_org, data_retention_days, max_ai_credits, allow_custom_meta_tags, allow_custom_utm_tags, extra_advanced_analytics'
    )
    .eq('plan_key', planKey)
    .single()

  if (error || !rawPlan) redirect('/pricing')

  const plan = rawPlan as {
    id: string; name: string; plan_key: string; amount: string; yearly_amount: string
    max_orgs_per_user: number; max_members_per_org: number; max_domains_per_org: number
    data_retention_days: number; max_ai_credits: number
    allow_custom_meta_tags: boolean; allow_custom_utm_tags: boolean; extra_advanced_analytics: boolean
  }

  if (!plan.amount || plan.amount === '0') redirect('/org')

  // Check if user already has an active paid plan
  let currentPlan: Plan | null = null
  let expiresAt: string | null = null
  if (session?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userPlan } = await (supabaseService as any)
      .from('user_plans')
      .select('expires_at, plans(id, name, plan_key, amount, yearly_amount)')
      .eq('user_id', session.id)
      .single()
    if (userPlan?.plans && (userPlan.plans as Plan).plan_key !== 't0') {
      currentPlan = userPlan.plans as Plan
      expiresAt = userPlan.expires_at as string | null
    }
  }

  // If user is already on the requested plan, bump them to t2 upgrade
  if (currentPlan && currentPlan.plan_key === planKey && planKey !== 't2') {
    redirect('/upgrade?plan=t2')
  }

  // Restore pending order so QR step survives a page refresh
  let pendingOrder: CreateOrderResponse | null = null
  if (session?.id) {
    const cached = await redis.get(REDIS_KEYS.BILLING.PENDING_ORDER(session.id))
    if (cached) {
      const parsed = JSON.parse(cached) as CreateOrderResponse
      if (parsed.plan_id === plan.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabaseService as any)
          .from('orders')
          .select('result_code')
          .eq('order_id', parsed.order_id)
          .single()

        if (order?.result_code === -1) {
          pendingOrder = parsed
        } else {
          await redis.del(REDIS_KEYS.BILLING.PENDING_ORDER(session.id))
        }
      }
    }
  }

  // User with existing paid plan → prorated upgrade UI
  if (currentPlan && currentPlan.plan_key !== planKey) {
    return (
      <BillingManagerPage
        currentPlan={currentPlan}
        expiresAt={expiresAt}
        upgradePlan={plan}
        initialOrder={pendingOrder}
      />
    )
  }

  // New user or same plan → normal purchase UI
  return <BillingPage plan={plan} initialOrder={pendingOrder} />
}
