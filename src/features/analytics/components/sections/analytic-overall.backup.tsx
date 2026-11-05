import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import {
  AllTouchPointVariants,
  mappingTouchPointVariantInteractions,
} from '@/shared/types/touch-point'
import { cn } from '@/shared/lib/utils'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/shared/components/ui/separator'

export const AnalyticOverall = ({
  data,
  totalVisits,
  totalUniqueVisits,
  showComingSoon = false,
}: {
  data: AnalyticByTagDataType['types']
  totalVisits: number
  totalUniqueVisits?: number
  showComingSoon?: boolean
}) => {
  const { orgPlan } = useOrganizationStoreProvider()
  const { t } = useTranslation(['analytic', 'dashboard'])
  return (
    <div className="flex flex-col gap-4">
      <div className="font-medium text-lg">{t('overall_visits')}</div>
      <div className="flex justify-between gap-4 md:gap-12">
        <div className="flex-col lg:flex-row min-w-32 lg:min-w-64 px-4 py-2 border border-slate-400 rounded-xl font-semibold text-[50px] leading-[50px] tracking-[-0.1%] text-center items-center flex justify-evenly gap-2">
          <div className="flex flex-col">
            <p className="font-medium text-slate-500 text-[16px]">
              {t('dashboard:performance_overview.total')}
            </p>
            <p>{totalVisits}</p>
          </div>
          {totalUniqueVisits != undefined && (
            <>
              <Separator orientation="vertical" className="hidden lg:block" />
              <Separator orientation="horizontal" className="block lg:hidden" />
              <div className="flex flex-col">
                <p className="font-medium text-slate-500 text-[16px]">
                  {t('dashboard:performance_overview.unique')}
                </p>
                <p>{totalUniqueVisits}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center flex-col md:flex-row gap-6 grow flex-1 justify-around overflow-x-auto">
          {Object.entries(AllTouchPointVariants)?.map(([key, value]) => {
            const isAllowed = orgPlan?.allowed_tp_types?.includes(value)
            const count = data.find((d) => d.name === value)?.count || 0

            if (!showComingSoon && !isAllowed) {
              return null
            }

            return (
              <LockableSection
                locked={showComingSoon && !isAllowed}
                variant="blur"
                lockBy="coming_soon"
                className="w-auto items-center"
                itemClassName="flex items-center"
                iconEnabled={false}
                lockText={t('common:text.coming_soon')}
                key={value + '_' + key}
              >
                <div className="flex flex-col text-center items-center relative">
                  <div className={cn('')}>
                    <div className="text-[32px] font-semibold">{count}</div>
                    <div className="font-medium text-slate-500 text-[16px]">
                      {t(mappingTouchPointVariantInteractions[value]) || '0'}
                    </div>
                  </div>
                </div>
              </LockableSection>
            )
          })}
        </div>
      </div>
    </div>
  )
}
