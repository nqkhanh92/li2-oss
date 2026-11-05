import { FolderIcon, Globe, Link2, Tag, BrainCircuit, Tags, Eye, Video, Users, LayoutDashboard, Zap } from 'lucide-react'
import { disabledFeatures } from '@/shared/constants/disabled-features'

export type QuotaItemConfig = {
  id: string
  titleKey: string
  icon: React.ReactNode
  usageKey: string // keyof OrgQuota or 'ai_credits_used_this_month'
  limitKey: string // keyof OrganizationPlan
  moduleKey: string
  isShowProgress?: boolean | ((limit: number) => boolean)
  isShowAlert?: boolean
  isShowCounter?: boolean
  hasResetTimer?: boolean
}

const ALL_QUOTA_ITEMS: QuotaItemConfig[] = [
  {
    id: 'touchpoint',
    titleKey: 'common:module.touchpoint',
    icon: <Link2 className="w-5 h-5" />,
    usageKey: 'monthly_touch_points',
    limitKey: 'max_tps_per_month',
    moduleKey: 'touchpoint',
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: true,
  },
  {
    id: 'tag',
    titleKey: 'common:module.tag',
    icon: <Tag className="w-5 h-5" />,
    usageKey: 'tags',
    limitKey: 'max_tags_per_org',
    moduleKey: 'tag',
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'domain',
    titleKey: 'layout:sidebar.domain',
    icon: <Globe className="w-5 h-5" />,
    usageKey: 'domains',
    limitKey: 'max_domains_per_org',
    moduleKey: 'domain',
    isShowProgress: (limit: number) => limit > 0,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'ai_credits',
    titleKey: 'common:module.ai_credits',
    icon: <BrainCircuit className="w-5 h-5" />,
    usageKey: 'ai_credits_used_this_month',
    limitKey: 'max_ai_credits',
    moduleKey: 'ai_credits',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: true,
  },
  {
    id: 'utm_templates',
    titleKey: 'common:module.utm_templates',
    icon: <Tags className="w-5 h-5" />,
    usageKey: 'utm_templates',
    limitKey: 'max_utm_templates_per_org',
    moduleKey: 'utm_templates',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  // {
  //   id: 'integration',
  //   titleKey: 'common:module.integration',
  //   icon: <Blocks className="w-5 h-5" />,
  //   usageKey: 'integrations',
  //   limitKey: 'max_integrations_per_org',
  //   moduleKey: 'integration',
  //   isShowProgress: true,
  //   isShowAlert: true,
  //   isShowCounter: true,
  //   hasResetTimer: false,
  // },
  {
    id: 'collection',
    titleKey: 'common:module.collection',
    icon: <FolderIcon className="w-5 h-5" />,
    usageKey: 'collections',
    limitKey: 'max_collections_per_org',
    moduleKey: 'collection',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'members',
    titleKey: 'common:module.members',
    icon: <Users className="w-5 h-5" />,
    usageKey: 'members',
    limitKey: 'max_members_per_org',
    moduleKey: 'members',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'dashboards',
    titleKey: 'common:module.dashboards',
    icon: <LayoutDashboard className="w-5 h-5" />,
    usageKey: 'dashboards',
    limitKey: 'max_dashboards_per_org',
    moduleKey: 'dashboards',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'event_rules',
    titleKey: 'common:module.event_rules',
    icon: <Zap className="w-5 h-5" />,
    usageKey: 'event_rules',
    limitKey: 'max_event_rules_per_org',
    moduleKey: 'event_rules',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: false,
  },
  {
    id: 'pageviews',
    titleKey: 'common:module.pageviews',
    icon: <Eye className="w-5 h-5" />,
    usageKey: 'monthly_pageviews',
    limitKey: 'max_pageviews_per_month',
    moduleKey: 'pageviews',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: true,
  },
  {
    id: 'session_recordings',
    titleKey: 'common:module.session_recordings',
    icon: <Video className="w-5 h-5" />,
    usageKey: 'monthly_session_recordings',
    limitKey: 'max_session_recordings_per_month',
    moduleKey: 'session_recordings',
    isShowProgress: true,
    isShowAlert: true,
    isShowCounter: true,
    hasResetTimer: true,
  },
]

// A usage card for a hidden feature advertises a quota the user can no longer spend
const HIDDEN_QUOTA_IDS = new Set(
  disabledFeatures.BEHAVIOR_ANALYTICS ? ['pageviews', 'session_recordings', 'event_rules'] : []
)

export const QUOTA_ITEMS_CONFIG = ALL_QUOTA_ITEMS.filter((item) => !HIDDEN_QUOTA_IDS.has(item.id))
