'use client'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { TouchPointDetailHeader } from './header'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { useTouchPointActions } from '../../hooks/use-touchpoint-actions'
import { TouchPointDetailRef, TouchPointDetailV2 } from '.'
import { useRef, useState } from 'react'
import { TouchPointAdvanced } from '../touch-point-detail-advanced'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useTranslation } from 'react-i18next'
import { AnalyticByTouchPoint } from '@/features/analytics/components/sections/analytic-by-touch-point'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { useSearchParams } from 'next/navigation'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { Toaster } from '@/shared/components/ui/sonner'
import { Button } from '@/shared/components/ui/button'
import { TouchPointDetailFooter } from './footer'
import { SafetyFlaggedBanner } from './safety-flagged-banner'

const tabList = ['analytics', 'detail', 'advanced'] as const
export const TouchPointDetailWrapper = () => {
  const searchParams = useSearchParams()
  const getInitTab = () => {
    const tab = searchParams.get('tab')
    if (tabList.includes(tab as (typeof tabList)[number])) {
      return tab as (typeof tabList)[number]
    }
    return 'analytics'
  }

  const { t } = useTranslation(['touchpoint'])
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)

  const isFlagged = touchPoint?.safety_status === 'flagged'

  const { handleBack, handleCopy } = useTouchPointActions(touchPoint)

  const [tab, setTab] = useState<(typeof tabList)[number]>(getInitTab())

  const { enabled, showConfirm } = useFormWarningProvider()

  const handleChangeTab = async (newTab: (typeof tabList)[number]) => {
    if (enabled) {
      const result = await showConfirm()
      if (result) {
        setTab(newTab)
      }
    } else {
      setTab(newTab)
    }
  }

  const { handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)

  const handleActiveChange = async (isActive: boolean) => {
    await handleUpdate({
      enabled: isActive,
    })
  }
  const ref = useRef<TouchPointDetailRef>(null)

  return (
    <ContentLayout
      title={
        <TouchPointDetailHeader
          name={touchPoint.name}
          shortUrl={touchPoint.short_url}
          handleBack={handleBack}
          handleCopy={handleCopy}
          visits={touchPoint.visits?.[0]?.count}
          isActive={touchPoint.enabled}
          onActiveChange={handleActiveChange}
          onVisitClicked={() => {
            setTab('analytics')
          }}
          isFlagged={isFlagged}
        />
      }
      suspenseFallback={
        <div className="2xl:max-w-7xl p-6 md:py-[16px] md:px-12 w-full 2xl:mx-auto mr-auto">
          <SkeletonCard className="h-[540px]" />
        </div>
      }
      isBackable={false}
      navBarClassName="py-2 h-[60px] w-full [&_#content-layout-title]:w-full"
      className="p-0!"
      footer={
        tab === 'detail' && !isFlagged ? (
          <TouchPointDetailFooter
            onBack={handleBack}
            isLoading={isUpdating}
          />
        ) : null
      }
    >
      <div className="2xl:w-[1280px] w-full p-6 md:py-[16px] md:px-12 2xl:mx-auto mr-auto">
        {isFlagged && (
          <SafetyFlaggedBanner
            threatTypes={touchPoint.safety_threat_types ?? []}
            flaggedAt={touchPoint.safety_flagged_at}
          />
        )}
        <Tabs
          value={tab}
          onValueChange={(value) => handleChangeTab(value as 'analytics' | 'detail' | 'advanced')}
        >
          <TabsList className="p-1 bg-card mb-[16px]">
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-background data-[state=active]:text-[#000E29] rounded-[8px]"
            >
              {t('touchpoint:touch_point_edit.tab_list.analytics')}
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              disabled={isFlagged}
              className="data-[state=active]:bg-background data-[state=active]:text-[#000E29] rounded-[8px]"
            >
              {t('touchpoint:touch_point_edit.tab_list.basicSettings')}
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              disabled={isFlagged}
              className="data-[state=active]:bg-background data-[state=active]:text-[#000E29] rounded-[8px]"
            >
              {t('touchpoint:touch_point_edit.tab_list.advancedOptions')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="detail">
            <TouchPointDetailV2 ref={ref} />
          </TabsContent>
          <TabsContent value="advanced">
            <TouchPointAdvanced />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticByTouchPoint />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
