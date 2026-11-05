import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { supabaseService } from '@/infrastructure/database/supabase'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { enqueueTask } from '@/infrastructure/queue/asynq-client'
import { TASK_LARK_NOTIFY, QUEUE_NAMES } from '@/infrastructure/queue/constants'

export const PATCH = withAuth(async (request: NextRequest, { context }) => {
  const body = await request.json()
  const { order_id } = body

  if (!order_id) throw new BadRequestError()

  const { data: updated, error } = await supabaseService
    .from('orders')
    .update({ result_code: 2 })
    .eq('order_id', order_id)
    .eq('user_id', context.userId)
    .eq('result_code', -1)
    .select('id, amount, retention_days, plans(name, plan_key)')
    .single()

  if (error || !updated) throw new NotFoundError()

  // Read order_type from Redis before deleting
  const cached = await redis.get(REDIS_KEYS.BILLING.PENDING_ORDER(context.userId))
  const orderType: string = cached ? (JSON.parse(cached)?.order_type ?? 'purchase') : 'purchase'

  await redis.del(REDIS_KEYS.BILLING.PENDING_ORDER(context.userId))

  const planKey = (updated.plans as any)?.plan_key ?? ''
  const planName = (updated.plans as any)?.name ?? ''
  const planLabel = planName ? `${planName} (${planKey})` : planKey
  let content: string
  if (orderType === 'extend') {
    content = `Extend: ${planLabel}\n+${updated.retention_days} days\nAmount: ${updated.amount}đ`
  } else if (orderType === 'upgrade') {
    content = `Upgrade → ${planLabel}\n+${updated.retention_days} days\nAmount: ${updated.amount}đ (prorated)`
  } else {
    const cycle = updated.retention_days === 365 ? 'yearly' : 'monthly'
    content = `Plan: ${planLabel}\nCycle: ${cycle}\nAmount: ${updated.amount}đ`
  }

  enqueueTask(TASK_LARK_NOTIFY, {
    event: 'user_confirmed',
    title: '💳 User Confirmed Transfer',
    content,
    user_id: context.userId,
    user_email: context.email,
    order_id: order_id,
  }, { queue: QUEUE_NAMES.DEFAULT, maxRetry: 1 })

  return APIResponse.ok({ data: null })
})
