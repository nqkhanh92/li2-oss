'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { CodeBlock } from '@/shared/components/customize/code-block'
import { cn } from '@/shared/lib/utils'
import type { AnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import type { BehaviorPlatform } from '../wizard'
import { WordPressConfigurePlugin } from './wordpress-configure-plugin'

type HtmlFramework = 'html' | 'react'

const INSTALL_TABS = [
  { label: 'npm', code: 'npm install @li2/analytics' },
  { label: 'yarn', code: 'yarn add @li2/analytics' },
  { label: 'bun', code: 'bun add @li2/analytics' },
]

interface Props {
  platform: BehaviorPlatform
  settings: AnalyticsSettings
  siteUrl: string
  onNext: () => void
}

function HtmlInstall({ settings, onNext }: Pick<Props, 'settings' | 'onNext'>) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const [framework, setFramework] = useState<HtmlFramework>('html')

  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'
  const strippedKey = (settings.publishable_key || '<YOUR_PUBLISHABLE_KEY>').replace(/^li2_pk_/, '')
  const cdnPath = isDev ? `dev/${strippedKey}` : strippedKey
  const htmlSnippet = `<script src="https://cdn.li2.ai/${cdnPath}" defer></script>`
  const reactInitSnippet = `import { useEffect } from 'react'
import { Li2Analytics } from '@li2/analytics'

const analytics = new Li2Analytics({ publishableKey: '${settings.publishable_key || '<YOUR_PUBLISHABLE_KEY>'}' })

export function App() {
  useEffect(() => {
    analytics.start()
    return () => analytics.destroy()
  }, [])
}`

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">{t('step_script_install.subtitle')}</p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex gap-1 border-b border-border bg-muted/40 px-3 py-2">
          {(['html', 'react'] as HtmlFramework[]).map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => setFramework(fw)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                framework === fw
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {fw === 'html'
                ? t('step_script_install.tab_html')
                : t('step_script_install.tab_react')}
            </button>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {framework === 'html' && (
            <>
              <p className="text-xs text-muted-foreground">
                {t('step_script_install.html_hint')
                  .split('<head>')
                  .map((part, i) =>
                    i === 0 ? (
                      part
                    ) : (
                      <>
                        <code key={i} className="font-mono bg-muted px-1 rounded">
                          &lt;head&gt;
                        </code>
                        {part}
                      </>
                    )
                  )}
              </p>
              <CodeBlock
                code={htmlSnippet}
                section="html"
                title={t('step_script_install.snippet_title')}
              />
            </>
          )}
          {framework === 'react' && (
            <div className="flex flex-col gap-3">
              <CodeBlock tabs={INSTALL_TABS} section="react-install" />
              <CodeBlock
                code={reactInitSnippet}
                section="react-init"
                title={t('step_script_install.react_init_title')}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Button onClick={onNext}>{t('step_script_install.next_btn')}</Button>
      </div>
    </div>
  )
}

function WordPressInstall({ siteUrl, settings, onNext }: Pick<Props, 'siteUrl' | 'settings' | 'onNext'>) {
  const { t } = useTranslation('behavior_analytics_onboarding')
  const normalized = siteUrl
    ? (siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).replace(/\/$/, '')
    : ''
  const uploadLink = normalized ? `${normalized}/wp-admin/plugin-install.php?tab=upload` : ''
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'

  const steps: React.ReactNode[] = [
    <div key="download" className="flex flex-col gap-2">
      <span>{t('step_script_install.wp_step_download')}</span>
      <a
        href={
          isDev
            ? 'https://supa.li2.ai/storage/v1/object/public/public-resources/sdk/li2-analytics_v2.zip'
            : 'https://supa.li2.ai/storage/v1/object/public/public-resources/sdk/li2-analytics.zip'
        }
        download
        className="inline-flex items-center gap-1.5 h-7 w-fit px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Download className="h-3.5 w-3.5" />
        {t('step_script_install.wp_download_btn')}
      </a>
    </div>,
    uploadLink ? (
      <>
        {t('step_script_install.wp_step_goto_upload').split('Upload Plugin')[0]}
        <a
          href={uploadLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        >
          Upload Plugin
        </a>
      </>
    ) : (
      <>{t('step_script_install.wp_step_goto_upload')}</>
    ),
    <>{t('step_script_install.wp_step_choose')}</>,
    <>{t('step_script_install.wp_step_activate')}</>,
  ]

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">{t('step_script_install.wp_subtitle')}</p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            {t('step_script_install.wp_method_upload')}
          </span>
        </div>
        <ol className="flex flex-col divide-y divide-slate-100 px-4 py-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 py-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <WordPressConfigurePlugin
        settings={settings}
        normalizedSiteUrl={normalized}
        onNext={onNext}
      />
    </div>
  )
}

export function StepScriptInstall({ platform, settings, siteUrl, onNext }: Props) {
  const { t } = useTranslation('behavior_analytics_onboarding')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          {t('step_script_install.title')}
        </h2>
      </div>
      {platform === 'wordpress' ? (
        <WordPressInstall siteUrl={siteUrl} settings={settings} onNext={onNext} />
      ) : (
        <HtmlInstall settings={settings} onNext={onNext} />
      )}
    </div>
  )
}
