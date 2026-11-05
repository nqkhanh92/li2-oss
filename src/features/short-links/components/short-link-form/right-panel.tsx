'use client'

import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { cn } from '@/shared/lib/utils'
import { QrPreviewCard } from './qr-preview-card'
import { MetaPreviewCard } from './meta-preview-card'
import type { metaTagsSchema } from '@/shared/schemas/touch-points'
import type { z } from 'zod'

interface ShortLinkRightPanelProps {
  qrOptions: any
  metaTags?: z.infer<typeof metaTagsSchema>
  shortUrl?: string
  isFetchingMetaTags?: boolean
  onQrOptionsUpdate?: (qrOptions: any, qrLogo?: string | File) => void
  onMetaTagsEditClick?: () => void
  className?: string
  isEditMode?: boolean
}

export const ShortLinkRightPanel = ({
  qrOptions,
  metaTags,
  shortUrl,
  isFetchingMetaTags,
  onQrOptionsUpdate,
  onMetaTagsEditClick,
  className,
  isEditMode,
}: ShortLinkRightPanelProps) => {
  return (
    <div className={cn('flex flex-col gap-6 p-6', className)}>
      {/* QR Code Section */}
      <QrPreviewCard
        qrOptions={qrOptions}
        onQrOptionsUpdate={onQrOptionsUpdate}
        isEditMode={isEditMode}
      />

      {/* Social Media Preview Section */}
      <LoadingMask className="w-full" loading={!!isFetchingMetaTags}>
        <MetaPreviewCard
          metaTags={metaTags}
          shortUrl={shortUrl}
          onEditClick={() => onMetaTagsEditClick?.()}
        />
      </LoadingMask>
    </div>
  )
}
