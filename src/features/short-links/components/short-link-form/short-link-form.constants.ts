import React from 'react'
import {
  SlidersHorizontal,
  BarChart3,
  Lock,
  Timer,
  MousePointerClick,
  Code2,
  FileWarning,
  Shield,
  EyeOff,
  LocateFixed,
  type LucideIcon,
  ChartNoAxesCombined,
  ChartNoAxesColumnIncreasing,
  Tags as TagsIcon,
} from 'lucide-react'
import { FacebookIcon, TikTokIcon, GoogleAnalyticsIcon } from './short-link-form.icons'

export type SidebarItemKey =
  | 'analytics'
  | 'basic_editing'
  | 'smart_targeting'
  | 'utm_builder'
  | 'fb_pixel'
  | 'ga_tracking'
  | 'tiktok_pixel'
  | 'password_protection'
  | 'link_expiration'
  | 'click_limitation'
  | 'custom_redirect_code'
  | 'custom_404_redirect'
  | 'encrypted_link'
  | 'link_cloaking'
  | 'tags'

// ── Sidebar group (for labeled grouping — labels empty for now) ────────────

export interface SidebarGroup {
  key: string
  /** Empty for now — will be filled in when groups need labels */
  label: string
  items: SidebarItemKey[]
}

/** Shown only on the edit page (prepended to SIDEBAR_GROUPS at runtime) */
export const ANALYTICS_SIDEBAR_GROUP: SidebarGroup = {
  key: 'analytics',
  label: '',
  items: ['analytics'],
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    key: 'settings',
    label: '',
    items: [
      'basic_editing',
      'smart_targeting',
      'utm_builder',
      'fb_pixel',
      'ga_tracking',
      'tiktok_pixel',
      'password_protection',
      'link_expiration',
      'click_limitation',
      'custom_redirect_code',
      'custom_404_redirect',
      'encrypted_link',
      'link_cloaking',
      // Tags chuyển từ sidebar chính về đây, đặt ngay dưới Link Cloaking — chủ sản phẩm
      // 2026-10-23. Trường chọn tag cũng rời khỏi tab Basic settings về mục này.
      'tags',
    ],
  },
]

/**
 * Hiện ra nhưng không bấm được: giữ chỗ để người dùng biết tính năng tồn tại, mà chưa mở.
 * Khác với bỏ khỏi `SIDEBAR_GROUPS` — bỏ hẳn thì không ai biết là có.
 */
export const DIMMED_SIDEBAR_ITEMS: SidebarItemKey[] = ['fb_pixel', 'ga_tracking', 'tiktok_pixel']

// Flat key order derived from groups (used for iteration)
export const SIDEBAR_ITEM_KEYS: SidebarItemKey[] = SIDEBAR_GROUPS.flatMap((g) => g.items)

export const SIDEBAR_ITEM_ICONS: Record<
  SidebarItemKey,
  LucideIcon | React.FC<{ className?: string }>
> = {
  analytics: ChartNoAxesCombined,
  basic_editing: SlidersHorizontal,
  smart_targeting: LocateFixed,
  utm_builder: BarChart3,
  fb_pixel: FacebookIcon,
  ga_tracking: ChartNoAxesColumnIncreasing,
  tiktok_pixel: TikTokIcon,
  password_protection: Lock,
  link_expiration: Timer,
  click_limitation: MousePointerClick,
  custom_redirect_code: Code2,
  custom_404_redirect: FileWarning,
  encrypted_link: Shield,
  link_cloaking: EyeOff,
  tags: TagsIcon,
}

export const SIDEBAR_ITEM_LABELS: Record<SidebarItemKey, string> = {
  analytics: 'touchpoint:advancedOptionMenu.items.analytics.title',
  basic_editing: 'touchpoint:advancedOptionMenu.items.basic_editing.title',
  smart_targeting: 'touchpoint:advancedOptionMenu.items.smart_targeting.title',
  utm_builder: 'touchpoint:advancedOptionMenu.items.utm_builder.title',
  fb_pixel: 'touchpoint:advancedOptionMenu.items.fb_pixel.title',
  ga_tracking: 'touchpoint:advancedOptionMenu.items.ga_tracking.title',
  tiktok_pixel: 'touchpoint:advancedOptionMenu.items.tiktok_pixel.title',
  password_protection: 'touchpoint:advancedOptionMenu.items.password_protection.title',
  link_expiration: 'touchpoint:advancedOptionMenu.items.link_expiration.title',
  click_limitation: 'touchpoint:advancedOptionMenu.items.click_limitation.title',
  custom_redirect_code: 'touchpoint:advancedOptionMenu.items.custom_redirect_code.title',
  custom_404_redirect: 'touchpoint:advancedOptionMenu.items.custom_404_redirect.title',
  encrypted_link: 'touchpoint:advancedOptionMenu.items.encrypted_link.title',
  link_cloaking: 'touchpoint:advancedOptionMenu.items.link_cloaking.title',
  tags: 'touchpoint:touch_point_create.form.tagSelectLabel',
}

export const SIDEBAR_ITEM_DESCRIPTIONS: Record<SidebarItemKey, string> = {
  analytics: '',
  basic_editing: '',
  smart_targeting: 'touchpoint:advancedOptionMenu.items.smart_targeting.description',
  utm_builder: 'touchpoint:advancedOptionMenu.items.utm_builder.description',
  fb_pixel: 'touchpoint:advancedOptionMenu.items.fb_pixel.description',
  ga_tracking: 'touchpoint:advancedOptionMenu.items.ga_tracking.description',
  tiktok_pixel: 'touchpoint:advancedOptionMenu.items.tiktok_pixel.description',
  password_protection: 'touchpoint:advancedOptionMenu.items.password_protection.description',
  link_expiration: 'touchpoint:advancedOptionMenu.items.link_expiration.description',
  click_limitation: 'touchpoint:advancedOptionMenu.items.click_limitation.description',
  custom_redirect_code: 'touchpoint:advancedOptionMenu.items.custom_redirect_code.description',
  custom_404_redirect: 'touchpoint:advancedOptionMenu.items.custom_404_redirect.description',
  encrypted_link: 'touchpoint:advancedOptionMenu.items.encrypted_link.description',
  link_cloaking: 'touchpoint:advancedOptionMenu.items.link_cloaking.description',
  tags: '',
}
