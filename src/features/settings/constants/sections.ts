import { disabledFeatures } from '@/shared/constants/disabled-features'

export const SETTING_TABS = {
  PROFILE: 'profile',
  ACCOUNT: 'account',
  ORGANIZATION: 'organization',
  DEVELOPER: 'developer',
} as const

export type SettingTab = (typeof SETTING_TABS)[keyof typeof SETTING_TABS]

export const SETTING_SECTIONS = {
  // Profile tab sections
  PROFILE_INFO: 'profile-info',
  PROFILE_PASSWORD: 'profile-password',
  ACCOUNT_MFA: 'account-mfa',

  // Account tab sections
  ACCOUNT_PLANNING: 'account-planning',
  ACCOUNT_USAGE: 'account-usage',
  ACCOUNT_EMAIL_PREFERENCES: 'account-email-preferences',

  // Organization tab sections
  ORGANIZATION_MEMBER: 'organization-member',
  ORGANIZATION_DOMAIN: 'organization-domain',
  ORGANIZATION_AUDIT_LOGS: 'organization-audit-logs',
  ORGANIZATION_EDIT: 'organization-edit',
  ORGANIZATION_DELETE: 'organization-delete',

  // Developer tab sections
  ANALYTICS_SETTINGS: 'analytics-settings',
  CONVERSION_SETTINGS: 'conversion-settings',
  API_KEYS: 'api-keys',
} as const

export type SettingSection = (typeof SETTING_SECTIONS)[keyof typeof SETTING_SECTIONS]

// With the Developer tab hidden, a deep link such as #api-keys must land somewhere real
const developerTab = disabledFeatures.DEVELOPER_SETTINGS
  ? SETTING_TABS.ACCOUNT
  : SETTING_TABS.DEVELOPER

export const SECTION_TO_TAB_MAP: Record<SettingSection, SettingTab> = {
  [SETTING_SECTIONS.PROFILE_INFO]: SETTING_TABS.PROFILE,
  [SETTING_SECTIONS.PROFILE_PASSWORD]: SETTING_TABS.PROFILE,
  [SETTING_SECTIONS.ACCOUNT_MFA]: SETTING_TABS.PROFILE,
  [SETTING_SECTIONS.ACCOUNT_PLANNING]: SETTING_TABS.ACCOUNT,
  [SETTING_SECTIONS.ACCOUNT_USAGE]: SETTING_TABS.ACCOUNT,
  [SETTING_SECTIONS.ACCOUNT_EMAIL_PREFERENCES]: SETTING_TABS.ACCOUNT,
  [SETTING_SECTIONS.ORGANIZATION_MEMBER]: SETTING_TABS.ORGANIZATION,
  [SETTING_SECTIONS.ORGANIZATION_DOMAIN]: SETTING_TABS.ORGANIZATION,
  [SETTING_SECTIONS.ORGANIZATION_AUDIT_LOGS]: SETTING_TABS.ORGANIZATION,
  [SETTING_SECTIONS.ORGANIZATION_EDIT]: SETTING_TABS.ORGANIZATION,
  [SETTING_SECTIONS.ORGANIZATION_DELETE]: SETTING_TABS.ORGANIZATION,
  [SETTING_SECTIONS.ANALYTICS_SETTINGS]: developerTab,
  [SETTING_SECTIONS.CONVERSION_SETTINGS]: developerTab,
  [SETTING_SECTIONS.API_KEYS]: developerTab,
}
