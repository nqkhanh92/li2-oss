export interface Dashboard {
  id: string
  organization_id: string
  created_by: string
  name: string
  access_mode: 'only_me' | 'restricted' | 'everyone'
  default_role: 'viewer' | 'editor'
  template_id: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface DashboardWithWidgets extends Dashboard {
  dashboard_widgets: DashboardWidget[]
  userRole?: DashboardRole
  is_pinned?: boolean
}

export interface DashboardWidget {
  id: string
  dashboard_id: string
  name: string
  widget_type: 'standard' | 'formula'
  config: WidgetConfig
  formula_config: FormulaConfig | null
  position: GridPosition
  date_override: DateOverride | null
  created_at: string
  updated_at: string
}

export type DataSource = 'visits' | 'pageviews' | 'events' | 'interactions' | 'conversions'

export type Visualization = 'bar' | 'line' | 'pie' | 'number' | 'table'

export type WidgetSize = 'small' | 'medium' | 'large'

export interface WidgetConfig {
  data_source: DataSource
  metric: string
  group_by: string
  filters: WidgetFilter[]
  visualization: Visualization
  size: WidgetSize
  display_currency?: string  // only meaningful for conversions + revenue; service defaults to org currency when absent
}

export interface WidgetFilter {
  field: string
  op: '=' | '!=' | 'contains'
  value: string
}

// Uses react-grid-layout's native key names (x/y/w/h)
export interface GridPosition {
  x: number
  y: number
  w: number
  h: number
}

// Phase 2b
export interface FormulaMetricConfig {
  data_source: DataSource
  metric: string
  filters?: WidgetFilter[]
}

export interface FormulaConfig {
  metric_a: FormulaMetricConfig
  metric_b: FormulaMetricConfig
  operator: '+' | '-' | '*' | '/'
}

// DateOverride is the same shape as DateRangeConfig — unified type
// Used for per-widget date override stored in dashboard_widgets.date_override JSONB
export type DateOverride = import('./utils/date-range').DateRangeConfig

export interface WidgetDataResult {
  total: number
  rows: { label: string; value: number }[]
}

export interface BatchWidgetResult {
  result: WidgetDataResult | null
  error: string | null
  errorCode: 'PLAN_GATE' | 'FEATURE_DISABLED' | 'RPC_ERROR' | 'DIVISION_BY_ZERO' | null
  formula?: {
    numerator: number
    denominator: number
    operator: string
  } | null
}

export interface WidgetTemplate {
  id: string
  name: string
  description: string
  data_source: DataSource
  config: WidgetConfig
  pro_only: boolean
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  widget_ids: string[]
  pro_only: boolean
}

// ── Phase 2c: Sharing types ──

export type DashboardAccessMode = 'only_me' | 'restricted' | 'everyone'
export type DashboardRole = 'owner' | 'editor' | 'viewer'

export interface DashboardMember {
  id: string
  dashboard_id: string
  user_id: string
  role: 'viewer' | 'editor'
  created_at: string
  profile: { id: string; name: string; email: string }
}

/** Size → react-grid-layout dimensions mapping */
export const WIDGET_SIZE_MAP: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 1, h: 2 },
  medium: { w: 1, h: 3 },
  large: { w: 2, h: 3 },
}

/** Per-item layout constraints for react-grid-layout v2 (set on LayoutItem, not data-grid) */
export const GRID_ITEM_CONSTRAINTS = {
  minW: 1,
  maxW: 2,
  minH: 2,
  maxH: 5,
} as const
