'use client'

import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface JourneyStepProps {
  icon: LucideIcon
  label: string
  step: number
}

export function JourneyStep({ icon: Icon, label, step }: JourneyStepProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <ChevronDown className="h-3 w-3" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center justify-center size-4 rounded-full bg-muted text-[10px] font-medium tabular-nums">
            {step}
          </span>
          <Icon className="h-3 w-3" />
          <span className="font-medium uppercase tracking-wider">{label}</span>
        </div>
      </div>
      <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
    </div>
  )
}
