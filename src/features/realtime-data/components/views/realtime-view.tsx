'use client'

import React from 'react'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { useTranslation } from 'react-i18next'
import { AdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import RealtimeData from '@/features/realtime-data/components'

export default function RealtimeInteractionView() {
  const { t } = useTranslation(['realtime'])
  return (
    <ContentLayout
      title={t('page_title')}
      className="md:pt-6 pt-4"
      isBackable={false}
    >
      <AdvancedAnalyticsProvider>
        <RealtimeData />
      </AdvancedAnalyticsProvider>
    </ContentLayout>
  )
}
