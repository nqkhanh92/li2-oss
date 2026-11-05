'use client'

import { useTranslation } from 'react-i18next'
import { CodeBlock } from '@/shared/components/customize/code-block'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { ManualFramework } from './index'

const INSTALL_TABS = [
  { label: 'npm', code: 'npm install @li2/analytics' },
  { label: 'yarn', code: 'yarn add @li2/analytics' },
  { label: 'bun', code: 'bun add @li2/analytics' },
]

const CLIENT_FRAMEWORK_IDS: Extract<ManualFramework, 'html' | 'react'>[] = ['html', 'react']

interface Props {
  publishableKey: string
  framework: ManualFramework
  onFrameworkChange: (fw: ManualFramework) => void
  onComplete: () => void
}

export function StepInstallScript({ publishableKey, framework, onFrameworkChange, onComplete }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'
  const strippedKey = (publishableKey || '<YOUR_PUBLISHABLE_KEY>').replace(/^li2_pk_/, '')
  const cdnPath = isDev ? `dev/${strippedKey}` : strippedKey

  // Ensure we only show HTML/React here; default to html if server-side framework selected
  const activeFramework: 'html' | 'react' = framework === 'react' ? 'react' : 'html'

  const htmlSnippet = `<script src="https://cdn.li2.ai/${cdnPath}" defer></script>`


  const reactInitSnippet = `import { useEffect } from 'react'
import { Li2Analytics } from '@li2/analytics'

const analytics = new Li2Analytics({ publishableKey: '${publishableKey || '<YOUR_PUBLISHABLE_KEY>'}' })

export function App() {
  useEffect(() => {
    analytics.start() // respects remote feature flags, fire and forget
    // Or override specific trackers:
    // analytics.start({ scroll: false })   // disable scroll only
    // analytics.start({ pageview: true })  // force pageview even if flag is off
    return () => analytics.destroy()
  }, [])
}`

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        {t('v2.manual_guide.install_script.subtitle')}
      </p>

      <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {CLIENT_FRAMEWORK_IDS.map((id) => {
            const selected = activeFramework === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onFrameworkChange(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {id === 'html' ? t('v2.manual_guide.install_script.tab_html') : t('v2.manual_guide.install_script.tab_react')}
              </button>
            )
          })}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {activeFramework === 'html' && (
            <>
              <p className="text-xs text-muted-foreground">
                {t('v2.manual_guide.install_script.snippet_hint')
                  .split('<head>')
                  .map((part, i) =>
                    i === 0 ? part : (
                      <>
                        <code key={i} className="font-mono bg-slate-100 px-1 rounded">&lt;head&gt;</code>
                        {part}
                      </>
                    )
                  )}
              </p>
              <CodeBlock code={htmlSnippet} section="html" title={t('v2.manual_guide.install_script.snippet_title')} />
            </>
          )}

          {activeFramework === 'react' && (
            <div className="flex flex-col gap-3">
              <CodeBlock tabs={INSTALL_TABS} section="react-install" />
              <CodeBlock code={reactInitSnippet} section="react-init" title={t('v2.manual_guide.install_script.react_init_title')} />
            </div>
          )}
        </div>
      </div>

      <div>
        <Button onClick={onComplete} size="sm">{t('v2.manual_guide.install_script.cta')}</Button>
      </div>
    </div>
  )
}
