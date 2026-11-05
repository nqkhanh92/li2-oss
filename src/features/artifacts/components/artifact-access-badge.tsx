'use client'

import { useTranslation } from 'react-i18next'

import type { ArtifactAccessMode } from '@/core/types/artifact.type'
import { cn } from '@/shared/lib/utils'

import { getArtifactAccessView } from '../utils/artifact-access'

/**
 * Badge nhỏ cho chế độ xem (spec M2.3). Công khai → KHÔNG badge: đó là mặc định của mọi link và một
 * badge "Công khai" trên mọi thẻ là một badge không ai đọc. Ba chế độ kia dùng cùng class xám với badge
 * kind cạnh nó — badge trạng thái đã mang màu ngữ nghĩa, màu thứ hai là màu thừa.
 */
export const ArtifactAccessBadge = ({
  mode,
  className,
}: {
  mode: ArtifactAccessMode | (string & {})
  className?: string
}) => {
  const { t } = useTranslation(['artifact'])
  if (mode === 'public') return null

  const { Icon, labelKey } = getArtifactAccessView(mode)
  return (
    <span
      data-testid="artifact-access-badge"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal leading-4 text-slate-500',
        className
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {labelKey ? t(labelKey) : mode}
    </span>
  )
}
