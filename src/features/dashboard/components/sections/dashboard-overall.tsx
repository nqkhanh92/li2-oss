import { DashboardDataType } from '@/app/api/organizations/[org_id]/dashboard/route'
import {
  AllTouchPointVariants,
  mappingTouchPointVariantInteractions,
} from '@/features/touch-points/types'
import { cn } from '@/shared/lib/utils'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useTranslation } from 'react-i18next'

export const DashboardOverall = ({
  data,
  totalVisits,
}: {
  data: DashboardDataType['typeVisits']
  totalVisits: number
}) => {
  const { orgPlan } = useOrganizationStoreProvider()
  const { t } = useTranslation('dashboard')
  return (
    <div className="flex flex-col gap-4">
      <div className="font-medium text-lg">{t('overall_visits')}</div>
      <div className="flex justify-between gap-12">
        <div className="w-32 lg:w-64 px-4 py-2 border border-slate-400 rounded-xl font-semibold text-[50px] leading-[50px] tracking-[-0.1%] text-center items-center flex justify-center">
          <p>{totalVisits}</p>
        </div>
        <div className="flex gap-6 md:flex-row flex-col grow flex-1 justify-around overflow-x-auto">
          {Object.entries(AllTouchPointVariants).map(([key, value]) => {
            const isAllowed = orgPlan?.allowed_tp_types.includes(value)
            const count = data.find((d) => d.name === value)?.count || 0
            return (
              <LockableSection
                locked={!isAllowed}
                action={() => {}}
                variant="blur"
                lockBy="coming_soon"
                className="w-auto"
                iconEnabled={false}
                key={value}
              >
                <div className="flex flex-col text-center items-center relative">
                  <div className={cn('', !isAllowed && 'blur-[1px]')}>
                    <div className="text-[32px] font-semibold">{count}</div>
                    <div className="font-medium text-slate-500 text-[16px]">
                      {mappingTouchPointVariantInteractions[value]}
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
