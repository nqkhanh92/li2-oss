import { UtmCampaignAnalytics } from '@/core/types/utm-campaign.type'
import { CampaignChannelsHorizontalBarChart } from './campaign-channels-horizontal-bar-chart'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CampaignChannelsPieChart } from './campaign-channels-pie-chart'
import { useTranslation } from 'react-i18next'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { useMemo, useState } from 'react'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { Typography } from '@/shared/components/ui/typography'
import { BarChartHorizontal, ChartPie } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

type Props = {
  analyticChannels: UtmCampaignAnalytics['channels']
  orgId: string
  isLoading: boolean
}

export const CampaignChannelsSection = ({ analyticChannels, orgId, isLoading }: Props) => {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('pie')
  const [tabValue, setTabValue] = useState<'visits' | 'unique'>('visits')

  // Create modified data based on selected tab
  const getTabData = () => {
    if (tabValue === 'visits') {
      return analyticChannels.map((channel) => ({
        ...channel,
        totalVisits: channel.totalVisits,
        totalUniqueVisits: 0, // Hide unique visits data
      }))
    } else {
      return analyticChannels.map((channel) => ({
        ...channel,
        totalVisits: 0, // Hide total visits data
        totalUniqueVisits: channel.totalUniqueVisits,
      }))
    }
  }
  const data = useMemo(() => {
    if (tabValue === 'visits') {
      return analyticChannels.map((channel) => ({
        ...channel,
        visits: channel.totalVisits,
      }))
    } else {
      return analyticChannels.map((channel) => ({
        ...channel,
        visits: channel.totalUniqueVisits,
      }))
    }
  }, [analyticChannels, tabValue])

  return (
    <Card className="p-6 flex flex-col h-full min-h-[400px] gap-4 min-w-0">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 justify-between">
          {t('analytic:by_channel', 'By Channel')}
          <CustomSwitch
            className="h-6 *:h-4 w-16 items-center"
            checkedLabel={
              <Typography className="flex items-center gap-2">
                <BarChartHorizontal size={16} />
              </Typography>
            }
            uncheckedLabel={
              <Typography className="flex items-center gap-2">
                <ChartPie size={16} />
              </Typography>
            }
            checkedColor="bg-yellow-500"
            uncheckedColor="bg-blue-500"
            onCheckedChange={(checked) => setViewMode(checked ? 'bar' : 'pie')}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] p-0">
        {analyticChannels && analyticChannels.length > 0 ? (
          <Tabs
            value={tabValue}
            onValueChange={(value) => setTabValue(value as 'visits' | 'unique')}
            className="w-full h-full flex flex-col"
          >
            <TabsList className="bg-transparent border-none outline-hidden gap-2 p-0 mb-4">
              <TabsTrigger
                value="visits"
                className="px-3 py-1.5 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:shadow-none"
              >
                {t('dashboard:performance_overview.total')}
              </TabsTrigger>
              <TabsTrigger
                value="unique"
                className="px-3 py-1.5 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:shadow-none"
              >
                {t('dashboard:performance_overview.unique')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="flex-1 mt-0">
              {viewMode === 'pie' ? (
                <CampaignChannelsPieChart data={data} orgId={orgId} />
              ) : (
                <CampaignChannelsHorizontalBarChart data={data} orgId={orgId} />
              )}
            </TabsContent>

            <TabsContent value="unique" className="flex-1 mt-0">
              {viewMode === 'pie' ? (
                <CampaignChannelsPieChart data={data} orgId={orgId} />
              ) : (
                <CampaignChannelsHorizontalBarChart data={data} orgId={orgId} />
              )}
            </TabsContent>
          </Tabs>
        ) : isLoading ? (
          <Skeleton className="h-full" />
        ) : (
          <EmptySection size="lg" title="NO DATA" description="" />
        )}
      </CardContent>
    </Card>
  )
}
