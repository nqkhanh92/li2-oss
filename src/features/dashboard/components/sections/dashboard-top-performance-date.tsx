import { DashboardDataType } from '@/app/api/organizations/[org_id]/dashboard/route'
import dayjs from '@/shared/lib/dayjs'
import { useTranslation } from 'react-i18next'

export const DashboardTopPerformanceDate = ({
  data,
}: {
  data: DashboardDataType['topPerformingDates']
}) => {
  const { t } = useTranslation('analytic')
  const topPerformingDate = data?.[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center w-full">
          <p className="font-medium text-lg leading-[26px] text-foreground">
            {t('top_performance')}
          </p>
        </div>
      </div>
      <div className="flex gap-2 items-center w-full">
        <p className="font-medium text-2xl leading-none text-slate-700">
          {topPerformingDate?.count?.toLocaleString() || 0}
        </p>
        <div className="flex flex-col gap-1 items-start justify-center">
          <p className="font-semibold text-lg leading-[26px] text-foreground">
            {t('common:form.click_scan')}
          </p>
          {topPerformingDate && (
            <p className="font-normal text-base leading-6 text-slate-500">
              {dayjs(topPerformingDate?.name).format('MMM DD, YYYY')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
