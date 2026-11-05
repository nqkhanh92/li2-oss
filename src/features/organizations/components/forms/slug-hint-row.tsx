import React from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { SlugStatus } from '@/features/organizations/hooks/use-organization-slug'

export type HintValidity = 'neutral' | 'valid' | 'invalid'

export function SlugHintRow({
  text,
  validity,
  slugStatus,
}: {
  text: string
  validity?: HintValidity
  slugStatus?: SlugStatus
}) {
  let icon: React.ReactNode
  let textColor: string

  if (slugStatus !== undefined) {
    if (slugStatus === 'checking') {
      icon = <Loader2 className="w-3 h-3 shrink-0 animate-spin text-[#5f6d7e]" />
      textColor = 'text-[#5f6d7e]'
    } else if (slugStatus === 'available') {
      icon = <CheckCircle2 className="w-3 h-3 shrink-0 text-semantic-success" />
      textColor = 'text-semantic-success'
    } else if (slugStatus === 'unavailable') {
      icon = <XCircle className="w-3 h-3 shrink-0 text-semantic-error" />
      textColor = 'text-semantic-error'
    } else {
      icon = <CheckCircle2 className="w-3 h-3 shrink-0 text-[#5f6d7e]" />
      textColor = 'text-[#5f6d7e]'
    }
  } else if (validity === 'valid') {
    icon = <CheckCircle2 className="w-3 h-3 shrink-0 text-semantic-success" />
    textColor = 'text-semantic-success'
  } else if (validity === 'invalid') {
    icon = <XCircle className="w-3 h-3 shrink-0 text-semantic-error" />
    textColor = 'text-semantic-error'
  } else {
    icon = <CheckCircle2 className="w-3 h-3 shrink-0 text-[#5f6d7e]" />
    textColor = 'text-[#5f6d7e]'
  }

  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className={`text-xs leading-4 overflow-hidden text-ellipsis whitespace-nowrap ${textColor}`}>
        {text}
      </span>
    </div>
  )
}
