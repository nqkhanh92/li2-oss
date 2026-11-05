'use client'

import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Checkbox } from '@/shared/components/ui/checkbox'

interface AudienceEmailFilterProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * "Chỉ khách có email" — bắt buộc, không phải tuỳ chọn trang trí.
 *
 * Mỗi `fp` mới sinh ra một hàng thiết bị, và `fp` đổi mỗi lần người ta xoá cookie hay đổi máy.
 * Nên trên prod số hàng thiết bị sẽ lớn hơn số người có email nhiều lần, và bảng thành vô dụng
 * sau vài tháng nếu không lọc được xuống những người ta biết là ai.
 */
export function AudienceEmailFilter({ checked, onCheckedChange }: AudienceEmailFilterProps) {
  const { t } = useTranslation('customers')

  return (
    <label
      className={cn(
        'flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer transition-colors select-none',
        checked
          ? 'border-primary/40 bg-primary/5 text-foreground'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="text-sm whitespace-nowrap">
        {t('filters.email_only', 'Chỉ khách có email')}
      </span>
    </label>
  )
}
