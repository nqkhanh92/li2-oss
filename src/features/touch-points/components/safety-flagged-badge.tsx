import { useTranslation } from 'react-i18next'
import { ShieldAlertIcon } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'

export const SafetyFlaggedBadge = () => {
  const { t } = useTranslation('common')

  return (
    <Badge
      variant="outline"
      className="bg-red-50 text-red-700 border-red-200 text-[11px] py-0 px-1.5 gap-1 font-medium shrink-0"
    >
      <ShieldAlertIcon className="w-3 h-3" />
      {t('common:safety.flagged_badge')}
    </Badge>
  )
}
