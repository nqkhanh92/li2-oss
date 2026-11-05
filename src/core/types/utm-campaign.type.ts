import { Tables } from '@/shared/types/database.types'

type UTMCampaignTouchpoint = Tables<'utm_campaign_touchpoints'>

export type UTMCampaign = Tables<'utm_campaigns'> & {
  utm_campaign_touchpoints: (UTMCampaignTouchpoint & {
    touch_points: {
      id: string
      name: string
      short_url: string
    }
  })[]
  utm_campaign_channels: {
    channel_id: string
    campaign_channels: {
      id: string
      name: string
      color: string
    }
  }[]
  profiles: Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>
}

export type UTMCampaignDetail = UTMCampaign & {}

export interface GetUtmCampaignAnalyticsInput {
  organizationId: string
  utmCampaignId: string

  channelIds?: string[]
  tpIds?: string[]

  startTime?: string // ISO timestamp
  endTime?: string // ISO timestamp

  excludeBot?: boolean
}

export interface UtmCampaignAnalytics {
  utmCampaignId: string

  totalVisits: number
  totalUniqueVisits: number

  channels: Array<{
    id: string | null
    totalVisits: number
    totalUniqueVisits: number
  }>

  touchpoints: Array<{
    id: string | null
    label: string
    totalVisits: number
    totalUniqueVisits: number
  }>

  daily: Array<{
    date: string // YYYY-MM-DD
    totalVisits: number
    totalUniqueVisits: number
  }>

  channelDaily: Array<{
    date: string // YYYY-MM-DD
    channelId: string
    totalVisits: number
    totalUniqueVisits: number
  }>

  referrers: Array<{
    name: string
    count: number
  }>

  os: Array<{
    name: string
    count: number
  }>

  platforms: Array<{
    name: string
    count: number
  }>
}
