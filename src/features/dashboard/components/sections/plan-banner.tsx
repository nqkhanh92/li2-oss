'use client'
import { CapaIcon } from '@/shared/components/icons/capa-icon'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useMemo } from 'react'
import { benefitIncludeOrg, PlanId } from '@/shared/constants'
import { Trans, useTranslation } from 'react-i18next'
import { useDayjs } from '@/shared/hooks/use-dayjs'

export const PlanBanner = () => {
  const { orgPlan } = useOrganizationStoreProvider()
  const currentInsight = useMemo(() => {
    return benefitIncludeOrg[orgPlan?.id as PlanId] || benefitIncludeOrg[PlanId.FREE]
  }, [orgPlan?.id])
  const { t } = useTranslation('dashboard')
  const { dayjs } = useDayjs()

  return (
    <div className="flex items-center gap-2 self-stretch rounded-xl py-3 px-6 bg-[linear-gradient(90deg,#DDDFFF_0%,#FFF_94.71%)] dark:bg-[linear-gradient(90deg,oklch(0.25_0.08_265)_0%,oklch(0.18_0_0)_94.71%)]">
      <div className="flex w-6 h-6 justify-center items-center relative">
        <CapaIcon />
      </div>
      <div className="text-foreground font-medium text-sm leading-5 tracking-tight">
        <span className="font-medium text-sm">
          <Trans i18nKey={t(currentInsight?.description)} components={{ br: <br /> }} />
          {orgPlan?.expires_at && <> {dayjs(orgPlan?.expires_at).format('LL')}</>}
        </span>
      </div>
    </div>
  )
}
