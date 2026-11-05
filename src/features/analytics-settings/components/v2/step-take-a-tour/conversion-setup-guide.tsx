'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  Loader2,
  Radio,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Globe,
  ChevronsUpDown,
  Plus,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { CodeBlock } from '@/shared/components/customize/code-block'
import { cn } from '@/shared/lib/utils'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { DebugLogsTable } from '../../debug-logs-table'
import { useToggleDebugMode } from '../../../hooks/mutations'
import { useGetDebugLogs } from '../../../hooks/queries'
import { HttpApiGuide } from './http-api-guide'
import { CreateApiKeyDialog } from '@/features/api-keys/components/create-api-key-dialog'
import { useCreateApiKey } from '@/features/api-keys/hooks'
import { ApiKeyType } from '@/shared/types/api-key'
import { ROLE_PERMISSION_KEYS, RolePermissionKey } from '@/shared/types/role-permission'
import { useSiteUrl } from '../site-url-context'
import { useTranslation } from 'react-i18next'

// ─── Snippets ────────────────────────────────────────────────────────────────

type Framework = 'javascript' | 'react' | 'nodejs' | 'wordpress' | 'http-api'
type DebugFilter = 'lead' | 'sale'

const JS_LEAD = `// Track a lead conversion
li2Analytics.trackLead({
  eventName: 'signup',
  customerExternalId: 'user_123',
  customerName: 'John Doe',
  customerEmail: 'user@example.com',
  metadata: { source: 'contact_form' },
})`

const JS_SALE = `// Track a sale conversion
li2Analytics.trackSale({
  customerExternalId: 'user_123',
  amount: 9999, // Amount in cents ($99.99)
  eventName: 'purchase',
  paymentProcessor: 'stripe',
  invoiceId: 'ORDER-123',
  currency: 'usd', // Supported: 'usd' or 'vnd'
})`

const REACT_LEAD = `import { trackLead } from '@li2/analytics'

function ContactForm() {
  const handleSubmit = async (formData) => {
    await trackLead({
      eventName: 'signup',
      customerExternalId: formData.userId,
      customerName: formData.name,
      customerEmail: formData.email,
    })
  }
  return <form onSubmit={handleSubmit}>...</form>
}`

const REACT_SALE = `import { trackSale } from '@li2/analytics'

function CheckoutPage() {
  const handlePurchase = async (order) => {
    await trackSale({
      customerExternalId: order.userId,
      amount: order.total, // Amount in cents
      eventName: 'purchase',
      paymentProcessor: 'stripe',
      invoiceId: order.id,
      currency: 'usd',
    })
  }
  return <button onClick={handlePurchase}>Complete Purchase</button>
}`

const nodeSnippets = (apiKey: string) => ({
  lead: `import { initServer } from '@li2/analytics'
const li2 = initServer({ apiKey: '${apiKey}' })

const result = await li2.trackLead({
  clickId: req.body.clickId,
  eventName: 'signup',
  customerExternalId: 'user_123',
  customerEmail: 'john@example.com',
})`,
  sale: `import { initServer } from '@li2/analytics'
const li2 = initServer({ apiKey: '${apiKey}' })

const result = await li2.trackSale({
  clickId: req.body.clickId,
  customerExternalId: 'user_123',
  amount: 9900,
  eventName: 'purchase',
  paymentProcessor: 'stripe',
  invoiceId: 'inv_xyz',
  currency: 'usd', // Supported: 'usd' or 'vnd'
})`,
})

// ─── Framework tabs config ───────────────────────────────────────────────────

const FRAMEWORK_TABS: { id: Framework; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'react', label: 'React' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'http-api', label: 'HTTP API' },
]

const CLIENT_SNIPPETS: Record<'javascript' | 'react', { lead: string; sale: string }> = {
  javascript: { lead: JS_LEAD, sale: JS_SALE },
  react: { lead: REACT_LEAD, sale: REACT_SALE },
}

// ─── Debug panel ─────────────────────────────────────────────────────────────

