'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useCreateOrder, useConfirmTransfer, type CreateOrderResponse } from '../hooks/mutation'
import { VietQRBuilder } from '../utils/vietqr-builder'
import { BillingQr } from './billing-qr'

type BillingPlan = {
  id: string
  name: string
  plan_key: string
  amount: string
  yearly_amount: string
}

type Props = {
  plan: BillingPlan
  cycle: 'monthly' | 'yearly'
  onCycleChange: (cycle: 'monthly' | 'yearly') => void
  initialOrder?: CreateOrderResponse | null
  orderType?: 'purchase' | 'extend' | 'upgrade'
}

const ACQUIRER_ID = '970407'
const ACCOUNT_NO = '998228'

function buildQrPayload(amount: string, description: string) {
  return VietQRBuilder.generate({
    acquirerId: ACQUIRER_ID,
    accountNumber: ACCOUNT_NO,
    amount,
    additionalData: { purpose: description },
  })
}

function formatVnd(amount: string) {
  const num = parseInt(amount, 10)
  if (isNaN(num)) return amount
  return num.toLocaleString('vi-VN') + 'đ'
}

type CycleId = 'monthly' | 'yearly'

function CycleCard({
  id,
  label,
  sub,
  price,
  badge,
  selected,
  onClick,
}: {
  id: CycleId
  label: string
  sub: string
  price: string
  badge?: string | null
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-background hover:border-primary/30',
      )}
    >
      {/* Radio dot */}
      <div
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
          selected ? 'border-primary' : 'border-muted-foreground/30',
        )}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-semibold text-sm', selected ? 'text-primary' : 'text-primary/70')}>
              {label}
            </span>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-semantic-success/15 text-semantic-success px-2 py-0.5 text-xs font-semibold">
                {badge}
              </span>
            )}
          </div>
          <span className={cn('font-bold text-sm shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}>
            {price}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

export function CheckoutPanel({ plan, cycle, onCycleChange, initialOrder, orderType = 'purchase' }: Props) {
  const { t } = useTranslation('billing')
  const [order, setOrder] = useState<CreateOrderResponse | null>(initialOrder ?? null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const [copied, setCopied] = useState(false)
  const { mutate: createOrder, isPending } = useCreateOrder()
  const { mutate: confirmTransfer, isPending: isConfirming } = useConfirmTransfer()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) { window.location.href = '/org'; return }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleSelfConfirm = () => {
    if (!order) return
    setConfirmError(false)
    confirmTransfer(
      { order_id: order.order_id },
      {
        onSuccess: () => { setConfirmed(true); setCountdown(10) },
        onError: () => setConfirmError(true),
      },
    )
  }

  const handleConfirm = () => {
    createOrder(
      { plan_id: plan.id, cycle, order_type: orderType },
      { onSuccess: (data) => setOrder(data) },
    )
  }

  const handleCopy = () => {
    if (!order) return
    navigator.clipboard.writeText(order.description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const savings = (() => {
    const m = parseInt(plan.amount, 10)
    const y = parseInt(plan.yearly_amount, 10)
    if (!m || !y || y >= m * 12) return null
    const saved = m * 12 - y
    return { pct: Math.round((saved / (m * 12)) * 100), amount: saved }
  })()

  /* ─── Step 3: Confirmed ─── */
  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-6 h-full justify-center text-center px-2">
        <div className="w-16 h-16 rounded-full bg-semantic-info/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-semantic-info" />
        </div>
        <div className="space-y-2">
          <p className="font-bold text-lg text-primary">{t('qr.confirmed_heading')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            {t('qr.email_notice')}{' '}
            <strong className="text-primary">{t('qr.email_notice_bold')}</strong>{' '}
            {t('qr.email_notice_suffix')}
          </p>
        </div>
        <div className="flex-1" />
        <div className="w-full space-y-3">
          <Button size="lg" className="w-full" asChild>
            <a href="/org">{t('qr.go_dashboard')}</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('qr.redirect_countdown', { seconds: countdown ?? 0 })}
          </p>
        </div>
      </div>
    )
  }

  /* ─── Step 2: QR ─── */
  if (order) {
    const qrPayload = buildQrPayload(order.amount, order.description)

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOrder(null)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="font-bold text-base text-primary">{t('qr.heading')}</p>
            <p className="text-xs text-muted-foreground">{t('qr.subheading')}</p>
          </div>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          <BillingQr value={qrPayload} size={256} />
        </div>

        {/* Payment details card */}
        <div className="rounded-xl border border-border text-sm overflow-hidden">
          <div className="bg-muted/60 divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{t('qr.bank')}</span>
              <span className="font-semibold text-primary">{t('qr.bank_name')}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{t('qr.account')}</span>
              <span className="font-semibold text-primary font-mono">{ACCOUNT_NO}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{t('qr.amount')}</span>
              <span className="font-bold text-primary">{formatVnd(order.amount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-muted-foreground shrink-0">{t('qr.description')}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold text-primary truncate">{order.description}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title={t('qr.copy')}
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          {/* Warning — attached to bottom, no top border */}
          <div className="flex items-start gap-2.5 bg-destructive/5 border-x-0 border-t-0 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive leading-relaxed">
              <strong>Không thay đổi nội dung chuyển khoản này.</strong>{' '}
              Hệ thống sẽ không thể xác nhận thanh toán nếu nội dung bị thay đổi.
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Email notice */}
        <div className="flex items-start gap-2.5 rounded-xl bg-secondary/5 border border-secondary/20 px-4 py-3">
          <Mail className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
          <p className="text-xs text-secondary/80 leading-relaxed">
            {t('qr.email_notice')}{' '}
            <strong className="text-secondary">{t('qr.email_notice_bold')}</strong>{' '}
            {t('qr.email_notice_suffix')}
          </p>
        </div>

        {/* Self-confirm button */}
        {confirmError && (
          <p className="text-xs text-destructive text-center">
            {t('qr.confirm_error')}
          </p>
        )}
        <Button size="lg" className="w-full" onClick={handleSelfConfirm} disabled={isConfirming}>
          {isConfirming ? t('qr.self_confirm_processing') : t('qr.self_confirm')}
        </Button>
      </div>
    )
  }

  /* ─── Step 1: Billing cycle ─── */
  const currentAmount = cycle === 'yearly' ? plan.yearly_amount : plan.amount

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div>
        <p className="font-bold text-base text-primary">{t('checkout.heading')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('checkout.subheading')}</p>
      </div>

      {/* Cycle options */}
      <div className="flex flex-col gap-2.5">
        <CycleCard
          id="monthly"
          label={t('checkout.monthly_label')}
          price={formatVnd(plan.amount)}
          sub={t('checkout.monthly_sub')}
          selected={cycle === 'monthly'}
          onClick={() => onCycleChange('monthly')}
        />
        <CycleCard
          id="yearly"
          label={t('checkout.yearly_label')}
          price={formatVnd(plan.yearly_amount)}
          sub={savings
            ? t('checkout.yearly_sub_savings', { amount: formatVnd(String(savings.amount)) })
            : t('checkout.yearly_sub_default')}
          badge={savings ? t('checkout.save_badge', { pct: savings.pct }) : null}
          selected={cycle === 'yearly'}
          onClick={() => onCycleChange('yearly')}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Order summary */}
      <div className="rounded-xl bg-muted/60 border border-border px-4 py-3 flex items-center justify-between text-sm">
        <div>
          <p className="font-medium text-primary">{plan.name}</p>
          <p className="text-xs text-muted-foreground">
            {t('checkout.days_access', { days: cycle === 'yearly' ? 365 : 30 })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary">{formatVnd(currentAmount)}</p>
          <p className="text-xs text-muted-foreground">
            {cycle === 'yearly' ? t('per_year') : t('per_month')}
          </p>
        </div>
      </div>

      {/* Confirm */}
      <Button size="lg" onClick={handleConfirm} disabled={isPending} className="w-full">
        {isPending ? t('checkout.processing') : t('checkout.confirm')}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t('checkout.terms')}</p>
    </div>
  )
}

/** @deprecated use CheckoutPanel */
export function QrPayment({ plan, cycle }: { plan: BillingPlan; cycle: 'monthly' | 'yearly' }) {
  return <CheckoutPanel plan={plan} cycle={cycle} onCycleChange={() => {}} />
}
