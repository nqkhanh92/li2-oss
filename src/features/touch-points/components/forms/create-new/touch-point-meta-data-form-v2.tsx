'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Textarea } from '@/shared/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { allowedMetaTagImageFormat, metaTagsSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import Image from 'next/image'
import { ImagePlaceholderIcon } from '@/shared/components/icons/image-placeholder-icon'
import { defaultMetaTags } from '@/shared/constants'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import UploadFileWithoutArray from '@/shared/components/customize/upload-file-no-array'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Eye, Globe } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import equal from 'fast-deep-equal'
import { fetchMetaTags } from '@/app/actions/utilities'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { usePathname } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Input } from '@/shared/components/ui/input'
type TouchPointMetaDataFormV2Props = {
  short_url?: string
  close: () => void
  defaultValues?: z.infer<typeof metaTagsSchema>
  onSubmit: (values: z.infer<typeof metaTagsSchema>) => void
  destination?: string
  showPreview?: boolean
  isEditing?: boolean
}

// Character limits based on social media best practices
const META_LIMITS = {
  title: { optimal: 60, max: 70 },
  description: { optimal: 155, max: 160 },
}

const getCharacterStatus = (length: number, optimal: number, max: number) => {
  if (length === 0) return { status: 'empty', color: 'text-slate-400' }
  if (length <= optimal) return { status: 'good', color: 'text-green-600' }
  if (length <= max) return { status: 'warning', color: 'text-amber-600' }
  return { status: 'error', color: 'text-red-600' }
}

