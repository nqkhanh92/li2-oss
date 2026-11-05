'use client'

import { ContentLayout } from '@/shared/components/layout/content-layout'
import { notFound, useParams } from 'next/navigation'
import { useGetTouchPointSlugs, useShowTouchPoint } from '@/features/touch-points/hooks/queries'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { metaTagsSchema, touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { useUpdateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/input'
import {
  ArrowLeft,
  CalendarIcon,
  ChevronRight,
  CopyIcon,
  CrownIcon,
  DownloadIcon,
  Globe,
  History,
  Link2Icon,
  LinkIcon,
  ListEnd,
  MoreVerticalIcon,
  PaletteIcon,
  SparklesIcon,
  UserRound,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  forwardRef,
  Suspense,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '@/shared/components/ui/button'
import { useRouter } from 'next/navigation'
import { parse } from 'tldts'
import { DomainSelect } from '@/features/custom-domains/components/domain-select'
import { TagSelect } from '@/features/tags/components/tag-select'
import dayjs from '@/shared/lib/dayjs'
import { MetaTagsPreview } from './meta-tags-preview'
import { TouchPointMetaDataFormV2 } from '../forms/create-new/touch-point-meta-data-form-v2'
import { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { cn } from '@/shared/lib/utils'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { QrCustomizeFormElementsDialog } from '../simple-form/qr-customize-form-elements-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { BackHalfHistory } from './backhalf-history'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { writeQrToClipboard } from '@/shared/helpers/client-helper'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { TouchPointDetailHeader } from './header'
import { TouchPointDetailQrSection } from './qr-section'
import { useTouchPointActions } from '../../hooks/use-touchpoint-actions'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { AISlugSuggestion } from '../ai-slug-suggestion'
import { slugMaxLength } from '@/shared/schemas/slug'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useSlugCheck } from '../../hooks'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import Link from 'next/link'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { usePlanFeatures, useMetaTagsAutoFetch } from '../../hooks'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { MoveToCollectionDialog } from '../dialogs/move-to-collection-dialog'
import { FolderOpen, Pencil } from 'lucide-react'
import { ConversionTrackingSection } from './conversion-tracking-section'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'

export type TouchPointDetailRef = {
  triggerUpdate: () => void
  isUpdating: boolean
}
type Props = {}
export const TouchPointDetailV2 = forwardRef<TouchPointDetailRef, Props>((props, ref) => {
  const { t } = useTranslation(['common', 'touchpoint', 'collection'])

  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)

  const { form, handleUpdate, isUpdating, isE2eEnabled } = useUpdateTouchPointForm(touchPoint)

  useImperativeHandle(
    ref,
    () => ({
      triggerUpdate: () => handleUpdate(form.getValues()),
      isUpdating,
    }),
    [handleUpdate, form, isUpdating]
  )

  const { handleBack } = useTouchPointActions(touchPoint)

  const watchMetatags = useWatch({ control: form.control, name: 'meta_tags' })
  const watchUrl = useWatch({ control: form.control, name: 'content_value' })

  const debounceUrl = useDebounce(watchUrl, 500)

  const metaTagsFormRef = useRef<DialogCustomRef>(null)

  // Collection management
  const { data: collectionsResponse } = useGetCollectionsDropdown(org_id)
  const collections = collectionsResponse?.data || []
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)

  const currentCollection = collections.find((c) => c.id === touchPoint?.collection_id)

  const handleSaveMetaTags = (values: z.infer<typeof metaTagsSchema>) => {
    metaTagsFormRef.current?.close()
    form.setValue('meta_tags', values, { shouldDirty: true })
  }

  const isMobile = useIsMobile()
  const onUpdate = async (data: z.infer<typeof touchPointUpdateSchema>) => {
    await handleUpdate(data)
  }

  const { data: tp, isLoading } = useGetTouchPointSlugs(org_id, touch_point_id)
  const { orgPlan } = useOrganizationStoreProvider()
  const { enableMetaTags, checkAdvancedFeature } = usePlanFeatures()
  const reachedMaxSlugs = tp && orgPlan ? tp.slugs.length >= orgPlan.max_slugs_per_tp : false

  // Slug validation
  const { slugStatus, slugStatusIcon } = useSlugCheck({
    control: form.control,
    onTriggerValidation: () => form.trigger('slug'),
    currentSlug: touchPoint?.slug,
  })

  const hasConversionTracking =
    checkAdvancedFeature(ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING) ?? false

  const { isFetching: isFetchingMetaTags } = useMetaTagsAutoFetch(form, debounceUrl, {
    enabled: enableMetaTags && debounceUrl !== touchPoint?.content_value,
    urlSchema: touchPointUpdateSchema.shape.content_value,
  })
  return (
    <>
      <Form {...form}>
        <form id="touch-point-detail-form" onSubmit={form.handleSubmit(onUpdate)}>
          {/* Section: Main container */}
          <div className="flex lg:flex-row flex-col lg:mb-6 gap-9 w-full mx-auto">
            {/* Section: Left container */}
            <div className="flex-1 flex flex-col gap-6 w-full">
              {/* Section: First left block */}
              <div className="p-6 bg-card rounded-[16px] space-y-3">
                <FormField
                  control={form.control}
                  name="content_value"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="flex gap-2 items-center">
                          <Link2Icon
                            className="w-6 h-6 text-slate-500 leading-[28px]"
                            strokeWidth={1.5}
                          />
                          <h2 className="text-slate-700 text-[18px] font-semibold">
                            {t('touchpoint:form.labels.destination')}
                          </h2>
                        </FormLabel>
                        {isE2eEnabled ? (
                          <Input
                            variant="default"
                            className="bg-neutral-500"
                            disabled
                            value={`li2-e2ee://${touchPoint.privacy_security?.e2e_encryption?.cipher}`}
                          />
                        ) : (
                          <Input
                            {...field}
                            placeholder={t('touchpoint:form.placeholders.destination')}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                ></FormField>

                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <Globe className="w-6 h-6 text-slate-500 leading-[28px]" strokeWidth={1.5} />
                      <h2 className="text-slate-700 text-[18px] font-semibold">
                        {t('touchpoint:form.labels.short_link')}
                      </h2>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="outline-none">
                        <Button
                          size={'sm'}
                          type="button"
                          className="text-slate-500"
                          variant={'tertiary'}
                          iconLeft={<History size={18} />}
                        >
                          {t('touchpoint:form.actions.slug_history')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-background border border-slate-100 rounded-[16px] p-4 w-[404px]"
                      >
                        <Suspense fallback={<SkeletonCard className="h-[100px] w-full" />}>
                          <BackHalfHistory />
                        </Suspense>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <FormItem className="col-span-1">
                      <FormLabel className="flex gap-2 items-center leading-[20px]">
                        {t('touchpoint:form.labels.domain')}
                      </FormLabel>
                      <FormControl>
                        <Input disabled value={parse(touchPoint.short_url).hostname ?? ''} />
                      </FormControl>
                      <FormDescription></FormDescription>
                      <FormMessage />
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="flex gap-2 items-center leading-[20px]">
                            {t('touchpoint:form.labels.back_half')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="py-0 flex items-center pr-0 overflow-hidden"
                              disabled={reachedMaxSlugs}
                              placeholder={t('touchpoint:form.placeholders.back_half')}
                              maxLength={slugMaxLength}
                              {...field}
                              endAdornment={
                                <div className="flex items-center gap-3">
                                  {slugStatusIcon}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger disabled={false}>
                                      <Button
                                        disabled={false}
                                        type="button"
                                        className="px-4 rounded-l-none"
                                        iconLeft={<SparklesIcon />}
                                      >
                                        {t('touchpoint:form.actions.ai_suggested_slugs')}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      sideOffset={20}
                                      className="p-0 w-full md:w-[430px] md:max-w-full max-w-full shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] rounded-[6px] border-none ml-[5%] md:ml-0"
                                    >
                                      <AISlugSuggestion
                                        onSlugSelect={(slug) => {
                                          form.setValue('slug', slug)
                                        }}
                                        url={watchUrl}
                                        touch_point_id={touch_point_id}
                                        defaultSuggestSlugs={touchPoint?.suggested_slugs || []}
                                      />
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              }
                            />
                          </FormControl>
                          {slugStatus === 'taken' && (
                            <FormMessage>{t('common:messages.error.slug_is_taken')}</FormMessage>
                          )}
                          {slugStatus !== 'taken' && (
                            <FormDescription
                              className={cn(reachedMaxSlugs ? 'text-semantic-warning' : '')}
                            >
                              {reachedMaxSlugs
                                ? t('touchpoint:touch_point_edit.slugs.reached_limit_description', {
                                    maxSlugs: orgPlan?.max_slugs_per_tp ?? 0,
                                    planName:
                                      (orgPlan?.name?.charAt(0).toUpperCase() ?? '') +
                                      (orgPlan?.name?.slice(1).toLowerCase() ?? ''),
                                  })
                                : t('touchpoint:form.tooltips.custom_back_half')}
                            </FormDescription>
                          )}
                          {slugStatus !== 'taken' && <FormMessage />}
                        </FormItem>
                      )}
                    />
                    {/* <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex gap-2 items-center leading-[20px]">
                            {t('touchpoint:form.labels.back_half')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('touchpoint:form.placeholders.back_half')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription></FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}
                  </div>
                </div>
              </div>
              {/* Section: Second left block */}
              <div className="p-6 bg-card rounded-[16px] space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="leading-[20px]">
                        {t('touchpoint:form.labels.name')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('touchpoint:form.placeholders.name')} {...field} />
                      </FormControl>
                      <FormDescription></FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="leading-[20px]">
                        {t('touchpoint:form.labels.tags')}
                      </FormLabel>
                      <FormControl>
                        <TagSelect
                          placeholder={t('touchpoint:form.placeholders.tags')}
                          initialValues={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription></FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Collection Field */}
                <div>
                  <FormLabel className="leading-[20px]">
                    {t('collection:field.collection')}
                  </FormLabel>
                  <div className="mt-2 flex items-center justify-between p-3 rounded-md border bg-slate-50">
                    <div className="flex items-center gap-2">
                      {currentCollection ? (
                        <>
                          <FolderOpen
                            className="w-5 h-5"
                            style={{
                              color: currentCollection.color || 'hsl(var(--muted-foreground))',
                            }}
                          />
                          <span className="text-sm font-medium">{currentCollection.name}</span>
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {t('collection:field.no_collection')}
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCollectionDialog(true)}
                      className="h-8"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      {t('common:buttons.change')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section: Conversion Tracking */}
              {!disabledFeatures.ATTRIBUTION && (
                <ConversionTrackingSection
                  control={form.control}
                  hasAccess={hasConversionTracking}
                />
              )}

              {/* Section: Third left block - Advanced Settings */}
              {/* <div className="flex flex-col gap-2">
                <div className="bg-background rounded-[16px] px-6 py-4 flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">Advanced Settings</p>
                  <div className="flex gap-4 items-center">
                    <Button type="button" variant="secondary" size="sm" iconLeft={<ListEnd />}>
                      UTM
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn({ 'border-primary': form.formState.dirtyFields.meta_tags })}
                      size="sm"
                      iconLeft={<ListEnd />}
                      onClick={() => metaTagsFormRef.current?.open()}
                    >
                      Meta tags
                    </Button>
                    <Button type="button" variant="secondary" size="sm" iconLeft={<ListEnd />}>
                      E2E
                    </Button>
                    <Button type="button" variant="secondary" size="sm" iconLeft={<ListEnd />}>
                      Password
                    </Button>
                    <Button
                      className="px-0"
                      type="button"
                      variant="tertiary"
                      size="sm"
                      iconRight={<ChevronRight />}
                    >
                      Manage All Settings
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1 items-center">
                    <UserRound className="w-3 h-3 text-[#5f6d7e]" />
                    <p className="text-xs text-[#5f6d7e] overflow-hidden text-ellipsis">
                      {touchPoint?.profiles?.email}
                    </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <CalendarIcon className="w-3 h-3 text-[#5f6d7e]" />
                    <p className="text-xs text-[#5f6d7e] overflow-hidden text-ellipsis">
                      {dayjs(touchPoint?.created_at).format('LL')}
                    </p>
                  </div>
                </div>
              </div> */}
              {isMobile && (
                <>
                  {/* Section: Right container */}
                  <div className="flex flex-col">
                    <div className="bg-card rounded-[16px] w-full">
                      {!isE2eEnabled && <TouchPointDetailQrSection touchPoint={touchPoint} />}

                      {/* Meta Tag Section */}
                      <div className="flex flex-col gap-4 p-6">
                        <LoadingMask loading={isFetchingMetaTags} size="md">
                          <MetaTagsPreview
                            url={touchPoint.short_url}
                            data={watchMetatags}
                            onEdit={() => {
                              metaTagsFormRef.current?.open()
                            }}
                            canEditTouchpoint={touchPoint.canEdit}
                            destination={watchUrl || touchPoint.content_value}
                          />
                        </LoadingMask>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2 items-center">
                <div className="flex gap-1 items-center">
                  <UserRound className="w-3 h-3 text-[#5f6d7e]" />
                  <p className="text-xs text-[#5f6d7e] overflow-hidden text-ellipsis">
                    {touchPoint?.profiles?.email}
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  <CalendarIcon className="w-3 h-3 text-[#5f6d7e]" />
                  <p className="text-xs text-[#5f6d7e] overflow-hidden text-ellipsis">
                    {dayjs(touchPoint?.created_at).format('LL')}
                  </p>
                </div>
              </div>
              {/* Section: Buttons */}
              {/* <div className="flex gap-4 justify-end">
                <Button variant="secondary" type="button" onClick={handleBack}>
                  {t('buttons.cancel')}
                </Button>
                <LoadingButton isLoading={isUpdating} variant="default" type="submit">
                  {t('buttons.save')}
                </LoadingButton>
              </div> */}
            </div>
            {!isMobile && (
              <>
                {/* Section: Right container */}
                <div className="flex flex-col">
                  <div className="bg-card rounded-[16px] lg:w-[300px]">
                    {!isE2eEnabled && <TouchPointDetailQrSection touchPoint={touchPoint} />}

                    {/* Meta Tag Section */}
                    <div className="flex flex-col gap-4 p-6">
                      <LoadingMask loading={isFetchingMetaTags} size="md">
                        <MetaTagsPreview
                          url={touchPoint.short_url}
                          data={watchMetatags}
                          canEditTouchpoint={touchPoint.canEdit}
                          onEdit={() => {
                            metaTagsFormRef.current?.open()
                          }}
                          destination={watchUrl || touchPoint.content_value}
                        />
                      </LoadingMask>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
      </Form>
      <CustomDialogV2 title={t('touchpoint:form.labels.meta_tags')} size="sm" ref={metaTagsFormRef}>
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            <TouchPointMetaDataFormV2
              defaultValues={watchMetatags}
              short_url={touchPoint?.short_url || ''}
              close={() => setOpen(false)}
              onSubmit={handleSaveMetaTags}
              isEditing={true}
            />
          </Suspense>
        )}
      </CustomDialogV2>

      {/* Move to Collection Dialog */}
      <MoveToCollectionDialog
        open={showCollectionDialog}
        onOpenChange={setShowCollectionDialog}
        touchPointIds={[touch_point_id]}
        currentCollectionId={touchPoint?.collection_id}
        orgId={org_id}
        onSuccess={() => {
          // Refetch the touch point to update the UI
          // The dialog mutations already invalidate the queries
        }}
      />
    </>
  )
})

TouchPointDetailV2.displayName = 'TouchPointDetailV2'
