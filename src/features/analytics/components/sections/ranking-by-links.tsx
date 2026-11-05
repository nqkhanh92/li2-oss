'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import {
  useGetRankingByLinks,
  useGetRankingByDestinations,
} from '@/features/analytics/hooks/queries'
import { TypeVisitByLinks } from '@/core/types/analytics'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { cn } from '@/shared/lib/utils'
import { Eye, Link2, MousePointerClick } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { DateRange } from 'react-day-picker'
import { Typography } from '@/shared/components/ui/typography'

type ParentTab = 'short_links' | 'destinations'
type RankingType = 'by_links' | 'by_tags' | 'by_spaces'
type DestinationType = 'base_urls' | 'full_urls'

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

interface RankingByLinksProps extends RankingProps {}

interface RankingByDestinationsProps extends RankingProps {}

// Shared RankingList component
const RankingList = ({
  data,
  isLoading,
  totalVisits,
  showIcon,
  getItemName,
}: {
  data: any[]
  isLoading: boolean
  totalVisits: number
  showIcon: boolean
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
                    {showIcon && <Link2 className="shrink-0 w-4 h-4 text-secondary-blue" />}
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

// Wrapper component with parent tabs
export const RankingWrapper = (props: RankingProps) => {
  return (
    <Card className="rounded-lg overflow-hidden group">
      <Tabs defaultValue="short_links" className="w-full">
        <div className="relative mt-6 mx-6">
          <TabsList
            variant="outline"
            className="w-full justify-start border-b border-slate-300 mb-2 *:text-base *:data-[state=active]:text-slate-700 *:text-slate-500"
          >
            <TabsTrigger variant="outline" value="short_links">
              Short Links
            </TabsTrigger>
            <TabsTrigger variant="outline" value="destinations">
              Destination URLs
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

        <TabsContent value="short_links" className="mt-0">
          <RankingByLinks {...props} />
        </TabsContent>
        <TabsContent value="destinations" className="mt-0">
          <RankingByDestinations {...props} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// RankingByLinks component with sub-tabs
const RankingByLinks = ({
  dateRange,
  excludeBot = false,
  tagIds = [],
  tpIds = [],
  collectionIds = [],
  utmSourceValues = [],
  utmMediumValues = [],
  utmCampaignValues = [],
  interactionTypes = [],
}: RankingByLinksProps) => {
  const { org_id }: { org_id: string } = useParams()
  const [activeTab, setActiveTab] = useState<RankingType>('by_links')

  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [dateRange]
  )

  const { data: rankingData, isLoading } = useGetRankingByLinks(
    org_id,
    activeTab,
    {
      tag_ids: tagIds,
      tp_ids: tpIds,
      collection_ids: collectionIds,
      date_range: formattedDateRange,
      exclude_bot: excludeBot,
      utm_source_values: utmSourceValues,
      utm_medium_values: utmMediumValues,
      utm_campaign_values: utmCampaignValues,
      interaction_types: interactionTypes,
    },
    false
  )

  const displayData = useMemo(() => {
    if (!rankingData?.data) return []

    // For by_spaces, add a "Non-Space" item for links without a space
    if (activeTab === 'by_spaces' && rankingData.data.length > 0) {
      const totalSpaceVisits = rankingData.data.reduce(
        (sum: number, item: any) => sum + (item.count || 0),
        0
      )
      const nonSpaceVisits = (rankingData.total || 0) - totalSpaceVisits

      if (nonSpaceVisits > 0) {
        return [
          ...rankingData.data,
          {
            id: 'non-space',
            name: 'Non-Space',
            count: nonSpaceVisits,
            unique_count: 0,
          },
        ].sort((a: any, b: any) => b.count - a.count)
      }
    }

    return rankingData.data
  }, [rankingData, activeTab])

  const getItemName = (item: any) => {
    if (activeTab === 'by_links') {
      const itemName = (item.name || item.short_link)?.replace(/^https?:\/\//, '')
      return itemName || ''
    }
    if (activeTab === 'by_tags') return item.name || item.tag_name
    if (activeTab === 'by_spaces') return item.name || item.space_name
    return item.name
  }

  return (
    <Tabs
      defaultValue="by_links"
      onValueChange={(value) => setActiveTab(value as RankingType)}
      className="w-full"
    >
      <div className="flex flex-col gap-2 px-6 pb-0">
        <TabsList className="p-0.5 h-9 rounded-lg w-full justify-start *:data-[state=active]:text-foreground *:text-s">
          <TabsTrigger
            value="by_links"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Links
          </TabsTrigger>
          <TabsTrigger
            value="by_spaces"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Spaces
          </TabsTrigger>
          <TabsTrigger
            value="by_tags"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Tags
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="by_links" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={rankingData?.total || 0}
          showIcon={true}
          getItemName={getItemName}
        />
      </TabsContent>
      <TabsContent value="by_spaces" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={rankingData?.total || 0}
          showIcon={false}
          getItemName={getItemName}
        />
      </TabsContent>
      <TabsContent value="by_tags" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={rankingData?.total || 0}
          showIcon={false}
          getItemName={getItemName}
        />
      </TabsContent>
    </Tabs>
  )
}

// RankingByDestinations component with sub-tabs
const RankingByDestinations = ({
  dateRange,
  excludeBot = false,
  tagIds = [],
  tpIds = [],
  collectionIds = [],
  utmSourceValues = [],
  utmMediumValues = [],
  utmCampaignValues = [],
  interactionTypes = [],
}: RankingProps) => {
  const { org_id }: { org_id: string } = useParams()
  const [destinationType, setDestinationType] = useState<DestinationType>('base_urls')

  const formattedDateRange = useMemo(
    () => ({
      from: dayjs(dateRange?.from || dayjs().subtract(7, 'day').toDate())
        .startOf('day')
        .toDate(),
      to: dayjs(dateRange?.to || new Date())
        .endOf('day')
        .toDate(),
    }),
    [dateRange]
  )

  const { data: destinationData, isLoading } = useGetRankingByDestinations(
    org_id,
    destinationType,
    {
      tag_ids: tagIds,
      tp_ids: tpIds,
      collection_ids: collectionIds,
      date_range: formattedDateRange,
      exclude_bot: excludeBot,
      utm_source_values: utmSourceValues,
      utm_medium_values: utmMediumValues,
      utm_campaign_values: utmCampaignValues,
      interaction_types: interactionTypes,
    },
    false
  )

  const displayData = useMemo(() => {
    return destinationData?.data || []
  }, [destinationData])

  return (
    <Tabs
      defaultValue="base_urls"
      onValueChange={(value) => setDestinationType(value as DestinationType)}
      className="w-full"
    >
      <div className="flex flex-col gap-2 px-6 pb-0">
        <TabsList className="p-0.5 h-9 rounded-lg w-full justify-start *:data-[state=active]:text-foreground *:text-s">
          <TabsTrigger
            value="base_urls"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Base URLs
          </TabsTrigger>
          <TabsTrigger
            value="full_urls"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Full URLs
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="base_urls" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={destinationData?.total || 0}
          showIcon={true}
          getItemName={(item) => item.destination}
        />
      </TabsContent>
      <TabsContent value="full_urls" className="mt-0">
        <RankingList
          data={displayData}
          isLoading={isLoading}
          totalVisits={destinationData?.total || 0}
          showIcon={true}
          getItemName={(item) => item.destination}
        />
      </TabsContent>
    </Tabs>
  )
}
