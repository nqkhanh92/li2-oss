'use client'

import { useState } from 'react'
import { Download, LayoutGrid, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useConversionTracking } from '../context'

type InstallMethod = 'store' | 'upload'

const StepLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
  >
    {children}
  </a>
)

interface Props {
  onComplete: () => void
}

export function StepInstallPlugin({ onComplete }: Props) {
  const [method, setMethod] = useState<InstallMethod>('upload')
  const { normalizedSiteUrl } = useConversionTracking()
  const { t } = useTranslation('analytics_settings')
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'
  const pluginDownloadUrl = isDev
    ? 'https://supa.li2.ai/storage/v1/object/public/public-resources/sdk/li2-analytics_v2.zip'
    : 'https://supa.li2.ai/storage/v1/object/public/public-resources/sdk/li2-analytics.zip'

  const METHODS = [
    {
      id: 'store' as InstallMethod,
      icon: LayoutGrid,
      title: t('onboarding.wordpress.plugin_store_title'),
      comingSoon: true,
    },
    {
      id: 'upload' as InstallMethod,
      icon: Upload,
      title: t('onboarding.wordpress.upload_plugin_title'),
      comingSoon: false,
    },
  ]

  const linked = !!normalizedSiteUrl
  const addNewPluginLink = `${normalizedSiteUrl}/wp-admin/plugin-install.php`
  const uploadPluginLink = `${normalizedSiteUrl}/wp-admin/plugin-install.php?tab=upload`
  const pluginsLink = `${normalizedSiteUrl}/wp-admin/plugins.php`

  const storeSteps: React.ReactNode[] = [
    <>{t('onboarding.wordpress.step_goto_plugins_add')}{' '}{linked ? <StepLink href={addNewPluginLink}>{t('onboarding.wordpress.step_store_goto_plugins')}</StepLink> : t('onboarding.wordpress.step_store_goto_plugins')}</>,
    <>{t('onboarding.wordpress.step_store_search')}</>,
    <>{t('onboarding.wordpress.step_store_install')}</>,
    <>{t('onboarding.wordpress.step_store_activate')}{linked && <> — {t('onboarding.wordpress.step_store_or_go')} <StepLink href={pluginsLink}>{t('onboarding.wordpress.step_store_goto_plugins_link')}</StepLink></>}</>,
  ]

  const uploadSteps: React.ReactNode[] = [
    <div className="flex flex-col gap-2">
      <span>{t('onboarding.wordpress.step_upload_download')}</span>
      <a
        href={pluginDownloadUrl}
        download
        className="inline-flex items-center gap-1.5 h-7 w-fit px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Download className="h-3.5 w-3.5" />
        {t('onboarding.wordpress.download_btn')}
      </a>
    </div>,
    <>{t('onboarding.wordpress.step_goto_plugins_add')}{' '}{linked ? <StepLink href={addNewPluginLink}>{t('onboarding.wordpress.step_store_goto_plugins')}</StepLink> : t('onboarding.wordpress.step_store_goto_plugins')}</>,
    <>{linked ? <StepLink href={uploadPluginLink}>{t('onboarding.wordpress.upload_plugin_title')}</StepLink> : <strong>{t('onboarding.wordpress.upload_plugin_title')}</strong>}{' '}{t('onboarding.wordpress.step_upload_top')}</>,
    <>{t('onboarding.wordpress.step_upload_choose')}</>,
    <>{t('onboarding.wordpress.step_store_activate')}{linked && <> — {t('onboarding.wordpress.step_store_or_go')} <StepLink href={pluginsLink}>{t('onboarding.wordpress.step_store_goto_plugins_link')}</StepLink></>}</>,
  ]

  const steps = method === 'store' ? storeSteps : uploadSteps

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Install the Li2 plugin on your WordPress site to start tracking conversions.
      </p>

      <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {METHODS.map((m) => {
            const Icon = m.icon
            const selected = method === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !m.comingSoon && setMethod(m.id)}
                disabled={m.comingSoon}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  m.comingSoon && 'cursor-not-allowed opacity-60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.title}
                {m.comingSoon && (
                  <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 leading-none">
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Steps */}
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

      <div>
        <Button onClick={onComplete}>Done — Plugin is installed</Button>
      </div>
    </div>
  )
}
