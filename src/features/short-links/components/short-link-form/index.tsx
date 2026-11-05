'use client'

import { useRef, useState, useMemo, Suspense, useEffect } from 'react'

import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { Form } from '@/shared/components/ui/form'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { Badge } from '@/shared/components/ui/badge'
import { LockableSection } from '@/shared/components/customize/lockable-section'

import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import { useIsTablet } from '@/shared/hooks/use-mobile'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { TouchPointMetaDataFormV2 } from '@/features/touch-points/components/forms/create-new/touch-point-meta-data-form-v2'
import PremiumBadge from '@/features/touch-points/components/PremiumBadge'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { PremiumOnlySection } from '@/features/touch-points/components/touch-point-detail-advanced/premium-only-section'
import { useShortLinkMetaTags } from '@/features/short-links/hooks/use-short-link-meta-tags'
import {
  MAX_TOUCHPOINTS_NAME_LENGTH,
  touchPointFormCreateWithAdvanceSchema,
} from '@/shared/schemas/touch-points'

// Section components
import { ShortLinkSmartTargetingSection } from './sections/smart-targeting-section'
import { ShortLinkUtmSection } from './sections/utm-section'
import { ShortLinkFbPixelSection } from './sections/fb-pixel-section'
import { ShortLinkGaSection } from './sections/ga-tracking-section'
import { ShortLinkTikTokSection } from './sections/tiktok-pixel-section'
import { ShortLinkPasswordSection } from './sections/password-section'
import { ShortLinkExpirationSection } from './sections/link-expiration-section'
import { ShortLinkClickLimitSection } from './sections/click-limitation-section'
import { ShortLinkRedirectCodeSection } from './sections/redirect-code-section'
import { ShortLinkNotFoundSection } from './sections/not-found-section'
import { ShortLinkCloakingSection } from './sections/link-cloaking-section'
import { ShortLinkTagsSection } from './sections/tags-section'
import { ShortLinkEncryptedLinkSection } from './sections/encrypted-link-section'

import { BasicEditingTab } from './basic-editing-tab'
import { ShortLinkSidebar } from './short-link-sidebar'
import { ShortLinkRightPanel } from './right-panel'
import { ShortLinkFormNavigationProvider } from './form-navigation-context'
import {
  SIDEBAR_ITEM_LABELS,
  SIDEBAR_ITEM_DESCRIPTIONS,
  ANALYTICS_SIDEBAR_GROUP,
  SIDEBAR_GROUPS,
  type SidebarItemKey,
} from './short-link-form.constants'

import type { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import type { UseFormReturn, FieldErrors } from 'react-hook-form'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AnalyticByTouchPoint } from '@/features/analytics/components/sections/analytic-by-touch-point'

// ── Types ────────────────────────────────────────────────────────────────────

interface ShortLinkFormProps {
  form: UseFormReturn<ShortLinkFormValues>
  formId?: string
  onSubmit: (values: ShortLinkFormValues) => void
  isLoading?: boolean
  /** When provided, section saves call the PATCH API (edit mode); otherwise writes to parent form state (create mode) */
  touchPointId?: string
  orgQuotaMonthlyTps?: number
  onTabChange?: (tab: SidebarItemKey) => void
}

// ── Plan access gate per section ─────────────────────────────────────────────

const SECTION_PLAN_KEYS: Partial<Record<SidebarItemKey, string>> = {
  smart_targeting: ADVANCED_FEATURE_KEYS.LINK_TARGETING,
  fb_pixel: ADVANCED_FEATURE_KEYS.FACEBOOK_TRACKING,
  ga_tracking: ADVANCED_FEATURE_KEYS.GOOGLE_TRACKING,
  tiktok_pixel: ADVANCED_FEATURE_KEYS.TIKTOK_TRACKING,
  password_protection: ADVANCED_FEATURE_KEYS.LINK_PASSWORD,
  link_expiration: ADVANCED_FEATURE_KEYS.LINK_EXPIRATION,
  click_limitation: ADVANCED_FEATURE_KEYS.LIMIT_ACCESS,
  custom_redirect_code: ADVANCED_FEATURE_KEYS.CUSTOM_REDIRECT_CODE,
  custom_404_redirect: ADVANCED_FEATURE_KEYS.NOT_FOUND_URL,
}

const SECTION_LOCKED: Partial<Record<SidebarItemKey, boolean>> = {
  fb_pixel: disabledFeatures.FACEBOOK_TRACKING,
  ga_tracking: disabledFeatures.GA_TRACKING,
  tiktok_pixel: disabledFeatures.TIKTOK_TRACKING,
}

const SECTION_EXPERIMENTAL: Partial<Record<SidebarItemKey, boolean>> = {
  fb_pixel: true,
  ga_tracking: true,
  tiktok_pixel: true,
  custom_404_redirect: true,
}

