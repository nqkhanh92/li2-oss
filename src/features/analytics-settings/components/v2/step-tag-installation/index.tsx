'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Check,
  CheckCircle2,
  Eye,
  MousePointerClick,
  ChevronsDown,
  Globe,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'
import { cn } from '@/shared/lib/utils'
import { AnalyticsSettings } from '../../../hooks/queries'
import { FrameworkTabs, Framework } from './framework-tabs'
import { HtmlInstallGuide } from './html-install-guide'
import { ReactInstallGuide } from './react-install-guide'
import { WordpressInstallGuide } from './wordpress-install-guide'
import { VerifyButton } from './verify-button'
import { useSiteUrl } from '../site-url-context'
import { useTranslation } from 'react-i18next'

interface ToggleRowProps {
  id: string
  icon: React.ElementType
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}

const ToggleRow = ({
  id,
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleRowProps) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div>
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
)

interface Props {
  org_id: string
  settings: AnalyticsSettings
  onComplete: () => void
}

export const StepTagInstallation = ({ org_id, settings, onComplete }: Props) => {
  const { t } = useTranslation('analytics_settings')
  const { siteUrl, setSiteUrl, wpOrigin, wpStatus } = useSiteUrl()
  const [framework, setFramework] = useState<Framework>('html')
  const [showConfetti, setShowConfetti] = useState(false)
  const [verified, setVerified] = useState(false)
  const siteUrlInputRef = useRef<HTMLInputElement>(null)

  const [autoPageview, setAutoPageview] = useState(true)
  const [autoClicks, setAutoClicks] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [autoForms, setAutoForms] = useState(true)

  // Auto-switch to WordPress tab when detected
  useEffect(() => {
    if (wpStatus === 'accessible') setFramework('wordpress')
  }, [wpStatus])

  const handleVerifyComplete = () => {
    setVerified(true)
    setTimeout(() => {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }, 200)
  }

  const showCollectToggles = framework === 'html' || framework === 'react'

  return (
    <div className="relative flex flex-col gap-6">
      {showConfetti && <ConfettiCanvas className="z-50" />}

      <div>
        <h2 className="text-base font-semibold text-foreground">
          {t('onboarding.tag_installation.title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t('onboarding.tag_installation.subtitle')}</p>
      </div>

      {/* Site URL — required */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {t('onboarding.tag_installation.site_url_label')}
          </span>
          <span className="text-xs text-red-500">*</span>
        </div>
        <div className="relative">
          <Input
            ref={siteUrlInputRef}
            placeholder="https://example.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            className={cn(
              'pr-8',
              wpStatus === 'accessible' && 'border-emerald-400 focus-visible:ring-emerald-300'
            )}
          />
          {wpStatus === 'checking' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
          )}
          {wpStatus === 'accessible' && (
            <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
          {wpStatus === 'unreachable' && siteUrl.trim() && (
            <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          )}
        </div>

        {wpStatus === 'accessible' && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{t('onboarding.tag_installation.wordpress_detected')}</span>
          </div>
        )}
      </div>

      {/* Framework selector */}
      <FrameworkTabs value={framework} onChange={setFramework} />

      {/* Auto-collect toggles — html & react only */}
      {showCollectToggles && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {t('onboarding.tag_installation.auto_collect_title')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('onboarding.tag_installation.auto_collect_subtitle')}
            </p>
          </div>
          <ToggleRow
            id="v2-collect-pageview"
            icon={Eye}
            label={t('onboarding.tag_installation.pageview_label')}
            description={t('onboarding.tag_installation.pageview_desc')}
            checked={autoPageview}
            onCheckedChange={setAutoPageview}
          />
          <ToggleRow
            id="v2-collect-clicks"
            icon={MousePointerClick}
            label={t('onboarding.tag_installation.clicks_label')}
            description={t('onboarding.tag_installation.clicks_desc')}
            checked={autoClicks}
            onCheckedChange={setAutoClicks}
          />
          <ToggleRow
            id="v2-collect-scroll"
            icon={ChevronsDown}
            label={t('onboarding.tag_installation.scroll_label')}
            description={t('onboarding.tag_installation.scroll_desc')}
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
          />
          <ToggleRow
            id="v2-collect-forms"
            icon={FileText}
            label={t('onboarding.tag_installation.forms_label')}
            description={t('onboarding.tag_installation.forms_desc')}
            checked={autoForms}
            onCheckedChange={setAutoForms}
          />
        </div>
      )}

      {/* Guide content */}
      <div>
        {framework === 'html' && (
          <HtmlInstallGuide
            publishableKey={settings.publishable_key}
            autoPageview={autoPageview}
            autoClicks={autoClicks}
            autoScroll={autoScroll}
            autoForms={autoForms}
          />
        )}
        {framework === 'react' && (
          <ReactInstallGuide
            publishableKey={settings.publishable_key}
            autoPageview={autoPageview}
            autoClicks={autoClicks}
            autoScroll={autoScroll}
            autoForms={autoForms}
          />
        )}
        {framework === 'wordpress' && (
          <WordpressInstallGuide origin={wpOrigin} publishableKey={settings.publishable_key} />
        )}
      </div>

      {/* Verify section */}
      <div
        className={cn(
          'rounded-xl border p-4 flex flex-col gap-3 transition-colors',
          verified ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {t('onboarding.tag_installation.verify_title')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('onboarding.tag_installation.verify_subtitle')}
            </p>
          </div>
          {verified && (
            <div className="flex items-center gap-1.5 text-emerald-700 text-sm font-medium shrink-0">
              <CheckCircle2 className="h-4 w-4" />
              {t('onboarding.tag_installation.verified_badge')}
            </div>
          )}
        </div>
        <VerifyButton
          org_id={org_id}
          publishableKey={settings.publishable_key}
          allowedHostnames={settings.allowed_hostnames}
          siteUrl={siteUrl}
          onVerifyComplete={handleVerifyComplete}
          onMissingSiteUrl={() => {
            siteUrlInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            siteUrlInputRef.current?.focus()
          }}
        />
      </div>

      {/* Complete */}
      <div className="flex justify-end">
        <Button onClick={onComplete} variant="outline" className="gap-2">
          <Check className="h-4 w-4" />
          {t('onboarding.tag_installation.complete_btn')}
        </Button>
      </div>
    </div>
  )
}
