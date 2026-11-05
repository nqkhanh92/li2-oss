'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, Mail } from 'lucide-react'
import { Separator } from '@/shared/components/ui/separator'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { CheckoutPanel } from './qr-payment'
import { useCreateOrder, useConfirmTransfer, type CreateOrderResponse } from '../hooks/mutation'
import { VietQRBuilder } from '../utils/vietqr-builder'
import { BillingQr } from './billing-qr'

type Plan = {
  id: string
  name: string
  plan_key: string
  amount: string
  yearly_amount: string
}

type Props = {
  currentPlan: Plan
  expiresAt: string | null
  upgradePlan: Plan | null
  initialOrder: CreateOrderResponse | null
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

function formatVnd(amount: string | number) {
  const num = typeof amount === 'number' ? amount : parseInt(amount, 10)
  if (isNaN(num)) return String(amount)
  return num.toLocaleString('vi-VN') + 'đ'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function calcProration(expiresAt: string | null, currentPlan: Plan) {
  const now = new Date()
  const expiry = expiresAt ? new Date(expiresAt) : null
  const remainingDays =
    expiry && expiry > now
      ? Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0
  const dailyRate = parseInt(currentPlan.amount, 10) / 30
  const credit = Math.floor(remainingDays * dailyRate)
  return { remainingDays, credit }
}

// ─── Upgrade right panel (inline QR flow, no cycle toggle) ───────────────────

type UpgradePanelProps = {
  upgradePlan: Plan
  credit: number
  initialOrder: CreateOrderResponse | null
}

function UpgradePanel({ upgradePlan, credit, initialOrder }: UpgradePanelProps) {
  const newPlanAmount = parseInt(upgradePlan.amount, 10)
  const discountedAmount = Math.max(0, newPlanAmount - credit)

  const [order, setOrder] = useState<CreateOrderResponse | null>(initialOrder ?? null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const { mutate: createOrder, isPending } = useCreateOrder()
  const { mutate: confirmTransfer, isPending: isConfirming } = useConfirmTransfer()

  const handleConfirm = () => {
    createOrder(
      { plan_id: upgradePlan.id, cycle: 'monthly', order_type: 'upgrade' },
      { onSuccess: (data) => setOrder(data) },
    )
  }

  const handleSelfConfirm = () => {
    if (!order) return
    setConfirmError(false)
    confirmTransfer(
      { order_id: order.order_id },
      {
        onSuccess: () => {
          setConfirmed(true)
          setCountdown(10)
          const tick = setInterval(() => {
            setCountdown((c) => {
              if (c === null || c <= 1) {
                clearInterval(tick)
                window.location.href = '/org'
                return 0
              }
              return c - 1
            })
          }, 1000)
        },
        onError: () => setConfirmError(true),
      },
    )
  }

  const handleCopy = () => {
    if (!order) return
    navigator.clipboard.writeText(order.description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ─── Step 3: Confirmed ─── */
  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-6 h-full justify-center text-center px-2">
        <div className="w-16 h-16 rounded-full bg-semantic-info/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-semantic-info" />
        </div>
        <div className="space-y-2">
          <p className="font-bold text-lg text-primary">Xác nhận thành công!</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Chúng tôi sẽ gửi email xác nhận đến{' '}
            <strong className="text-primary">địa chỉ email</strong>{' '}
            của bạn khi thanh toán được duyệt.
          </p>
        </div>
        <div className="flex-1" />
        <div className="w-full space-y-3">
          <Button size="lg" className="w-full" asChild>
            <a href="/org">Về trang quản lý</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Tự động chuyển hướng sau {countdown ?? 0} giây...
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOrder(null)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="font-bold text-base text-primary">Quét mã QR để thanh toán</p>
            <p className="text-xs text-muted-foreground">Sử dụng app ngân hàng để quét mã</p>
          </div>
        </div>

        <div className="flex justify-center">
          <BillingQr value={qrPayload} size={256} />
        </div>

        <div className="rounded-xl border border-border text-sm overflow-hidden">
          <div className="bg-muted/60 divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Ngân hàng</span>
              <span className="font-semibold text-primary">Techcombank</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Số tài khoản</span>
              <span className="font-semibold text-primary font-mono">{ACCOUNT_NO}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Số tiền</span>
              <span className="font-bold text-primary">{formatVnd(order.amount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-muted-foreground shrink-0">Nội dung</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold text-primary truncate">{order.description}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Sao chép"
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-destructive/5 border-x-0 border-t-0 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive leading-relaxed">
              <strong>Không thay đổi nội dung chuyển khoản này.</strong>{' '}
              Hệ thống sẽ không thể xác nhận thanh toán nếu nội dung bị thay đổi.
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-start gap-2.5 rounded-xl bg-secondary/5 border border-secondary/20 px-4 py-3">
          <Mail className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
          <p className="text-xs text-secondary/80 leading-relaxed">
            Chúng tôi sẽ gửi email xác nhận đến{' '}
            <strong className="text-secondary">địa chỉ email</strong>{' '}
            của bạn khi thanh toán được duyệt.
          </p>
        </div>

        {confirmError && (
          <p className="text-xs text-destructive text-center">
            Chưa tìm thấy giao dịch. Vui lòng thử lại sau vài phút.
          </p>
        )}
        <Button size="lg" className="w-full" onClick={handleSelfConfirm} disabled={isConfirming}>
          {isConfirming ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản'}
        </Button>
      </div>
    )
  }

  /* ─── Step 1: Upgrade summary + confirm ─── */
  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <p className="font-bold text-base text-primary">Nâng cấp lên {upgradePlan.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          30 ngày sử dụng · Giá ưu đãi từ gói hiện tại
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border overflow-hidden text-sm">
        <div className="bg-muted/60 divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Giá gốc</span>
            <span className="text-primary font-medium">{formatVnd(upgradePlan.amount)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Khấu trừ còn lại</span>
            <span className="text-semantic-success font-medium">-{formatVnd(credit)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border">
          <span className="font-semibold text-primary">Bạn thanh toán</span>
          <span className="font-bold text-lg text-secondary-yellow">{formatVnd(discountedAmount)}</span>
        </div>
      </div>

      <div className="flex-1" />

      <Button
        size="lg"
        className="w-full"
        onClick={handleConfirm}
        disabled={isPending}
      >
        {isPending ? 'Đang xử lý...' : `Xác nhận nâng cấp · ${formatVnd(discountedAmount)}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Bằng cách tiếp tục, bạn đồng ý với điều khoản dịch vụ của Li2.
      </p>
    </div>
  )
}

// ─── Main BillingManagerPage ─────────────────────────────────────────────────

export function BillingManagerPage({ currentPlan, expiresAt, upgradePlan, initialOrder }: Props) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  const isUpgradeMode = upgradePlan !== null
  const { remainingDays, credit } = isUpgradeMode
    ? calcProration(expiresAt, currentPlan)
    : { remainingDays: 0, credit: 0 }

  const currentAmount = cycle === 'yearly' ? currentPlan.yearly_amount : currentPlan.amount
  const totalDue = isUpgradeMode
    ? Math.max(0, parseInt(upgradePlan!.amount, 10) - credit)
    : parseInt(currentAmount, 10)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/20 to-purple-50/30 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[900px] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">

        {/* ── Left panel: dark ── */}
        <div className="lg:w-[44%] bg-primary flex flex-col p-8 gap-8">

          {/* Logo */}
          <div className="relative h-8 w-[120px]">
            <Image
              src="/images/li2-logo-withtext.svg"
              alt="Li2"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Mode heading */}
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-secondary-yellow/20 text-secondary-yellow px-3 py-1 text-xs font-semibold">
              {isUpgradeMode ? upgradePlan!.name : currentPlan.name}
            </span>
            <h1 className="text-xl font-bold text-white leading-snug">
              {isUpgradeMode ? (
                <>
                  Nâng cấp lên{' '}
                  <span className="text-secondary-yellow">{upgradePlan!.name}</span>
                </>
              ) : (
                <>
                  Gia hạn gói{' '}
                  <span className="text-secondary-yellow">{currentPlan.name}</span>
                </>
              )}
            </h1>
            {expiresAt && (
              <p className="text-sm text-white/60">
                Gói hiện tại hết hạn: {formatDate(expiresAt)}
              </p>
            )}
          </div>

          {/* Proration breakdown (upgrade mode only) */}
          {isUpgradeMode && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Chi tiết ưu đãi
              </p>
              <div className={cn('flex flex-col gap-2 rounded-xl bg-white/5 p-4 text-sm')}>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Còn lại ({currentPlan.name})</span>
                  <span className="text-white font-medium">{remainingDays} ngày</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Khấu trừ</span>
                  <span className="text-semantic-success font-medium">-{formatVnd(credit)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Total due */}
          <div>
            <Separator className="bg-white/10 mb-5" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/50">Tổng thanh toán</span>
              <div className="text-right">
                <span className="text-xl font-bold text-secondary-yellow">{formatVnd(totalDue)}</span>
                {!isUpgradeMode && (
                  <span className="text-xs text-white/40 ml-1">
                    {cycle === 'yearly' ? '/năm' : '/tháng'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Back link */}
          <Link
            href="https://li2.ai/pricing"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            Xem bảng giá
          </Link>
        </div>

        {/* ── Right panel: checkout ── */}
        <div className="flex-1 bg-card flex flex-col p-8">
          {isUpgradeMode ? (
            <UpgradePanel
              upgradePlan={upgradePlan!}
              credit={credit}
              initialOrder={initialOrder}
            />
          ) : (
            <CheckoutPanel
              plan={currentPlan}
              cycle={cycle}
              onCycleChange={setCycle}
              initialOrder={initialOrder}
              orderType="extend"
            />
          )}
        </div>
      </div>
    </div>
  )
}
