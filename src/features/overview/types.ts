export interface OverviewTrendPoint {
  date: string
  clicks: number
  pageviews: number
  conversions: number
}

export interface OverviewLinksData {
  totalClicks: number
  totalClicksPrev: number
  uniqueClicks: number
  uniqueClicksPrev: number
  avgPerDay: number
  avgPerDayPrev: number
  channels: { name: string; count: number }[]
  topLinks: { name: string; slug: string | null; count: number }[]
}

export interface OverviewWebsiteData {
  totalPageviews: number
  totalPageviewsPrev: number
  uniqueVisitors: number
  uniqueVisitorsPrev: number
  totalSessions: number
  totalSessionsPrev: number
  topSources: { name: string; percentage: number }[]
  topPages: { hostname: string; path: string; count: number }[]
}

export interface OverviewConversionsData {
  totalConversions: number
  totalConversionsPrev: number
  totalLeads: number
  totalLeadsPrev: number
  totalSales: number
  totalSalesPrev: number
  clickToLeadRate: number
  leadToSaleRate: number
}

export interface OverviewPlanUsage {
  planName: string
  planKey: string
  expiresAt: string | null
  quotas: {
    label: string
    used: number
    max: number
  }[]
}

export interface OverviewData {
  trend: OverviewTrendPoint[]
  links: OverviewLinksData
  website: OverviewWebsiteData | null
  conversions: OverviewConversionsData | null
  planUsage: OverviewPlanUsage
}
