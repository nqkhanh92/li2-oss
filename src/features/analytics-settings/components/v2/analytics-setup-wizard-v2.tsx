'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { AnalyticsSettings } from '../../hooks/queries'
import { StepTagInstallation } from './step-tag-installation'
import { StepTakeATour } from './step-take-a-tour'
import { SiteUrlProvider, useSiteUrl } from './site-url-context'
import { useTranslation } from 'react-i18next'
import { SmartSetupResults } from '@/features/smart-setup/components/smart-setup-results'

interface Props {
  org_id: string
  settings: AnalyticsSettings
}

function getStorageKey(org_id: string) {
  return `li2-analytics-setup-v2-${org_id}`
}

function loadState(org_id: string): { completedSections: number[] } {
  try {
    const raw = localStorage.getItem(getStorageKey(org_id))
    if (raw) return JSON.parse(raw)
  } catch {}
  return { completedSections: [] }
}

function saveState(org_id: string, completedSections: number[]) {
  try {
    localStorage.setItem(getStorageKey(org_id), JSON.stringify({ completedSections }))
  } catch {}
}

const WizardContent = ({ org_id, settings }: Props) => {
  const { t, i18n } = useTranslation('analytics_settings')
  const { t: tSS } = useTranslation('smart_setup')
  const { siteUrl } = useSiteUrl()

  const SECTIONS = [
    { id: 0, label: t('onboarding.wizard.section_tag_installation') },
    { id: 1, label: tSS('title') },
    { id: 2, label: t('onboarding.wizard.section_take_a_tour') },
  ]

  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())
  const [openSection, setOpenSection] = useState<number | null>(null)
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    const state = loadState(org_id)
    const completed = new Set<number>(state.completedSections)
    setCompletedSections(completed)
    const firstIncomplete = SECTIONS.find((s) => !completed.has(s.id))
    setOpenSection(firstIncomplete?.id ?? SECTIONS[SECTIONS.length - 1].id)
  }, [org_id])

  const markCompleted = (sectionId: number) => {
    const next = new Set([...completedSections, sectionId])
    saveState(org_id, [...next])
    setCompletedSections(next)
    const nextSection = SECTIONS.find((s) => s.id > sectionId && !next.has(s.id))
    const nextId = nextSection?.id ?? null
    setOpenSection(nextId)
    if (nextId !== null) {
      setTimeout(() => {
        const container = document.querySelector('.content-layout-div')
        const el = sectionRefs.current[nextId]
        if (container && el) {
          const containerRect = container.getBoundingClientRect()
          const elRect = el.getBoundingClientRect()
          container.scrollBy({
            top: elRect.top - containerRect.top - 24,
            behavior: 'smooth',
          })
        }
      }, 50)
    }
  }

  const toggleSection = (sectionId: number) => {
    setOpenSection((prev) => {
      const isOpening = prev !== sectionId
      if (isOpening) {
        setTimeout(() => {
          const container = document.querySelector('.content-layout-div')
          const el = sectionRefs.current[sectionId]
          if (container && el) {
            const containerRect = container.getBoundingClientRect()
            const elRect = el.getBoundingClientRect()
            container.scrollBy({
              top: elRect.top - containerRect.top - 24,
              behavior: 'smooth',
            })
          }
        }, 50)
      }
      return isOpening ? sectionId : null
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {SECTIONS.map((section) => {
        const isOpen = openSection === section.id
        const isCompleted = completedSections.has(section.id)

        return (
          <div
            key={section.id}
            ref={(el) => {
              sectionRefs.current[section.id] = el
            }}
            className={cn(
              'scroll-mt-24 rounded-2xl border bg-white transition-all overflow-hidden',
              isOpen ? 'shadow-sm' : ''
            )}
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between p-5 text-left relative"
            >
              <div
                className={cn(
                  'absolute inset-0 pointer-events-none bg-linear-to-br transition-all duration-500',
                  isOpen
                    ? 'from-orange-500/10 via-transparent to-orange-500/5'
                    : 'from-orange-500/5 via-transparent to-transparent'
                )}
              />
              <div className="flex items-center gap-3 relative z-10">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all',
                    isCompleted
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : isOpen
                        ? 'border-orange-500 text-orange-500'
                        : 'border-slate-200 text-slate-400'
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : section.id + 1}
                </div>
                <span className={cn('font-medium', isOpen ? 'text-slate-900' : 'text-slate-600')}>
                  {section.label}
                </span>
                {isCompleted && (
                  <span className="text-xs font-medium text-emerald-600">
                    {t('onboarding.wizard.done_badge')}
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform relative z-10',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Section Content */}
            {isOpen && (
              <div className="border-t px-5 pb-6 pt-5">
                {section.id === 0 && (
                  <StepTagInstallation
                    org_id={org_id}
                    settings={settings}
                    onComplete={() => markCompleted(0)}
                  />
                )}
                {section.id === 1 && (
                  <SmartSetupResults
                    orgId={org_id}
                    initialUrl={siteUrl}
                    locale={i18n.language as 'en' | 'vi'}
                    onComplete={() => markCompleted(1)}
                    onSkip={() => markCompleted(1)}
                  />
                )}
                {section.id === 2 && (
                  <StepTakeATour
                    org_id={org_id}
                    settings={settings}
                    onComplete={() => markCompleted(2)}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export const AnalyticsSetupWizardV2 = ({ org_id, settings }: Props) => (
  <SiteUrlProvider>
    <WizardContent org_id={org_id} settings={settings} />
  </SiteUrlProvider>
)
