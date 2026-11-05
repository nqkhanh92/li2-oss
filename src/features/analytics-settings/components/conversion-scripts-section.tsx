'use client'

import { useState } from 'react'
import { ChevronDown, Code2, Globe, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { CodeBlock } from '@/shared/components/customize/code-block'
import { useSaveCustomScripts } from '../hooks/mutations'
import type { CustomScript } from '../hooks/queries'

interface Props {
  org_id: string
  scripts: CustomScript[]
}

export function ConversionScriptsSection({ org_id, scripts }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const saveScripts = useSaveCustomScripts(org_id)

  const handleDelete = (id: string) => {
    const updated = scripts.filter((s) => s.id !== id)
    saveScripts.mutate(updated)
  }

  if (scripts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
        <Code2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-600">No conversion scripts yet</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Use the link attribution wizard to generate scripts with AI.
        </p>
      </div>
    )
  }

  // Group by domain
  const byDomain = scripts.reduce<Record<string, CustomScript[]>>((acc, s) => {
    const key = s.site_url || 'unknown'
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(byDomain).map(([domain, domainScripts]) => (
        <div key={domain} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 font-mono">{domain}</span>
            <span className="text-xs text-slate-400">({domainScripts.length})</span>
          </div>

          {domainScripts.map((script) => {
            const isExpanded = expandedId === script.id

            return (
              <div key={script.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {script.name}
                      </span>
                      {script.description && (
                        <span className="text-xs text-slate-400 truncate">
                          {script.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : script.id)}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      View code
                      <ChevronDown
                        className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(script.id)}
                      disabled={saveScripts.isPending}
                      className="rounded-md p-1.5 text-slate-300 hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                      aria-label="Delete script"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                    <CodeBlock
                      section="conversion-script"
                      title={script.name}
                      code={script.script}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
