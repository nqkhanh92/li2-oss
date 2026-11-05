'use client'

import { Globe, QrCode, Target, Map, Users, ArrowLeft, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import PremiumBadge from '@/features/touch-points/components/PremiumBadge'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export type LinkAttributionGoal =
  | 'setup_domain'
  | 'create_touchpoint'
  | 'track_conversions'
  | 'link_journey'
  | 'customer_profiles'

interface GoalConfig {
  key: LinkAttributionGoal
  icon: React.ElementType
  color: string
  bg: string
}

const GOALS: GoalConfig[] = [
  { key: 'setup_domain', icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'create_touchpoint', icon: QrCode, color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'track_conversions', icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
  { key: 'link_journey', icon: Map, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'customer_profiles', icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
]

const ENABLED_GOALS: Set<LinkAttributionGoal> = new Set(['track_conversions', 'create_touchpoint', 'setup_domain'])
const PERMISSION_REQUIRED_GOALS: Set<LinkAttributionGoal> = new Set(['setup_domain', 'track_conversions'])

interface Props {
  onBack: () => void
  onSelect: (goal: LinkAttributionGoal) => void
}

export function GoalSelectStep({ onBack, onSelect }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { orgRouterPush, hasPermission } = useOrganizationStoreProvider()
  const { enableConversionTracking } = usePlanFeatures()
  const canManageOrg = hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION)

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 w-full sm:h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('v2.common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('v2.goal_select.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('v2.goal_select.subtitle')}</p>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        {[...GOALS]
          .sort((a, b) => (ENABLED_GOALS.has(b.key) ? 1 : 0) - (ENABLED_GOALS.has(a.key) ? 1 : 0))
          .map((goal) => {
            const Icon = goal.icon
            const enabled = ENABLED_GOALS.has(goal.key)

            if (enabled) {
              const needsPermission = PERMISSION_REQUIRED_GOALS.has(goal.key) && !canManageOrg

              if (needsPermission) {
                return (
                  <div
                    key={goal.key}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
                      'opacity-50 cursor-not-allowed select-none'
                    )}
                  >
                    <div className={cn('mt-0.5 rounded-lg p-2 shrink-0', goal.bg, goal.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground leading-5">
                        {t(`v2.goal_select.goals.${goal.key}.title`)}
                      </span>
                      <span className="text-xs text-muted-foreground leading-4">
                        {t(`v2.goal_select.goals.${goal.key}.description`)}
                      </span>
                    </div>
                    <div className="ml-auto shrink-0 flex items-center gap-1 text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium whitespace-nowrap">{t('v2.common.only_owner')}</span>
                    </div>
                  </div>
                )
              }

              const handleClick = () => {
                if (goal.key === 'create_touchpoint') return orgRouterPush('short-links/create')
                if (goal.key === 'track_conversions' && !enableConversionTracking)
                  return orgRouterPush('conversions')
                return onSelect(goal.key)
              }

              return (
                <button
                  key={goal.key}
                  type="button"
                  onClick={handleClick}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left',
                    'transition-all duration-150 hover:border-primary/30 hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                  )}
                >
                  <div className={cn('mt-0.5 rounded-lg p-2 shrink-0', goal.bg, goal.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground leading-5">
                      {t(`v2.goal_select.goals.${goal.key}.title`)}
                    </span>
                    <span className="text-xs text-muted-foreground leading-4">
                      {t(`v2.goal_select.goals.${goal.key}.description`)}
                    </span>
                  </div>
                  {goal.key === 'track_conversions' && (
                    <div className="ml-auto shrink-0">
                      <PremiumBadge />
                    </div>
                  )}
                </button>
              )
            }

            return (
              <div
                key={goal.key}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
                  'opacity-50 cursor-not-allowed select-none'
                )}
              >
                <div className={cn('mt-0.5 rounded-lg p-2 shrink-0', goal.bg, goal.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground leading-5">
                    {t(`v2.goal_select.goals.${goal.key}.title`)}
                  </span>
                  <span className="text-xs text-muted-foreground leading-4">
                    {t(`v2.goal_select.goals.${goal.key}.description`)}
                  </span>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                  {t('v2.common.coming_soon')}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
