'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/shared/components/ui/separator'
import { CheckoutPanel } from './qr-payment'
import { type CreateOrderResponse } from '../hooks/mutation'

type BillingPlan = {
  id: string
  name: string
  plan_key: string
  amount: string
  yearly_amount: string
  max_orgs_per_user: number
  max_members_per_org: number
  max_domains_per_org: number
  data_retention_days: number
  max_ai_credits: number
  allow_custom_meta_tags: boolean
  allow_custom_utm_tags: boolean
  extra_advanced_analytics: boolean
}

type Props = {
  plan: BillingPlan
  initialOrder?: CreateOrderResponse | null
}

function formatVnd(amount: string) {
  const num = parseInt(amount, 10)
  if (isNaN(num)) return amount
  return num.toLocaleString('vi-VN') + 'đ'
}

export function BillingPage({ plan, initialOrder }: Props) {
  const { t } = useTranslation('billing')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  const currentAmount = cycle === 'yearly' ? plan.yearly_amount : plan.amount

  const features = [
    t('feature.orgs', { count: plan.max_orgs_per_user }),
    t('feature.members', { count: plan.max_members_per_org }),
    plan.max_domains_per_org > 0 ? t('feature.domains', { count: plan.max_domains_per_org }) : null,
    t('feature.retention', { days: plan.data_retention_days }),
    t('feature.ai_credits', { count: plan.max_ai_credits }),
    plan.allow_custom_meta_tags ? t('feature.meta_tags') : null,
    plan.allow_custom_utm_tags ? t('feature.utm_tags') : null,
    plan.extra_advanced_analytics ? t('feature.advanced_analytics') : null,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/20 to-purple-50/30 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[900px] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">

        {/* ── Left panel: dark, plan details ── */}
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

          {/* Plan header */}
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-secondary-yellow/20 text-secondary-yellow px-3 py-1 text-xs font-semibold">
              {plan.name}
            </span>
            <h1 className="text-xl font-bold text-white leading-snug">
              {t('heading_prefix')}{' '}
              <span className="text-secondary-yellow">{plan.name}</span>
            </h1>
            <p className="text-sm text-white/60">{t('tagline')}</p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {t('whats_included')}
            </p>
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-secondary-yellow/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-secondary-yellow" />
                </div>
                <span className="text-sm text-white/80">{f}</span>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Total */}
          <div>
            <Separator className="bg-white/10 mb-5" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/50">{t('total_due')}</span>
              <div className="text-right">
                <span className="text-xl font-bold text-secondary-yellow">{formatVnd(currentAmount)}</span>
                <span className="text-xs text-white/40 ml-1">
                  {cycle === 'yearly' ? t('per_year') : t('per_month')}
                </span>
              </div>
            </div>
          </div>

          {/* Back link */}
          <Link
            href="https://li2.ai/pricing"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('back_to_pricing')}
          </Link>
        </div>

        {/* ── Right panel: checkout ── */}
        <div className="flex-1 bg-card flex flex-col p-8">
          <CheckoutPanel plan={plan} cycle={cycle} onCycleChange={setCycle} initialOrder={initialOrder} />
        </div>
      </div>
    </div>
  )
}
