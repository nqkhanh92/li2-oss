import { redirect } from 'next/navigation'
import { getSession } from '@/shared/lib/auth/session'
import { supabaseService } from '@/infrastructure/database/supabase'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { BillingManagerPage } from '@/ee/features/billing/components/billing-manager-page'
import { type CreateOrderResponse } from '@/ee/features/billing/hooks/mutation'

export const metadata = { title: 'Billing' }

export default async function BillingRoute() {
  const session = await getSession()
  if (!session?.id) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userPlan } = await (supabaseService as any)
    .from('user_plans')
    .select('expires_at, plans(id, name, plan_key, amount, yearly_amount)')
    .eq('user_id', session.id)
    .single()

  if (!userPlan?.plans) redirect('/upgrade')

  const currentPlan = userPlan.plans as {
    id: string; name: string; plan_key: string; amount: string; yearly_amount: string
  }
  const expiresAt = userPlan.expires_at as string | null

  // Restore pending extend order from Redis
  let pendingOrder: CreateOrderResponse | null = null
  const cached = await redis.get(REDIS_KEYS.BILLING.PENDING_ORDER(session.id))
  if (cached) {
    const parsed = JSON.parse(cached) as CreateOrderResponse
    if (parsed.plan_id === currentPlan.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: order } = await (supabaseService as any)
        .from('orders')
        .select('result_code')
        .eq('order_id', parsed.order_id)
        .single()
      if (order?.result_code === -1) pendingOrder = parsed
      else await redis.del(REDIS_KEYS.BILLING.PENDING_ORDER(session.id))
    }
  }

  return (
    <BillingManagerPage
      currentPlan={currentPlan}
      expiresAt={expiresAt}
      upgradePlan={null}
      initialOrder={pendingOrder}
    />
  )
}
