export const USER_PLAN_LIMIT_KEYS = {
  MAX_ORGS_PER_USER: 'max_orgs_per_user',
} as const
export const ORG_PLAN_LIMIT_KEYS = {
  MAX_MEMBERS_PER_ORG: 'max_members_per_org',
  MAX_TPS_PER_ORG: 'max_tps_per_org',
  MAX_TAGS_PER_TP: 'max_tags_per_tp',
  MAX_TAGS_PER_ORG: 'max_tags_per_org',
  DATA_RETENTION_DAYS: 'data_retention_days',
  MAX_DOMAINS_PER_ORG: 'max_domains_per_org',
  MAX_INTEGRATIONS_PER_ORG: 'max_integrations_per_org',
  MAX_SLUGS_PER_TP: 'max_slugs_per_tp',
  ALLOWED_TP_TYPES: 'allowed_tp_types',
  ALLOW_CUSTOM_META_TAGS: 'allow_custom_meta_tags',
  ALLOW_CUSTOM_UTM_TAGS: 'allow_custom_utm_tags',
  MAX_TPS_PER_MONTH: 'max_tps_per_month',
  EXTRA_ADVANCED_ANALYTICS: 'extra_advanced_analytics',
  MAX_UTM_TEMPLATES_PER_ORG: 'max_utm_templates_per_org',
  MAX_COLLECTIONS_PER_ORG: 'max_collections_per_org',
  AUDIT_LOGS_RETENTION_DAYS: 'audit_logs_retention_days',

  MAX_STATIC_QR_PER_ORG: 'max_static_qr_per_org',
  MAX_EVENT_RULES_PER_ORG: 'max_event_rules_per_org',
  MAX_DASHBOARDS_PER_ORG: 'max_dashboards_per_org',
  MAX_SESSION_RECORDINGS_PER_MONTH: 'max_session_recordings_per_month',
  MAX_PAGEVIEWS_PER_MONTH: 'max_pageviews_per_month',
} as const

export const ADVANCED_FEATURE_KEYS = {
  LINK_TARGETING: 'link_targeting',
  AB_TESTING: 'ab_testing',

  LIMIT_ACCESS: 'limit_access',
  LINK_PASSWORD: 'link_password',
  LINK_EXPIRATION: 'link_expiration',

  NOT_FOUND_URL: 'not_found_url',
  CUSTOM_REDIRECT_CODE: 'custom_redirect_code',

  FACEBOOK_TRACKING: 'facebook_tracking',
  GOOGLE_TRACKING: 'google_tracking',
  TIKTOK_TRACKING: 'tiktok_tracking',

  LINK_CLOAKING: 'link_cloaking',
  E2EE_ENCRYPTION: 'e2ee_encryption',

  IMPORT_TOUCHPOINTS: 'import_touchpoints',
  EXPORT_TOUCHPOINTS: 'export_touchpoints',

  AUDIT_LOGS: 'audit_logs',

  CONVERSION_TRACKING: 'conversion_tracking',
  EVENT_TAGGING: 'event_tagging',
  SMART_SETUP: 'smart_setup',

  HEATMAP_ANALYTICS: 'heatmap_analytics',
  FUNNEL_ANALYTICS: 'funnel_analytics',

  DEEP_LINK_ATTRIBUTION: 'deep_link_attribution',

  AI_CHAT: 'ai_chat',
  // Deliberately separate from AI_CHAT: MCP is sellable on its own, and ai_budget is meaningless
  // there — an MCP customer pays for their own model tokens.
  MCP_ACCESS: 'mcp_access',
} as const

export const PLAN_LIMIT_KEYS = {
  ...USER_PLAN_LIMIT_KEYS,
  ...ORG_PLAN_LIMIT_KEYS,
  ...ADVANCED_FEATURE_KEYS,
} as const

export type UserPlanLimitKey = (typeof USER_PLAN_LIMIT_KEYS)[keyof typeof USER_PLAN_LIMIT_KEYS]
export type OrgPlanLimitKey = (typeof ORG_PLAN_LIMIT_KEYS)[keyof typeof ORG_PLAN_LIMIT_KEYS]
export type OrgAdvancedFeatureKey =
  (typeof ADVANCED_FEATURE_KEYS)[keyof typeof ADVANCED_FEATURE_KEYS]

export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[keyof typeof PLAN_LIMIT_KEYS]

// Stable plan tier keys — constant names are tier-based, DB values are short slugs (never rename)
export const PLAN_KEYS = {
  TIER0: 't0',
  TIER0_TRIAL: 't0_trial',
  TIER1: 't1',
  TIER1_TRIAL: 't1_trial',
  TIER2: 't2',
} as const

