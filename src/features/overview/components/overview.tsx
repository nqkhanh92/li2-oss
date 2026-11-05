'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
// TODO: Move PlanBanner to shared/ when old dashboard is removed
import { PlanBanner } from '@/features/dashboard/components/sections/plan-banner'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { useGetOverviewData } from '../hooks/queries'
import { OverviewTrendChart } from './overview-trend-chart'
import { OverviewLinksColumn } from './overview-links-column'
import { OverviewClicksCard } from './overview-clicks-card'
import { OverviewChannelsCard } from './overview-channels-card'
import { OverviewTopLinksCard } from './overview-top-links-card'
import { OverviewWebsiteColumn } from './overview-website-column'
import { OverviewConversionsColumn } from './overview-conversions-column'
import { OverviewLockedColumn } from './overview-locked-column'
import { OverviewPlanFooter } from './overview-plan-footer'

// Both domain columns are gone: fill the row with the Links card split into three
const LINKS_ONLY = disabledFeatures.ATTRIBUTION && disabledFeatures.BEHAVIOR_ANALYTICS

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Chart skeleton */}
      <Skeleton className="h-64 w-full rounded-2xl" />
      {/* Columns skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      {/* Footer skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  )
}

export function OverviewView() {
  const { t } = useTranslation(['overview', 'dashboard'])
  const { org_id } = useParams<{ org_id: string }>()
  const { profile } = useProfileProvider()
  const orgPlan = useOrganizationStore((s) => s.orgPlan)

  const { data, isLoading, isError, refetch } = useGetOverviewData(org_id)

  // Determine if user has Pro features (website analytics + conversions)
  const isPro =
    !!orgPlan?.advanced_features_allowed?.includes(ADVANCED_FEATURE_KEYS.FUNNEL_ANALYTICS) ||
    !!orgPlan?.advanced_features_allowed?.includes(ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS) ||
    !!orgPlan?.advanced_features_allowed?.includes(ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)

  if (isLoading) return <OverviewSkeleton />

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-slate-500">{t('error.message')}</p>
        <Button
          size="sm"
          variant="secondary"
          iconLeft={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          {t('error.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome + Plan banner (reused from old dashboard) */}
      <span className="text-2xl font-semibold text-foreground md:inline-flex flex max-w-full text-ellipsis overflow-hidden">
        Hi, {profile?.display_name || profile?.name}! {t('dashboard:welcome')}
      </span>
      <PlanBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t('overview:title')}</h1>
          <p className="mt-0.5 text-xs text-slate-400">{t('overview:subtitle')}</p>
        </div>
      </div>

      {/* Trend Chart */}
      <OverviewTrendChart data={data.trend} isPro={isPro} />

      {/* Three domain columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {LINKS_ONLY ? (
          <>
            <OverviewClicksCard data={data.links} />
            <OverviewChannelsCard data={data.links} />
            <OverviewTopLinksCard data={data.links} />
          </>
        ) : (
          <>
            {/* Links — always active */}
            <OverviewLinksColumn data={data.links} />

            {/* Website — real data for Pro, locked for Free */}
            {!disabledFeatures.BEHAVIOR_ANALYTICS &&
              (isPro && data.website ? (
                <OverviewWebsiteColumn data={data.website} />
              ) : (
                <OverviewLockedColumn domain="website" />
              ))}

            {/* Conversions — real data for Pro, locked for Free */}
            {!disabledFeatures.ATTRIBUTION &&
              (isPro && data.conversions ? (
                <OverviewConversionsColumn data={data.conversions} />
              ) : (
                <OverviewLockedColumn domain="conversions" />
              ))}
          </>
        )}
      </div>

      {/* Plan footer */}
      <OverviewPlanFooter planUsage={data.planUsage} />
    </div>
  )
}
