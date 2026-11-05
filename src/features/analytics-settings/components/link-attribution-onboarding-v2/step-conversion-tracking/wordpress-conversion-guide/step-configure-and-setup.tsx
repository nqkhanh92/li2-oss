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
  ShoppingCart,
  UserCheck,
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

type ConfigTab = 'auto' | 'manual'
type PushStatus = 'idle' | 'waiting' | 'success' | 'error'

interface ConversionOption {
  id: string
  icon: React.ElementType
  label: string
  description: string
  pushParam: string
  pluginLabel: string
}

const OPTIONS: ConversionOption[] = [
  {
    id: 'registration',
    icon: UserCheck,
    label: 'Track Lead for all registered users',
    description: 'Fire a Lead event whenever a new user registers on your site.',
    pushParam: 'track_registration',
    pluginLabel: 'Track Registrations',
  },
  {
    id: 'add_to_cart',
    icon: ShoppingCart,
    label: 'Track Lead when a user adds an item to cart',
    description: 'Fire a Lead event when a user adds a product to their WooCommerce cart.',
    pushParam: 'track_add_to_cart',
    pluginLabel: 'Track Add to Cart',
  },
  {
    id: 'checkout',
    icon: CheckCircle2,
    label: 'Track Sale when a user creates an order',
    description: 'Fire a Sale event when a WooCommerce order is placed.',
    pushParam: 'track_checkout',
    pluginLabel: 'Track WooCommerce Orders',
  },
]

const GENERAL_OPTIONS = ['registration']
const WOOCOMMERCE_OPTIONS = ['add_to_cart', 'checkout']

function OptionCard({
  opt,
  selected,
  onToggle,
}: {
  opt: ConversionOption
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const Icon = opt.icon
  const isSelected = selected.has(opt.id)
  return (
    <button
      type="button"
      onClick={() => onToggle(opt.id)}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
        isSelected ? 'border-primary/30 bg-primary/[0.04]' : 'border-slate-200 bg-card hover:border-slate-300'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          isSelected ? 'bg-primary/10' : 'bg-slate-100'
        )}
      >
        <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-slate-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-slate-700')}>{opt.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
      </div>
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 mt-0.5 transition-all',
          isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
        )}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
    </button>
  )
}

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

interface Props {
  org_id: string
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  onComplete: () => void
}

export function StepConfigureAndSetup({ org_id, selected, onSelectedChange, onComplete }: Props) {
  const [tab, setTab] = useState<ConfigTab>('auto')
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle')
  const [pushMessage, setPushMessage] = useState('')
  const [serverApiKey, setServerApiKey] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCreatingKey, setIsCreatingKey] = useState(false)

  const { normalizedSiteUrl } = useConversionTracking()
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

  const toggleOption = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onSelectedChange(next)
  }

  const buildPushUrl = (key: string, publishableKey: string): string => {
    const url = new URL(`${normalizedSiteUrl}/wp-admin/admin.php`)
    url.searchParams.set('page', 'li2-analytics')
    url.searchParams.set('push_configuration', 'true')
    url.searchParams.set('publishable_key', publishableKey)
    url.searchParams.set('server_api_key', key)
    url.searchParams.set('dev_mode', process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'true' : 'false')
    for (const opt of OPTIONS) {
      url.searchParams.set(opt.pushParam, selected.has(opt.id) ? 'true' : 'false')
    }
    return url.toString()
  }

  const handleConfirmAutoConfig = async () => {
    if (!normalizedSiteUrl || !settings?.publishable_key) return

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
      return
    } finally {
      setIsCreatingKey(false)
    }

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

  const handleCreateKeyForManual = async (request: CreateApiKeyRequest): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey.mutateAsync(request)
    setServerApiKey(result.secret_key)
    return result
  }

  const selectedOptions = OPTIONS.filter((o) => selected.has(o.id))
  const pluginUrl = normalizedSiteUrl
    ? `${normalizedSiteUrl}/wp-admin/admin.php?page=li2-analytics`
    : null

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Choose which conversion events to track, then configure the plugin with your API keys — all in one step.
      </p>

      {/* Conversion event selection */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {OPTIONS.filter((o) => GENERAL_OPTIONS.includes(o.id)).map((opt) => (
            <OptionCard key={opt.id} opt={opt} selected={selected} onToggle={toggleOption} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">WooCommerce Integration</p>
          {OPTIONS.filter((o) => WOOCOMMERCE_OPTIONS.includes(o.id)).map((opt) => (
            <OptionCard key={opt.id} opt={opt} selected={selected} onToggle={toggleOption} />
          ))}
        </div>
      </div>

      {/* API key config card */}
      <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const isSelected = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {tab === 'auto' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Click <strong>Auto Configure</strong> — we'll create a Server API Key and push your API keys and conversion settings directly into the plugin.
              </p>
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
            </div>
          )}

          {tab === 'manual' && (
            <ol className="flex flex-col divide-y divide-slate-100">
              <li className="flex items-start gap-3 py-3 first:pt-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">1</span>
                <span className="text-sm text-slate-700">
                  {pluginUrl ? (
                    <StepLink href={pluginUrl}>Open Li2 Analytics Settings</StepLink>
                  ) : (
                    <strong>Open Li2 Analytics Settings</strong>
                  )}{' '}
                  in your WordPress admin.
                </span>
              </li>

              <li className="flex items-start gap-3 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">2</span>
                <div className="flex flex-col gap-1.5 text-sm text-slate-700">
                  <span>Copy your <strong>Publishable Key</strong> and paste it into the plugin settings.</span>
                  <CopyableKey value={settings?.publishable_key ?? ''} />
                </div>
              </li>

              <li className="flex items-start gap-3 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">3</span>
                <div className="flex flex-col gap-1.5 text-sm text-slate-700">
                  <span>Create a <strong>Server API Key</strong> and paste it into the plugin settings.</span>
                  {serverApiKey ? (
                    <CopyableKey value={serverApiKey} />
                  ) : (
                    <CreateApiKeyDialog
                      onCreateApiKey={handleCreateKeyForManual}
                      trigger={<Button size="sm" variant="outline">Create Key</Button>}
                    />
                  )}
                </div>
              </li>

              {selectedOptions.length > 0 && (
                <li className="flex items-start gap-3 py-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">4</span>
                  <div className="text-sm text-slate-700 flex flex-col gap-1.5">
                    <span>Enable the following options in the <strong>Conversion Tracking</strong> section:</span>
                    <ul className="flex flex-col gap-1">
                      {selectedOptions.map((opt) => (
                        <li key={opt.id} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="font-medium">{opt.pluginLabel}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )}

              <li className="flex items-start gap-3 py-3 last:pb-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                  {selectedOptions.length > 0 ? 5 : 4}
                </span>
                <span className="text-sm text-slate-700">Click <strong>Save Settings</strong> in the plugin.</span>
              </li>
            </ol>
          )}
        </div>
      </div>

      <div>
        <Button onClick={onComplete}>Done — Plugin is configured</Button>
      </div>

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
            will be created with full permissions and no expiration. Your keys and conversion settings will then be pushed directly into the plugin.
          </span>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isCreatingKey}>
            Cancel
          </Button>
          <Button onClick={handleConfirmAutoConfig} disabled={isCreatingKey}>
            {isCreatingKey ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
            ) : (
              'Create & Continue'
            )}
          </Button>
        </div>
      </CustomDialogV2>
    </div>
  )
}