const DebugPanel = ({ org_id }: { org_id: string }) => {
  const { t } = useTranslation('analytics_settings')
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [filter, setFilter] = useState<DebugFilter>('lead')
  const [page, setPage] = useState(1)
  const toggleDebugMode = useToggleDebugMode(org_id)

  const { data: logsData, isLoading } = useGetDebugLogs(
    org_id,
    { page, limit: 10, request_type: filter },
    debugEnabled
  )

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleDebugMode.mutateAsync({ enabled })
      setDebugEnabled(enabled)
      setPage(1)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border-2 p-4 transition-colors',
          debugEnabled ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {t('onboarding.conversion.debug_mode')}
          </span>
          <span className="text-xs text-slate-500">
            {debugEnabled
              ? t('onboarding.conversion.debug_on')
              : t('onboarding.conversion.debug_off')}
          </span>
        </div>
        <Switch
          checked={debugEnabled}
          onCheckedChange={handleToggle}
          disabled={toggleDebugMode.isPending}
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {(['lead', 'sale'] as DebugFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f)
              setPage(1)
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all',
              filter === f
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {f === 'lead'
              ? t('onboarding.conversion.lead_events')
              : t('onboarding.conversion.sale_events')}
          </button>
        ))}
      </div>

      {!debugEnabled ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
          <Radio className="h-6 w-6" />
          <span className="text-sm">{t('onboarding.conversion.debug_empty')}</span>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <DebugLogsTable
          logs={logsData?.data ?? []}
          isLoading={isLoading}
          currentPage={page}
          hasMore={logsData?.has_more ?? false}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── WP push-config hook ──────────────────────────────────────────────────────

type PushStatus = 'idle' | 'waiting' | 'success' | 'error'

function useWpPush(origin: string) {
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle')
  const [pushMessage, setPushMessage] = useState('')
  const childRef = useRef<Window | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current)
      listenerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => cleanup, [])

  const openPush = (params: Record<string, string>) => {
    const url = new URL(`${origin}/wp-admin/admin.php`)
    url.searchParams.set('page', 'li2-analytics')
    url.searchParams.set('push_configuration', 'true')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

    const child = window.open(url.toString(), '_blank', 'width=960,height=700,resizable=yes')
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
        setPushMessage(e.data.message ?? 'Configuration pushed successfully')
      } else {
        setPushStatus('error')
        setPushMessage(e.data.message ?? 'Failed to push configuration')
      }
    }

    listenerRef.current = handler
    window.addEventListener('message', handler)

    intervalRef.current = setInterval(() => {
      if (childRef.current?.closed) {
        cleanup()
        childRef.current = null
        setPushStatus((s) => (s === 'waiting' ? 'error' : s))
        setPushMessage((m) => m || 'Window closed before configuration was applied')
      }
    }, 300)
  }

  return { pushStatus, pushMessage, openPush }
}

// ─── Site creatable combobox ──────────────────────────────────────────────────

interface SiteComboboxProps {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  detectedFromProvider: boolean
}

