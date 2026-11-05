'use client'

import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { DeepLinkAnalyticsFilters } from './deep-link-analytics-filters'

/**
 * Deep Link Analytics page body (Task 5.0 — shell + gate only).
 *
 * - `blocked` (non-Pro): the page-level plan gate in page.tsx caught a PlanError;
 *   render the locked/upsell state from the existing `domain:deepLink.attribution.*` keys.
 * - Pro+: the filter bar (`<DeepLinkAnalyticsFilters/>`) owns the shared analytics filter
 *   state and feeds a mapped filter object into the filter-prop-driven
 *   `<DeepLinkAnalyticsBody/>` (the Clicks→App Opens funnel + widgets), built so the same
 *   body can later embed in AnalyticByTag with zero rework (README Key Decision 1).
 */
export function DeepLinkAnalyticsView({ blocked }: { blocked: boolean }) {
  const { t } = useTranslation(['domain'])

  if (blocked) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t('domain:deepLink.attribution.analytics_locked')}
          </CardTitle>
          <CardDescription>{t('domain:deepLink.attribution.upsell_body')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <DeepLinkAnalyticsFilters />
}
