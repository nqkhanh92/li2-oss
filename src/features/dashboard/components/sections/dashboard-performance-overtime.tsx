import { DashboardDataType } from '@/app/api/organizations/[org_id]/dashboard/route'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { DashboardBarChart } from '../chart/dashboard-bar-chart'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'

export const DashboardPerformanceOvertime = ({
  data,
}: {
  data: DashboardDataType['performanceOverTime']
}) => {
  const { t } = useTranslation('dashboard')
  const [tab, setTab] = useState('to_day')

  const chartData = React.useMemo(() => {
    let data_out: { name: string; count: number }[] = []
    switch (tab) {
      case 'to_day':
        data_out =
          data?.today?.map((item) => ({
            name: dayjs(item.name).format('HH:mm'),
            count: item.count,
          })) || []

        const toDayFilledData = Array.from({ length: 24 }).map((_, index) => {
          const hour = dayjs().hour(index).minute(0).format('HH:mm')
          const hourExists = data_out.find((item) => item.name === hour)
          return {
            name: hour,
            count: hourExists ? hourExists.count : 0,
          }
        })
        data_out = toDayFilledData

        break
      case 'last_day':
        data_out =
          data?.lastDay?.map((item) => ({
            name: dayjs(item.name).format('HH:mm'),
            count: item.count,
          })) || []
        const lastDayFilledData = Array.from({ length: 24 }).map((_, index) => {
          const hour = dayjs().hour(index).minute(0).format('HH:mm')
          const hourExists = data_out.find((item) => item.name === hour)
          return {
            name: hour,
            count: hourExists ? hourExists.count : 0,
          }
        })
        data_out = lastDayFilledData
        break
      case 'last_week':
        data_out =
          data?.lastWeek?.map((item) => ({
            name: dayjs(item.name).format('ddd'),
            count: item.count,
          })) || []
        const startOfWeek = dayjs().subtract(1, 'week').startOf('week')
        const lastWeekFilledData = Array.from({ length: 7 }).map((_, index) => {
          const day = startOfWeek.add(index, 'day').format('ddd')
          const dayExists = data_out.find((item) => item.name === day)
          return {
            name: day,
            count: dayExists ? dayExists.count : 0,
          }
        })

        data_out = lastWeekFilledData
        break
      case 'last_month':
        data_out =
          data?.lastMonth?.map((item) => ({
            name: dayjs(item.name).format('DD-MM'),
            count: item.count,
          })) || []
        const startOfMonth = dayjs().subtract(1, 'month').startOf('month')
        const lastMonthFilledData = Array.from({
          length: startOfMonth.daysInMonth(),
        }).map((_, index) => {
          const day = startOfMonth.add(index, 'day').format('DD-MM')
          const dayExists = data_out.find((item) => item.name === day)
          return {
            name: day,
            count: dayExists ? dayExists.count : 0,
          }
        })
        data_out = lastMonthFilledData
        break
      default:
        data_out = []
        break
    }
    return data_out
  }, [data, tab])
  return (
    <div className="h-full w-full flex flex-col gap-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="outline" className="flex flex-row gap-4 border-b border-border *:[data-state=active]:border-slate-800">
          <TabsTrigger variant="outline" className="px-0 py-0" value="to_day">
            {t('performance_overtime.today')}
          </TabsTrigger>
          <TabsTrigger variant="outline" className="px-0 py-0" value="last_day">
            {t('performance_overtime.yesterday')}
          </TabsTrigger>
          <TabsTrigger variant="outline" className="px-0 py-0" value="last_week">
            {t('performance_overtime.last_week')}
          </TabsTrigger>
          <TabsTrigger variant="outline" className="px-0 py-0" value="last_month">
            {t('performance_overtime.last_month')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <DashboardBarChart data={chartData || []} />
    </div>
  )
}
