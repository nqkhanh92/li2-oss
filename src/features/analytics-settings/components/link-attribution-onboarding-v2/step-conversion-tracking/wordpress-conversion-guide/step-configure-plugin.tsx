'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  Wrench,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useCreateApiKey } from '@/features/api-keys/hooks'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'
import { useConversionTracking } from '../context'
import { ApiKeyType } from '@/shared/types/api-key'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import type { RolePermissionKey } from '@/shared/types/role-permission'
import type { CreateApiKeyRequest, ApiKeyWithSecret } from '@/shared/types/api-key'
import { CreateApiKeyDialog } from '@/features/api-keys/components/create-api-key-dialog'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { VerifyButton } from '@/features/analytics-settings/components/v2/step-tag-installation/verify-button'
import { Input } from '@/shared/components/ui/input'
import { toast } from 'sonner'

type ConfigTab = 'auto' | 'manual'
type PushStatus = 'idle' | 'waiting' | 'success' | 'error'

interface Props {
  org_id: string
  onComplete: () => void
}

const TABS = [
  { id: 'auto' as ConfigTab, icon: Zap, label: 'Auto Config' },
  { id: 'manual' as ConfigTab, icon: Wrench, label: 'Manual' },
]

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

function CopyableKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2 font-mono text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors w-fit max-w-full"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-semantic-success" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
      )}
    </button>
  )
}

