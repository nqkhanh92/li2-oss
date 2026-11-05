'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Link2Icon,
  MousePointer2,
  Link2,
  QrCode,
  GitMerge,
  Target,
  Users,
  Flame,
  Filter,
  Settings,
  FileText,
  PlayCircle,
  Map,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useUpdateOnboardingState } from '@/features/analytics-settings/hooks/use-onboarding-state'
import type { ProductType } from '@/features/analytics-settings/types/types'
import CardSwap from '@/shared/components/animation/card-swap'
import { LinkJourneyTrafficCard } from '@/ee/features/link-journey/components/link-journey-demo-v4'
import { ConversionsStatsCard } from '@/ee/features/conversions/components/conversions-demo-v2'
import { HeatmapClickCard } from '@/ee/features/heatmap/components/heatmap-demo-v2'
import { FunnelDemoCard } from '@/ee/features/funnels/components/funnel-demo-v2'
import { FormsAnalyticsDemoCard } from '@/ee/features/forms-analytics/components/forms-analytics-demo-v2'
import { CustomersDemoCard } from '@/features/customers/components/customers-demo-v1'
import { AnalyticsDemoCard } from '@/features/analytics/components/analytics-demo-v1'

interface Props {
  org_id: string
  onSelect: (type: ProductType) => void
}

const PRODUCT_CONFIGS: Array<{
  key: ProductType
  icon: React.ElementType
  colorClass: string
  bgClass: string
  features: Array<{ icon: React.ElementType; featureKey: string }>
}> = [
  {
    key: 'link_attribution',
    icon: Link2Icon,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-200',
    features: [
      { icon: Link2, featureKey: 'short_links' },
      { icon: QrCode, featureKey: 'qr_codes' },
      { icon: GitMerge, featureKey: 'advanced_routing' },
      { icon: Target, featureKey: 'conversion_tracking' },
      { icon: Map, featureKey: 'link_journey' },
      { icon: Users, featureKey: 'customer_profiles' },
    ],
  },
  {
    key: 'behavior_activity',
    icon: MousePointer2,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-200',
    features: [
      { icon: Flame, featureKey: 'heatmaps' },
      { icon: Filter, featureKey: 'funnels' },
      { icon: Settings, featureKey: 'event_rules' },
      { icon: FileText, featureKey: 'form_analytics' },
      { icon: PlayCircle, featureKey: 'session_replay' },
    ],
  },
]

const PRODUCT_TRANSLATION_KEY: Record<ProductType, 'link_attribution' | 'behavior_analytics'> = {
  link_attribution: 'link_attribution',
  behavior_activity: 'behavior_analytics',
}

export function ProductSelectStepSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Guide Banner */}
      <Skeleton className="h-12 w-full rounded-lg shrink-0" />

      {/* Product Cards */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-9 w-full shrink-0">
        {[6, 5].map((featureCount, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-card"
          >
            {/* Preview area */}
            <div className="relative h-[275px] shrink-0 bg-muted">
              {/* Feature rows */}
              <div className="absolute left-4 inset-y-0 flex flex-col justify-center gap-2.5">
                {Array.from({ length: featureCount }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-full rounded-[8px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductSelectStep({ org_id, onSelect }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { mutate: updateOnboardingState, isPending } = useUpdateOnboardingState(org_id)
  const [hoveredProduct, setHoveredProduct] = useState<ProductType | null>(null)

  const handleSelect = (type: ProductType) => {
    updateOnboardingState(
      { product_type: type },
      {
        onSuccess: () => onSelect(type),
        onError: () => onSelect(type),
      }
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full py-6">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('v2.product_select.title')}
        </h1>
        <p className="text-s text-muted-foreground truncate">{t('v2.product_select.subtitle')}</p>
      </div>

      {/* Guide Banner */}
      <div className="flex items-center gap-2 px-6 py-3 rounded-lg border border-[#b9aaff] bg-gradient-to-r from-[#dddfff] to-[94.712%] to-white shrink-0">
        <span className="text-s text-slate-600 whitespace-nowrap">
          {t('v2.product_select.guide_hint')}
        </span>
        <a
          href="https://docs.li2.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-s font-medium text-semantic-info hover:underline whitespace-nowrap"
        >
          {t('v2.product_select.guide_link')}
        </a>
      </div>

      {/* Product Cards */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-9 w-full shrink-0">
        {PRODUCT_CONFIGS.map((option) => {
          const isHovered = hoveredProduct === option.key
          const tKey = PRODUCT_TRANSLATION_KEY[option.key]

          return (
            <motion.div
              layout
              key={option.key}
              onHoverStart={() => setHoveredProduct(option.key)}
              onHoverEnd={() => setHoveredProduct(null)}
              initial={{ flex: 1 }}
              animate={{ flex: isHovered ? 1.4 : 1 }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                'relative flex flex-col rounded-2xl overflow-hidden cursor-pointer shadow-sm border transition-colors duration-500',
                isHovered
                  ? option.key === 'link_attribution'
                    ? 'bg-indigo-50/40 border-indigo-300'
                    : 'bg-orange-50/40 border-orange-300'
                  : 'bg-card border-slate-300'
              )}
              onClick={() => handleSelect(option.key)}
            >
              {/* CardSwap preview — top of card */}
              <div
                className={cn(
                  'relative h-[275px] rounded-t-xl overflow-hidden shrink-0 bg-gradient-to-br',
                  option.key === 'link_attribution'
                    ? 'from-indigo-100/70 to-slate-50'
                    : 'from-orange-100/70 to-slate-50'
                )}
              >
                {/* Feature list — overlaid on the left */}
                <div className="absolute left-4 inset-y-0 z-10 flex flex-col justify-center gap-2.5">
                  {option.features.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <div key={feature.featureKey} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'p-1.5 rounded-md shadow-sm bg-white border shrink-0',
                            option.key === 'link_attribution'
                              ? 'text-indigo-500 border-indigo-100'
                              : 'text-orange-500 border-orange-100'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 whitespace-nowrap drop-shadow-sm">
                          {t(`v2.product_select.products.${tKey}.features.${feature.featureKey}`)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* CardSwap — shifted right */}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out translate-x-28 translate-y-10',
                    isHovered ? 'opacity-100 scale-100' : 'opacity-20 scale-95'
                  )}
                >
                  <div className="scale-[0.62] origin-center">
                    {option.key === 'link_attribution' ? (
                      <CardSwap
                        cardDistance={28}
                        verticalDistance={36}
                        delay={3000}
                        easing="elastic"
                      >
                        <AnalyticsDemoCard />
                        <ConversionsStatsCard />
                        <CustomersDemoCard />
                      </CardSwap>
                    ) : (
                      <CardSwap
                        cardDistance={28}
                        verticalDistance={36}
                        delay={3000}
                        easing="elastic"
                      >
                        <HeatmapClickCard />
                        <FunnelDemoCard />
                        <FormsAnalyticsDemoCard />
                        <LinkJourneyTrafficCard />
                      </CardSwap>
                    )}
                  </div>
                </div>
              </div>

              {/* Info — bottom of card */}
              <div className="relative z-10 flex flex-1 flex-col justify-between gap-4 p-6">
                {/* Title + description */}
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-medium text-primary leading-7">
                    {t(`v2.product_select.products.${tKey}.title`)}
                  </h2>
                  <p className="text-s text-muted-foreground">
                    {t(`v2.product_select.products.${tKey}.description`)}
                  </p>
                </div>

                {/* CTA — pinned to bottom */}
                <Button
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(option.key)
                  }}
                >
                  {t('v2.product_select.cta')}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
