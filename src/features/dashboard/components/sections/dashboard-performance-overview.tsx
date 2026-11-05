import { Eye, UserRound, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import CountUp from '@/shared/components/animation/count-up'
import { useTranslation } from 'react-i18next'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { Button } from '@/shared/components/ui/button'
import React from 'react'

interface MetricItemProps {
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  label: string
  value: number
  tooltipContent?: string
}

const MetricItem = ({ icon: Icon, iconClassName, label, value, tooltipContent }: MetricItemProps) => {
  return (
    <div className="flex flex-1 gap-4 items-center pr-4 last:pr-0">
      <div className="bg-slate-50 rounded-lg flex items-center justify-center shrink-0 size-10">
        <Icon className={`size-7 ${iconClassName ?? 'text-slate-500'}`} />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-base text-slate-500 leading-6">{label}</span>
          {tooltipContent && (
            <ResponsivePopover content={<p>{tooltipContent}</p>} align="start" side="top">
              <Button variant="ghost" size="icon" className="rounded-full size-5">
                <Info className="size-4 text-slate-400" />
              </Button>
            </ResponsivePopover>
          )}
        </div>
        <CountUp
          from={0}
          to={value}
          separator=","
          direction="up"
          duration={0.5}
          className="text-xl font-medium text-slate-700 leading-7"
        />
      </div>
    </div>
  )
}

export const DashboardPerformanceOverview = ({
  totalVisits,
  totalUniqueVisits,
  totalVisitWoWPercent,
  totalUniqueVisitWoWPercent,
}: {
  totalVisits: number
  totalUniqueVisits: number
  totalVisitWoWPercent: number
  totalUniqueVisitWoWPercent: number
}) => {
  const { t } = useTranslation('dashboard')
  return (
    <Card className="w-full bg-card border border-slate-300 rounded-2xl flex flex-col">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-medium text-slate-700">
          {t('performance_overview.label')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex items-center">
        <div className="flex gap-4 w-full">
          <MetricItem
            icon={Eye}
            iconClassName="text-secondary-blue"
            label={t('performance_overview.total')}
            value={totalVisits}
            tooltipContent={t('performance_overview.tooltip.total')}
          />
          <MetricItem
            icon={UserRound}
            iconClassName="text-secondary-orange"
            label={t('performance_overview.unique')}
            value={totalUniqueVisits}
            tooltipContent={t('performance_overview.tooltip.unique')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
