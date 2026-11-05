import { useTranslation } from 'react-i18next'
import { UsageDetailSection } from './usage-detail-section'
import { DisplayCurrentUsage } from './display-current-usage'
import { AlertUsageMaximum } from './alert-usage'
import { Progress } from '@/shared/components/ui/progress'
import Link from 'next/link'

type UsageQuotaItemProps = {
  title: string
  icon?: React.ReactNode
  usage: number
  label?: string
  limit: number
  moduleKey: string // i18n module key like "domain", "members"
  isShowCounter?: boolean
  isShowAlert?: boolean
  isShowProgress?: boolean
  extra?: React.ReactNode
  planName?: string
}

const statusColor = (percent: number) => {
  if (percent < 50) return 'bg-green-600'
  if (percent < 80) return 'bg-yellow-500'
  return 'bg-red-600'
}

const getUsagePercent = (used: number, max: number) =>
  max === 0 ? 0 : Math.round((used / max) * 100)

export const UsageQuotaItem = ({
  title,
  icon,
  usage,
  limit,
  moduleKey,
  label = '',
  isShowCounter = true,
  isShowAlert = true,
  isShowProgress = true,
  extra,
  planName,
}: UsageQuotaItemProps) => {
  const percent = getUsagePercent(usage, limit)
  const color = statusColor(percent)
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 bg-white h-full justify-between">
      <div className="flex flex-col gap-3">
        <UsageDetailSection
          title={
            <DisplayCurrentUsage
              limit={limit}
              usage={usage}
              title={title}
              icon={icon}
              isShowCounter={isShowCounter}
              label={label}
            />
          }
          progress={
            isShowProgress && (
              <Progress value={percent} className="h-2 bg-slate-100 rounded-full" progressClassName={color} />
            )
          }
          alert={
            percent >= 100 &&
            isShowAlert && (
              <AlertUsageMaximum
                text={t('common:form.maximum_alert.maximum_field_reached', {
                  field: t(`common:module.${moduleKey}`),
                })}
                linkCta={t('common:cta.upgrade_plan')}
              />
            )
          }
        />
        {limit <= 1 && (
          <span className="text-slate-500 text-xs">
            {t('common:form.not_available.not_available', {
              plan: planName,
            })}
            <Link
              href="https://li2.ai/pricing"
              className="text-primary font-medium hover:underline ml-1"
            >
              {t('common:cta.upgrade_plan')}
            </Link>
          </span>
        )}
      </div>
      {extra}
    </div>
  )
}
