import { useParams, useSearchParams } from 'next/navigation'
import {
  MAX_TOUCHPOINTS_NAME_LENGTH,
  metaTagsSchema,
  touchPointFormCreateWithAdvanceSchema,
} from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { Form } from '@/shared/components/ui/form'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useTranslation } from 'react-i18next'
import { CrownIcon } from 'lucide-react'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { TouchPoint } from '@/core/types/touch-point.type'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { TouchPointUtmDataFormV2 } from './touch-point-utm-data-form-v2'
import { TouchPointMetaDataFormV2 } from './touch-point-meta-data-form-v2'
import { TouchPointMetaPreviewPanel } from './touch-point-meta-preview-panel'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

// Hooks
import { useTouchPointForm } from '../../../hooks/use-touch-point-form'
import { useUrlVerification } from '../../../hooks/use-url-verification'
import { usePlanFeatures } from '../../../hooks/use-plan-features'
import { useIsTablet } from '@/shared/hooks/use-mobile'

// Components
import { TouchPointTypeSelector } from '../fields/touch-point-type-selector'
import { DestinationUrlField } from '../fields/destination-url-field'
import { ShortLinkConfiguration } from '../fields/short-link-configuration'
import { TouchPointNameAndTags } from '../fields/touch-point-name-and-tags'
import { AdvancedSettingsSection } from '../fields/advanced-settings-section'
import { QrPreviewPanel } from '../fields/qr-preview-panel'

// Utils and Constants
import { transformFormDataForSubmit } from '../../../utils/form-transformers'
import { getAnimatedTabsConfig, QR_PREVIEW_SIZE } from '../touch-point-form.constants'
import PremiumBadge from '../../PremiumBadge'
import PasswordProtectionForm from './PasswordProtectionForm'
import { useWatch } from 'react-hook-form'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useMetaTagsAutoFetch } from '@/features/touch-points/hooks'
import { ToggleE2EE } from './toggle-e2ee'
import { useE2EEStore } from '@/shared/stores/e2ee-encryption-store'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { Separator } from '@/shared/components/ui/separator'

interface TouchPointCreateV2Props {
  onSubmit: (values: z.infer<typeof touchPointFormCreateWithAdvanceSchema>) => void
  isLoading: boolean
  orgQuotaMonthlyTps: number
  form: ReturnType<typeof useTouchPointForm>['form']
  isFormDirty: ReturnType<typeof useTouchPointForm>['isFormDirty']
}

