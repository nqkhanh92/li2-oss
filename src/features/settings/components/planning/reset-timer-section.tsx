import { useTranslation } from 'react-i18next'
import { TimerReset } from 'lucide-react'
import { UsageDetailSection } from './usage-detail-section'
import { DisplayCurrentUsage } from './display-current-usage'

type ResetTimerSectionProps = {
  daysInCurrentMonth: number
  currentDayOfMonth: number
  daysLeftInMonth: number
}

export const ResetTimerSection = ({
  daysInCurrentMonth,
  currentDayOfMonth,
  daysLeftInMonth,
}: ResetTimerSectionProps) => {
  const { t } = useTranslation()

  return (
    <UsageDetailSection
      title={
        <DisplayCurrentUsage
          limit={daysInCurrentMonth}
          usage={currentDayOfMonth}
          title={t('common:text.reset_in_days', { days: daysLeftInMonth })}
          label=""
          icon={<TimerReset className="w-4 h-4" />}
          isShowCounter={false}
          className="font-normal text-slate-500 text-xs"
        />
      }
    />
  )
}
