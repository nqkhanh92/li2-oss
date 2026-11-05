'use client'

import { useMemo } from 'react'
import { CheckIcon } from '@/shared/components/icons/check-icon'
import { OrganizationPlan } from '@/shared/types/plan-permission'
import { CustomCountdown } from '@/shared/components/customize/count-down'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

type OrgPlanProps = {
  orgPlan?: OrganizationPlan
}
export const CurrentOrgPlan = ({ orgPlan }: OrgPlanProps) => {
  const { t, i18n } = useTranslation('setting')
  const router = useRouter()
  const defaultValues = useMemo(() => {
    if (orgPlan) {
      const values = orgPlan as unknown as OrganizationPlan
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
  }, [orgPlan])
  const featuresList = useMemo(() => {
    const customLabels: Record<string, string | ((value: any) => string)> = {
      max_tps_per_month: (value: any) => `${value} ${t('subscription.max_tps_per_month')}`,
      max_tags_per_org: (value: any) => `${value} ${t('subscription.max_tags_per_org')}`,
      max_tags_per_tp: (value: any) => `${value} ${t('subscription.max_tags_per_tp')}`,
      allow_custom_utm_tags: (value: any) =>
        value
          ? t('subscription.allow_custom_utm_tags')
          : t('subscription.no_allow_custom_utm_tags'),
      allow_custom_meta_tags: (value: any) =>
        value
          ? t('subscription.allow_custom_meta_tags')
          : t('subscription.no_allow_custom_meta_tags'),
      max_domains_per_org: (value: any) =>
        Number(value) === 0
          ? t('subscription.no_custom_domain')
          : `${value} ${t('subscription.max_domains_per_org')}`,
      max_slugs_per_tp: (value: any) =>
        Number(value) === 0
          ? t('subscription.no_custom_link_ending')
          : t('subscription.max_slugs_per_tp', { count: value }),
    }

    const acceptedFields = [
      'max_tps_per_month',
      'max_tags_per_org',
      'max_domains_per_org',
      'max_slugs_per_tp',
      'max_tags_per_tp',
    ]

    return Object.entries(defaultValues || {})
      .filter(([key]) => acceptedFields.includes(key))
      .map(([key, value]) => {
        const label = customLabels[key]
        return {
          title:
            typeof label === 'function'
              ? label(value)
              : label ||
                key
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' '),
          value:
            label || typeof value === 'boolean'
              ? ''
              : Array.isArray(value)
                ? value.join(', ')
                : String(value),
        }
      })
      .filter((item) => item.title)
  }, [defaultValues, i18n.language])

  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-4 bg-white rounded-2xl w-full">
          {/* {orgPlan?.expires_at && orgPlan.name.toLowerCase() !== "premium" && (
            <div className="flex flex-col items-start justify-between w-full gap-0">
              <CustomCountdown
                startContent={true}
                expirationDate={orgPlan.expires_at}
                planName={orgPlan.name || ""}
                isPlanningSection={true}
                onButtonClick={() => {
                  router.push("/contact");
                }}
              />
            </div>
          )} */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t('subscription.include_title')}:
            </span>
            <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
              <div className="flex flex-col items-start gap-2 self-stretch">
                {featuresList
                  .sort((a, b) => {
                    const lengthDiff = a.title.length - b.title.length
                    if (lengthDiff !== 0) return lengthDiff
                    return a.value.localeCompare(b.value)
                  })
                  .map((item, index) => (
                    <div key={index} className="flex items-center gap-2 self-stretch">
                      <CheckIcon width={24} height={24} className="w-[24px] h-[24px]" />
                      <span className="text-slate-600 text-base">{item.title}</span>
                      {item.value && <span className="text-slate-600 text-base">{item.value}</span>}
                    </div>
                  ))}
              </div>
            </ul>
          </div>
          {/* <Button
            variant="success"
            type="button"
            // disabled={initialData?.name === "FREE" ? true : false}
            disabled
            className="font-medium text-white rounded-[8px] justify-start items-start gap-[6px] w-fit"
          >
            {orgPlan?.name === "FREE" ? "Upgrade to Premium" : "Upgrade"}
          </Button> */}
        </div>
      </div>
    </div>
  )
}
