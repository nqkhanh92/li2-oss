export interface HeatmapGridPoint {
  x: number
  y: number
  count: number
}

export interface HeatmapElement {
  selector: string
  text: string | null
  tag: string | null
  count: number
  element_id: string | null
  element_href: string | null
}

export interface HeatmapClicksResponse {
  total_clicks: number
  unique_visitors: number
  grid: HeatmapGridPoint[]
  elements: HeatmapElement[]
}

export interface TopInteractionPage {
  scheme: string
  hostname: string
  page_path: string
  click_count: number
}

export type PageNodeType = 'domain' | 'folder' | 'leaf'

export interface PageTreeNode {
  type: PageNodeType
  /** Display label — hostname for domain, segment for folder, page name for leaf */
  label: string
  /** Full path from root (e.g., "/products/shoes") — only on leaf nodes */
  fullPath?: string
  /** Hostname for this node (inherited from domain parent) */
  hostname: string
  /** URL scheme — "https" or "http" */
  scheme: string
  /** Click count for leaves, aggregate for folders/domains */
  clickCount: number
  /** Number of leaf pages under this node (domains and folders only) */
  pageCount?: number
  /** Whether this page is in the top 10% by click count */
  isHot?: boolean
  /** Set on folder nodes that are also tracked pages (e.g. /blog exists AND /blog/post exists) */
  selfPage?: { fullPath: string; clickCount: number; isHot?: boolean }
  /** Children: subfolders and leaf pages */
  children: PageTreeNode[]
  /** True if this node (or any child) has data in the recent window; undefined when recency tracking is off */
  hasRecentData?: boolean
}

export interface PageTree {
  domains: PageTreeNode[]
  totalPages: number
}

export interface RageClickElement {
  selector: string
  text: string | null
  tag: string | null
  href: string | null
  rage_click_count: number
  affected_sessions: number
  last_seen: string
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

export interface ScrollDepthMilestone {
  scroll_depth_percent: number  // 25 | 50 | 75 | 90 | 100
  sessions_reached: number
  pct_of_total: number          // computed client-side from total_sessions
  avg_time_at_depth: number     // ms
}

export interface ScrollHeatmapResponse {
  total_sessions: number
  milestones: ScrollDepthMilestone[]
}