export const TouchPointCreateV2 = ({
  onSubmit,
  isLoading,
  orgQuotaMonthlyTps,
  form,
  isFormDirty,
}: TouchPointCreateV2Props) => {
  const { org_id } = useParams<{ org_id: string }>()
  const searchParams = useSearchParams()
  const { t } = useTranslation(['common', 'touchpoint', 'advanced_custom'])
  const { back } = useFormWarningProvider()

  // Initialize form and hooks
  const isTablet = useIsTablet()
  const { isDirty: isQrDirty, setQrOptions } = useQrContext()
  const { qrOptions } = useQrContext()
  const { urlVerification, isVerifying } = useUrlVerification()
  const planFeatures = usePlanFeatures()

  // State
  const [selectedTab, setSelectedTab] = useState<AllTouchPointVariants>(AllTouchPointVariants.LINK)
  const [createdTouchPoint, setCreatedTouchPoint] = useState<Pick<
    TouchPoint,
    'id' | 'short_url' | 'qr_customize_options'
  > | null>(null)
  const [tempSuggestSlugs, setTempSuggestSlugs] = useState<string[]>([])

  // Refs
  const utmDialogRef = useRef<CustomDialogRef>(null)
  const metaTagDialogRef = useRef<CustomDialogRef>(null)
  const passwordDialogRef = useRef<CustomDialogRef>(null)

  // Fetch data
  const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
  const { data: collectionsResponse, isLoading: isLoadingCollections } =
    useGetCollectionsDropdown(org_id)
  const collections = collectionsResponse?.data || []

  // Handle URL query params for tab selection
  const type = searchParams.get('type')
  useEffect(() => {
    if (type === 'qr-code') {
      setSelectedTab(AllTouchPointVariants.QR)
    }
  }, [type])

  // Reset created touch point when form becomes dirty
  useEffect(() => {
    const isDirty = isFormDirty || isQrDirty
    if (createdTouchPoint && isDirty) {
      setCreatedTouchPoint(null)
    }
  }, [createdTouchPoint, isFormDirty, isQrDirty])

  // Form submission handler
  const handleSubmit = (values: z.infer<typeof touchPointFormCreateWithAdvanceSchema>) => {
    const transformedData = transformFormDataForSubmit(values, selectedTab, qrOptions, form)
    onSubmit(transformedData)
  }

  // Get animated tabs configuration
  const animatedTabs = useMemo(() => getAnimatedTabsConfig(t), [t])

  const resetE2EEStore = useE2EEStore().reset

  useEffect(() => {
    if (
      selectedTab === AllTouchPointVariants.QR &&
      !!form.getValues('privacy_security.e2e_encryption')
    ) {
      form.setValue('content_value', '')
      form.setValue('privacy_security.e2e_encryption', undefined)
      resetE2EEStore()
    }
  }, [selectedTab, form])

  const watchDestination = useWatch({
    control: form.control,
    name: 'content_value',
  })
  const debounceDestination = useDebounce(watchDestination, 1000)

  const watchPassword = useWatch({
    control: form.control,
    name: 'access_control.password',
  })

  const watchMetaTags = useWatch({
    control: form.control,
    name: 'meta_tags',
  })

  const lastMetaTags = useRef<z.infer<typeof metaTagsSchema>>()

  const { isFetching: isFetchingMetaTags } = useMetaTagsAutoFetch(form, debounceDestination, {
    enableMetaTagsOnFetch: true,
    urlSchema: touchPointFormCreateWithAdvanceSchema.shape.content_value,
    onFetched: (data) => {
      const currentName = form.getValues('name')
      if (data.title && (!currentName || currentName === lastMetaTags.current?.title)) {
        form.setValue('name', data.title.slice(0, MAX_TOUCHPOINTS_NAME_LENGTH))
      }
      lastMetaTags.current = data
    },
  })

  return (
    <>
      <Form {...form}>
        <form id="touch-point-create-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="flex flex-col w-full max-w-7xl mx-auto pt-2 pb-6 px-6 lg:px-12">
            {/* Usage Information */}
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <CrownIcon className="w-5 h-5 min-w-5 min-h-5 fill-slate-400 stroke-slate-400 stroke-[1.5px]" />
              {t('common:usage.title_display_usage', {
                chances: planFeatures.maxTpsPerMonth - orgQuotaMonthlyTps,
                object: t('common:label.link'),
              }).replace('Link', 'links')}
            </div>

            {/* Main Content: Left Form + Right Panel */}
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                {/* Left Content Card */}
                <div className=" bg-card rounded-xl border border-border overflow-hidden">
                  {/* Type Selector Tabs */}
                  <div className="border-b border-border px-6 pt-6">
                    <TouchPointTypeSelector
                      tabs={animatedTabs}
                      selectedTab={selectedTab}
                      onTabChange={setSelectedTab}
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="flex flex-col gap-4 p-6">
                    {/* Destination URL */}
                    <DestinationUrlField
                      control={form.control}
                      urlVerification={urlVerification}
                      isVerifying={isVerifying}
                      required
                      currentTab={selectedTab}
                    />

                    {/* Short Link Configuration */}
                    <ShortLinkConfiguration
                      control={form.control}
                      enableCustomDomain={!!planFeatures.enableCustomDomain}
                      destinationUrl={watchDestination}
                      tempSuggestSlugs={tempSuggestSlugs}
                      onSlugSelect={(slug) => form.setValue('slug', slug)}
                      onSuggestSlugsChange={setTempSuggestSlugs}
                      triggerSlugCheck={() => form.trigger('slug')}
                    />

                    <Separator />

                    {/* Name and Tags (inline, no wrapper card) */}
                    <TouchPointNameAndTags
                      control={form.control}
                      tags={tags}
                      isLoadingTags={isLoadingTags}
                      maxTagsPerTouchPoint={planFeatures.maxTagsPerTouchPoint}
                      collections={collections}
                      isLoadingCollections={isLoadingCollections}
                    />

                    {/* Advanced Settings */}
                    <AdvancedSettingsSection
                      isUtmDirty={!!form.formState.dirtyFields.utm_tags}
                      isMetaTagsDirty={!!form.formState.dirtyFields.meta_tags}
                      isPasswordDirty={!!form.formState.dirtyFields.access_control?.password}
                      onUtmClick={() => utmDialogRef.current?.open()}
                      onMetaTagsClick={() => metaTagDialogRef.current?.open()}
                      onPasswordClick={() => passwordDialogRef.current?.open()}
                      control={form.control}
                      hasConversionTrackingAccess={!!planFeatures.enableConversionTracking}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side Panel */}
              <div className="w-full lg:w-[300px] lg:shrink-0">
                {/* QR Code Section */}
                {selectedTab === AllTouchPointVariants.QR && (
                  <div className="px-9">
                    <QrPreviewPanel
                      qrOptions={qrOptions}
                      createdTouchPoint={createdTouchPoint}
                      qrSize={QR_PREVIEW_SIZE}
                      onQrOptionsUpdate={(updatedQrOptions, qrLogo) => {
                        setQrOptions(updatedQrOptions)
                        if (qrLogo) {
                          form.setValue('qr_logo_image', qrLogo, { shouldDirty: true })
                        }
                      }}
                    />
                  </div>
                )}
                {selectedTab === AllTouchPointVariants.LINK && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Social Media Preview Section */}
                    <LoadingMask className="w-full" loading={isFetchingMetaTags}>
                      <TouchPointMetaPreviewPanel
                        metaTags={watchMetaTags}
                        shortUrl={debounceDestination}
                        onEditClick={() => metaTagDialogRef.current?.open()}
                      />
                    </LoadingMask>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* UTM Dialog */}
      <CustomDialogV2
        ref={utmDialogRef}
        title={
          !planFeatures.enableUTM ? (
            <PremiumBadge btnText={t('touchpoint:advancedSettings.utm.title')} />
          ) : (
            t('touchpoint:advancedSettings.utm.title')
          )
        }
        description={t('touchpoint:advancedSettings.utm.subtitle')}
        size="sm"
        showTooltip
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            <TouchPointUtmDataFormV2
              org_id={org_id}
              shortLink={`${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/abcxyz`}
              destination={watchDestination || ''}
              close={() => setOpen(false)}
              onSubmit={(values) => {
                if (planFeatures.enableUTM) {
                  form.setValue('utm_tags', values, { shouldDirty: true })
                }
                setOpen(false)
              }}
              defaultValues={form.watch('utm_tags')}
            />
          </Suspense>
        )}
      </CustomDialogV2>

      {/* Meta Tags Dialog */}
      <CustomDialogV2
        ref={metaTagDialogRef}
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

      {/* Password Protection Dialog */}
      <CustomDialogV2
        ref={passwordDialogRef}
        title={
          !planFeatures.enablePassword ? (
            <PremiumBadge btnText={t('touchpoint:advancedSettings.password.title')} />
          ) : (
            t('touchpoint:advancedSettings.password.title')
          )
        }
        description={t('touchpoint:advancedSettings.password.subtitle')}
        size="sm"
        showTooltip
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            <PasswordProtectionForm
              defaultValues={watchPassword ? { password: watchPassword } : undefined}
              handleSubmit={(values) => {
                let password = undefined
                if (planFeatures.enablePassword && values.password) {
                  password = values.password
                }
                form.setValue('access_control.password', password, { shouldDirty: true })
                setOpen(false)
              }}
              close={() => setOpen(false)}
            />
          </Suspense>
        )}
      </CustomDialogV2>
    </>
  )
}