export const TouchPointMetaDataFormV2 = ({
  short_url,
  close,
  defaultValues,
  onSubmit,
  destination,
  showPreview = false,
  isEditing = false,
}: TouchPointMetaDataFormV2Props) => {
  const { orgPlan } = useOrganizationStoreProvider()

  const form = useForm<z.infer<typeof metaTagsSchema>>({
    defaultValues: defaultValues ?? defaultMetaTags,
    resolver: zodResolver(metaTagsSchema),
  })

  const [isLoadingMetaTags, setIsLoadingMetaTags] = useState(false)
  const { enableMetaTags } = usePlanFeatures()
  useEffect(() => {
    if (enableMetaTags && equal(form.getValues(), defaultMetaTags) && destination) {
      setIsLoadingMetaTags(true)
      fetchMetaTags(destination)
        .then((result) => {
          if (result) {
            const parsed = metaTagsSchema.safeParse(result)
            if (parsed.success) {
              form.setValue('title', parsed.data.title)
              form.setValue('description', parsed.data.description)
              form.setValue('image', parsed.data.image)
            }
          }
        })
        .finally(() => setIsLoadingMetaTags(false))
    }
  }, [enableMetaTags, destination]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirtyFields = Object.keys(form.formState.dirtyFields).length
  useEffect(() => {
    if (dirtyFields > 0) {
      form.setValue('enabled', true)
    }
  }, [dirtyFields, form])

  const { t } = useTranslation('advanced_custom')
  const watchImage = form.watch('image')
  const watchTitle = form.watch('title')
  const watchDescription = form.watch('description')

  const titleStatus = useMemo(
    () =>
      getCharacterStatus(watchTitle?.length || 0, META_LIMITS.title.optimal, META_LIMITS.title.max),
    [watchTitle]
  )

  const descriptionStatus = useMemo(
    () =>
      getCharacterStatus(
        watchDescription?.length || 0,
        META_LIMITS.description.optimal,
        META_LIMITS.description.max
      ),
    [watchDescription]
  )

  const imageSrc = useMemo(() => {
    if (!watchImage) return null
    const src = typeof watchImage === 'string' ? watchImage : URL.createObjectURL(watchImage)
    return src
  }, [watchImage])

  // const [compareModalOpen, setCompareModalOpen] = useState(false)

  // Platform preview component for reusability
  const PlatformPreview = ({
    platform,
    demoDomain,
    className = '',
  }: {
    platform: 'facebook' | 'twitter' | 'linkedin' | 'generic'
    demoDomain?: string
    className?: string
  }) => {
    // const platformIcons = {
    //   facebook: (
    //     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    //       <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    //     </svg>
    //   ),
    //   twitter: (
    //     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    //       <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    //     </svg>
    //   ),
    //   linkedin: (
    //     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    //       <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    //     </svg>
    //   ),
    //   generic: <Globe className="w-5 h-5" />
    // }

    if (!demoDomain) demoDomain = t('touchpoint:advancedSettings.linkPreview.tabs.defaultDomain')

    const content = {
      facebook: (
        <div
          className={cn(
            'border border-slate-200 rounded-lg overflow-hidden bg-background shadow-sm w-auto max-w-xs',
            className
          )}
        >
          {imageSrc && (
            <div className="relative w-auto aspect-[1.91/1] bg-slate-100">
              <Image
                src={imageSrc}
                fill
                alt="Preview"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
              />
            </div>
          )}
          <div className="p-3 border-t bg-slate-50">
            <p className="text-xs text-slate-500 uppercase mb-1">{short_url || demoDomain}</p>
            <h3
              className={cn(
                'text-base font-semibold text-slate-900 line-clamp-2',
                !watchTitle && 'text-slate-400'
              )}
            >
              {watchTitle || 'Your title will appear here'}
            </h3>
            <p
              className={cn(
                'text-sm text-slate-600 line-clamp-1 mt-1',
                !watchDescription && 'text-slate-400'
              )}
            >
              {watchDescription || 'Your description will appear here'}
            </p>
          </div>
        </div>
      ),
      twitter: (
        <div
          className={cn(
            'border border-slate-200 rounded-2xl overflow-hidden bg-background shadow-sm max-w-xs',
            className
          )}
        >
          <div className="flex gap-0">
            {imageSrc && (
              <div className="relative w-[130px] h-[129px] bg-slate-100 flex-shrink-0">
                <Image src={imageSrc} fill alt="Preview" className="object-cover" sizes="130px" unoptimized />
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <p className="text-xs text-slate-500 mb-1 truncate">{short_url || demoDomain}</p>
              <h3
                className={cn(
                  'text-sm font-semibold text-slate-900 line-clamp-2 mb-1',
                  !watchTitle && 'text-slate-400'
                )}
              >
                {watchTitle || 'Your title will appear here'}
              </h3>
              <p
                className={cn(
                  'text-xs text-slate-600 line-clamp-2',
                  !watchDescription && 'text-slate-400'
                )}
              >
                {watchDescription || 'Your description'}
              </p>
            </div>
          </div>
        </div>
      ),
      linkedin: (
        <div
          className={cn(
            'border border-slate-200 rounded-lg overflow-hidden bg-background shadow-sm max-w-xs',
            className
          )}
        >
          {imageSrc && (
            <div className="relative w-full aspect-[1.91/1] bg-slate-100">
              <Image
                src={imageSrc}
                fill
                alt="Preview"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
              />
            </div>
          )}
          <div className="p-3">
            <h3
              className={cn(
                'text-sm font-semibold text-slate-900 line-clamp-2',
                !watchTitle && 'text-slate-400'
              )}
            >
              {watchTitle || 'Your title will appear here'}
            </h3>
            <p className="text-xs text-slate-500 mt-2">{short_url || demoDomain}</p>
          </div>
        </div>
      ),
      generic: (
        <div
          className={cn(
            'border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-background max-w-xs',
            className
          )}
        >
          {imageSrc ? (
            <div className="relative w-full aspect-[1.91/1] bg-gradient-to-br from-slate-50 to-slate-100">
              <Image
                src={imageSrc}
                fill
                alt="Social media preview"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
              />
            </div>
          ) : (
            <div className="relative w-full aspect-[1.91/1] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
              <ImagePlaceholderIcon className="w-24 h-24 text-slate-300" />
            </div>
          )}
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
              {short_url || demoDomain}
            </p>
            <h3
              className={cn(
                'text-base font-semibold text-slate-900 line-clamp-2 min-h-[3rem]',
                !watchTitle && 'text-slate-400'
              )}
            >
              {watchTitle || 'Your title will appear here'}
            </h3>
            <p
              className={cn(
                'text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]',
                !watchDescription && 'text-slate-400'
              )}
            >
              {watchDescription || 'Your description will appear here'}
            </p>
          </div>
        </div>
      ),
    }

    return content[platform]
  }
  const randomString = useMemo(() => {
    return Math.random().toString(36).slice(2, 7)
  }, [])

  if (isLoadingMetaTags) {
    return (
      <div className="flex flex-col md:flex-row gap-6">
        <SkeletonCard bodyParts={5} className="h-[460px] w-full" />
        <SkeletonCard bodyParts={5} className="h-[460px] w-full" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 md:gap-6">
          <div className={cn('flex flex-col gap-4 md:gap-6', showPreview && 'lg:flex-row')}>
            {/* Form Section */}
            <LockableSection
              className={showPreview ? 'flex-1' : 'w-full'}
              lockBy="plan"
              locked={!orgPlan?.allow_custom_meta_tags}
            >
              <div className="flex flex-col gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <UploadFileWithoutArray
                        key={field.value?.toString()}
                        label={t('touchpoint:advancedSettings.linkPreview.fields.image.label')}
                        size="default"
                        mode="temp"
                        variant="dropzone"
                        accept={allowedMetaTagImageFormat.join(',')}
                        description="Recommend 1200 x 628 (1.91:1 ratio)"
                        defaultValue={field.value}
                        onUpload={(url) => {
                          form.setValue('image', url ?? undefined, { shouldDirty: true })
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-semibold">
                          {t('touchpoint:advancedSettings.linkPreview.fields.title.label')}
                        </FormLabel>
                        <span className={cn('text-xs font-medium', titleStatus.color)}>
                          {field.value?.length || 0}/{META_LIMITS.title.optimal}
                          {titleStatus.status === 'good' && (
                            <CheckCircle2 className="inline-block w-3 h-3 ml-1" />
                          )}
                          {titleStatus.status === 'warning' && (
                            <AlertCircle className="inline-block w-3 h-3 ml-1" />
                          )}
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          maxLength={META_LIMITS.title.optimal}
                          placeholder={t(
                            'touchpoint:advancedSettings.linkPreview.fields.title.placeholder'
                          )}
                          className={cn(
                            'resize-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-slate-400',
                            titleStatus.status === 'warning' &&
                              'border-amber-300 focus-visible:ring-amber-400',
                            titleStatus.status === 'error' &&
                              'border-red-300 focus-visible:ring-red-400'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('touchpoint:advancedSettings.linkPreview.notes.titleOptimal', {
                          chars: META_LIMITS.title.optimal,
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-semibold">
                          {t('touchpoint:advancedSettings.linkPreview.fields.desc.label')}
                        </FormLabel>
                        <span className={cn('text-xs font-medium', descriptionStatus.color)}>
                          {field.value?.length || 0}/{META_LIMITS.description.optimal}
                          {descriptionStatus.status === 'good' && (
                            <CheckCircle2 className="inline-block w-3 h-3 ml-1" />
                          )}
                          {descriptionStatus.status === 'warning' && (
                            <AlertCircle className="inline-block w-3 h-3 ml-1" />
                          )}
                        </span>
                      </div>
                      <FormControl>
                        <Textarea
                          rows={2}
                          maxLength={META_LIMITS.description.optimal}
                          placeholder={t(
                            'touchpoint:advancedSettings.linkPreview.fields.desc.placeholder'
                          )}
                          className={cn(
                            'resize-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-slate-400',
                            descriptionStatus.status === 'warning' &&
                              'border-amber-300 focus-visible:ring-amber-400',
                            descriptionStatus.status === 'error' &&
                              'border-red-300 focus-visible:ring-red-400'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('touchpoint:advancedSettings.linkPreview.notes.descOptimal', {
                          chars: META_LIMITS.description.optimal,
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isEditing && (
                  <Alert variant={'warning'}>
                    <AlertTitle>{t('common:text.warning')}</AlertTitle>
                    <AlertDescription>
                      {t('touchpoint:touch_point_edit.advanced_form.meta_tags.update_note')}
                    </AlertDescription>
                    <span className="font-semibold italic text-xs text-slate-700">
                      {`${short_url}?v=${randomString}`}
                    </span>
                  </Alert>
                )}
              </div>
            </LockableSection>

            {/* Preview Section - Hidden on Mobile */}
            {showPreview && (
              <div className="hidden lg:flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Eye className="w-4 h-4" />
                    {t('touchpoint:advancedSettings.linkPreview.tabs.label')}
                  </div>
                </div>

                <div className="flex flex-1 flex-col">
                  <Tabs defaultValue="generic" className="">
                    <TabsList className="grid grid-cols-4 mb-4">
                      <TabsTrigger
                        value="generic"
                        className="flex items-center gap-1.5 text-xs sm:text-sm"
                      >
                        <Globe className="w-4 h-4" />
                        {t('touchpoint:advancedSettings.linkPreview.tabs.items.general')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="facebook"
                        className="flex items-center gap-1.5 text-xs sm:text-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </TabsTrigger>
                      <TabsTrigger
                        value="twitter"
                        className="flex items-center gap-1.5 text-xs sm:text-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </TabsTrigger>
                      <TabsTrigger
                        value="linkedin"
                        className="flex items-center gap-1.5 text-xs sm:text-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="generic" className="mt-0">
                      <div className="overflow-auto max-h-[500px]">
                        <PlatformPreview platform="generic" className="max-w-full" />
                      </div>
                    </TabsContent>

                    <TabsContent value="facebook" className="mt-0 min-w-0">
                      <div className="overflow-auto max-h-[500px]">
                        <PlatformPreview platform="facebook" className="max-w-full" />
                      </div>
                    </TabsContent>

                    <TabsContent value="twitter" className="mt-0 min-w-0">
                      <div className="overflow-auto max-h-[500px]">
                        <PlatformPreview platform="twitter" className="max-w-full" />
                      </div>
                    </TabsContent>

                    <TabsContent value="linkedin" className="mt-0 min-w-0">
                      <div className="overflow-auto max-h-[500px]">
                        <PlatformPreview platform="linkedin" className="max-w-full" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 md:gap-4 justify-end items-center pt-4 border-t flex-shrink-0">
            <Button type="button" variant="ghost" onClick={close} className="text-sm md:text-base">
              {t('touchpoint:advancedSettings.linkPreview.actions.discard')}
            </Button>
            <LoadingButton type="submit" className="text-sm md:text-base">
              {t('touchpoint:advancedSettings.linkPreview.actions.apply')}
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
