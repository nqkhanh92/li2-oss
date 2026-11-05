'use client'

import { AlertTriangle, RotateCw, SearchX, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

/**
 * Hai trạng thái KHÔNG phải "chưa có gì": lỗi tải, và lọc không khớp.
 *
 * Trước đây cả ba tình huống dùng chung `ShortLinkEmptyState`. Hậu quả đo được: ép endpoint trả
 * 500 kéo dài thì một org có **61 hàng** hiện ra màn "Chưa có link rút gọn nào" kèm nút "Tạo link
 * đầu tiên" — sản phẩm nói với chủ sở hữu rằng họ chưa có gì, đúng lúc máy chủ hỏng. Không dấu
 * hiệu nào phân biệt với rỗng thật.
 *
 * Nên hai nhánh này CỐ Ý không dùng lại hình minh hoạ của trạng thái rỗng: hình đó vẽ một danh
 * sách đầy ("1.2k · 843 · 327") để mời người ta tạo cái đầu tiên. Vẽ nó khi máy chủ lỗi là nói sai
 * lần thứ hai bằng hình.
 *
 * Mỗi nhánh có một hành động dẫn ra khỏi chỗ đang kẹt: thử lại, hoặc xoá bộ lọc.
 */
export type ShortLinkListStatusVariant = 'error' | 'no_match'

interface ShortLinkListStatusProps {
  variant: ShortLinkListStatusVariant
  onRetry?: () => void
  onClearFilters?: () => void
}

export function ShortLinkListStatus({
  variant,
  onRetry,
  onClearFilters,
}: ShortLinkListStatusProps) {
  const { t } = useTranslation('touchpoint')
  const isError = variant === 'error'

  const Icon = isError ? AlertTriangle : SearchX

  return (
    <div
      data-testid={`short-link-list-${variant}`}
      role={isError ? 'alert' : 'status'}
      className="flex flex-col items-center gap-3 px-6 py-14 text-center"
    >
      <span
        className={
          isError
            ? 'flex size-11 items-center justify-center rounded-full bg-semantic-error/10 text-semantic-error'
            : 'flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500'
        }
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <h2 className="text-base font-semibold text-foreground">
        {t(`touchpoint:merged_list.status.${variant}.title`)}
      </h2>
      <p className="max-w-sm text-s leading-relaxed text-slate-500">
        {t(`touchpoint:merged_list.status.${variant}.description`)}
      </p>

      {isError ? (
        <Button variant="secondary" iconLeft={<RotateCw className="size-4" />} onClick={onRetry}>
          {t('touchpoint:merged_list.status.error.retry')}
        </Button>
      ) : (
        <Button variant="secondary" iconLeft={<X className="size-4" />} onClick={onClearFilters}>
          {t('touchpoint:merged_list.status.no_match.clear')}
        </Button>
      )}
    </div>
  )
}
