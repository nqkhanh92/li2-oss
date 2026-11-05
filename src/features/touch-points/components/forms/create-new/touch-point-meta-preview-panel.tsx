'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { Eye, Pencil, Globe, PencilLine, HelpCircleIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { metaTagsSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { ImagePlaceholderIcon } from '@/shared/components/icons/image-placeholder-icon'
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'

interface TouchPointMetaPreviewPanelProps {
  metaTags?: z.infer<typeof metaTagsSchema>
  shortUrl?: string
  onEditClick: () => void
}

const TouchPointMetaPreviewPanelComponent = ({
  metaTags,
  shortUrl,
  onEditClick,
}: TouchPointMetaPreviewPanelProps) => {
  const { t } = useTranslation('advanced_custom')

  const watchImage = useMemo(() => metaTags?.image, [metaTags?.image])
  const watchTitle = useMemo(() => metaTags?.title, [metaTags?.title])
  const watchDescription = useMemo(() => metaTags?.description, [metaTags?.description])

  const imageSrc = useMemo(() => {
    if (!watchImage) return null
    return typeof watchImage === 'string' ? watchImage : URL.createObjectURL(watchImage)
  }, [watchImage])

  const demoDomain = t('touchpoint:advancedSettings.linkPreview.tabs.defaultDomain')

  // Platform preview component for reusability
  const PlatformPreview = ({
    platform,
    className = '',
  }: {
    platform: 'facebook' | 'twitter' | 'linkedin' | 'generic'
    className?: string
  }) => {
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
                sizes="(max-width: 320px) 100vw, 33vw"
                unoptimized
              />
            </div>
          )}
          <div className="p-3 border-t bg-slate-50">
            <p className="text-xs text-slate-500 uppercase mb-1">{shortUrl || demoDomain}</p>
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
              <p className="text-xs text-slate-500 mb-1 truncate">{shortUrl || demoDomain}</p>
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
                sizes="(max-width: 320px) 100vw, 33vw"
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
            <p className="text-xs text-slate-500 mt-2">{shortUrl || demoDomain}</p>
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
                sizes="(max-width: 320px) 100vw, 33vw"
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
              {shortUrl || demoDomain}
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

  return (
    <div className="p-6 flex flex-col gap-4 h-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {/* <Eye className="w-4 h-4" /> */}
          <span>
            {t('touchpoint:advancedSettings.linkPreview.tabs.label')}
            <HelperTooltip
              icon={
                <HelpCircleIcon className="w-4 h-4 text-secondary-blue inline align-middle ml-1" />
              }
              description={t('touchpoint:touch_point_edit.advanced_form.meta_tags.helper')}
            />
          </span>
        </div>
      </div>
      {/* Preview Tabs */}
      <div className="flex flex-1 flex-col min-h-0">
        <Tabs defaultValue="generic" className="flex flex-col flex-1">
          <TabsList className="grid grid-cols-4 mb-4 flex-shrink-0 bg-slate-50">
            <TabsTrigger
              value="generic"
              className="flex items-center gap-1.5 text-xs sm:text-sm rounded-[8px]"
            >
              <Globe className="w-[18px] h-[18px] !text-slate-700" />
              {/* {t('touchpoint:advancedSettings.linkPreview.tabs.items.general')} */}
            </TabsTrigger>
            <TabsTrigger
              value="facebook"
              className="flex items-center gap-1.5 text-xs sm:text-sm rounded-[8px]"
            >
              <svg
                className="w-[18px] h-[18px] !text-slate-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </TabsTrigger>
            <TabsTrigger
              value="twitter"
              className="flex items-center gap-1.5 text-xs sm:text-sm rounded-[8px]"
            >
              <svg
                className="w-[18px] h-[18px] !text-slate-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </TabsTrigger>
            <TabsTrigger
              value="linkedin"
              className="flex items-center gap-1.5 text-xs sm:text-sm rounded-[8px]"
            >
              <svg
                className="w-[18px] h-[18px] !text-slate-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generic" className="mt-0 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="relative">
                <PlatformPreview platform="generic" className="min-w-full" />
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  onClick={onEditClick}
                  className="absolute top-2 right-2 bg-white!"
                >
                  <PencilLine className="w-[18px] h-[18px]" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="facebook" className="mt-0 min-w-0 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="relative">
                <PlatformPreview platform="facebook" className="min-w-full" />
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  onClick={onEditClick}
                  className="absolute top-2 right-2 bg-white!"
                >
                  <PencilLine className="w-[18px] h-[18px]" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="twitter" className="mt-0 min-w-0 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="relative">
                <PlatformPreview platform="twitter" className="min-w-full" />
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  onClick={onEditClick}
                  className="absolute top-2 right-2 bg-white!"
                >
                  <PencilLine className="w-[18px] h-[18px]" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="linkedin" className="mt-0 min-w-0 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="relative">
                <PlatformPreview platform="linkedin" className="min-w-full" />
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  onClick={onEditClick}
                  className="absolute top-2 right-2 bg-white!"
                >
                  <PencilLine className="w-[18px] h-[18px]" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Memoize the component with custom comparison
export const TouchPointMetaPreviewPanel = React.memo(
  TouchPointMetaPreviewPanelComponent,
  (prevProps, nextProps) => {
    // Only re-render if these specific values change
    return (
      prevProps.shortUrl === nextProps.shortUrl &&
      prevProps.metaTags?.title === nextProps.metaTags?.title &&
      prevProps.metaTags?.description === nextProps.metaTags?.description &&
      prevProps.metaTags?.image === nextProps.metaTags?.image
    )
  }
)
