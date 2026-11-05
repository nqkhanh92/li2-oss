/**
 * Build-time feature switches.
 *
 * Pass the full `process.env.NEXT_PUBLIC_*` expression as the argument. Next.js replaces
 * that literal text at build time, so the helper receives a string, not a lookup.
 *
 * TODO: each disabled route repeats the same two-line guard in its page.tsx. That belongs
 * in src/middleware.ts as one route table, which would also cover sub-routes for free.
 * Left alone for now because casdoor_middleware has many redirect paths, and the flag check
 * has to run after it returns NextResponse.next(). Needs a route table test before the move.
 */
const isTrue = (value?: string) => value?.toLowerCase() === 'true'

export const disabledFeatures = {
  CAMPAIGNS: isTrue(process.env.NEXT_PUBLIC_DISABLE_CAMPAIGNS),
  INTEGRATIONS: isTrue(process.env.NEXT_PUBLIC_DISABLE_INTEGRATIONS),
  FACEBOOK_TRACKING: isTrue(process.env.NEXT_PUBLIC_DISABLE_FACEBOOK_TRACKING),
  GA_TRACKING: isTrue(process.env.NEXT_PUBLIC_DISABLE_GA_TRACKING),
  TIKTOK_TRACKING: isTrue(process.env.NEXT_PUBLIC_DISABLE_TIKTOK_TRACKING),
  LINK_JOURNEY: isTrue(process.env.NEXT_PUBLIC_DISABLE_LINK_JOURNEY),
  HEATMAP: isTrue(process.env.NEXT_PUBLIC_DISABLE_HEATMAP),
  FORM_ANALYTICS: isTrue(process.env.NEXT_PUBLIC_DISABLE_FORM_ANALYTICS),
  SESSION_RECORDING: isTrue(process.env.NEXT_PUBLIC_DISABLE_SESSION_RECORDING),
  DEEP_LINK_ANALYTICS: isTrue(process.env.NEXT_PUBLIC_DISABLE_DEEP_LINK_ANALYTICS),
  // Group flags: hide a whole product area (sidebar group, its routes, and its data)
  ATTRIBUTION: isTrue(process.env.NEXT_PUBLIC_DISABLE_ATTRIBUTION),
  BEHAVIOR_ANALYTICS: isTrue(process.env.NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS),
  ONBOARDING: isTrue(process.env.NEXT_PUBLIC_DISABLE_ONBOARDING),
  DEVELOPER_SETTINGS: isTrue(process.env.NEXT_PUBLIC_DISABLE_DEVELOPER_SETTINGS),
  // Nhóm Overview và các mục bên trong (self-host)
  OVERVIEW_GROUP: isTrue(process.env.NEXT_PUBLIC_DISABLE_OVERVIEW_GROUP),
  DASHBOARDS: isTrue(process.env.NEXT_PUBLIC_DISABLE_DASHBOARDS),
  CONVERSIONS: isTrue(process.env.NEXT_PUBLIC_DISABLE_CONVERSIONS),
  CUSTOMERS: isTrue(process.env.NEXT_PUBLIC_DISABLE_CUSTOMERS),
  // Khối tiện ích trong layout (self-host): roadmap Canny, chat Chatwoot, nút hỏi AI
  ROADMAP: isTrue(process.env.NEXT_PUBLIC_DISABLE_ROADMAP),
  SUPPORT_CHAT: isTrue(process.env.NEXT_PUBLIC_DISABLE_SUPPORT_CHAT),
  AI_CHAT: isTrue(process.env.NEXT_PUBLIC_DISABLE_AI_CHAT),
}

/**
 * Section mặc định của trang chủ org. Rỗng = giữ hành vi cũ (`overview`).
 */
export const ORG_HOME_SECTION = process.env.NEXT_PUBLIC_ORG_HOME_SECTION?.trim() || ''