export type PlanKey = (typeof PLAN_KEYS)[keyof typeof PLAN_KEYS]

// Paid tiers (tier1 and above)
export const PAID_PLAN_KEYS: PlanKey[] = [PLAN_KEYS.TIER1, PLAN_KEYS.TIER1_TRIAL, PLAN_KEYS.TIER2]

/**
 * Resolved monthly AI spend cap per tier, in cents.
 *
 * ⚠ **Mọi gói đều phải có mặt ở đây** — chốt chủ sản phẩm 2026-10-29 ("mở toàn gói"). Trước đó
 * chỉ có t1/t1_trial/t2, kèm ghi chú "t0/t0_trial không bao giờ tới được bước này vì
 * ensureOrgPlan(AI_CHAT) chặn trước". Ghi chú đó đúng **chừng nào `ai_chat` còn vắng mặt trong
 * `plans.advanced_features_allowed` của t0/t0_trial**, tức nó phụ thuộc vào DỮ LIỆU chứ không
 * phải vào code.
 *
 * Mở `ai_chat` cho t0 trong DB mà quên bảng này thì `agent/session/route.ts:47-49` không giải
 * được ngân sách và **ném AppError** — gói FREE đang bị từ chối gọn gàng bằng 403 ('not-entitled',
 * UI hiện lời mời nâng gói) sẽ chuyển thành 500 ('generic', UI hiện lỗi vô nghĩa). Tức là mở
 * quyền mà làm trải nghiệm TỆ ĐI. Hai chỗ phải đi cùng nhau.
 *
 * Con số **không được cưỡng chế ở đâu cả** ở bản này: chủ sản phẩm chốt không giới hạn ngân sách,
 * `/usage` không dựng, `usage-meter.tsx` ẩn. Nó chỉ đi vào trường `ai_budget` của token PASETO
 * cho đủ hình dạng. t1_trial giữ 200 vì đó là con số cũ, không có lý do đổi.
 */
export const TIER_DEFAULT: Partial<Record<PlanKey, number>> = {
  t0: 1000,
  t0_trial: 1000,
  t1: 1000,
  t1_trial: 200,
  t2: 1000,
}

export interface Plan extends OrganizationPlan {
  id: string
  name: string
  plan_key: PlanKey
  max_orgs_per_user: number
}

export interface OrgQuota {
  touch_points: number
  members: number
  tags: number
  domains: number
  integrations: number
  monthly_touch_points: number
  utm_templates: number
  collections: number
  static_qr: number
  event_rules: number
  dashboards: number
  monthly_session_recordings: number
  monthly_pageviews: number
  ai_monthly_budget_cents: number | null // per-org agent spend override; NULL = use TIER_DEFAULT
}
export interface OrganizationPlan {
  plan_key: PlanKey
  max_members_per_org: number
  max_tps_per_org: number
  max_tags_per_tp: number
  max_tags_per_org: number
  max_domains_per_org: number
  max_integrations_per_org: number
  max_slugs_per_tp: number
  max_utm_templates_per_org: number
  max_collections_per_org: number
  max_static_qr_per_org: number
  max_event_rules_per_org: number
  max_dashboards_per_org: number
  allowed_tp_types: string[] // ['QR', 'URL']
  allow_custom_meta_tags: boolean
  allow_custom_utm_tags: boolean
  allow_password: boolean
  data_retention_days: number
  max_tps_per_month: number
  extra_advanced_analytics: boolean
  audit_logs_retention_days: number
  max_ai_credits: number
  max_session_recordings_per_month: number
  max_pageviews_per_month: number

  advanced_features_allowed: string[]

  name: string
  id: string
  expires_at: string
}

export interface OrganizationAICredit {
  ai_credits_balance: number
  ai_credits_used_this_month: number
  ai_credits_last_reset: string
}

export const MAPPING_QUOTA_KEYS: Record<any, keyof OrgQuota> = {
  max_members_per_org: 'members',
  max_tps_per_org: 'touch_points',
  max_tags_per_org: 'tags',
  max_domains_per_org: 'domains',
  max_integrations_per_org: 'integrations',
  max_tps_per_month: 'monthly_touch_points',
  max_utm_templates_per_org: 'utm_templates',
  max_collections_per_org: 'collections',

  max_static_qr_per_org: 'static_qr',
  max_event_rules_per_org: 'event_rules',
  max_dashboards_per_org: 'dashboards',
  max_session_recordings_per_month: 'monthly_session_recordings',
  max_pageviews_per_month: 'monthly_pageviews',
} as const
