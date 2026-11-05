'use client'
import { defineSubmenu } from '@/shared/components/customize/custom-submenu'
import {
  ChevronDown,
  ChevronRight,
  ListEnd,
  LocateFixed,
  GitBranch,
  Crosshair,
  Link2,
  Lock,
  Timer,
  MousePointerClick,
  Code2,
  FileWarning,
  Shield,
  EyeOff,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { UtmSection } from './utm-section'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import { Switch } from '@/shared/components/ui/switch'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { AnimatePresence, motion } from 'framer-motion'
import { PasswordSection } from './password-section'
import { DynamicTargeting } from '../forms/dynamic-targeting'
import { SmartTargetingSection } from './smart-targeting-section'
import { useTranslation } from 'react-i18next'
import { ComingSoonSection } from './coming-soon-section'
import { LimitAccessSection } from './limit-access-section'
import { LinkExpirationSection } from './link-expiration-section'
import { CustomRedirectCodeSection } from './custom-redirect-code-section'
import { CustomNotFoundSection } from './custom-notfound-section'
import { ADVANCED_FEATURE_KEYS, OrgAdvancedFeatureKey } from '@/shared/types/plan-permission'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { usePlanFeatures } from '../../hooks'
import { PremiumOnlySection } from './premium-only-section'
import { FbTrackingSection } from './fb-tracking-section'
import { TiktokTrackingSection } from './tiktok-tracking-section'
import { GATrackingSection } from './ga-tracking-section'
import { LinkCloakingSection } from './link-cloaking-section'
import { AbTestingSection } from './ab-testing-section'
import { E2EEncryptionSection } from './e2e-encryption-section'
import { useShowTouchPoint } from '../../hooks/queries'
import { useParams } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { CampaignBlockedSection } from './campaign-blocked-section'
import { Badge } from '@/shared/components/ui/badge'
import { disabledFeatures } from '@/shared/constants/disabled-features'
type MenuSection = {
  key: string
  label: string
  subItems: {
    key: string
    planKey?: OrgAdvancedFeatureKey
    Icon?: React.ComponentType<{ className?: string }>
    label: string
    Component: React.ComponentType
    description?: string
    show?: boolean
    locked?: boolean
    experimental?: boolean
  }[]
  show?: boolean
}
const menuSections: MenuSection[] = [
  {
    key: 'targeting_n_experiments',
    label: 'advancedOptionMenu.groups.targeting',
    subItems: [
      {
        key: 'smart_targeting',
        planKey: ADVANCED_FEATURE_KEYS.LINK_TARGETING,
        label: 'advancedOptionMenu.items.smart_targeting.title',
        Component: SmartTargetingSection,
        Icon: LocateFixed,
        description: 'advancedOptionMenu.items.smart_targeting.description',
        show: true,
      },
      {
        key: 'split_traffic',
        label: 'advancedOptionMenu.items.split_traffic.title',
        Component: AbTestingSection,
        Icon: GitBranch,
        description: 'advancedOptionMenu.items.split_traffic.description',
        show: false,
      },
      {
        key: 'deep_link',
        label: 'advancedOptionMenu.items.deep_link.title',
        Component: () => <>deep_link</>,
        Icon: Link2,
        description: 'advancedOptionMenu.items.deep_link.description',
      },
    ],
    show: true,
  },
  {
    key: 'tracking_n_analytics',
    label: 'advancedOptionMenu.groups.tracking',
    subItems: [
      {
        key: 'utm_builder',
        Icon: Tag,
        label: 'advancedOptionMenu.items.utm_builder.title',
        Component: UtmSection,
        description: 'advancedOptionMenu.items.utm_builder.description',
        show: true,
      },
      {
        key: 'fb_pixel',
        planKey: ADVANCED_FEATURE_KEYS.FACEBOOK_TRACKING,
        Icon: Tag,
        label: 'advancedOptionMenu.items.fb_pixel.title',
        Component: FbTrackingSection,
        description: 'advancedOptionMenu.items.fb_pixel.description',
        show: true,
        experimental: true,
        locked: disabledFeatures.FACEBOOK_TRACKING,
      },
      {
        key: 'ga_tracking',
        planKey: ADVANCED_FEATURE_KEYS.GOOGLE_TRACKING,
        Icon: Tag,
        label: 'advancedOptionMenu.items.ga_tracking.title',
        Component: GATrackingSection,
        description: 'advancedOptionMenu.items.ga_tracking.description',
        show: true,
        experimental: true,
        locked: disabledFeatures.GA_TRACKING,
      },
      {
        key: 'tiktok_pixel',
        planKey: ADVANCED_FEATURE_KEYS.TIKTOK_TRACKING,
        Icon: Tag,
        label: 'advancedOptionMenu.items.tiktok_pixel.title',
        Component: TiktokTrackingSection,
        description: 'advancedOptionMenu.items.tiktok_pixel.description',
        show: true,
        experimental: true,
        locked: disabledFeatures.TIKTOK_TRACKING,
      },
    ],
    show: true,
  },
  {
    key: 'access_control',
    label: 'advancedOptionMenu.groups.access',
    subItems: [
      {
        key: 'password_protection',
        planKey: ADVANCED_FEATURE_KEYS.LINK_PASSWORD,
        label: 'advancedOptionMenu.items.password_protection.title',
        Component: PasswordSection,
        Icon: Lock,
        description: 'advancedOptionMenu.items.password_protection.description',
        show: true,
      },
      {
        key: 'link_expiration',
        planKey: ADVANCED_FEATURE_KEYS.LINK_EXPIRATION,
        label: 'advancedOptionMenu.items.link_expiration.title',
        Component: LinkExpirationSection,
        Icon: Timer,
        description: 'advancedOptionMenu.items.link_expiration.description',
        show: true,
      },
      {
        key: 'click_limitation',
        planKey: ADVANCED_FEATURE_KEYS.LIMIT_ACCESS,
        label: 'advancedOptionMenu.items.click_limitation.title',
        Component: LimitAccessSection,
        Icon: MousePointerClick,
        description: 'advancedOptionMenu.items.click_limitation.description',
        show: true,
      },
    ],
    show: true,
  },
  {
    key: 'redirect_settings',
    label: 'advancedOptionMenu.groups.redirect',
    subItems: [
      {
        key: 'custom_redirect_code',
        planKey: ADVANCED_FEATURE_KEYS.CUSTOM_REDIRECT_CODE,
        label: 'advancedOptionMenu.items.custom_redirect_code.title',
        Component: CustomRedirectCodeSection,
        Icon: Code2,
        description: 'advancedOptionMenu.items.custom_redirect_code.description',
        show: true,
      },
      {
        key: 'custom_404_redirect',
        planKey: ADVANCED_FEATURE_KEYS.NOT_FOUND_URL,
        label: 'advancedOptionMenu.items.custom_404_redirect.title',
        Component: CustomNotFoundSection,
        Icon: FileWarning,
        experimental: true,
        description: 'advancedOptionMenu.items.custom_404_redirect.description',
        show: true,
      },
    ],
    show: true,
  },
  {
    key: 'privacy_n_security',
    label: 'advancedOptionMenu.groups.privacy',
    subItems: [
      {
        key: 'encrypted_link',
        label: 'advancedOptionMenu.items.encrypted_link.title',
        Component: E2EEncryptionSection,
        Icon: Shield,
        description: 'advancedOptionMenu.items.encrypted_link.description',
        show: true,
      },
      {
        key: 'link_cloaking',
        label: 'advancedOptionMenu.items.link_cloaking.title',
        Component: LinkCloakingSection,
        Icon: EyeOff,
        description: 'advancedOptionMenu.items.link_cloaking.description',
        show: true,
      },
    ],
    show: true,
  },
  {
    key: 'integrations_automation',
    label: 'Integrations & Automation',
    subItems: [
      {
        key: 'utm_builder',
        Icon: ListEnd,
        label: 'UTM builder',
        Component: UtmSection,
        description:
          'Track how users access your destination URL by adding UTM tags for marketing analytics.',
      },
      { key: 'ab_test', label: 'A/B Test', Component: UtmSection },
      { key: 'hamon_bot_ai', label: 'Hamon/Bot/AI Traffic', Component: UtmSection },
    ],
  },
  {
    key: 'security_access',
    label: 'Security & Access Control',
    subItems: [
      { key: 'password_protection', label: 'Password protection', Component: PasswordSection },
      { key: 'link_permissions', label: 'Link Permissions', Component: UtmSection },
      { key: 'link_expiration', label: 'Link Expiration', Component: UtmSection },
      { key: 'encrypted_link', label: 'Encrypted Link', Component: UtmSection },
    ],
  },
  {
    key: 'privacy_cloaking',
    label: 'Privacy & Cloaking',
    subItems: [
      { key: 'sso', label: 'Single Sign-On (SSO)', Component: UtmSection },
      { key: 'link_cloaking', label: 'Link Cloaking', Component: UtmSection },
      { key: 'referrer_hiding', label: 'Referrer Hiding', Component: UtmSection },
      { key: 'gdpr_privacy', label: 'GDPR Privacy', Component: UtmSection },
    ],
  },
  {
    key: 'advanced_links',
    label: 'Advanced Links',
    subItems: [
      { key: 'deep_links', label: 'Deep Links', Component: UtmSection },
      { key: '404_redirect', label: '404 Redirect', Component: UtmSection },
      { key: '301_redirect', label: '301 Redirect Code', Component: UtmSection },
    ],
  },
  {
    key: 'collaboration',
    label: 'Collaboration',
    subItems: [
      { key: 'multiple_teams', label: 'Multiple Teams', Component: UtmSection },
      { key: 'teammates_roles', label: 'Teammates with Roles', Component: UtmSection },
    ],
  },
  {
    key: 'integration_api',
    label: 'Integration & API',
    subItems: [
      { key: 'api', label: 'API', Component: UtmSection },
      { key: 'app_integrations', label: 'App Integrations', Component: UtmSection },
      { key: 'tools_extensions', label: 'Tools & Extensions', Component: UtmSection },
    ],
  },
]

const e2eeBlacklist = ['smart_targeting', 'split_traffic']
const campaignBlacklist = ['utm_builder', 'link_expiration']

export const TouchPointAdvancedMenu = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const isMobile = useIsMobile()
  const { t } = useTranslation(['touchpoint'])

  const { data } = useShowTouchPoint(org_id, touch_point_id)
  const isTouchPointE2ee = !!data?.privacy_security?.e2e_encryption

  const visibleMenuSections = useMemo(() => {
    return menuSections
      .filter((section) => section.show === true)
      .map((section) => ({
        ...section,
        subItems: section.subItems.filter((subItem) => subItem.show === true),
      }))
  }, [data])

  const [expandedSection, setExpandedSection] = useState<string[]>(
    visibleMenuSections.map((e) => e.key)
  )
  const [selectedSubSection, setSelectedSubSection] = useState(
    visibleMenuSections[0]?.subItems[0]?.key ?? ''
  )

  const selectedSubSectionItem = useMemo(() => {
    return visibleMenuSections
      .flatMap((section) => section.subItems)
      .find((section) => section.key === selectedSubSection)
  }, [selectedSubSection, visibleMenuSections])

  const handleSelectSubSection = (key: string) => {
    const section = visibleMenuSections
      .flatMap((section) => section.subItems)
      .find((section) => section.key === key)
    if (!section) return
    setSelectedSubSection(section.key)
  }

  const handleExpandSection = (section: (typeof menuSections)[number], open: boolean) => {
    setExpandedSection((prev) => {
      if (open) {
        return [...prev, section.key]
      } else {
        const newExpandedSection = prev.filter((key) => key !== section.key)
        if (
          section.subItems.find((subItem) => subItem.key === selectedSubSection) &&
          newExpandedSection.length > 0
        ) {
          const section = visibleMenuSections.find(
            (section) => section.key === newExpandedSection[0]
          )
          if (!section) return newExpandedSection
          setSelectedSubSection(section.subItems?.[0].key)
        }
        return newExpandedSection
      }
    })
  }
  const { checkAdvancedFeature, enableE2EE } = usePlanFeatures()

  const contentRender = useMemo(() => {
    if (!selectedSubSectionItem) return null

    if (selectedSubSectionItem.planKey && !checkAdvancedFeature(selectedSubSectionItem.planKey)) {
      return <PremiumOnlySection />
    }

    if (!!data?.utm_campaign_id && campaignBlacklist.includes(selectedSubSectionItem.key)) {
      return <CampaignBlockedSection campaignId={data.utm_campaign_id} />
    }
    if (
      !!data?.privacy_security?.e2e_encryption &&
      e2eeBlacklist.includes(selectedSubSectionItem.key)
    ) {
      return (
        <div>
          <Alert variant={'info'}>
            <AlertTitle>{t('e2ee.feature_unavailable_title')}</AlertTitle>
            <AlertDescription>{t('e2ee.feature_unavailable_description')}</AlertDescription>
          </Alert>
        </div>
      )
    }

    return <selectedSubSectionItem.Component />
  }, [data, selectedSubSectionItem])

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-9 w-full">
      {isMobile ? (
        <div>
          <SingleCommandSelect
            hideCheckIcon
            value={selectedSubSection}
            onChange={(value) => handleSelectSubSection(value)}
            options={visibleMenuSections.flatMap((e) =>
              e.subItems.map((subItem) => ({
                value: subItem.key,
                label: (
                  <div key={`label-${subItem.key}`} className="flex gap-2 items-center">
                    {subItem.Icon && <subItem.Icon />} {t(subItem.label)}
                  </div>
                ),
                group: t(e.label),
              }))
            )}
            groups={visibleMenuSections.map((e) => t(e.label))}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleMenuSections.map((section) => {
            const isOpen = expandedSection.includes(section.key)
            return (
              <Collapsible
                open={isOpen}
                onOpenChange={(open) => handleExpandSection(section, open)}
                className="text-sm leading-[20px]"
                key={section.key}
              >
                <CollapsibleTrigger className="px-[16px] py-[6px] text-slate-500 flex justify-between text-nowrap gap-2 w-full group">
                  {t(section.label)}
                  <ChevronRight className="w-[22px]! h-[22px]! transition-transform duration-300 group-data-[state=open]:rotate-90" />
                </CollapsibleTrigger>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      {section.subItems.map((subItem) => {
                        return (
                          <div
                            className={cn(
                              'pl-[28px] py-[8px] text-slate-600 cursor-pointer flex gap-2 rounded-[8px]',
                              {
                                'text-primary bg-card': selectedSubSection == subItem.key,
                              }
                            )}
                            key={subItem.key}
                            onClick={() => handleSelectSubSection(subItem.key)}
                          >
                            {subItem.Icon ? (
                              <subItem.Icon className="!w-[18px] !h-[18px]" />
                            ) : (
                              <span className="w-[18px] h-[18px]" />
                            )}
                            <span>{t(subItem.label)}</span>
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Collapsible>
            )
          })}
        </div>
      )}
      <div className="flex flex-col gap-4 w-full overflow-hidden">
        {selectedSubSectionItem && (
          <div key={selectedSubSection} className="p-6 space-y-4 bg-card rounded-[16px]">
            <LockableSection lockBy="coming_soon" locked={selectedSubSectionItem.locked}>
              <div className="flex justify-between gap-2">
                <div>
                  <h2 className="text-[18px] font-semibold line-clamp-[28px] text-slate-700 flex items-center gap-2">
                    {t(selectedSubSectionItem.label)}{' '}
                    {selectedSubSectionItem.experimental && (
                      <Badge className="self-baseline" color="#000EEE" size={'xs'}>
                        {t('common:label.experimental')}
                      </Badge>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 line-clamp-[20px]">
                    {t(selectedSubSectionItem.description || '')}
                  </p>
                </div>
                {/* <Switch /> */}
              </div>
              <Suspense fallback={<SkeletonCard className="h-[360px] w-full" />}>
                {contentRender}
              </Suspense>
            </LockableSection>
          </div>
        )}
      </div>
    </div>
  )
}
