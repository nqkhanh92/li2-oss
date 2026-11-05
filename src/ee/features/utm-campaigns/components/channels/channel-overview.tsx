import { useTranslation } from 'react-i18next'
import { Eye, UserRound, TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  totalVisits: number
  totalUniqueVisits?: number
}

export const ChannelOverview = ({ totalVisits, totalUniqueVisits }: Props) => {
  const { t } = useTranslation(['analytic', 'dashboard'])

  // Calculate percentage change (placeholder logic - you may need to pass previous values)
  const totalChange = 0 // Replace with actual calculation
  const uniqueChange = 0 // Replace with actual calculation

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <p className="font-medium text-lg text-foreground">
          {t('dashboard:performance_overview.label', 'Performance Overview')}
        </p>
      </div>
      <div className="flex flex-col md:flex-row flex-wrap lg:flex-nowrap gap-4 items-start md:items-center w-full">
        {/* Total Visits */}
        <div className="flex gap-4 h-[60px] items-center pr-4 flex-1">
          <div className="bg-slate-50 flex gap-1 items-center justify-center rounded-lg shrink-0 size-[60px]">
            <Eye className="size-[32px] text-foreground stroke-[1.5]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-normal text-base leading-6 text-slate-500 text-nowrap">
              {t('dashboard:performance_overview.total')}
            </p>
            <div className="flex gap-1 items-end">
              <p className="font-medium text-2xl leading-none text-slate-700">
                {totalVisits.toLocaleString()}
              </p>
              {totalChange !== 0 && (
                <div className="flex gap-1 items-center">
                  <p
                    className={`font-normal text-sm leading-5 ${
                      totalChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {totalChange > 0 ? '+' : ''}
                    {totalChange}%
                  </p>
                  {totalChange > 0 ? (
                    <TrendingUp className="size-3 text-green-600" />
                  ) : (
                    <TrendingDown className="size-3 text-red-600" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unique Visits */}
        {totalUniqueVisits !== undefined && (
          <div className="flex gap-4 h-[60px] items-center pr-4 flex-1">
            <div className="bg-slate-50 flex gap-1 items-center justify-center rounded-lg shrink-0 size-[60px]">
              <UserRound className="size-[32px] text-secondary-purple stroke-[1.5]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-normal text-base leading-6 text-slate-500 text-nowrap">
                {t('dashboard:performance_overview.unique')}
              </p>
              <div className="flex gap-1 items-end">
                <p className="font-medium text-2xl leading-none text-slate-700">
                  {totalUniqueVisits.toLocaleString()}
                </p>
                {uniqueChange !== 0 && (
                  <div className="flex gap-1 items-center">
                    <p
                      className={`font-normal text-sm leading-5 ${
                        uniqueChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {uniqueChange > 0 ? '+' : ''}
                      {uniqueChange}%
                    </p>
                    {uniqueChange > 0 ? (
                      <TrendingUp className="size-3 text-green-600" />
                    ) : (
                      <TrendingDown className="size-3 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
