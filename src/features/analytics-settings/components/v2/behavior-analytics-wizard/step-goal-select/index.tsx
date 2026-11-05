'use client'

import { Download, Sparkles, Flame, PlayCircle, ArrowLeft, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import PremiumBadge from '@/features/touch-points/components/PremiumBadge'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export type BehaviorGoal = 'installation' | 'ai_setup' | 'heatmap_guide' | 'session_guide'

interface GoalConfig {
  key: BehaviorGoal
  icon: React.ElementType
  color: string
  bg: string
  enabled: boolean
}

const GOALS: GoalConfig[] = [
  { key: 'installation', icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-50', enabled: true },
  { key: 'ai_setup', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', enabled: true },
  { key: 'heatmap_guide', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', enabled: false },
  { key: 'session_guide', icon: PlayCircle, color: 'text-rose-600', bg: 'bg-rose-50', enabled: false },
]

interface Props {
  onBack: () => void
  onSelect: (goal: BehaviorGoal) => void
}

export function BehaviorGoalSelect({ onBack, onSelect }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const { hasPermission } = useOrganizationStoreProvider()
  const canManageOrg = hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION)

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 sm:h-full">
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {t('goal_select.title')}
        </h1>
        <p className="text-s text-muted-foreground">{t('goal_select.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        {GOALS.map((goal) => {
          const Icon = goal.icon

          if (goal.enabled) {
            const isLocked = goal.key === 'installation' && !canManageOrg

            if (isLocked) {
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
                      {t(`goal_select.goals.${goal.key}.title`)}
                    </span>
                    <span className="text-xs text-muted-foreground leading-4">
                      {t(`goal_select.goals.${goal.key}.description`)}
                    </span>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-1 text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium whitespace-nowrap">{t('common.only_owner')}</span>
                  </div>
                </div>
              )
            }

            return (
              <button
                key={goal.key}
                type="button"
                onClick={() => onSelect(goal.key)}
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
                    {t(`goal_select.goals.${goal.key}.title`)}
                  </span>
                  <span className="text-xs text-muted-foreground leading-4">
                    {t(`goal_select.goals.${goal.key}.description`)}
                  </span>
                </div>
                {goal.key === 'installation' && (
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
                  {t(`goal_select.goals.${goal.key}.title`)}
                </span>
                <span className="text-xs text-muted-foreground leading-4">
                  {t(`goal_select.goals.${goal.key}.description`)}
                </span>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400 whitespace-nowrap">
                {t('common.coming_soon')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
