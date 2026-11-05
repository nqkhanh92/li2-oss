'use client'

import { useMemo } from 'react'
import { OrganizationPlan } from '@/shared/types/plan-permission'
import { OrgQuota } from '@/shared/types/plan-permission'
import { useTranslation } from 'react-i18next'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useGetOrganizationAICredits } from '@/features/organizations/hooks/queries/org-credit'
import { QUOTA_ITEMS_CONFIG } from './quota-items-config'
import { QuotaItemRenderer } from './quota-item-renderer'

const MONTHLY_IDS = new Set(['touchpoint', 'ai_credits', 'pageviews', 'session_recordings'])

const monthlyItems = QUOTA_ITEMS_CONFIG.filter((c) => MONTHLY_IDS.has(c.id))
const totalItems = QUOTA_ITEMS_CONFIG.filter((c) => !MONTHLY_IDS.has(c.id))

type CurrentUsageProps = {
  currentUsage?: OrganizationPlan
  orgQuota?: OrgQuota
}

export const CurrentOrgUsage = ({ currentUsage, orgQuota }: CurrentUsageProps) => {
  const maxValues = useMemo(() => {
    if (currentUsage) {
      const values = currentUsage as unknown as OrganizationPlan
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
  }, [currentUsage])
  const { t } = useTranslation(['setting', 'layout'])
  const currentDate = new Date()
  // 1. Total number of days in the current month
  const daysInCurrentMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    []
  )
  const currentDayOfMonth = useMemo(() => currentDate.getDate(), [])
  const daysLeftInMonth = useMemo(() => daysInCurrentMonth - currentDayOfMonth, [])

  const { organization } = useOrganizationStoreProvider()
  const { data: aiCredits } = useGetOrganizationAICredits(organization?.id || '')

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-4 bg-white rounded-2xl w-full shadow-none">
          <span className="text-base font-semibold text-foreground">
            {t('subscription.usage_details')}
          </span>

          {/* Monthly quotas */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-500">
              {t('subscription.section_monthly')}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {monthlyItems.map((config) => (
                <QuotaItemRenderer
                  key={config.id}
                  config={config}
                  maxValues={maxValues}
                  orgQuota={orgQuota}
                  aiCredits={aiCredits}
                  daysInCurrentMonth={daysInCurrentMonth}
                  currentDayOfMonth={currentDayOfMonth}
                  daysLeftInMonth={daysLeftInMonth}
                />
              ))}
            </div>
          </div>

          {/* Total / org limits */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-500">
              {t('subscription.section_total')}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {totalItems.map((config) => (
                <QuotaItemRenderer
                  key={config.id}
                  config={config}
                  maxValues={maxValues}
                  orgQuota={orgQuota}
                  aiCredits={aiCredits}
                  daysInCurrentMonth={daysInCurrentMonth}
                  currentDayOfMonth={currentDayOfMonth}
                  daysLeftInMonth={daysLeftInMonth}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
