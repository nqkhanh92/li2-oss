'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import {
  useGetRankingByUTMParameters,
  useGetRankingByReferrers,
} from '@/features/analytics/hooks/queries'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import dayjs from '@/shared/lib/dayjs'
import { DateRange } from 'react-day-picker'
import { Typography } from '@/shared/components/ui/typography'
import { Eye, MousePointerClick } from 'lucide-react'

type ParentTab = 'utm_parameters' | 'referrers'
type UTMType = 'by_source' | 'by_medium' | 'by_campaign' | 'by_term' | 'by_content'
type ReferrerType = 'referrer' | 'raw'

interface RankingProps {
  dateRange?: DateRange
  excludeBot?: boolean
  tagIds?: string[]
  tpIds?: string[]
  collectionIds?: string[]
  utmSourceValues?: string[]
  utmMediumValues?: string[]
  utmCampaignValues?: string[]
  interactionTypes?: AllTouchPointVariants[]
}

// Shared RankingList component
const RankingList = ({
  data,
  isLoading,
  totalVisits,
  getItemName,
}: {
  data: any[]
  isLoading: boolean
  totalVisits: number
  getItemName: (item: any) => string
}) => {
  return (
    <CardContent className="pt-4 pb-6 px-6">
      <div className="flex flex-col gap-1.5 h-[200px] overflow-y-auto">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-full shrink-0" />
            ))}
          </>
        ) : !data || data.length === 0 ? (
          <EmptySection size="sm" title="No data available" description="" />
        ) : (
          data.map((item: any, index: number) => {
            const barWidth = totalVisits > 0 ? (item.count / totalVisits) * 100 : 0
            const itemName = getItemName(item)

            return (
              <div
                key={item.id || item.destination || index}
                className="relative h-7 shrink-0 group/item cursor-pointer"
              >
                <div
                  className="absolute h-7 rounded left-0 top-0 bg-secondary-blue/10 transition-all duration-300 border-l-2 border-transparent group-hover/item:border-secondary-blue"
                  style={{ width: `${barWidth}%` }}
                />
                <div className="absolute flex items-center left-0 top-0 w-full h-7">
                  <div className="flex flex-1 gap-3 items-center pl-3 pr-0 py-1 min-w-0">
                    <div className="flex flex-1 gap-1.5 items-center min-w-0">
                      <p className="flex-1 text-slate-700 text-xs leading-4 font-normal overflow-ellipsis overflow-hidden whitespace-nowrap min-w-0">
                        {itemName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-4 py-1 shrink-0">
                    <p className="text-slate-700 text-sm leading-5 font-normal">{item.count}</p>
                    <p className="text-slate-500 text-xs leading-4 font-normal max-w-0 group-hover:max-w-[100px] transition-all duration-300 overflow-hidden whitespace-nowrap">
                      ({barWidth.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </CardContent>
  )
}

// UTM Parameters component with sub-tabs
const UTMParameters = (props: RankingProps) => {
  const { org_id }: { org_id: string } = useParams()
  const [activeTab, setActiveTab] = useState<UTMType>('by_source')

  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(props.dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(props.dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [props.dateRange]
  )

  const { data: utmData, isLoading } = useGetRankingByUTMParameters(
    org_id,
    activeTab,
    {
      tag_ids: props.tagIds,
      tp_ids: props.tpIds,
      collection_ids: props.collectionIds,
      date_range: formattedDateRange,
      exclude_bot: props.excludeBot,
      utm_source_values: props.utmSourceValues,
      utm_medium_values: props.utmMediumValues,
      utm_campaign_values: props.utmCampaignValues,
      interaction_types: props.interactionTypes,
    },
    false
  )

  const displayData = useMemo(() => {
    return utmData?.data || []
  }, [utmData])

  return (
    <Tabs
      defaultValue="by_source"
      onValueChange={(value) => setActiveTab(value as UTMType)}
      className="w-full"
    >
      <div className="flex flex-col gap-2 px-6">
        <div className="overflow-x-auto">
          <TabsList className="p-0.5 h-9 rounded-lg w-full justify-start *:data-[state=active]:text-foreground *:text-s">
            <TabsTrigger
              value="by_source"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Source
            </TabsTrigger>
            <TabsTrigger
              value="by_campaign"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Campaign
            </TabsTrigger>
            <TabsTrigger
              value="by_medium"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Medium
            </TabsTrigger>
            <TabsTrigger
              value="by_term"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Term
            </TabsTrigger>
            <TabsTrigger
              value="by_content"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Content
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="by_source" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={utmData?.total || 0}
          getItemName={(item) => item.utm_value}
        />
      </TabsContent>
      <TabsContent value="by_medium" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={utmData?.total || 0}
          getItemName={(item) => item.utm_value}
        />
      </TabsContent>
      <TabsContent value="by_campaign" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={utmData?.total || 0}
          getItemName={(item) => item.utm_value}
        />
      </TabsContent>
      <TabsContent value="by_term" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={utmData?.total || 0}
          getItemName={(item) => item.utm_value}
        />
      </TabsContent>
      <TabsContent value="by_content" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={utmData?.total || 0}
          getItemName={(item) => item.utm_value}
        />
      </TabsContent>
    </Tabs>
  )
}

// Referrers component with sub-tabs
const Referrers = (props: RankingProps) => {
  const { org_id }: { org_id: string } = useParams()
  const [activeTab, setActiveTab] = useState<ReferrerType>('referrer')

  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(props.dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(props.dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [props.dateRange]
  )

  const { data: referrerData, isLoading } = useGetRankingByReferrers(
    org_id,
    activeTab,
    {
      tag_ids: props.tagIds,
      tp_ids: props.tpIds,
      collection_ids: props.collectionIds,
      date_range: formattedDateRange,
      exclude_bot: props.excludeBot,
      utm_source_values: props.utmSourceValues,
      utm_medium_values: props.utmMediumValues,
      utm_campaign_values: props.utmCampaignValues,
      interaction_types: props.interactionTypes,
    },
    false
  )

  const displayData = useMemo(() => {
    return referrerData?.data || []
  }, [referrerData])

  return (
    <Tabs
      defaultValue="referrer"
      onValueChange={(value) => setActiveTab(value as ReferrerType)}
      className="w-full"
    >
      <div className="flex flex-col gap-2 px-6">
        <div className="overflow-x-auto">
          <TabsList className="p-0.5 h-9 rounded-lg w-full justify-start *:data-[state=active]:text-foreground *:text-s">
            <TabsTrigger
              value="referrer"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Referrer
            </TabsTrigger>
            <TabsTrigger
              value="raw"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Raw Referrer
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="referrer" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={referrerData?.total || 0}
          getItemName={(item) => item.referrer}
        />
      </TabsContent>
      <TabsContent value="raw" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={referrerData?.total || 0}
          getItemName={(item) => item.referrer}
        />
      </TabsContent>
    </Tabs>
  )
}

// Wrapper component with parent tabs
export const RankingByUTMAndReferrers = (props: RankingProps) => {
  return (
    <Card className="rounded-lg overflow-hidden group">
      <Tabs defaultValue="referrers" className="w-full">
        <div className="relative mt-6 mx-6">
          <TabsList
            variant="outline"
            className="w-full justify-start border-b border-slate-300 mb-2 *:text-base *:data-[state=active]:text-slate-700 *:text-slate-500"
          >
            <TabsTrigger variant="outline" value="referrers">
              Referrers
            </TabsTrigger>
            <TabsTrigger variant="outline" value="utm_parameters">
              UTM Parameters
            </TabsTrigger>
          </TabsList>
          <Typography
            weight={'medium'}
            size={'base'}
            className="absolute top-2 right-0 flex items-center gap-1 text-secondary-blue"
          >
            <Eye className="h-5 w-5" /> Visit
          </Typography>
        </div>

        <TabsContent value="utm_parameters" className="mt-0">
          <UTMParameters {...props} />
        </TabsContent>
        <TabsContent value="referrers" className="mt-0">
          <Referrers {...props} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
