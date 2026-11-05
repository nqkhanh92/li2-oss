export interface ConversionEvent {
  id: string
  created_at: string
  organization_id: string
  touch_point_id: string | null
  click_id: string
  event_type: 'lead' | 'sale'
  event_name: string
  customer_profile_id: string | null
  metadata: Record<string, unknown> | null
  // Sale-specific fields
  amount: number | null
  currency: string | null
  lead_event_id: string | null
  // Joined fields (match Supabase join names)
  customer_profiles?: {
    id: string
    email: string | null
    name: string | null
    phone: string | null
  }
  touch_points?: { id: string; name: string; short_url: string | null }
  lead_event?: { id: string; event_name: string; created_at: string } | null
  utm_source?: string | null
  channel?: string | null
}

export interface CustomerProfile {
  id: string
  created_at: string
  organization_id: string
  email: string | null
  phone: string | null
  name: string | null
  external_id: string | null
  first_click_id: string | null
  first_touch_point_id: string | null
  lead_count: number
  sale_count: number
  total_revenue: number
  // Joined fields (match Supabase join names)
  touch_points?: { id: string; name: string }
}

export interface ConversionStats {
  totalLeads: number
  totalCustomers: number
  totalSales: number
  totalRevenue: number
}

export interface ConversionPaginationParams {
  limit: number
  offset: number
  search?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  // Filter fields
  startDate?: Date
  endDate?: Date
  touchPointId?: string
}

// Funnel chart types
export interface FunnelStage {
  name: string
  value: number
  fill: string
  directValue?: number
}

export interface FunnelData {
  stages: FunnelStage[]
  conversionRates: {
    clicksToLeads: number
    leadsToSales: number
    overall: number
  }
}

export interface FunnelFilters {
  startDate?: Date
  endDate?: Date
  touchPointIds?: string[]
  tagIds?: string[]
  collectionIds?: string[]
  excludeBot?: boolean
}
