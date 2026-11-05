'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { Globe, PencilLine, HelpCircleIcon, PenIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'
import { ImagePlaceholderIcon } from '@/shared/components/icons/image-placeholder-icon'
import { cn } from '@/shared/lib/utils'
import { metaTagsSchema } from '@/shared/schemas/touch-points'
import type { z } from 'zod'

interface MetaPreviewCardProps {
  metaTags?: z.infer<typeof metaTagsSchema>
  shortUrl?: string
  onEditClick: () => void
}

type Platform = 'generic' | 'facebook' | 'twitter' | 'linkedin'

const MetaPreviewCardComponent = ({ metaTags, shortUrl, onEditClick }: MetaPreviewCardProps) => {
  const imageSrc = useMemo(() => {
    if (!metaTags?.image) return null
    return typeof metaTags.image === 'string' ? metaTags.image : URL.createObjectURL(metaTags.image)
  }, [metaTags?.image])

  const title = metaTags?.title
  const description = metaTags?.description
  const domain = shortUrl || 'https://li2.ai'

  const PreviewImage = ({ aspect = '1.91/1' }: { aspect?: string }) =>
    imageSrc ? (
      <div className={`relative w-full bg-slate-100`} style={{ aspectRatio: aspect }}>
        {/* `unoptimized`: ảnh Open Graph của BÊN THỨ BA, lấy từ URL đích khách nhập. Không có lý
            do để server mình proxy và tái mã hoá chúng — để trình duyệt tải thẳng. Và tập host là
            MỞ (đo trên prod: 1.794 link, 174 host, còn phình mỗi khi có link mới), nên bắt chúng
            qua `/_next/image` là buộc `remotePatterns` phải liệt kê cả internet, hoặc ảnh trả 400.
            Xem `next.config.mjs` — danh sách trắng ở đó giữ chặt cho ảnh NỘI BỘ. */}
        <Image src={imageSrc} fill alt="Preview" className="object-cover" sizes="250px" unoptimized />
      </div>
    ) : null

  const EmptyImage = () => (
    <div className="relative w-full aspect-[1.91/1] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <ImagePlaceholderIcon className="w-16 h-16 text-slate-300" />
    </div>
  )

  const platforms: Record<Platform, React.ReactNode> = {
    generic: (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-card">
        {imageSrc ? <PreviewImage /> : <EmptyImage />}
        <div className="p-3 space-y-1.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
            {domain}
          </p>
          <h3
            className={cn(
              'text-s font-semibold text-slate-900 line-clamp-2',
              !title && 'text-slate-400'
            )}
          >
            {title || 'Your title will appear here'}
          </h3>
          <p
            className={cn('text-xs text-slate-600 line-clamp-2', !description && 'text-slate-400')}
          >
            {description || 'Your description will appear here'}
          </p>
        </div>
      </div>
    ),
    facebook: (
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-card shadow-sm">
        {imageSrc && <PreviewImage />}
        <div className="p-3 border-t bg-slate-50">
          <p className="text-xs text-slate-500 uppercase mb-1 truncate">{domain}</p>
          <h3
            className={cn(
              'text-s font-semibold text-slate-900 line-clamp-2',
              !title && 'text-slate-400'
            )}
          >
            {title || 'Your title will appear here'}
          </h3>
          <p
            className={cn(
              'text-xs text-slate-600 line-clamp-1 mt-1',
              !description && 'text-slate-400'
            )}
          >
            {description || 'Your description will appear here'}
          </p>
        </div>
      </div>
    ),
    twitter: (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="flex">
          {imageSrc && (
            <div className="relative w-[110px] h-[110px] bg-slate-100 shrink-0">
              {/* `unoptimized` — cùng lý do như PreviewImage ở trên. */}
              <Image src={imageSrc} fill alt="Preview" className="object-cover" sizes="110px" unoptimized />
            </div>
          )}
          <div className="flex-1 p-3 min-w-0">
            <p className="text-xs text-slate-500 mb-1 truncate">{domain}</p>
            <h3
              className={cn(
                'text-xs font-semibold text-slate-900 line-clamp-2 mb-1',
                !title && 'text-slate-400'
              )}
            >
              {title || 'Your title will appear here'}
            </h3>
            <p
              className={cn(
                'text-xs text-slate-600 line-clamp-2',
                !description && 'text-slate-400'
              )}
            >
              {description || 'Your description'}
            </p>
          </div>
        </div>
      </div>
    ),
    linkedin: (
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-card shadow-sm">
        {imageSrc && <PreviewImage />}
        <div className="p-3">
          <h3
            className={cn(
              'text-xs font-semibold text-slate-900 line-clamp-2',
              !title && 'text-slate-400'
            )}
          >
            {title || 'Your title will appear here'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 truncate">{domain}</p>
        </div>
      </div>
    ),
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-s font-medium text-slate-700">Social Media Preview</span>
        <HelperTooltip
          icon={<HelpCircleIcon className="w-3.5 h-3.5 text-secondary-blue" />}
          description="Preview how your link will appear when shared on social media."
        />
      </div>

      {/* Platform tabs */}
      <Tabs defaultValue="generic" className="w-full">
        <TabsList className="grid grid-cols-4 bg-slate-50 rounded-lg p-1 mb-2">
          <TabsTrigger value="generic" className="rounded-[6px]">
            <Globe className="w-[18px] h-[18px]" />
          </TabsTrigger>
          <TabsTrigger value="facebook" className="rounded-[6px]">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </TabsTrigger>
          <TabsTrigger value="twitter" className="rounded-[6px]">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="rounded-[6px]">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </TabsTrigger>
        </TabsList>

        {(Object.keys(platforms) as Platform[]).map((platform) => (
          <TabsContent key={platform} value={platform} className="mt-0">
            <div className="relative">
              {platforms[platform]}
              <Button
                type="button"
                variant="tertiary"
                size="icon"
                onClick={onEditClick}
                className="w-9 h-9 absolute top-1 right-1 z-20 bg-white! border border-border! rounded-[6px]"
              >
                <PenIcon className="w-4.5 h-4.5 text-primary" />
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export const MetaPreviewCard = React.memo(
  MetaPreviewCardComponent,
  (prev, next) =>
    prev.shortUrl === next.shortUrl &&
    prev.metaTags?.title === next.metaTags?.title &&
    prev.metaTags?.description === next.metaTags?.description &&
    prev.metaTags?.image === next.metaTags?.image
)
