import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { supabaseService } from '@/infrastructure/database/supabase'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { enqueueTask } from '@/infrastructure/queue/asynq-client'
import { TASK_LARK_NOTIFY, QUEUE_NAMES } from '@/infrastructure/queue/constants'

export const POST = withAuth(async (request: NextRequest, { context }) => {
  const body = await request.json()
  const { plan_id, cycle, order_type = 'purchase' } = body

  if (!plan_id || !cycle || !['monthly', 'yearly'].includes(cycle)) {
    throw new BadRequestError()
  }

  if (!['purchase', 'extend', 'upgrade'].includes(order_type)) {
    throw new BadRequestError()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan, error: planError } = await (supabaseService as any)
    .from('plans')
    .select('id, name, plan_key, amount, yearly_amount')
    .eq('id', plan_id)
    .single() as { data: { id: string; name: string; plan_key: string; amount: string; yearly_amount: string | null } | null; error: unknown }

  if (planError || !plan) throw new NotFoundError()

  let amount: string
  let retention_days: number

  if (order_type === 'upgrade') {
    // Fetch current user plan to calculate prorated credit
    const { data: userPlan } = await supabaseService
      .from('user_plans')
      .select('expires_at, plan_id, plans(amount)')
      .eq('user_id', context.userId)
      .single()

    const expiresAt = userPlan?.expires_at ? new Date(userPlan.expires_at) : null
    const now = new Date()
    const remainingDays = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMonthlyAmount = parseInt((userPlan?.plans as any)?.amount ?? '0', 10)
    const dailyRate = currentMonthlyAmount / 30
    const credit = Math.floor(remainingDays * dailyRate)
    const newPlanAmount = parseInt(plan.amount, 10)
    amount = String(Math.max(0, newPlanAmount - credit))
    retention_days = 30
  } else {
    amount = cycle === 'yearly' ? (plan.yearly_amount ?? '0') : plan.amount
    retention_days = cycle === 'yearly' ? 365 : 30
  }

  const orderId = crypto.randomUUID().replace(/-/g, '')

  const { data: order, error: insertError } = await supabaseService
    .from('orders')
    .insert({
      partner_code: 'VIETQR',
      order_id: orderId,
      request_id: orderId,
      user_id: context.userId,
      plan_id: plan.id,
      amount,
      retention_days,
      result_code: -1,
    })
    .select('id, order_id')
    .single()

  if (insertError || !order) throw new Error('Failed to create order')

  const orderData = {
    order_id: orderId,
    plan_id: plan.id,
    amount,
    retention_days,
    description: orderId.slice(0, 8),
    order_type,
  }

  // Persist so the QR step survives a page refresh (TTL: 2 hours)
  await redis.set(
    REDIS_KEYS.BILLING.PENDING_ORDER(context.userId),
    JSON.stringify(orderData),
    'EX',
    60 * 60 * 2,
  )

  const planLabel = `${plan.name} (${plan.plan_key})`
  let larkContent: string
  if (order_type === 'extend') {
    larkContent = `Extend: ${planLabel}\n+${retention_days} days\nAmount: ${amount}đ`
  } else if (order_type === 'upgrade') {
    larkContent = `Upgrade → ${planLabel}\n+30 days\nAmount: ${amount}đ (prorated)`
  } else {
    larkContent = `Plan: ${planLabel}\nCycle: ${cycle}\nAmount: ${amount}đ`
  }

  enqueueTask(TASK_LARK_NOTIFY, {
    event: 'order_created',
    title: '🆕 New Order Created',
    content: larkContent,
    user_id: context.userId,
    user_email: context.email,
    order_id: orderId,
  }, { queue: QUEUE_NAMES.DEFAULT, maxRetry: 1 })

  return APIResponse.created({ data: orderData })
})
