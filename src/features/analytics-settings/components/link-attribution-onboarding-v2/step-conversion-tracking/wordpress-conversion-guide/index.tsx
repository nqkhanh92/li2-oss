'use client'

import { useState } from 'react'
import { Check, ArrowLeft, PartyPopper } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'
import { StepInstallPlugin } from './step-install-plugin'
import { StepConfigureAndSetup } from './step-configure-and-setup'
import { StepVerifyInstallation } from './step-verify-installation'
import { StepCreateShortLink } from './step-create-short-link'
import { StepTestConversion } from './step-test-conversion'

interface Props {
  org_id: string
  onBack: () => void
  onComplete: () => void
}

const SECTIONS = [
  { id: 0, label: 'Install Plugin' },
  { id: 1, label: 'Configure & Setup' },
  { id: 2, label: 'Verify Installation' },
  { id: 3, label: 'Create Short Link' },
  { id: 4, label: 'Test Tracking' },
]

export function WordPressConversionGuide({ org_id, onBack, onComplete }: Props) {
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())
  const [activeSection, setActiveSection] = useState<number>(0)
  const [selectedConversions, setSelectedConversions] = useState<Set<string>>(
    new Set(['registration', 'checkout'])
  )
  const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null)

  const allDone = completedSections.size === SECTIONS.length

  const markCompleted = (id: number) => {
    setCompletedSections((prev) => new Set([...prev, id]))
    const next = SECTIONS.find((s) => s.id > id && !completedSections.has(s.id))
    if (next) setActiveSection(next.id)
  }

  return (
    <div className="flex flex-col gap-6 px-12 py-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          WordPress Conversion Tracking
        </h1>
        <p className="text-s text-muted-foreground">
          Follow the steps below to start tracking conversions on your WordPress site.
        </p>
      </div>

      {/* Two-column stepper */}
      <div className="flex gap-8 min-h-0 rounded-xl border border-border bg-card overflow-hidden p-6 relative">
        {/* Confetti + completion overlay */}
        {allDone && (
          <>
            <ConfettiCanvas bursts={10} perBurst={15} interval={160} />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-card/90 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-semantic-success/10">
                  <PartyPopper className="h-8 w-8 text-semantic-success" />
                </div>
                <h2 className="text-xl font-semibold text-primary">All set!</h2>
                <p className="text-s text-muted-foreground max-w-xs">
                  Your WordPress site is now connected to Li2 conversion tracking.
                </p>
              </div>
              <Button onClick={onComplete}>Done</Button>
            </div>
          </>
        )}

        {/* Left: step list */}
        <div className="flex flex-col w-52 shrink-0 pt-1">
          {SECTIONS.map((section, index) => {
            const isActive = activeSection === section.id
            const isCompleted = completedSections.has(section.id)
            const isLast = index === SECTIONS.length - 1

            return (
              <div key={section.id} className="flex flex-col">
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 -mx-3 transition-colors text-left',
                    isActive && 'bg-primary/[0.05]'
                  )}
                >
                  {/* Circle */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all',
                      isCompleted
                        ? 'border-semantic-success bg-semantic-success text-white'
                        : isActive
                          ? 'border-primary bg-white text-primary'
                          : 'border-slate-200 bg-white text-slate-400'
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : section.id + 1}
                  </div>

                  {/* Label */}
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isActive
                          ? 'text-primary'
                          : isCompleted
                            ? 'text-semantic-success'
                            : 'text-slate-400'
                      )}
                    >
                      {section.label}
                    </p>
                    {isCompleted && (
                      <p className="text-xs font-medium text-semantic-success mt-0.5">Done</p>
                    )}
                    {isActive && !isCompleted && (
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">
                        In progress
                      </p>
                    )}
                  </div>
                </button>

                {/* Connector */}
                {!isLast && (
                  <div
                    className={cn(
                      'w-px self-start ml-[1.125rem] my-1 min-h-6 transition-colors',
                      isCompleted ? 'bg-semantic-success' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-px bg-border shrink-0" />

        {/* Right: content */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-3 pb-2">
          {activeSection === 0 && <StepInstallPlugin onComplete={() => markCompleted(0)} />}
          {activeSection === 1 && (
            <StepConfigureAndSetup
              org_id={org_id}
              selected={selectedConversions}
              onSelectedChange={setSelectedConversions}
              onComplete={() => markCompleted(1)}
            />
          )}
          {activeSection === 2 && (
            <StepVerifyInstallation
              org_id={org_id}
              selectedConversions={selectedConversions}
              onComplete={() => markCompleted(2)}
            />
          )}
          {activeSection === 3 && (
            <StepCreateShortLink
              org_id={org_id}
              onComplete={(url) => {
                setCreatedShortUrl(url)
                markCompleted(3)
              }}
            />
          )}
          {activeSection === 4 && (
            <StepTestConversion
              org_id={org_id}
              selectedConversions={selectedConversions}
              shortUrl={createdShortUrl}
              onComplete={() => markCompleted(4)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
