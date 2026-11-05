'use client'

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, RotateCcw, Send, ShieldQuestion, Upload } from 'lucide-react'

import type { ArtifactStatus } from '@/core/types/artifact.type'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { cn } from '@/shared/lib/utils'

import { getArtifactStatusView, type ArtifactActionKind } from '../utils/artifact-status'

const ACTION_ICON: Record<ArtifactActionKind, React.ElementType> = {
  publish: Send,
  reupload: Upload,
  republish: RotateCcw,
  appeal: ShieldQuestion,
  replace: RefreshCw,
}

interface ArtifactPrimaryActionProps {
  status: ArtifactStatus | (string & {})
  onPublish: () => void
  /** `blocked` cần tải lên file khác — chỉ là điều hướng, không cần endpoint mới. */
  onReupload: () => void
  /** `live`: mở hộp thoại Cập nhật nội dung (wave 3). */
  onReplace: () => void
  isPending?: boolean
  className?: string
  size?: 'sm' | 'default'
}

/**
 * Prototype có hành vi thật cho `publish` và `reupload`. Hai mã còn lại (`republish`,
 * `appeal`) chưa có endpoint nên nút vẫn hiện — ẩn đi thì người ở `expired`/`quarantined`
 * không biết phải làm gì — nhưng bị khoá kèm một dòng chữ nói vì sao, ngay dưới nút và
 * nối bằng `aria-describedby` chứ không giấu trong tooltip.
 */
export const ArtifactPrimaryAction = ({
  status,
  onPublish,
  onReupload,
  onReplace,
  isPending,
  className,
  size = 'default',
}: ArtifactPrimaryActionProps) => {
  const { t } = useTranslation('artifact')
  const reasonId = useId()
  const { action } = getArtifactStatusView(status)
  if (!action) return null

  const Icon = ACTION_ICON[action.kind]
  const handler =
    action.kind === 'publish'
      ? onPublish
      : action.kind === 'reupload'
        ? onReupload
        : action.kind === 'replace'
          ? onReplace
          : null

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <LoadingButton
        type="button"
        size={size}
        isLoading={isPending}
        disabled={!handler}
        aria-describedby={handler ? undefined : reasonId}
        iconLeft={<Icon />}
        onClick={handler ?? undefined}
      >
        {t(action.labelKey)}
      </LoadingButton>
      {!handler && (
        <p id={reasonId} className="text-s text-slate-500">
          {t('actions.not_available_yet')}
        </p>
      )}
    </div>
  )
}
