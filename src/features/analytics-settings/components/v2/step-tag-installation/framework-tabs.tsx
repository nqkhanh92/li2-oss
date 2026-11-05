'use client'

import { cn } from '@/shared/lib/utils'

export type Framework = 'html' | 'react' | 'wordpress'

const TABS: { id: Framework; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'react', label: 'React' },
  { id: 'wordpress', label: 'WordPress' },
]

interface Props {
  value: Framework
  onChange: (fw: Framework) => void
}

export const FrameworkTabs = ({ value, onChange }: Props) => {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            value === tab.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
