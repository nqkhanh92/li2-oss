'use client'

import { useGetUtmCampaigns } from '../hooks/queries'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Suspense, useState, useMemo, useEffect } from 'react'
import { CampaignItem } from './campaign-item'
import { CampaignDetailView } from './campaign-detail-view'
import { ChannelAnalyticsView } from './channels/channel-analytics-view'
import { Pagination } from '@/shared/components/customize/pagination'
import { useFilters } from '@/shared/hooks/use-filters'

export const UtmCampaignList = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const router = useRouter()

  const { pagination, setPagination, filters, sorting, setFilter, search, setSearch } = useFilters({
    pagination: {
      pageIndex: 0,
      pageSize: 6,
    },
    sorting: [{ id: 'created_at', desc: true }],
  })

  const { data, isLoading, error } = useGetUtmCampaigns(org_id, {
    filters,
    pagination,
    sorting,
    search,
  })

  // Memoize channel data lookup to prevent expensive operations on every render
  const channelData = useMemo(() => {
    if (!selectedCampaignId || !data?.data) return null

    const campaign = data.data.find((c) => c.id === selectedCampaignId)
    if (!campaign) return null

    return campaign.utm_campaign_channels?.find((cc) => cc.channel_id === selectedChannelId)
  }, [selectedCampaignId, selectedChannelId, data?.data])

  // Memoize channel name and color extraction
  const channelName = useMemo(() => channelData?.campaign_channels.name || 'Channel', [channelData])

  const channelColor = useMemo(
    () => channelData?.campaign_channels.color || '#000000',
    [channelData]
  )

  const campaignName = useMemo(
    () => data?.data.find((c) => c.id === selectedCampaignId)?.name || 'Campaign',
    [data?.data, selectedCampaignId]
  )

  useEffect(() => {
    const firstCampaign = data?.data?.[0]
    if (!selectedCampaignId && firstCampaign) {
      setSelectedCampaignId(firstCampaign.id)
    }
  }, [selectedCampaignId, data])

  return (
    <div className="flex flex-col gap-2 w-full relative">
      <div className="flex gap-4 h-full">
        {/* Left side - Campaign List (30% width) */}
        <div className="w-[20%] min-w-[300px]">
          <div className=" flex flex-col gap-4 sticky top-0 overflow-scroll">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button
                onClick={() => router.push(`/org/${org_id}/campaigns/create`)}
                type="button"
                variant="default"
              >
                Add Campaign
              </Button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading campaigns...</div>
              ) : error ? (
                <div className="text-center text-destructive py-8">Error loading campaigns</div>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((campaign) => (
                  <CampaignItem
                    key={campaign.id}
                    campaign={campaign}
                    isSelected={selectedCampaignId === campaign.id}
                    selectedChannelId={selectedChannelId}
                    onCampaignClick={() => {
                      setSelectedCampaignId(campaign.id)
                      setSelectedChannelId(null)
                    }}
                    onChannelClick={(channelId) => {
                      setSelectedCampaignId(campaign.id)
                      setSelectedChannelId(channelId)
                    }}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No campaigns found. Create your first campaign!
                </div>
              )}
            </div>
            <Pagination
              pageSize={pagination.pageSize}
              pageIndex={pagination.pageIndex}
              rowCount={data?.rowCount || 0}
              onPageChange={(pageIndex) => {
                setSelectedCampaignId(null)
                setSelectedChannelId(null)
                setPagination((prev) => ({ ...prev, pageIndex }))
              }}
              onPageSizeChange={(pageSize) => {
                setSelectedCampaignId(null)
                setSelectedChannelId(null)
                setPagination((prev) => ({ ...prev, pageSize }))
              }}
              availablePageSize={[]}
            />
          </div>
          {/* Campaign List */}
        </div>

        {/* Right side - Detail (70% width) */}
        <div
          className="flex-1 border p-4 rounded-lg overflow-x-hidden"
          style={{ backgroundColor: channelColor ? `${channelColor}10` : undefined }}
        >
          {!selectedCampaignId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a campaign to view details
            </div>
          ) : selectedChannelId ? (
            <Suspense
              fallback={<div className="flex items-center justify-center h-full">Loading...</div>}
            >
              <ChannelAnalyticsView
                campaignId={selectedCampaignId}
                campaignName={campaignName}
                channelId={selectedChannelId}
                orgId={org_id}
                channelName={channelName}
                channelColor={channelColor}
                onBack={() => {
                  setSelectedChannelId(null)
                }}
              />
            </Suspense>
          ) : (
            <Suspense
              fallback={<div className="flex items-center justify-center h-full">Loading...</div>}
            >
              <CampaignDetailView
                orgId={org_id}
                campaignId={selectedCampaignId}
                setSelectedChannelId={setSelectedChannelId}
                setSelectedCampaignId={setSelectedCampaignId}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
