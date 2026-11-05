'use client'

import { useShowUtmCampaign } from '../hooks/queries'
import { CampaignAnalyticsView } from './analytic'
import { UtmCampaignUpdateForm } from './forms/update'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { BarChart3Icon, FileEditIcon } from 'lucide-react'

export const CampaignDetailView = ({
  orgId,
  campaignId,
  setSelectedChannelId,
  setSelectedCampaignId,
}: {
  orgId: string
  campaignId: string
  setSelectedChannelId: (channelId: string | null) => void
  setSelectedCampaignId: (campaignId: string | null) => void
}) => {
  const { data, isLoading } = useShowUtmCampaign(orgId, campaignId)

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Campaign not found
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="analytics" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger
            value="analytics"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <BarChart3Icon className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="detail"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileEditIcon className="h-4 w-4 mr-2" />
            Detail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="flex-1 mt-4 overflow-y-auto">
          {/* Analytics Chart Placeholder */}
          <CampaignAnalyticsView
            key={campaignId}
            orgId={orgId}
            campaignId={campaignId}
            campaign={data}
            setSelectedChannelId={setSelectedChannelId}
          />
        </TabsContent>

        <TabsContent value="detail" className="flex-1 mt-4 overflow-y-auto">
          <UtmCampaignUpdateForm
            onDelete={() => setSelectedCampaignId(null)}
            campaignId={campaignId}
            initialValues={data}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
