/**
 * Mọi `<Image>` hiển thị ảnh meta trong file này mang `unoptimized`, có chủ ý.
 *
 * Đó là ảnh Open Graph của BÊN THỨ BA, lấy tự động từ URL đích mà khách nhập. Hai lý do:
 *
 * 1. Đúng bản chất: không có lý do gì để server mình tải, giải mã và tái mã hoá ảnh của người
 *    khác. Để trình duyệt tải thẳng thì nhanh hơn, và bỏ luôn một đường tấn công — bytes do
 *    người ngoài kiểm soát không còn đi qua `sharp` trong process Next.
 * 2. Tập host là MỞ. Đo trên prod 2026-10-25: 1.794 link có ảnh meta, đến từ **174 host khác
 *    nhau** (supa.li2.ai 517, example.com 312, hi-static.fpt.vn 173, Shopee, Canva, fbcdn,
 *    ytimg…), và còn phình thêm mỗi khi có link mới. Bắt chúng qua `/_next/image` nghĩa là
 *    `remotePatterns` phải liệt kê cả internet — tức quay lại `hostname: '**'`, đúng cái lỗ mà
 *    `9cc16ca2` vừa bịt.
 *
 * Danh sách trắng trong `next.config.mjs` vẫn giữ chặt, nhưng cho ảnh NỘI BỘ (Supabase, QR,
 * avatar, CDN li2) — những thứ ta thật sự muốn tối ưu và có tập host hữu hạn.
 *
 * ⚠ Kiểm hostname của `next/image` là DEV-ONLY (`image-loader.js`, trong
 * `if (process.env.NODE_ENV !== "production")`). Trên production không có lỗi nào được ném —
 * ảnh chỉ đơn giản trả 400 từ `/_next/image`. Nên lớp lỗi này KHÔNG tự lộ ra lúc build hay
 * lúc chạy test; chỉ khách nhìn thấy. Đó là lý do có test giữ `unoptimized`.
 */
import { metaTagsSchema, touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
import { Globe, Facebook, LinkedinIcon, PencilLine } from 'lucide-react'
import { CircleHelp } from 'lucide-react'
import Image from 'next/image'
import { defaultMetaTags } from '@/shared/constants'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { XTwitterIcon } from '@/shared/components/icons/x-twitter-icon'
import { cn } from '@/shared/lib/utils'
import { parse } from 'tldts'
import { useTranslation } from 'react-i18next'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { fetchMetaTags } from '@/app/actions/utilities'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import equal from 'fast-deep-equal'
import { TouchPoint } from '@/core/types/touch-point.type'
import { useParams } from 'next/navigation'
import { useUpdateTouchPoint } from '../../hooks/mutations'
import { usePlanFeatures } from '../../hooks'
import { useQueryClient } from '@tanstack/react-query'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { useFormContext } from 'react-hook-form'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

type DefaultMetaTagsPreviewProps = {
  url: string
  title: string
  description: string
  image: string
}
const DefaultMetaTagsPreview = ({
  url,
  title,
  description,
  image,
}: DefaultMetaTagsPreviewProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-background shadow-sm w-auto max-w-xs">
      {image && (
        <div className="relative w-auto aspect-[1.91/1] bg-slate-100">
          <Image
            src={image}
            fill
            alt="Preview"
            className="object-cover"
            sizes="(max-width: 320px) 100vw, 33vw"
            unoptimized
          />
        </div>
      )}
      <div className="p-3 border-t bg-slate-50">
        <p className="text-xs text-slate-500 uppercase mb-1">{url}</p>
        <h3
          className={cn(
            'text-base font-semibold text-slate-900 line-clamp-2',
            !title && 'text-slate-400'
          )}
        >
          {title || 'Your title will appear here'}
        </h3>
        <p
          className={cn(
            'text-sm text-slate-600 line-clamp-1 mt-1',
            !description && 'text-slate-400'
          )}
        >
          {description || 'Your description will appear here'}
        </p>
      </div>
    </div>
  )
}

