import { useTranslation } from 'react-i18next'
import { OrgQuota } from '@/shared/types/plan-permission'
import { OrganizationPlan } from '@/shared/types/plan-permission'
import { UsageQuotaItem } from './usage-quota-item'
import { ResetTimerSection } from './reset-timer-section'
import type { QuotaItemConfig } from './quota-items-config'

type QuotaItemRendererProps = {
  config: QuotaItemConfig
  maxValues: Record<string, any> | undefined
  orgQuota?: OrgQuota
  aiCredits?: { ai_credits_used_this_month?: number }
  daysInCurrentMonth: number
  currentDayOfMonth: number
  daysLeftInMonth: number
}

export const QuotaItemRenderer = ({
  config,
  maxValues,
  orgQuota,
  aiCredits,
  daysInCurrentMonth,
  currentDayOfMonth,
  daysLeftInMonth,
}: QuotaItemRendererProps) => {
  const { t } = useTranslation()

  // Get usage value based on config
  const getUsageValue = (): number => {
    if (config.usageKey === 'ai_credits_used_this_month') {
      return aiCredits?.ai_credits_used_this_month || 0
    }
    return (orgQuota?.[config.usageKey as keyof OrgQuota] as number) || 0
  }

  // Get limit value based on config
  const getLimitValue = (): number => {
    return (maxValues?.[config.limitKey] as number) || 0
  }

  const usage = getUsageValue()
  const limit = getLimitValue()

  // Determine isShowProgress
  const getShowProgress = (): boolean => {
    if (typeof config.isShowProgress === 'function') {
      return config.isShowProgress(limit)
    }
    return config.isShowProgress ?? true
  }

  return (
    <UsageQuotaItem
      title={t(config.titleKey)}
      icon={config.icon}
      usage={usage}
      limit={limit}
      moduleKey={config.moduleKey}
      isShowProgress={getShowProgress()}
      isShowAlert={config.isShowAlert ?? true}
      isShowCounter={config.isShowCounter ?? true}
      planName={maxValues?.name}
      extra={
        config.hasResetTimer ? (
          <ResetTimerSection
            daysInCurrentMonth={daysInCurrentMonth}
            currentDayOfMonth={currentDayOfMonth}
            daysLeftInMonth={daysLeftInMonth}
          />
        ) : undefined
      }
    />
  )
}