// ── Advanced tab header ───────────────────────────────────────────────────────

const SectionHeader = ({ sectionKey }: { sectionKey: SidebarItemKey }) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  if (sectionKey === 'basic_editing') return null
  const label = SIDEBAR_ITEM_LABELS[sectionKey]
  const desc = SIDEBAR_ITEM_DESCRIPTIONS[sectionKey]
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
        {t(label)}
        {SECTION_EXPERIMENTAL[sectionKey] && (
          <Badge className="self-baseline" color="#000EEE" size="xs">
            {t('common:label.experimental')}
          </Badge>
        )}
      </h2>
      {desc && <p className="text-sm text-slate-500 mt-0.5">{t(desc)}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export const ShortLinkForm = ({ form, onSubmit, onTabChange, formId }: ShortLinkFormProps) => {
  const { touch_point_id } = useParams<{ touch_point_id: string }>()
  const searchParams = useSearchParams()

  const { t } = useTranslation(['touchpoint', 'common'])
  const { qrOptions, setQrOptions } = useQrContext()

  const [selectedTab, setSelectedTab] = useState<SidebarItemKey>(() => {
    const tab = searchParams.get('tab')
    if (tab === 'analytics' && touch_point_id) return 'analytics'
    return 'basic_editing'
  })
  useEffect(() => {
    if (touch_point_id) {
      onTabChange?.(selectedTab)
    }
  }, [touch_point_id, selectedTab])

  const handleTabChange = (tab: SidebarItemKey) => {
    setSelectedTab(tab)
  }

  // Meta tags dialog ref — passed directly to the dialog so the right panel can open it
  const metaTagsDialogRef = useRef<CustomDialogRef>(null)

  const watchDestination = useWatch({ control: form.control, name: 'content_value' })
  const watchMetaTags = useWatch({ control: form.control, name: 'meta_tags' })
  const debounceDestination = useDebounce(watchDestination, 800)

  const lastMetaTagsRef = useRef<{ title?: string }>()

  const { isFetching: isFetchingMetaTags } = useShortLinkMetaTags(form, debounceDestination, {
    enableMetaTagsOnFetch: true,
    urlSchema: touchPointFormCreateWithAdvanceSchema.shape.content_value,
    mode: touch_point_id ? 'edit' : 'create',
    onFetched: (data) => {
      const currentName = form.getValues('name')
      if (data.title && (!currentName || currentName === lastMetaTagsRef.current?.title)) {
        form.setValue('name', data.title.slice(0, MAX_TOUCHPOINTS_NAME_LENGTH))
      }
      lastMetaTagsRef.current = data
    },
  })

  const planFeatures = usePlanFeatures()
  const { checkAdvancedFeature } = planFeatures
  const isTablet = useIsTablet()

  // Analytics tab is only available on the edit page
  const sidebarGroups = useMemo(
    () => (touch_point_id ? [ANALYTICS_SIDEBAR_GROUP, ...SIDEBAR_GROUPS] : SIDEBAR_GROUPS),
    [touch_point_id]
  )

  // ── Render active section ───────────────────────────────────────────────────

  const sectionContent = useMemo(() => {
    if (selectedTab === 'basic_editing') return null // rendered separately

    // Plan gate
    const planKey = SECTION_PLAN_KEYS[selectedTab]
    if (planKey && !checkAdvancedFeature(planKey as any)) {
      return <PremiumOnlySection />
    }

    const locked = SECTION_LOCKED[selectedTab]

    return (
      <LockableSection lockBy="coming_soon" locked={!!locked}>
        <Suspense fallback={<SkeletonCard className="h-[360px] w-full" />}>
          {renderSectionContent(selectedTab)}
        </Suspense>
      </LockableSection>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, checkAdvancedFeature])

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      handleTabChange(findFirstErrorTab(form.formState.errors))
    }
  }, [form.formState.errors])

  const isAnalytics = selectedTab === 'analytics'

  const onSubmitForm = (values: ShortLinkFormValues) => {
    const submitValues = {
      ...values,
      qr_customize_options: qrOptions,
    }
    onSubmit(submitValues)
  }

  return (
    <Form {...form}>
      <ShortLinkFormNavigationProvider setSelectedTab={handleTabChange}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} id={formId}>
          <motion.div
            className="flex flex-col xl:flex-row gap-5 w-full mx-auto"
            animate={{ maxWidth: isAnalytics ? '96rem' : '80rem' }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* ── Left Sidebar ── */}
            <div className="xl:w-[252px] 2xl:w-[302px] xl:shrink-0">
              <ShortLinkSidebar
                selected={selectedTab}
                onSelect={handleTabChange}
                groups={sidebarGroups}
              />
            </div>

            {/* ── Center Content + Right Panel (merged card) ── */}
            <div className="flex-1 min-w-0 bg-card rounded-xl border border-border overflow-hidden flex flex-col lg:flex-row">
              {/* Center */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {selectedTab === 'basic_editing' ? (
                  <BasicEditingTab form={form} isEditMode={!!touch_point_id} />
                ) : (
                  <div className="p-6">
                    <SectionHeader sectionKey={selectedTab} />
                    {sectionContent}
                  </div>
                )}
              </div>

              {/* Right Panel — only for basic settings tab */}
              <AnimatePresence>
                {selectedTab === 'basic_editing' && (
                  <motion.div
                    key="right-panel"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden shrink-0"
                  >
                    <ShortLinkRightPanel
                      qrOptions={qrOptions}
                      metaTags={watchMetaTags}
                      shortUrl={debounceDestination}
                      isFetchingMetaTags={isFetchingMetaTags}
                      isEditMode={!!touch_point_id}
                      onQrOptionsUpdate={(updatedOptions, qrLogo) => {
                        setQrOptions(updatedOptions)
                        form.setValue('qr_customize_options', updatedOptions, { shouldDirty: true })
                        if (qrLogo) form.setValue('qr_logo_image', qrLogo, { shouldDirty: true })
                      }}
                      onMetaTagsEditClick={() => metaTagsDialogRef.current?.open()}
                      className="lg:w-[252px] 2xl:w-[302px] lg:border-l lg:border-border border-t border-border lg:border-t-0 h-full"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </form>

        {/* Meta Tags Dialog — outside <form> to avoid nested form submission */}
        <CustomDialogV2
          ref={metaTagsDialogRef}
          title={
            !planFeatures.enableMetaTags ? (
              <PremiumBadge btnText={t('touchpoint:advancedSettings.linkPreview.title')} />
            ) : (
              t('touchpoint:advancedSettings.linkPreview.title')
            )
          }
          description={t('touchpoint:advancedSettings.linkPreview.subtitle')}
          size={isTablet ? 'xs' : 'sm'}
          showTooltip
        >
          {({ setOpen }) => (
            <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
              <TouchPointMetaDataFormV2
                defaultValues={watchMetaTags}
                onSubmit={(values) => {
                  if (planFeatures.enableMetaTags) {
                    form.setValue('meta_tags', values, { shouldDirty: true })
                    form.setValue('meta_tags.image', values.image, { shouldDirty: true })
                  }
                  setOpen(false)
                }}
                short_url={watchDestination}
                close={() => setOpen(false)}
                destination={watchDestination}
              />
            </Suspense>
          )}
        </CustomDialogV2>
      </ShortLinkFormNavigationProvider>
    </Form>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findFirstErrorTab(errors: FieldErrors<ShortLinkFormValues>): SidebarItemKey {
  if (errors.name || errors.content_value || errors.slug) return 'basic_editing'
  if (errors.utm_tags) return 'utm_builder'
  if (errors.tracking?.facebook) return 'fb_pixel'
  if (errors.tracking?.google) return 'ga_tracking'
  if (errors.tracking?.tiktok) return 'tiktok_pixel'
  if (errors.access_control?.password) return 'password_protection'
  if (errors.access_control?.valid_from || errors.access_control?.expires_at)
    return 'link_expiration'
  if (errors.access_control?.limit) return 'click_limitation'
  if (errors.redirect_setting?.status_code) return 'custom_redirect_code'
  if (errors.redirect_setting?.not_found_url) return 'custom_404_redirect'
  if (errors.privacy_security?.link_cloaking) return 'link_cloaking'
  if (errors.privacy_security?.e2e_encryption) return 'encrypted_link'
  return 'basic_editing'
}

function renderSectionContent(section: SidebarItemKey) {
  switch (section) {
    case 'analytics':
      return <AnalyticByTouchPoint />
    case 'smart_targeting':
      return <ShortLinkSmartTargetingSection />
    case 'utm_builder':
      return <ShortLinkUtmSection />
    case 'fb_pixel':
      return <ShortLinkFbPixelSection />
    case 'ga_tracking':
      return <ShortLinkGaSection />
    case 'tiktok_pixel':
      return <ShortLinkTikTokSection />
    case 'password_protection':
      return <ShortLinkPasswordSection />
    case 'link_expiration':
      return <ShortLinkExpirationSection />
    case 'click_limitation':
      return <ShortLinkClickLimitSection />
    case 'custom_redirect_code':
      return <ShortLinkRedirectCodeSection />
    case 'custom_404_redirect':
      return <ShortLinkNotFoundSection />
    case 'link_cloaking':
      return <ShortLinkCloakingSection />
    case 'encrypted_link':
      return <ShortLinkEncryptedLinkSection />
    case 'tags':
      return <ShortLinkTagsSection />
    default:
      return null
  }
}
