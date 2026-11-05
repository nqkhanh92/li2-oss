'use client'

import { Skeleton } from '@/shared/components/ui/skeleton'
import { CurrentOrgPlan } from '../planning/current-plan'
import { CurrentOrgUsage } from '../planning/current-usage'
import { OrganizationPlan } from '@/shared/types/plan-permission'
import { OrgQuota } from '@/shared/types/plan-permission'
import { useTranslation } from 'react-i18next'
import { SETTING_SECTIONS } from '../../constants/sections'
import { EmailPreferences } from '../email-preferences'

type Props = {
  orgPlan: OrganizationPlan | null
  orgQuota: OrgQuota | null
}

export const AccountTab = ({ orgPlan, orgQuota }: Props) => {
  const { t } = useTranslation('setting')
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ACCOUNT_PLANNING}>
        <span className="text-lg font-semibold text-foreground">{t('subscription.label')}</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          {orgPlan ? <CurrentOrgPlan orgPlan={orgPlan} /> : <Skeleton className="w-full h-full" />}
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ACCOUNT_USAGE}>
        <span className="text-lg font-semibold text-foreground">{t('subscription.usage')}</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          {orgPlan && orgQuota ? (
            <CurrentOrgUsage currentUsage={orgPlan} orgQuota={orgQuota} />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      </div>
      <div
        className="flex flex-col gap-4 items-start"
        id={SETTING_SECTIONS.ACCOUNT_EMAIL_PREFERENCES}
      >
        <span className="text-lg font-semibold text-foreground">Email preferences</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <EmailPreferences />
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start h-0 md:h-[calc(100svh-60px-52px-222px)]"></div>
    </div>
  )
}
