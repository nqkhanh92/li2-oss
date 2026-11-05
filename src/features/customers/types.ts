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
  total_revenue_usd: number
  total_revenue_vnd: number
  // Revisit tracking (Phase 2)
  last_visit_at: string | null
  visit_count: number
  // Anonymous customer merge fields
  is_anonymous?: boolean
  merged_into_id?: string | null
  merged_from_ids?: string[]
  merged_at?: string | null
  // Joined fields (match Supabase join names)
  touch_points?: { id: string; name: string; short_url: string | null }
  // Enriched from visits or sessions
  country?: string | null
  visitor_id?: string | null

  metadata?: Record<string, any>
}

export interface CustomerPaginationParams {
  limit: number
  offset: number
  search?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  // Phase 2: Country filter (multi-select)
  countries?: string[]
}

/**
 * Một thành viên của tập khán giả. Hai loại, KHÔNG gộp được với nhau:
 *
 * - `identified`: mở artifact bằng Google nên có email (`customer_profiles` + `artifact_views`).
 * - `device`: một `visits.fp` — dấu vết THIẾT BỊ, không biết là ai.
 *
 * Cùng một người vừa đăng nhập Google vừa quét QR sẽ hiện hai hàng, và dữ liệu không có cột nào
 * chứng minh đó là một người. Xem `content-audience.service.ts`.
 */
export interface AudienceMember {
  /** uuid của hồ sơ, hoặc `device:<fp>`. */
  id: string
  kind: 'identified' | 'device'
  fp: string | null
  email: string | null
  name: string | null
  external_id: string | null
  display_name: string
  content_count: number
  open_count: number
  last_seen_at: string | null
  first_seen_at: string | null
  country: string | null
  touch_points: { id: string; name: string; short_url: string | null } | null
  visit_count: number
}

export interface AudienceListResponse {
  data: AudienceMember[]
  rowCount: number
  /** `visits` chạm trần quét → số thiết bị CHƯA ĐỦ, UI phải nói ra. */
  scanTruncated?: boolean
}

/** Một nội dung khách đã mở. `open_count` là `artifact_views.view_count`. */
export interface ContentView {
  artifact_id: string
  name: string
  kind: string | null
  serve_token: string | null
  status: string | null
  open_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
}

export interface DeviceVisit {
  id: string
  created_at: string
  /** `QR` hay `LINK`. */
  type: string | null
  touch_point: { id: string; name: string; short_url: string | null } | null
  artifact: { id: string; name: string; serve_token: string | null } | null
  country: string | null
  city: string | null
  os: string | null
  platform: string | null
  referrer: string | null
}

export interface DeviceActivity {
  fp: string
  display_name: string
  visit_count: number
  content_count: number
  open_count: number
  first_seen_at: string | null
  last_seen_at: string | null
  country: string | null
  os: string | null
  platform: string | null
  visits: DeviceVisit[]
  visitsTruncated: boolean
}

// Phase 2: Country filter types
export interface CustomerCountry {
  country: string
  count: number
}
