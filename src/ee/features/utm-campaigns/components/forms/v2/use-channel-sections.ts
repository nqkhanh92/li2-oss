import { useMemo } from 'react'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'

export type TouchpointField = z.infer<typeof utmCampaignTouchPointSchema>

export type ChannelSection = {
  channelId: string | null
  channelName: string
  channelColor?: string
  touchpoints: TouchpointField[]
  isNonChannel: boolean
}

type UseChannelSectionsProps = {
  touchpoints: TouchpointField[]
  selectedChannels: { id: string; name: string; color: string }[]
  enableCustomizeUTM: boolean
}

export const useChannelSections = ({
  touchpoints,
  selectedChannels,
  enableCustomizeUTM,
}: UseChannelSectionsProps): ChannelSection[] => {
  return useMemo(() => {
    const sections: ChannelSection[] = []

    if (!enableCustomizeUTM) {
      // Normal mode: group by channel_id
      const channelMap = new Map<string, TouchpointField[]>()

      for (const tp of touchpoints) {
        const channelId = tp.channel_id || 'non-channel'
        if (!channelMap.has(channelId)) {
          channelMap.set(channelId, [])
        }
        channelMap.get(channelId)!.push(tp)
      }

      // Create sections for selected channels
      for (const channel of selectedChannels) {
        const channelTouchpoints = channelMap.get(channel.id) || []
        sections.push({
          channelId: channel.id,
          channelName: channel.name,
          channelColor: channel.color,
          touchpoints: channelTouchpoints,
          isNonChannel: false,
        })
      }

      // Add non-channel section if there are unassigned touchpoints
      const nonChannelTouchpoints = channelMap.get('non-channel') || []
      if (nonChannelTouchpoints.length > 0) {
        sections.push({
          channelId: null,
          channelName: 'Unassigned',
          touchpoints: nonChannelTouchpoints,
          isNonChannel: true,
        })
      }
    } else {
      // Customize UTM mode: group by utm_source
      const utmSourceMap = new Map<string, TouchpointField[]>()

      for (const tp of touchpoints) {
        const utmSource = tp.utm_tags?.utm_source || 'non-channel'
        if (!utmSourceMap.has(utmSource)) {
          utmSourceMap.set(utmSource, [])
        }
        utmSourceMap.get(utmSource)!.push(tp)
      }

      // Get unique UTM sources from touchpoints
      const utmSources = Array.from(
        new Set(
          touchpoints
            .map((tp) => tp.utm_tags?.utm_source)
            .filter((source): source is string => !!source)
        )
      )

      // Create sections for each UTM source
      for (const utmSource of utmSources) {
        const utmTouchpoints = utmSourceMap.get(utmSource) || []
        // Try to find matching channel for color
        const matchingChannel = selectedChannels.find((ch) => ch.name === utmSource)

        sections.push({
          channelId: matchingChannel?.id || null,
          channelName: utmSource,
          channelColor: matchingChannel?.color,
          touchpoints: utmTouchpoints,
          isNonChannel: false,
        })
      }

      // Add non-channel section for touchpoints without UTM source
      const nonChannelTouchpoints = utmSourceMap.get('non-channel') || []
      if (nonChannelTouchpoints.length > 0) {
        sections.push({
          channelId: null,
          channelName: 'Not configured',
          touchpoints: nonChannelTouchpoints,
          isNonChannel: true,
        })
      }
    }

    return sections
  }, [touchpoints, selectedChannels, enableCustomizeUTM])
}
