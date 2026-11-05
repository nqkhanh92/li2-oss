import { useTranslation } from 'react-i18next'
import { ShieldAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import dayjs from '@/shared/lib/dayjs'

type Props = {
  threatTypes: string[]
  flaggedAt: string | null
}

export const SafetyFlaggedBanner = ({ threatTypes, flaggedAt }: Props) => {
  const { t } = useTranslation(['common'])

  const threatLabels = threatTypes
    .map((type) => t(`common:safety.threat_types.${type}`, type))
    .join(', ')

  return (
    <Alert variant="destructive" className="mb-4 border-red-300 bg-red-50">
      <ShieldAlertIcon className="h-5 w-5" />
      <AlertTitle className="font-semibold">
        {t('common:safety.flagged_title')}
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-1">
        <p>{t('common:safety.flagged_description', { threats: threatLabels })}</p>
        <p className="text-sm font-medium">{t('common:safety.flagged_frozen_notice')}</p>
        {flaggedAt && (
          <p className="text-xs text-red-500">
            {t('common:safety.flagged_at', { date: dayjs(flaggedAt).format('LL') })}
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
