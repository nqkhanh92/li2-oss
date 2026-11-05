'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/shared/lib/utils'

interface CodeTab {
  label: string
  code: string
}

interface CodeBlockProps {
  section: string
  description?: string
  actions?: React.ReactNode
  // Single mode
  title?: string
  code?: string
  // Multi-tab mode
  tabs?: CodeTab[]
}

export const CodeBlock = ({ title, code, tabs, description, actions }: CodeBlockProps) => {
  const { t } = useTranslation('analytics_settings')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const isTabbed = tabs && tabs.length > 0
  const activeCode = isTabbed ? tabs[activeTab].code : (code ?? '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeCode)
    setCopied(true)
    toast.success(t('snippet.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center bg-slate-100 border-b border-slate-200 min-h-[36px]">
        {/* Traffic lights */}
        <div className="flex items-center gap-1 px-3 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>

        {isTabbed ? (
          /* Terminal-style tabs */
          <div className="flex items-end self-stretch flex-1 min-w-0 overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-3 h-full text-xs whitespace-nowrap border-r border-slate-200 transition-colors',
                  i === activeTab
                    ? 'bg-[#1e1e1e] text-slate-200 font-medium'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
          </div>
        ) : (
          /* Single title */
          <div className="flex-1 min-w-0 px-1">
            <span className="text-xs font-medium text-slate-500 truncate block">{title}</span>
            {description && (
              <span className="text-xs text-slate-400 truncate hidden sm:block">— {description}</span>
            )}
          </div>
        )}

        {/* Copy button */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          {actions}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-200"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>{copied ? 'Copied' : t('snippet.copy')}</span>
          </button>
        </div>
      </div>

      {/* Code area */}
      <pre className="bg-[#1e1e1e] text-[#d4d4d4] text-[13px] leading-relaxed p-4 overflow-x-auto font-mono">
        <code>{activeCode}</code>
      </pre>
    </div>
  )
}
