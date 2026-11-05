'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Target,
  GitBranch,
  MousePointer2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { AnalyticsSettings } from '../../../hooks/queries'
import { ConversionSetupGuide } from './conversion-setup-guide'
import { HeatmapSetupGuide } from './heatmap-setup-guide'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { useTranslation } from 'react-i18next'

type GuideId = 'conversion' | 'funnel' | 'heatmap'

interface TourCard {
  id: GuideId
  icon: React.ElementType
  title: string
  description: string
}

function getTourStorageKey(org_id: string) {
  return `li2-tour-guides-${org_id}`
}

function loadCompletedGuides(org_id: string): Set<GuideId> {
  try {
    const raw = localStorage.getItem(getTourStorageKey(org_id))
    if (raw) return new Set<GuideId>(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveCompletedGuides(org_id: string, guides: Set<GuideId>) {
  try {
    localStorage.setItem(getTourStorageKey(org_id), JSON.stringify([...guides]))
  } catch {}
}

interface Props {
  org_id: string
  settings: AnalyticsSettings
  onComplete: () => void
}

export const StepTakeATour = ({ org_id, settings, onComplete }: Props) => {
  const { t } = useTranslation('analytics_settings')
  const [activeGuide, setActiveGuide] = useState<GuideId | null>(null)
  const [completedGuides, setCompletedGuides] = useState<Set<GuideId>>(new Set())
  const org_slug = useOrganizationStore((s) => s.organization?.org_slug)

  const TOUR_CARDS: TourCard[] = [
    // {
    //   id: 'conversion',
    //   icon: Target,
    //   title: t('onboarding.tour.conversion_title'),
    //   description: t('onboarding.tour.conversion_desc'),
    // },
    {
      id: 'funnel',
      icon: GitBranch,
      title: t('onboarding.tour.funnel_title'),
      description: t('onboarding.tour.funnel_desc'),
    },
    {
      id: 'heatmap',
      icon: MousePointer2,
      title: t('onboarding.tour.heatmap_title'),
      description: t('onboarding.tour.heatmap_desc'),
    },
  ]

  useEffect(() => {
    setCompletedGuides(loadCompletedGuides(org_id))
  }, [org_id])

  const activeCard = TOUR_CARDS.find((c) => c.id === activeGuide)

  const markDone = (id: GuideId) => {
    setCompletedGuides((prev) => {
      const next = new Set([...prev, id])
      saveCompletedGuides(org_id, next)
      if (next.size === TOUR_CARDS.length) {
        onComplete()
      }
      return next
    })
    setActiveGuide(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t('onboarding.tour.title')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('onboarding.tour.subtitle')}</p>
      </div>

      {activeGuide === null ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TOUR_CARDS.map((card) => {
              const Icon = card.icon
              const isFunnel = card.id === 'funnel'
              const done = completedGuides.has(card.id)
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveGuide(card.id)}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 text-left transition-all',
                    done
                      ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                      : 'border-slate-200 hover:border-orange-400/50 hover:bg-orange-500/5 hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      done ? 'bg-emerald-100' : 'bg-orange-500/10'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Icon className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('font-medium', done ? 'text-emerald-800' : 'text-foreground')}
                      >
                        {card.title}
                      </span>
                      {isFunnel && !done && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                          {t('onboarding.tour.coming_soon')}
                        </span>
                      )}
                      {done && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {t('onboarding.tour.done_badge')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{card.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={onComplete} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              {t('onboarding.tour.done_exploring')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 w-fit">
            <button
              onClick={() => setActiveGuide(null)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('onboarding.tour.title')}
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-foreground">{activeCard?.title}</span>
          </div>

          {activeGuide === 'conversion' && (
            <ConversionSetupGuide org_id={org_id} allowedHostnames={settings.allowed_hostnames} />
          )}

          {activeGuide === 'funnel' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <Sparkles className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">
                  {t('onboarding.tour.funnel_coming_title')}
                </p>
                <p className="text-sm text-slate-500 max-w-xs">
                  {t('onboarding.tour.funnel_coming_desc')}
                </p>
              </div>
              {org_slug && (
                <a
                  href={`/org/${org_slug}/funnels`}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('onboarding.tour.explore_funnels')}
                </a>
              )}
            </div>
          )}

          {activeGuide === 'heatmap' && <HeatmapSetupGuide org_id={org_id} />}

          <div className="flex justify-end">
            <Button onClick={() => markDone(activeGuide)} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              {t('onboarding.tour.done_exploring')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