const XPreview = ({ url, title, description, image }: DefaultMetaTagsPreviewProps) => {
  const domain = parse(url).domain
  return (
    <div className="h-[100px] border border-slate-200 rounded-2xl overflow-hidden bg-background shadow-sm max-w-xs">
      <div className="flex gap-0">
        {image && (
          <div className="relative w-[100px] h-[100px] bg-slate-100 flex-shrink-0">
            <Image src={image} fill alt="Preview" className="object-cover" sizes="130px" unoptimized />
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          <p className="text-xs text-slate-500 mb-1 truncate">{domain || url}</p>
          <h3
            className={cn(
              'text-sm font-semibold text-slate-900 line-clamp-2 mb-1',
              !title && 'text-slate-400'
            )}
          >
            {title || 'Your title will appear here'}
          </h3>
          <p
            className={cn('text-xs text-slate-600 line-clamp-2', !description && 'text-slate-400')}
          >
            {description || 'Your description'}
          </p>
        </div>
      </div>
    </div>
  )
}
const LinkedinPreview = ({ url, title, description, image }: DefaultMetaTagsPreviewProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-background shadow-sm max-w-xs">
      {image && (
        <div className="relative w-full aspect-[1.91/1] bg-slate-100">
          <Image
            src={image}
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
            !title && 'text-slate-400'
          )}
        >
          {title || 'Your title will appear here'}
        </h3>
        <p className="text-xs text-slate-500 mt-2">{url}</p>
      </div>
    </div>
  )
}
type MetaTagsPreviewProps = {
  data?: z.infer<typeof metaTagsSchema>
  url?: string
  onEdit?: () => void
  destination?: string
  canEditTouchpoint?: boolean
}
type PreviewMode = 'website' | 'x' | 'linkedin' | 'facebook'
const mappingPreviewMode: Record<PreviewMode, { icon: React.FC<any>; preview: React.FC<any> }> = {
  website: {
    icon: Globe,
    preview: DefaultMetaTagsPreview,
  },
  x: {
    icon: XTwitterIcon,
    preview: XPreview,
  },
  linkedin: {
    icon: LinkedinIcon,
    preview: LinkedinPreview,
  },
  facebook: {
    icon: Facebook,
    preview: DefaultMetaTagsPreview,
  },
}

export const MetaTagsPreview = ({
  data,
  url,
  onEdit,
  destination,
  canEditTouchpoint,
}: MetaTagsPreviewProps) => {
  const { t } = useTranslation(['touchpoint'])
  const queryClient = useQueryClient()
  const { touch_point_id, org_id } = useParams<{ touch_point_id: string; org_id: string }>()
  const { setValue } = useFormContext<z.infer<typeof touchPointUpdateSchema>>()
  const { mutateAsync: updateTouchPoint } = useUpdateTouchPoint(org_id, touch_point_id, true)
  const { enableMetaTags } = usePlanFeatures()

  const [transition, startTransition] = useTransition()

  useEffect(() => {
    if (
      enableMetaTags &&
      touch_point_id &&
      destination &&
      (!data || equal(data, defaultMetaTags))
    ) {
      startTransition(async () => {
        const result = await fetchMetaTags(destination)
        const parsedResult = metaTagsSchema.safeParse(result)
        if (parsedResult.success && canEditTouchpoint) {
          const metaTags = {
            enabled: true,
            title: parsedResult.data.title,
            description: parsedResult.data.description,
            image: parsedResult.data.image,
          }
          const result = await updateTouchPoint({
            data: {
              meta_tags: metaTags,
            },
          })
          if (result) {
            setValue('meta_tags', metaTags)
            queryClient.setQueryData(
              ['organizations', org_id, 'touch-points', touch_point_id],
              (pre: any) => {
                return {
                  ...pre,
                  meta_tags: {
                    ...pre.meta_tags,
                    ...metaTags,
                  },
                }
              }
            )
          }
        }
      })
    }
  }, [destination, touch_point_id, canEditTouchpoint])

  const displayUrl = url || 'https://li2.ai/shortlinks'
  const displayTitle = data?.title
  const displayDescription = data?.description
  const displayImage = useMemo(() => {
    if (data?.image && typeof data?.image === 'string') {
      return data?.image
    }
    if (data?.image && data.image instanceof File) {
      return URL.createObjectURL(data.image)
    }
    return defaultMetaTags.image
  }, [data?.image])

  const [previewMode, setPreviewMode] = useState<PreviewMode>('website')
  const PreviewComponent = mappingPreviewMode[previewMode].preview

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-2 items-center">
          <p className="text-[15px] font-semibold text-slate-700 leading-[22px]">
            {t('touchpoint:form.labels.meta_tags')}
          </p>
          <ResponsivePopover content={t('touchpoint:advancedSettings.linkPreview.subtitle')}>
            <Button type="button" variant="ghost" size="icon">
              <CircleHelp size={16} className="text-slate-500" />
            </Button>
          </ResponsivePopover>
        </div>
      </div>

      {/* Social Media Platform Buttons */}
      <div className="flex gap-3">
        <Tabs
          defaultValue={previewMode}
          onValueChange={(value) => setPreviewMode(value as PreviewMode)}
          className="w-full"
        >
          <TabsList className="flex justify-between bg-slate-50">
            {Object.entries(mappingPreviewMode).map(([key, { icon: Icon }]) => (
              <TabsTrigger value={key} key={key} className="rounded-[8px]">
                <Icon className="w-[18px] h-[18px] !text-slate-700" />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* {Object.entries(mappingPreviewMode).map(([key, { icon: Icon }]) => (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={cn('flex-1', previewMode === key && 'border-primary')}
            onClick={() => setPreviewMode(key as PreviewMode)}
          >
            <Icon className="w-[18px] h-[18px]" />
          </Button>
        ))} */}
      </div>

      {/* Meta Tag Preview Card */}
      <div className="relative">
        {transition ? (
          <SkeletonCard bodyParts={3} className="w-full h-[220px] p-0!" />
        ) : (
          <PreviewComponent
            url={displayUrl}
            title={displayTitle}
            description={displayDescription}
            image={displayImage}
          />
        )}
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          onClick={onEdit}
          className="absolute top-2 right-2 bg-slate-100"
        >
          <PencilLine className="w-[18px] h-[18px]" />
        </Button>
      </div>
    </div>
  )
}
