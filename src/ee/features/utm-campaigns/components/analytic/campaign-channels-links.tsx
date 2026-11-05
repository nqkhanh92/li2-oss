'use client'

import { UtmCampaignAnalytics } from '@/core/types/utm-campaign.type'
import { UTMCampaign } from '@/core/types/utm-campaign.type'
import { Separator } from '@/shared/components/ui/separator'
import { Typography } from '@/shared/components/ui/typography'
import { Eye, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { useCallback } from 'react'

type Props = {
  campaign: UTMCampaign
  analytics?: UtmCampaignAnalytics
  setSelectedChannelId?: (channelId: string | null) => void
}

export const CampaignChannelsLinks = ({ campaign, analytics, setSelectedChannelId }: Props) => {
  // Get analytics data for a specific channel
  const getChannelAnalytics = useCallback(
    (channelId: string) => {
      const channelAnalytics = analytics?.channels?.find((ch) => ch.id === channelId)

      return channelAnalytics
    },
    [analytics]
  )

  // Get analytics data for a specific touchpoint
  const getTouchpointAnalytics = useCallback(
    (touchpointId: string) => {
      return analytics?.touchpoints?.find((tp) => tp.id === touchpointId)
    },
    [analytics]
  )

  return (
    <div className="grid grid-cols-1 mt-4 gap-6">
      <Card className="p-6 flex flex-col h-full min-h-[400px] gap-4 min-w-0">
        <CardHeader className="p-0">
          <CardTitle>Channels & Links</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] p-0">
          <div className="space-y-4">
            {campaign.utm_campaign_channels && campaign.utm_campaign_channels.length > 0 ? (
              campaign.utm_campaign_channels.map((cc) => {
                // Get touchpoints for this channel
                const channelTouchpoints =
                  campaign.utm_campaign_touchpoints?.filter(
                    (tp) => tp.channel_id === cc.channel_id
                  ) || []

                const channelAnalytics = getChannelAnalytics(cc.channel_id)

                return (
                  <div
                    key={cc.channel_id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedChannelId?.(cc.channel_id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cc.campaign_channels.color }}
                      />
                      <h4 className="font-semibold">{cc.campaign_channels.name}</h4>
                      <span className="text-sm text-muted-foreground">
                        ({channelTouchpoints.length}{' '}
                        {channelTouchpoints.length === 1 ? 'link' : 'links'})
                      </span>

                      {/* Channel Analytics */}
                      <div className="ml-auto flex items-center">
                        <div className="flex items-center gap-2">
                          <Typography size={'xl'} className="text-slate-500 flex gap-2">
                            VISIT
                            <span className="font-medium">
                              {channelAnalytics?.totalVisits?.toLocaleString() ?? 0}
                            </span>
                          </Typography>
                        </div>
                        <Separator orientation="vertical" className="mx-2 h-6" />
                        <div className="flex items-center gap-2">
                          <Typography size={'xl'} className=" text-secondary-purple flex gap-2">
                            UNIQUE
                            <span className="font-medium">
                              {channelAnalytics?.totalUniqueVisits?.toLocaleString() ?? 0}
                            </span>
                          </Typography>
                        </div>
                      </div>
                    </div>

                    {/* Links for this channel */}
                    {channelTouchpoints.length > 0 ? (
                      <div className="space-y-2 ml-7">
                        {channelTouchpoints.map((tp) => {
                          const touchpointAnalytics = getTouchpointAnalytics(tp.touchpoint_id)

                          return (
                            <div
                              key={tp.id}
                              className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded"
                            >
                              <span className="font-medium">
                                {tp.touch_points?.name || 'Touchpoint'}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <code className="text-xs bg-background px-2 py-1 rounded">
                                {tp.touch_points?.short_url || 'No short URL'}
                              </code>

                              {/* Touchpoint Analytics */}
                              {/* {touchpointAnalytics && (
                            <div className="ml-auto flex items-center">
                              <div className="flex items-center gap-2">
                                <Typography size={'sm'} className="text-slate-500 flex gap-2">
                                  VISIT
                                  <span className="font-medium">
                                    {touchpointAnalytics.totalVisits.toLocaleString()}
                                  </span>
                                </Typography>
                              </div>
                              <Separator orientation="vertical" className="mx-2 h-6" />
                              <div className="flex items-center gap-2">
                                <Typography
                                  size={'sm'}
                                  className=" text-secondary-purple flex gap-2"
                                >
                                  UNIQUE
                                  <span className="font-medium">
                                    {touchpointAnalytics.totalUniqueVisits.toLocaleString()}
                                  </span>
                                </Typography>
                              </div>
                            </div>
                          )} */}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground ml-7">No links yet</p>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-muted-foreground">No channels configured</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