const SiteCombobox = ({
  value,
  onChange,
  suggestions,
  detectedFromProvider,
}: SiteComboboxProps) => {
  const { t } = useTranslation('analytics_settings')
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [extraOptions, setExtraOptions] = useState<string[]>([])

  const allOptions = [...new Set([...suggestions, ...extraOptions])]
  const filtered = allOptions.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))

  const normalise = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    try {
      return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname
    } catch {
      return trimmed
    }
  }

  const select = (raw: string) => {
    const normalised = normalise(raw)
    if (!normalised) return
    if (!allOptions.includes(normalised)) setExtraOptions((prev) => [...prev, normalised])
    onChange(normalised)
    setOpen(false)
    setInputValue('')
  }

  const showCreate =
    inputValue.trim() && !filtered.some((o) => o.toLowerCase() === inputValue.trim().toLowerCase())

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Globe className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">
          {t('onboarding.conversion.wp_site_label')}
        </span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span className={value ? 'text-foreground' : 'text-slate-400'}>
              {value || t('onboarding.conversion.wp_site_placeholder')}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('onboarding.conversion.wp_search_placeholder')}
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {allOptions.length === 0 && !showCreate && (
                <CommandEmpty>{t('onboarding.conversion.wp_no_sites')}</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((opt) => (
                    <CommandItem key={opt} value={opt} onSelect={() => select(opt)}>
                      <CheckCircle2
                        className={cn(
                          'mr-2 h-3.5 w-3.5',
                          value === opt ? 'text-primary opacity-100' : 'opacity-0'
                        )}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {showCreate && (
                <CommandGroup>
                  <CommandItem value={inputValue} onSelect={() => select(inputValue)}>
                    <Plus className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    {t('onboarding.conversion.wp_combobox_use', { value: inputValue.trim() })}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-slate-400">
        {detectedFromProvider
          ? t('onboarding.conversion.wp_site_hint_detected')
          : t('onboarding.conversion.wp_site_hint_default')}
      </p>
    </div>
  )
}

// ─── WordPress section ────────────────────────────────────────────────────────

interface WpSectionProps {
  org_id: string
  allowedHostnames: string[]
  apiKey: string
  setApiKey: (k: string) => void
  onOpenCreateKeyDialog: () => void
  setFramework: (f: Framework) => void
}

const WpSection = ({
  org_id,
  allowedHostnames,
  apiKey,
  setApiKey,
  onOpenCreateKeyDialog,
  setFramework,
}: WpSectionProps) => {
  const { t } = useTranslation('analytics_settings')
  const { wpOrigin } = useSiteUrl()
  const wpHostname = wpOrigin ? new URL(wpOrigin).hostname : ''
  const [hasWooCommerce, setHasWooCommerce] = useState<'yes' | 'no' | null>(null)
  const [selectedDomain, setSelectedDomain] = useState(wpHostname || allowedHostnames[0] || '')
  const [trackAddToCart, setTrackAddToCart] = useState(true)
  const [trackCheckout, setTrackCheckout] = useState(true)
  const [wooTab, setWooTab] = useState<'auto' | 'manual'>('auto')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const createApiKey = useCreateApiKey(org_id)

  const resolvedOrigin = (() => {
    if (wpOrigin) return wpOrigin
    const v = selectedDomain.trim()
    if (!v) return ''
    try {
      return new URL(v.includes('://') ? v : `https://${v}`).origin
    } catch {
      return ''
    }
  })()

  const { pushStatus, pushMessage, openPush } = useWpPush(resolvedOrigin)

  const handleConfirmPush = async () => {
    let keyToUse = apiKey && apiKey !== 'li2_sk_...' ? apiKey : null
    setIsCreatingKey(true)
    try {
      if (!keyToUse) {
        const name = `WooCommerce Integration ${Math.random().toString(36).slice(2, 7).toUpperCase()}`
        const result = await createApiKey.mutateAsync({
          name,
          key_type: ApiKeyType.USER,
          permissions: Object.values(ROLE_PERMISSION_KEYS) as RolePermissionKey[],
          expires_at: null,
        })
        keyToUse = result.secret_key
        setApiKey(keyToUse)
      }
      setConfirmOpen(false)
      const params: Record<string, string> = { api_key: keyToUse }
      if (trackAddToCart) params['track_add_to_cart'] = 'true'
      if (trackCheckout) params['track_checkout'] = 'true'
      openPush(params)
    } catch {
      // keep dialog open on error
    } finally {
      setIsCreatingKey(false)
    }
  }

  const pluginUrl = resolvedOrigin
    ? `${resolvedOrigin}/wp-admin/admin.php?page=li2-analytics`
    : null

  const StepLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
    >
      {children}
      <ExternalLink className="h-3 w-3 mb-0.5" />
    </a>
  )

  const manualSteps = [
    <>
      <button
        onClick={onOpenCreateKeyDialog}
        className="font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {t('onboarding.conversion.wp_step_generate_key')}
      </button>{' '}
      {t('onboarding.conversion.wp_step_generate_key_suffix')}
    </>,
    <>
      {t('onboarding.conversion.wp_step_open_plugin_prefix')}{' '}
      {pluginUrl ? (
        <StepLink href={pluginUrl}>Li2 Analytics</StepLink>
      ) : (
        <strong>Li2 Analytics</strong>
      )}{' '}
      {t('onboarding.conversion.wp_step_open_plugin_suffix')}
    </>,
    <>{t('onboarding.conversion.wp_step_paste_key')}</>,
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* WooCommerce question */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">
          {t('onboarding.conversion.woo_question')}
        </p>
        <div className="flex gap-2">
          {(
            [
              ['yes', t('onboarding.conversion.woo_yes')],
              ['no', t('onboarding.conversion.woo_no')],
            ] as [string, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setHasWooCommerce(val as 'yes' | 'no')}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                hasWooCommerce === val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* No WooCommerce */}
      {hasWooCommerce === 'no' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span>
            {t('onboarding.conversion.woo_no_info')}{' '}
            <button
              onClick={() => setFramework('http-api')}
              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {t('onboarding.conversion.woo_http_link')}
            </button>
          </span>
        </div>
      )}

      {/* WooCommerce = yes */}
      {hasWooCommerce === 'yes' && (
        <>
          {/* Site creatable combobox */}
          <SiteCombobox
            value={selectedDomain}
            onChange={setSelectedDomain}
            suggestions={allowedHostnames}
            detectedFromProvider={!!wpOrigin}
          />

          {/* Auto / Manual tabbed card */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Header: tabs left, configure button right */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex gap-1">
                {(
                  [
                    { id: 'auto', label: t('onboarding.conversion.wp_auto_tab') },
                    { id: 'manual', label: t('onboarding.conversion.wp_manual_tab') },
                  ] as { id: 'auto' | 'manual'; label: string }[]
                ).map((tab_item) => (
                  <button
                    key={tab_item.id}
                    onClick={() => setWooTab(tab_item.id)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      wooTab === tab_item.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {tab_item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              {wooTab === 'auto' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">
                    {t('onboarding.conversion.wp_auto_desc')}
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        id: 'add_to_cart',
                        label: t('onboarding.conversion.wp_track_add_to_cart'),
                        desc: t('onboarding.conversion.wp_track_add_to_cart_desc'),
                        value: trackAddToCart,
                        onChange: setTrackAddToCart,
                      },
                      {
                        id: 'checkout',
                        label: t('onboarding.conversion.wp_track_checkout'),
                        desc: t('onboarding.conversion.wp_track_checkout_desc'),
                        value: trackCheckout,
                        onChange: setTrackCheckout,
                      },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <div>
                          <Label
                            htmlFor={`woo-${item.id}`}
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            {item.label}
                          </Label>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <Switch
                          id={`woo-${item.id}`}
                          checked={item.value}
                          onCheckedChange={item.onChange}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setConfirmOpen(true)}
                      disabled={pushStatus === 'waiting' || !resolvedOrigin}
                      className="inline-flex items-center gap-1.5 h-8 w-fit px-3 rounded-md border border-input bg-background text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pushStatus === 'waiting' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />{' '}
                          {t('onboarding.conversion.wp_applying')}
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />{' '}
                          {t('onboarding.conversion.wp_auto_configure_btn')}
                        </>
                      )}
                    </button>
                    {pushStatus === 'waiting' && (
                      <p className="text-xs text-slate-400">
                        {t('onboarding.conversion.wp_waiting')}
                      </p>
                    )}
                    {pushStatus === 'success' && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {pushMessage}
                      </p>
                    )}
                    {pushStatus === 'error' && (
                      <p className="flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="h-3 w-3 shrink-0" />
                        {pushMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {wooTab === 'manual' && (
                <ol className="flex flex-col divide-y divide-slate-100">
                  {manualSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Confirm auto-configure dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('onboarding.conversion.wp_dialog_title')}</DialogTitle>
                <DialogDescription>
                  {apiKey && apiKey !== 'li2_sk_...'
                    ? t('onboarding.conversion.wp_dialog_desc_existing')
                    : t('onboarding.conversion.wp_dialog_desc_new')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isCreatingKey}
                >
                  {t('onboarding.conversion.wp_cancel')}
                </Button>
                <Button onClick={handleConfirmPush} disabled={isCreatingKey}>
                  {isCreatingKey ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('onboarding.conversion.wp_configuring')}
                    </>
                  ) : (
                    t('onboarding.conversion.wp_confirm')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

// ─── API params reference ─────────────────────────────────────────────────────

type ParamTab = 'lead' | 'sale'

const LEAD_PARAMS = [
  {
    name: 'click_id',
    type: 'string',
    required: true,
    description: 'Li2 click ID from the `_li2` URL parameter — used to attribute the lead',
  },
  {
    name: 'event_name',
    type: 'string',
    required: false,
    description: 'Custom event label (e.g. `signup`, `contact_form`)',
  },
  { name: 'email', type: 'string', required: false, description: 'Customer email address' },
  { name: 'phone', type: 'string', required: false, description: 'Customer phone number' },
  { name: 'name', type: 'string', required: false, description: 'Customer full name' },
  {
    name: 'external_id',
    type: 'string',
    required: false,
    description: 'Your internal user / customer ID',
  },
  {
    name: 'metadata',
    type: 'object',
    required: false,
    description: 'Any additional key-value pairs to store with the event',
  },
]

const SALE_PARAMS = [
  {
    name: 'external_id',
    type: 'string',
    required: false,
    description:
      'Your internal user / customer ID. At least one of `external_id` or `email` must be provided — if omitted, `email` is used to identify the customer',
  },
  {
    name: 'amount',
    type: 'integer',
    required: true,
    description: 'Sale amount in the smallest currency unit (cents). E.g. `9999` = $99.99',
  },
  {
    name: 'currency',
    type: 'string',
    required: false,
    description: 'Supported values: `usd` or `vnd`. Defaults to `usd`',
  },
  {
    name: 'event_name',
    type: 'string',
    required: false,
    description: 'Custom event label (e.g. `purchase`, `subscription`)',
  },
  {
    name: 'payment_processor',
    type: 'string',
    required: false,
    description: 'Payment processor name (e.g. `stripe`, `paypal`)',
  },
  {
    name: 'invoice_id',
    type: 'string',
    required: false,
    description: 'Your internal order or invoice ID',
  },
  {
    name: 'click_id',
    type: 'string',
    required: true,
    description:
      'Li2 click ID for attributed sales. Send empty string `""` for direct sales with no link attribution',
  },
  {
    name: 'email',
    type: 'string',
    required: false,
    description:
      'Customer email address. Used as identity fallback when `external_id` is not provided',
  },
  { name: 'name', type: 'string', required: false, description: 'Customer full name' },
  {
    name: 'avatar_url',
    type: 'string',
    required: false,
    description: 'URL to customer avatar image',
  },
  {
    name: 'metadata',
    type: 'object',
    required: false,
    description: 'Any additional key-value pairs to store with the event',
  },
]

const ApiParamsTable = ({ params }: { params: typeof LEAD_PARAMS }) => {
  const { t } = useTranslation('analytics_settings')
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-3 py-2 font-semibold text-slate-600 w-32">
              {t('onboarding.conversion.param_col_parameter')}
            </th>
            <th className="px-3 py-2 font-semibold text-slate-600 w-20">
              {t('onboarding.conversion.param_col_type')}
            </th>
            <th className="px-3 py-2 font-semibold text-slate-600 w-20">
              {t('onboarding.conversion.param_col_required')}
            </th>
            <th className="px-3 py-2 font-semibold text-slate-600">
              {t('onboarding.conversion.param_col_description')}
            </th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr
              key={p.name}
              className={cn(
                'border-b border-slate-100 last:border-0',
                i % 2 === 1 && 'bg-slate-50/50'
              )}
            >
              <td className="px-3 py-2 font-mono text-foreground">{p.name}</td>
              <td className="px-3 py-2 text-slate-500">{p.type}</td>
              <td className="px-3 py-2">
                {p.required ? (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                    {t('onboarding.conversion.param_required_badge')}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {t('onboarding.conversion.param_optional')}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-slate-600 leading-relaxed">
                {p.description.split(/`([^`]+)`/).map((part, j) =>
                  j % 2 === 1 ? (
                    <code key={j} className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                      {part}
                    </code>
                  ) : (
                    part
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ApiReferenceSection = () => {
  const { t } = useTranslation('analytics_settings')
  const [tab, setTab] = useState<ParamTab>('lead')

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Card header — always visible title */}
      <div className="px-4 py-3 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-700">
          {t('onboarding.conversion.api_reference_title')}
        </span>
      </div>

      {/* Tabs row — sits between header and content, not inside collapsed area */}
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {(
          [
            ['lead', 'trackLead'],
            ['sale', 'trackSale'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ApiParamsTable params={tab === 'lead' ? LEAD_PARAMS : SALE_PARAMS} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  org_id: string
  allowedHostnames: string[]
}

export const ConversionSetupGuide = ({ org_id, allowedHostnames }: Props) => {
  const { t } = useTranslation('analytics_settings')
  const { wpOrigin } = useSiteUrl()
  const [framework, setFramework] = useState<Framework>(wpOrigin ? 'wordpress' : 'javascript')
  const [debugOpen, setDebugOpen] = useState(false)
  const [apiKey, setApiKey] = useState('li2_sk_...')
  const createApiKey = useCreateApiKey(org_id)

  // Hidden wrapper ref to programmatically trigger CreateApiKeyDialog
  const createKeyTriggerRef = useRef<HTMLDivElement>(null)
  const openCreateKeyDialog = () => {
    createKeyTriggerRef.current?.querySelector<HTMLButtonElement>('button')?.click()
  }

  const needsApiKey = framework === 'nodejs' || framework === 'http-api'

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">{t('onboarding.conversion.subtitle')}</p>

      {/* Framework tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {FRAMEWORK_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFramework(tab.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              framework === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* API key banner — Node.js / HTTP API only */}
      {needsApiKey && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex flex-col gap-2 flex-1">
            <span>{t('onboarding.conversion.server_key_info')}</span>
            <div>
              <CreateApiKeyDialog
                onCreateApiKey={async (req) => {
                  const key = await createApiKey.mutateAsync(req)
                  setApiKey(key.secret_key)
                  return key
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* JS / React snippets */}
      {(framework === 'javascript' || framework === 'react') && (
        <CodeBlock
          section="conversion"
          tabs={[
            { label: t('onboarding.conversion.track_lead'), code: CLIENT_SNIPPETS[framework].lead },
            { label: t('onboarding.conversion.track_sale'), code: CLIENT_SNIPPETS[framework].sale },
          ]}
        />
      )}

      {/* Node.js snippets */}
      {framework === 'nodejs' && (
        <CodeBlock
          section="conversion"
          tabs={[
            { label: t('onboarding.conversion.track_lead'), code: nodeSnippets(apiKey).lead },
            { label: t('onboarding.conversion.track_sale'), code: nodeSnippets(apiKey).sale },
          ]}
        />
      )}

      {/* HTTP API */}
      {framework === 'http-api' && <HttpApiGuide apiKey={apiKey} />}

      {/* WordPress / WooCommerce */}
      {framework === 'wordpress' && (
        <>
          {/* Hidden CreateApiKeyDialog — triggered programmatically */}
          <div ref={createKeyTriggerRef} className="hidden" aria-hidden>
            <CreateApiKeyDialog
              onCreateApiKey={async (req) => {
                const key = await createApiKey.mutateAsync(req)
                setApiKey(key.secret_key)
                return key
              }}
            />
          </div>

          <WpSection
            org_id={org_id}
            allowedHostnames={allowedHostnames}
            apiKey={apiKey}
            setApiKey={setApiKey}
            onOpenCreateKeyDialog={openCreateKeyDialog}
            setFramework={setFramework}
          />
        </>
      )}

      {/* WooCommerce = no handled inside WpWooSection via setFramework */}
      {/* Non-WooCommerce note is removed — user selects HTTP API tab directly */}

      {/* API params reference — not shown for WordPress (plugin handles the API) */}
      {framework !== 'wordpress' && <ApiReferenceSection />}

      {/* Debug tools */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setDebugOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-700">
            {t('onboarding.conversion.debug_tools')}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', debugOpen && 'rotate-180')}
          />
        </button>
        {debugOpen && (
          <div className="border-t px-4 py-4">
            <DebugPanel org_id={org_id} />
          </div>
        )}
      </div>
    </div>
  )
}
