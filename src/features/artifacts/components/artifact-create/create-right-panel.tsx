'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Options } from 'qr-code-styling'

import type { ArtifactAccessMode } from '@/core/types/artifact.type'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { QrPreviewCard } from '@/features/short-links/components/short-link-form/qr-preview-card'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { cn } from '@/shared/lib/utils'

import { ViewerOutcomeCard } from './viewer-outcome-card'

interface ArtifactCreateRightPanelProps {
  slug: string
  accessMode: ArtifactAccessMode
  className?: string
}

/**
 * Cột phải: mã QR dựng từ đường dẫn đang gõ, rồi khối "người xem gặp gì" đổi theo chế độ.
 *
 * QR hiện TRƯỚC khi xuất bản vì nó cho thấy đường dẫn đang gõ sẽ thành cái gì — nhưng hai nút tải
 * / sao chép **khoá** (`isEditMode={false}`): chưa xuất bản thì chưa có link ngắn, và một ảnh QR
 * tải về trước đó trỏ vào hư không là thứ người ta đem đi in.
 *
 * `hideCustomize` vì artifact không lưu `qr_customize_options` riêng — cùng lý do như trang chi tiết.
 */
export const ArtifactCreateRightPanel = ({
  slug,
  accessMode,
  className,
}: ArtifactCreateRightPanelProps) => {
  const { t } = useTranslation(['artifact'])

  const base = (process.env.NEXT_PUBLIC_SHORT_LINK_URL ?? '').replace(/\/+$/, '')
  const previewUrl = slug ? `${base}/${slug}` : base
  const qrOptions = useMemo<Options>(() => getQrDefaultOptions(previewUrl), [previewUrl])

  return (
    <div className={cn('flex flex-col gap-6 p-6', className)}>
      <div className="flex flex-col gap-2">
        <TooltipProvider delayDuration={200}>
          <QrPreviewCard
            qrOptions={qrOptions}
            isEditMode={false}
            hideCustomize
            lockedTooltip={t('artifact:create.qr.publish_first')}
          />
        </TooltipProvider>
        {previewUrl && (
          <p className="truncate text-center text-xs text-slate-500" title={previewUrl}>
            {previewUrl.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>

      <ViewerOutcomeCard mode={accessMode} />
    </div>
  )
}