export function StepConfigurePlugin({ org_id, onComplete }: Props) {
  const [tab, setTab] = useState<ConfigTab>('auto')
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle')
  const [pushMessage, setPushMessage] = useState('')
  const [serverApiKey, setServerApiKey] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [siteUrlDialogOpen, setSiteUrlDialogOpen] = useState(false)
  const [siteUrlInput, setSiteUrlInput] = useState('')

  const { siteUrl, setSiteUrl, normalizedSiteUrl } = useConversionTracking()
  const { data: settings } = useGetAnalyticsSettings(org_id)
  const createApiKey = useCreateApiKey(org_id)

  const childRef = useRef<Window | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (listenerRef.current) { window.removeEventListener('message', listenerRef.current); listenerRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  useEffect(() => cleanup, [])

  const buildPushUrl = (key: string, publishableKey: string): string => {
    const url = new URL(`${normalizedSiteUrl}/wp-admin/admin.php`)
    url.searchParams.set('page', 'li2-analytics')
    url.searchParams.set('push_configuration', 'true')
    url.searchParams.set('publishable_key', publishableKey)
    url.searchParams.set('server_api_key', key)
    url.searchParams.set('dev_mode', process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'true' : 'false')
    return url.toString()
  }

  const handleConfirmAutoConfig = async () => {
    if (!normalizedSiteUrl || !settings?.publishable_key) return

    // Step 1: create key
    setIsCreatingKey(true)
    let keyToUse = serverApiKey
    try {
      if (!keyToUse) {
        const now = new Date()
        const dateStr = now.toISOString().replace('T', ' ').slice(0, 19)
        const result = await createApiKey.mutateAsync({
          name: `WordPress Consumer ${dateStr}`,
          key_type: ApiKeyType.USER,
          permissions: Object.values(ROLE_PERMISSION_KEYS) as RolePermissionKey[],
          expires_at: null,
        })
        keyToUse = result.secret_key
        setServerApiKey(keyToUse)
      }
    } catch {
      // key creation failed — keep dialog open
      return
    } finally {
      setIsCreatingKey(false)
    }

    // Step 2: open push window (key exists at this point)
    setConfirmOpen(false)
    const pushUrl = buildPushUrl(keyToUse, settings.publishable_key)
    const child = window.open(pushUrl, '_blank', 'width=960,height=700,resizable=yes')
    if (!child) {
      setPushStatus('error')
      setPushMessage('Popup was blocked. Please allow popups and click Auto Configure again.')
      return
    }

    childRef.current = child
    setPushStatus('waiting')
    setPushMessage('')
    cleanup()

    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'li2_analytics_config_pushed') return
      cleanup()
      childRef.current?.close()
      childRef.current = null
      if (e.data.success) {
        setPushStatus('success')
        setPushMessage(e.data.message ?? 'Configuration applied successfully')
      } else {
        setPushStatus('error')
        setPushMessage(e.data.message ?? 'Failed to apply configuration')
      }
    }

    listenerRef.current = handler
    window.addEventListener('message', handler)

    intervalRef.current = setInterval(() => {
      if (childRef.current?.closed) {
        cleanup()
        childRef.current = null
        setPushStatus((s) => s === 'waiting' ? 'error' : s)
        setPushMessage((m) => m || 'Window closed before configuration was applied')
      }
    }, 300)
  }

  const handleCreateKeyForManual = async (
    request: CreateApiKeyRequest
  ): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey.mutateAsync(request)
    setServerApiKey(result.secret_key)
    return result
  }

  const autoSteps: React.ReactNode[] = [
    <div className="flex flex-col gap-2">
      <span>
        Click <strong>Auto Configure</strong> — we'll create a Server API Key and configure your WordPress plugin automatically.
      </span>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={pushStatus === 'waiting'}
        >
          {pushStatus === 'waiting' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Applying…</>
          ) : (
            <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Auto Configure</>
          )}
        </Button>
        {pushStatus === 'waiting' && (
          <p className="text-xs text-slate-400">Waiting for plugin to confirm…</p>
        )}
        {pushStatus === 'success' && (
          <p className="flex items-center gap-1 text-xs text-semantic-success">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{pushMessage}
          </p>
        )}
        {pushStatus === 'error' && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5 shrink-0" />{pushMessage}
          </p>
        )}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500">
          If auto config doesn't work (popup blocked or plugin not yet activated), switch to the{' '}
          <button
            type="button"
            onClick={() => setTab('manual')}
            className="font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Manual
          </button>{' '}
          tab.
        </p>
      </div>
    </div>,
  ]

  const manualSteps: React.ReactNode[] = [
    normalizedSiteUrl ? (
      <>
        <StepLink href={`${normalizedSiteUrl}/wp-admin/admin.php?page=li2-analytics`}>
          Open Li2 Analytics Settings
        </StepLink>{' '}
        in your WordPress admin.
      </>
    ) : (
      <>
        Find <strong>Li2 Analytics</strong> in your WordPress sidebar and open it.
      </>
    ),

    <div className="flex flex-col gap-1.5">
      <span>
        Copy your <strong>Publishable Key</strong> and paste it into the plugin settings.
      </span>
      <CopyableKey value={settings?.publishable_key ?? ''} />
    </div>,

    <div className="flex flex-col gap-1.5">
      <span>
        Create a <strong>Server API Key</strong>, then paste it into the plugin settings.
      </span>
      {serverApiKey ? (
        <CopyableKey value={serverApiKey} />
      ) : (
        <CreateApiKeyDialog
          onCreateApiKey={handleCreateKeyForManual}
          trigger={
            <Button size="sm" variant="outline">
              Create Key
            </Button>
          }
        />
      )}
    </div>,

    <>
      Click <strong>Save Settings</strong> in the plugin.
    </>,
  ]

  const steps = tab === 'auto' ? autoSteps : manualSteps

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Configure the Li2 plugin with your API keys to start tracking conversions.
      </p>

      <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
        {/* Tab header */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const selected = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  selected
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Steps */}
        <ol className="flex flex-col divide-y divide-slate-100 px-4 py-3">
          {steps.map((step, i) => (
            <li key={`${tab}-${i}`} className="flex items-start gap-3 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {settings && (
        <VerifyButton
          org_id={org_id}
          publishableKey={settings.publishable_key}
          allowedHostnames={settings.allowed_hostnames}
          siteUrl={siteUrl}
          onVerifyComplete={() => {
            toast.success('WordPress plugin verified successfully!')
            onComplete()
          }}
          onMissingSiteUrl={() => { setSiteUrlInput(siteUrl); setSiteUrlDialogOpen(true) }}
        />
      )}

      {/* Site URL dialog — shown when user clicks Verify without a URL */}
      <CustomDialogV2
        size="xs"
        open={siteUrlDialogOpen}
        setOpen={setSiteUrlDialogOpen}
        onOpenChange={setSiteUrlDialogOpen}
        title="Enter your site URL"
        description="We need your WordPress site URL to open it for verification."
      >
        <div className="flex flex-col gap-4 pt-2">
          <Input
            placeholder="https://yoursite.com"
            value={siteUrlInput}
            onChange={(e) => setSiteUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setSiteUrl(siteUrlInput); setSiteUrlDialogOpen(false) }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSiteUrlDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setSiteUrl(siteUrlInput); setSiteUrlDialogOpen(false) }}>Save</Button>
          </div>
        </div>
      </CustomDialogV2>

      {/* Confirm dialog */}
      <CustomDialogV2
        size="xs"
        open={confirmOpen}
        setOpen={setConfirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create Server API Key"
      >
        <div className="flex flex-col gap-2 text-sm">
          <span>
            A secret key named{' '}
            <strong className="text-foreground">
              WordPress Consumer {new Date().toISOString().replace('T', ' ').slice(0, 19)}
            </strong>{' '}
            will be created with full permissions and no expiration. Your keys will then be pushed
            directly into the plugin settings.
          </span>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isCreatingKey}>
            Cancel
          </Button>
          <Button onClick={handleConfirmAutoConfig} disabled={isCreatingKey}>
            {isCreatingKey ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating…
              </>
            ) : (
              'Create & Continue'
            )}
          </Button>
        </div>
      </CustomDialogV2>
    </div>
  )
}
