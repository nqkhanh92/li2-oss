'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { useGetDashboardData } from '@/features/dashboard/hooks/queries'
import { useTranslation } from 'react-i18next'
import { DashboardPerformanceOvertime } from './sections/dashboard-performance-overtime'
import { TouchPointSimpleForm } from '@/features/touch-points/components/simple-form/touch-point-simple-form'
import { PlanBanner } from './sections/plan-banner'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

import { DashboardPerformanceOverview } from './sections/dashboard-performance-overview'
import { DashboardInteractionChannels } from './sections/dashboard-interaction-channels'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { Button } from '@/shared/components/ui/button'
import { Info } from 'lucide-react'
import { DashboardRecentActivities } from './sections/dashboard-recent-activities'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export default function DashboardView() {
  const { org_id } = useParams<{ org_id: string }>()
  const { profile } = useProfileProvider()
  const { data } = useGetDashboardData(org_id)
  const { t } = useTranslation('dashboard')
  const { hasPermission } = useOrganizationStoreProvider()

  // Check if user can add touch-points (Viewers cannot)
  const canAddTouchPoint = hasPermission(ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT)
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <span className="text-2xl font-semibold text-foreground md:inline-flex flex max-w-full text-ellipsis overflow-hidden">
        Hi, {profile?.display_name || profile?.name}! {t('welcome')}
      </span>
      <Card className="h-auto bg-card outline-hidden border-0 shadow-none">
        <CardContent className="flex flex-col justify-end gap-[10px] self-stretch p-0">
          {/* <DashboardUnlockInsight /> */}
          <PlanBanner />
        </CardContent>
      </Card>
      {/* Only show TouchPointSimpleForm for users with ADD_TOUCH_POINT permission (Viewers cannot) */}
      {canAddTouchPoint && (
        <div className="rounded-[16px] bg-linear-to-r from-[#B9AAFF] to-[#D6A4AF] p-px overflow-hidden">
          <Card className="bg-card border-none! rounded-[15px]! overflow-hidden">
            <CardContent className="flex flex-col justify-end gap-[10px] self-stretch p-0">
              <div className="bg-card rounded-[16px] relative">
                <QrCustomizeProvider initialValues={QR_CUSTOMIZE_DEFAULT_OPTIONS}>
                  <TouchPointSimpleForm />
                </QrCustomizeProvider>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* <Card>
        <CardContent className="shadow-none p-6">
          <AnalyticOverall data={data?.typeVisits || []} totalVisits={data?.totalVisits || 0} />
        </CardContent>
      </Card> */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
        <div className="col-span-1 flex">
          <DashboardPerformanceOverview
            totalUniqueVisitWoWPercent={data?.uniqueVisitWoWPercent || 0}
            totalVisits={data?.totalVisits || 0}
            totalUniqueVisits={data?.totalUniqueVisits || 0}
            totalVisitWoWPercent={data?.totalVisitWoWPercent || 0}
          />
        </div>
        <div className="col-span-1 flex">
          <DashboardInteractionChannels
            LINK={data?.typeVisits?.find((v) => v.name === 'LINK')?.count || 0}
            QR={data?.typeVisits?.find((v) => v.name === 'QR')?.count || 0}
            NFC={data?.typeVisits?.find((v) => v.name === 'NFC')?.count || 0}
            WIFI={data?.typeVisits?.find((v) => v.name === 'WIFI')?.count || 0}
          />
        </div>
      </div>

      <DashboardRecentActivities />

      <Card className="h-96 bg-card">
        <CardHeader className="font-medium text-lg pb-1">
          <div className="flex items-center">
            {t('performance_overtime.label')}
            <ResponsivePopover content={t('performance_overtime.tooltip')} align="start" side="top">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Info className="w-5 h-5 md:w-4 md:h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
              </Button>
            </ResponsivePopover>
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)]">
          <DashboardPerformanceOvertime
            data={
              data?.performanceOverTime || {
                today: [],
                lastDay: [],
                lastWeek: [],
                lastMonth: [],
              }
            }
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
    </div>
  )
}
