'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Key,
  Server,
  Monitor,
  ChevronDown,
  UserPlus,
  FileText,
  ShoppingCart,
  Code,
  ArrowLeft,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useAiSetup } from '@/features/analytics-settings/hooks/use-ai-setup'
import { composeConversionScript } from '@/features/analytics-settings/utils/compose-conversion-script'
import { useConversionTracking } from '../context'
import { CodeBlock } from '@/shared/components/customize/code-block'
import { CreateApiKeyDialog } from '@/features/api-keys/components/create-api-key-dialog'
import { useCreateApiKey } from '@/features/api-keys/hooks'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { CONVERSIONS_API_BASE_URL } from '@/core/constants/api'
import type { CreateApiKeyRequest, ApiKeyWithSecret } from '@/shared/types/api-key'
import type { ManualFramework } from './index'

type TrackingUseCase = 'lead_registration' | 'lead_form' | 'sale_purchase' | 'manual'
type TrackingMode = 'server' | 'client'
type ServerSubTab = 'node' | 'api'

const NODE_INSTALL_SNIPPET = `npm install @li2/analytics
# or
pnpm add @li2/analytics`

const buildNodeSnippets = (apiKey: string) => ({
  init: `import { initServer } from '@li2/analytics'

const li2 = initServer({
  apiKey: '${apiKey}', // Use process.env.LI2_API_KEY in production
})`,
  lead: `// clickId comes from the li_cid cookie set automatically by the client SDK,
// or from the ?uid= query parameter on your landing page.
const clickId = req.cookies['li_cid'] // or req.query.uid

await li2.trackLead({
  clickId,
  eventName: 'signup',
  customerExternalId: 'user_123',
  customerEmail: 'user@example.com',
})`,
  sale: `await li2.trackSale({
  clickId,
  customerExternalId: 'user_123',
  amount: 9999, // Amount in cents ($99.99)
  eventName: 'purchase',
  paymentProcessor: 'stripe',
  invoiceId: 'ORDER-123',
  currency: 'usd', // 'usd' or 'vnd'
})`,
})

const API_LEAD_TABS = [
  {
    label: 'HTTP',
    code: `POST ${CONVERSIONS_API_BASE_URL}/track/lead
X-Li2-API-Key: <YOUR_SECRET_API_KEY>
Content-Type: application/json

{
  "click_id": "uid_from_query_param",
  "event_name": "signup",
  "external_id": "user_123",
  "name": "John Doe",
  "email": "user@example.com",
  "metadata": { "source": "contact_form" }
}`,
  },
  {
    label: 'Python',
    code: `import requests

response = requests.post(
    "${CONVERSIONS_API_BASE_URL}/track/lead",
    headers={
        "X-Li2-API-Key": "<YOUR_SECRET_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "click_id": "uid_from_query_param",
        "event_name": "signup",
        "external_id": "user_123",
        "name": "John Doe",
        "email": "user@example.com",
        "metadata": {"source": "contact_form"},
    },
)
print(response.json())`,
  },
  {
    label: 'PHP',
    code: `<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => '${CONVERSIONS_API_BASE_URL}/track/lead',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'X-Li2-API-Key: <YOUR_SECRET_API_KEY>',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'click_id'    => 'uid_from_query_param',
        'event_name'  => 'signup',
        'external_id' => 'user_123',
        'name'        => 'John Doe',
        'email'       => 'user@example.com',
        'metadata'    => ['source' => 'contact_form'],
    ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
  },
]

const API_SALE_TABS = [
  {
    label: 'HTTP',
    code: `POST ${CONVERSIONS_API_BASE_URL}/track/sale
X-Li2-API-Key: <YOUR_SECRET_API_KEY>
Content-Type: application/json

{
  "external_id": "user_123",
  "amount": 9999,
  "click_id": "uid_from_query_param",
  "event_name": "purchase",
  "currency": "usd",
  "payment_processor": "stripe",
  "invoice_id": "ORDER-123"
}`,
  },
  {
    label: 'Python',
    code: `import requests

response = requests.post(
    "${CONVERSIONS_API_BASE_URL}/track/sale",
    headers={
        "X-Li2-API-Key": "<YOUR_SECRET_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "external_id": "user_123",
        "amount": 9999,
        "click_id": "uid_from_query_param",
        "event_name": "purchase",
        "currency": "usd",
        "payment_processor": "stripe",
        "invoice_id": "ORDER-123",
    },
)
print(response.json())`,
  },
  {
    label: 'PHP',
    code: `<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => '${CONVERSIONS_API_BASE_URL}/track/sale',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'X-Li2-API-Key: <YOUR_SECRET_API_KEY>',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'external_id'       => 'user_123',
        'amount'            => 9999,
        'click_id'          => 'uid_from_query_param',
        'event_name'        => 'purchase',
        'currency'          => 'usd',
        'payment_processor' => 'stripe',
        'invoice_id'        => 'ORDER-123',
    ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
  },
]

const SDK_LEAD_PARAMS = [
  {
    param: 'clickId',
    type: 'string',
    required: false,
    desc: 'The li_cid cookie or ?uid= query param — links the conversion to the original click',
  },
  {
    param: 'eventName',
    type: 'string',
    required: false,
    desc: 'Label for the event (e.g. "signup")',
  },
  { param: 'customerExternalId', type: 'string', required: false, desc: 'Your internal user ID' },
  { param: 'customerName', type: 'string', required: false, desc: "Customer's display name" },
  {
    param: 'customerEmail',
    type: 'string',
    required: false,
    desc: 'Customer email for deduplication',
  },
  {
    param: 'metadata',
    type: 'object',
    required: false,
    desc: 'Arbitrary key-value data attached to the event',
  },
]

const SDK_SALE_PARAMS = [
  {
    param: 'clickId',
    type: 'string',
    required: false,
    desc: 'The li_cid cookie or ?uid= query param',
  },
  { param: 'customerExternalId', type: 'string', required: true, desc: 'Your internal user ID' },
  {
    param: 'amount',
    type: 'number',
    required: true,
    desc: 'Sale amount in cents (e.g. 9999 = $99.99)',
  },
  {
    param: 'eventName',
    type: 'string',
    required: false,
    desc: 'Label for the event (e.g. "purchase")',
  },
  { param: 'currency', type: 'string', required: false, desc: '"usd" or "vnd" (default: "usd")' },
  {
    param: 'paymentProcessor',
    type: 'string',
    required: false,
    desc: 'Payment provider (e.g. "stripe", "paypal")',
  },
  { param: 'invoiceId', type: 'string', required: false, desc: 'Internal order or invoice ID' },
]

const API_LEAD_PARAMS = [
  {
    param: 'click_id',
    type: 'string',
    required: false,
    desc: 'The ?uid= query param or li_cid cookie — links the conversion to the original click',
  },
  {
    param: 'event_name',
    type: 'string',
    required: false,
    desc: 'Label for the event (e.g. "signup")',
  },
  { param: 'external_id', type: 'string', required: false, desc: 'Your internal user ID' },
  { param: 'name', type: 'string', required: false, desc: "Customer's display name" },
  { param: 'email', type: 'string', required: false, desc: 'Customer email for deduplication' },
  { param: 'phone', type: 'string', required: false, desc: "Customer's phone number" },
  {
    param: 'metadata',
    type: 'object',
    required: false,
    desc: 'Arbitrary key-value data attached to the event',
  },
]

const API_SALE_PARAMS = [
  { param: 'external_id', type: 'string', required: true, desc: 'Your internal user ID' },
  {
    param: 'amount',
    type: 'number',
    required: true,
    desc: 'Sale amount in cents (e.g. 9999 = $99.99)',
  },
  {
    param: 'click_id',
    type: 'string',
    required: false,
    desc: 'The ?uid= query param or li_cid cookie',
  },
  {
    param: 'event_name',
    type: 'string',
    required: false,
    desc: 'Label for the event (e.g. "purchase")',
  },
  { param: 'currency', type: 'string', required: false, desc: '"usd" or "vnd" (default: "usd")' },
  {
    param: 'payment_processor',
    type: 'string',
    required: false,
    desc: 'Payment provider (e.g. "stripe", "paypal")',
  },
  { param: 'invoice_id', type: 'string', required: false, desc: 'Internal order or invoice ID' },
  { param: 'name', type: 'string', required: false, desc: "Customer's display name" },
  { param: 'email', type: 'string', required: false, desc: 'Customer email' },
  {
    param: 'metadata',
    type: 'object',
    required: false,
    desc: 'Arbitrary key-value data attached to the event',
  },
]

function ParamsTable({
  rows,
}: {
  rows: { param: string; type: string; required: boolean; desc: string }[]
}) {
  const { t } = useTranslation('link_attribution_onboarding')
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              {t('v2.manual_guide.add_tracking.param_col')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              {t('v2.manual_guide.add_tracking.type_col')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              {t('v2.manual_guide.add_tracking.desc_col')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ param, type, required, desc }) => (
            <tr key={param}>
              <td className="px-4 py-2 font-mono text-xs text-primary whitespace-nowrap">
                {param}
                {required && (
                  <span className="ml-1.5 text-[10px] font-semibold text-red-500 uppercase tracking-wide">
                    {t('v2.manual_guide.add_tracking.required_badge')}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{type}</td>
              <td className="px-4 py-2 text-xs text-slate-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ParamsCollapsible({ sdkMode }: { sdkMode: boolean }) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [open, setOpen] = useState(false)

  const sections = sdkMode
    ? [
        { title: t('v2.manual_guide.add_tracking.sdk_lead_title'), rows: SDK_LEAD_PARAMS },
        { title: t('v2.manual_guide.add_tracking.sdk_sale_title'), rows: SDK_SALE_PARAMS },
      ]
    : [
        { title: t('v2.manual_guide.add_tracking.api_lead_title'), rows: API_LEAD_PARAMS },
        { title: t('v2.manual_guide.add_tracking.api_sale_title'), rows: API_SALE_PARAMS },
      ]

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>
            {sdkMode
              ? t('v2.manual_guide.add_tracking.sdk_params')
              : t('v2.manual_guide.add_tracking.api_params')}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-3">
        {sections.map((s) => (
          <div key={s.title} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-600 font-mono">{s.title}</p>
            <ParamsTable rows={s.rows} />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function LeadParamsCollapsible({ sdkMode }: { sdkMode: boolean }) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>
            {sdkMode
              ? t('v2.manual_guide.add_tracking.sdk_params')
              : t('v2.manual_guide.add_tracking.api_params')}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <ParamsTable rows={sdkMode ? SDK_LEAD_PARAMS : API_LEAD_PARAMS} />
      </CollapsibleContent>
    </Collapsible>
  )
}

function SaleParamsCollapsible({ sdkMode }: { sdkMode: boolean }) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>
            {sdkMode
              ? t('v2.manual_guide.add_tracking.sdk_params')
              : t('v2.manual_guide.add_tracking.api_params')}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <ParamsTable rows={sdkMode ? SDK_SALE_PARAMS : API_SALE_PARAMS} />
      </CollapsibleContent>
    </Collapsible>
  )
}

const CLIENT_HTML_LEAD = `li2Analytics.trackLead({
  eventName: 'signup',
  customerExternalId: 'user_123',
})`

const CLIENT_HTML_SALE = `li2Analytics.trackSale({
  amount: 9999, // Amount in cents ($99.99)
  customerExternalId: 'user_123',
  eventName: 'purchase',
})`

const CLIENT_REACT_LEAD = `import { trackLead } from '@li2/analytics'

await trackLead({
  eventName: 'signup',
  customerExternalId: 'user_123',
})`

const CLIENT_REACT_SALE = `import { trackSale } from '@li2/analytics'

await trackSale({
  amount: 9999, // Amount in cents ($99.99)
  customerExternalId: 'user_123',
  eventName: 'purchase',
})`

const USE_CASES: {
  id: TrackingUseCase
  icon: typeof UserPlus
  titleKey: string
  descKey: string
  color: {
    border: string
    hoverBorder: string
    bg: string
    hoverBg: string
    iconBg: string
    iconColor: string
    titleColor: string
  }
}[] = [
  {
    id: 'lead_registration',
    icon: UserPlus,
    titleKey: 'use_case_lead_registration',
    descKey: 'use_case_lead_registration_desc',
    color: {
      border: 'border-violet-200',
      hoverBorder: 'hover:border-violet-400',
      bg: 'bg-violet-50/60',
      hoverBg: 'hover:bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      titleColor: 'text-violet-900',
    },
  },
  {
    id: 'lead_form',
    icon: FileText,
    titleKey: 'use_case_lead_form',
    descKey: 'use_case_lead_form_desc',
    color: {
      border: 'border-sky-200',
      hoverBorder: 'hover:border-sky-400',
      bg: 'bg-sky-50/60',
      hoverBg: 'hover:bg-sky-50',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      titleColor: 'text-sky-900',
    },
  },
  {
    id: 'sale_purchase',
    icon: ShoppingCart,
    titleKey: 'use_case_sale_purchase',
    descKey: 'use_case_sale_purchase_desc',
    color: {
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      bg: 'bg-emerald-50/60',
      hoverBg: 'hover:bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-900',
    },
  },
  {
    id: 'manual',
    icon: Code,
    titleKey: 'use_case_manual',
    descKey: 'use_case_manual_desc',
    color: {
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      bg: 'bg-amber-50/60',
      hoverBg: 'hover:bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
    },
  },
]

function UseCaseSelector({ onSelect }: { onSelect: (useCase: TrackingUseCase) => void }) {
  const { t } = useTranslation('link_attribution_onboarding')
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-primary">
          {t('v2.manual_guide.add_tracking.use_case_title')}
        </p>
        <p className="text-s text-muted-foreground mt-0.5">
          {t('v2.manual_guide.add_tracking.use_case_subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {USE_CASES.map(({ id, icon: Icon, titleKey, descKey, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              'flex flex-col items-start gap-2.5 rounded-xl border-2 px-4 py-4 text-left transition-all hover:shadow-sm',
              color.border,
              color.hoverBorder,
              color.bg,
              color.hoverBg
            )}
          >
            <div
              className={cn('flex h-9 w-9 items-center justify-center rounded-lg', color.iconBg)}
            >
              <Icon className={cn('h-4.5 w-4.5', color.iconColor)} />
            </div>
            <div>
              <p className={cn('text-sm font-medium', color.titleColor)}>
                {t(`v2.manual_guide.add_tracking.${titleKey}`)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {t(`v2.manual_guide.add_tracking.${descKey}`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlaceholderContent({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete: () => void
}) {
  const { t } = useTranslation('link_attribution_onboarding')
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('v2.manual_guide.add_tracking.back_to_selection')}
      </button>
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {t('v2.manual_guide.add_tracking.placeholder_title')}
          </p>
          <p className="text-s text-muted-foreground mt-1 max-w-xs mx-auto">
            {t('v2.manual_guide.add_tracking.placeholder_desc')}
          </p>
        </div>
      </div>
      <div>
        <Button onClick={onComplete} size="sm">
          {t('v2.manual_guide.add_tracking.cta')}
        </Button>
      </div>
    </div>
  )
}

const buildFormSnippets = (apiKey: string) => ({
  init: `import { initServer } from '@li2/analytics'

const li2 = initServer({
  apiKey: '${apiKey}', // Use process.env.LI2_API_KEY in production
})`,
  track: `// Inside your form submission handler — after validating the form data
const clickId = req.cookies['li_cid'] // or req.query.uid

await li2.trackLead({
  clickId,
  eventName: 'Contact Form Submit',
  customerName: form.name,
  customerEmail: form.email,
  metadata: { source: 'contact_form' },
})`,
})

const API_FORM_TABS = [
  {
    label: 'HTTP',
    code: `POST ${CONVERSIONS_API_BASE_URL}/track/lead
X-Li2-API-Key: <YOUR_SECRET_API_KEY>
Content-Type: application/json

{
  "click_id": "uid_from_query_param",
  "event_name": "Contact Form Submit",
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "metadata": { "source": "contact_form" }
}`,
  },
  {
    label: 'Python',
    code: `import requests

response = requests.post(
    "${CONVERSIONS_API_BASE_URL}/track/lead",
    headers={
        "X-Li2-API-Key": "<YOUR_SECRET_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "click_id": "uid_from_query_param",
        "event_name": "Contact Form Submit",
        "name": "John Doe",
        "email": "user@example.com",
        "phone": "+1234567890",
        "metadata": {"source": "contact_form"},
    },
)
print(response.json())`,
  },
  {
    label: 'PHP',
    code: `<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => '${CONVERSIONS_API_BASE_URL}/track/lead',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'X-Li2-API-Key: <YOUR_SECRET_API_KEY>',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'click_id'   => 'uid_from_query_param',
        'event_name' => 'form_submit',
        'name'       => 'John Doe',
        'email'      => 'user@example.com',
        'phone'      => '+1234567890',
        'metadata'   => ['source' => 'contact_form'],
    ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
  },
]

type FormSubTab = 'node' | 'api'

function LeadFormContent({
  org_id,
  framework,
  onBack,
  onComplete,
}: {
  org_id: string
  framework: ManualFramework
  onBack: () => void
  onComplete: () => void
}) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { normalizedSiteUrl } = useConversionTracking()
  const [mode, setMode] = useState<TrackingMode>('server')
  const [subTab, setSubTab] = useState<FormSubTab>('node')
  const [apiKey, setApiKey] = useState('')
  const [manualPath, setManualPath] = useState('')
  const {
    state: aiState,
    submitManualPath,
    confirmSave,
    proceedWithConflicts,
    reset: resetAiSetup,
  } = useAiSetup(org_id)
  const [scriptPreviewOpen, setScriptPreviewOpen] = useState(false)
  const [conflictDeleteIds, setConflictDeleteIds] = useState<string[]>([])
  const scriptPreview = aiState.detectedSuggestion
    ? composeConversionScript(
        aiState.detectedSuggestion,
        aiState.detectedSuggestion.suggested_params
      )
    : ''

  const { mutateAsync: createApiKey } = useCreateApiKey(org_id)

  const handleCreateApiKey = async (request: CreateApiKeyRequest): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey(request)
    if (result.secret_key) setApiKey(result.secret_key)
    return result
  }

  const snippets = buildFormSnippets(apiKey || 'li2_sk_...')
  const clientFramework = framework === 'react' ? 'react' : 'html'

  const MODES: { id: TrackingMode; icon: typeof Server; labelKey: string; badgeKey?: string }[] = [
    { id: 'server', icon: Server, labelKey: 'mode_server', badgeKey: 'badge_recommended' },
    { id: 'client', icon: Monitor, labelKey: 'mode_client' },
  ]

  const SUBTABS: { id: FormSubTab; label: string }[] = [
    { id: 'node', label: t('v2.manual_guide.add_tracking.tab_node') },
    { id: 'api', label: t('v2.manual_guide.add_tracking.tab_api') },
  ]

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('v2.manual_guide.add_tracking.back_to_selection')}
      </button>

      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, labelKey, badgeKey }) => {
          const selected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                selected
                  ? 'border-primary bg-primary/[0.04] text-primary'
                  : 'border-border bg-card text-slate-500 hover:border-primary/30 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`v2.manual_guide.add_tracking.${labelKey}`)}</span>
              {badgeKey && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {t(`v2.manual_guide.add_tracking.${badgeKey}`)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {mode === 'client' && (
        <div className="flex flex-col gap-4">
          {/* AI Setup banner */}
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border transition-colors',
              aiState.phase === 'done'
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
                : aiState.phase === 'error'
                  ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                  : aiState.phase === 'conflicting-scripts'
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                    : 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50'
            )}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-200/25 blur-2xl pointer-events-none" />

            {aiState.phase === 'conflicting-scripts' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t('v2.manual_guide.add_tracking.ai_conflict_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_conflict_desc')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {aiState.conflictingScripts.map((script) => {
                    const checked = conflictDeleteIds.includes(script.id)
                    return (
                      <label
                        key={script.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                          checked
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setConflictDeleteIds((prev) =>
                              e.target.checked
                                ? [...prev, script.id]
                                : prev.filter((id) => id !== script.id)
                            )
                          }
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              checked ? 'text-red-700 line-through' : 'text-slate-700'
                            )}
                          >
                            {script.name}
                          </p>
                          {script.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {script.description}
                            </p>
                          )}
                        </div>
                        {checked && <Trash2 className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />}
                      </label>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      proceedWithConflicts(conflictDeleteIds)
                      setConflictDeleteIds([])
                    }}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {conflictDeleteIds.length > 0
                      ? t('v2.manual_guide.add_tracking.ai_conflict_delete_n', {
                          count: conflictDeleteIds.length,
                        })
                      : t('v2.manual_guide.add_tracking.ai_conflict_keep_all')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAiSetup}>
                    {t('v2.manual_guide.add_tracking.ai_conflict_cancel')}
                  </Button>
                </div>
              </div>
            ) : aiState.phase === 'confirming' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <Sparkles className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      {t('v2.manual_guide.add_tracking.ai_confirm_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-violet-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_confirm_desc')}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      {t('v2.manual_guide.add_tracking.ai_confirm_event_badge')}
                    </span>
                    <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {aiState.detectedSuggestion?.event_name}
                    </code>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {aiState.detectedSuggestion?.trigger.type.replace(/_/g, ' ')}
                      {aiState.detectedSuggestion?.trigger.selector && (
                        <>
                          {' '}
                          on{' '}
                          <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 not-capitalize">
                            {aiState.detectedSuggestion.trigger.selector}
                          </code>
                        </>
                      )}
                      {aiState.detectedSuggestion?.trigger.page_path && (
                        <>
                          {' '}
                          at{' '}
                          <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 not-capitalize">
                            {aiState.detectedSuggestion.trigger.page_path}
                          </code>
                        </>
                      )}
                    </span>
                  </div>
                  {aiState.detectedSuggestion?.description && (
                    <p className="text-xs text-slate-500">
                      {aiState.detectedSuggestion.description}
                    </p>
                  )}
                </div>
                {(aiState.detectedSuggestion?.suggested_params?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-slate-600">
                      {t('v2.manual_guide.add_tracking.ai_confirm_fields_title')}
                    </p>
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {aiState.detectedSuggestion!.suggested_params.map((param, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                          <code className="text-[11px] font-mono text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded shrink-0">
                            {param.sdk_param}
                          </code>
                          <span className="text-xs text-slate-600 flex-1 min-w-0">
                            {param.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Collapsible open={scriptPreviewOpen} onOpenChange={setScriptPreviewOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span>{t('v2.manual_guide.add_tracking.ai_confirm_view_script')}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-slate-400 transition-transform',
                          scriptPreviewOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5">
                    <CodeBlock code={scriptPreview} section="ai-form-script-preview" />
                  </CollapsibleContent>
                </Collapsible>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={confirmSave}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {t('v2.manual_guide.add_tracking.ai_confirm_save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAiSetup}>
                    {t('v2.manual_guide.add_tracking.ai_confirm_retry')}
                  </Button>
                </div>
              </div>
            ) : aiState.phase === 'scanning-site' ||
              aiState.phase === 'opening-tab' ||
              aiState.phase === 'awaiting-page' ||
              aiState.phase === 'detecting-form' ? (
              (() => {
                const steps: { label: string; done: boolean; active: boolean }[] = [
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_find_page'),
                    done: aiState.phase !== 'scanning-site',
                    active: aiState.phase === 'scanning-site',
                  },
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_scan_content'),
                    done: aiState.phase === 'detecting-form',
                    active: aiState.phase === 'opening-tab' || aiState.phase === 'awaiting-page',
                  },
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_analyze'),
                    done: false,
                    active: aiState.phase === 'detecting-form',
                  },
                ]
                const activeLabel =
                  aiState.phase === 'scanning-site'
                    ? t('v2.manual_guide.add_tracking.ai_active_finding')
                    : aiState.phase === 'detecting-form'
                      ? t('v2.manual_guide.add_tracking.ai_active_analyzing')
                      : t('v2.manual_guide.add_tracking.ai_active_scanning')
                return (
                  <div className="relative px-4 py-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Loader2 className="h-4.5 w-4.5 text-violet-600 animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-violet-900">{activeLabel}</p>
                        <p className="mt-0.5 text-xs text-violet-700/80">
                          {t('v2.manual_guide.add_tracking.ai_active_tab_hint')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-1">
                      {steps.map((step) => (
                        <div
                          key={step.label}
                          className={cn(
                            'flex items-center gap-2 text-xs',
                            step.done
                              ? 'text-emerald-600'
                              : step.active
                                ? 'text-violet-700 font-medium'
                                : 'text-slate-400'
                          )}
                        >
                          {step.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          ) : step.active ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          ) : (
                            <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                          )}
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : aiState.phase === 'idle' || aiState.phase === 'awaiting-path-input' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <Sparkles className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      {t('v2.manual_guide.add_tracking.ai_idle_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-violet-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_form_path_desc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitManualPath(manualPath)}
                    placeholder={`${normalizedSiteUrl}/contact`}
                    className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                  <Button
                    size="sm"
                    onClick={() => submitManualPath(manualPath)}
                    className="bg-violet-600 text-white hover:bg-violet-700 shrink-0"
                  >
                    {t('v2.manual_guide.add_tracking.ai_path_cta')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative px-4 py-4 flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    aiState.phase === 'done'
                      ? 'bg-emerald-100'
                      : aiState.phase === 'error'
                        ? 'bg-red-100'
                        : 'bg-violet-100'
                  )}
                >
                  {aiState.phase === 'done' ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  ) : aiState.phase === 'error' ? (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  ) : aiState.phase === 'saving' ? (
                    <Loader2 className="h-4.5 w-4.5 text-violet-600 animate-spin" />
                  ) : (
                    <Sparkles className="h-4.5 w-4.5 text-violet-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {aiState.phase === 'done' ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-900">
                        {t('v2.manual_guide.add_tracking.ai_done_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700/80 leading-relaxed">
                        {t('v2.manual_guide.add_tracking.ai_done_desc', {
                          name: aiState.savedScriptName,
                        })}
                      </p>
                    </>
                  ) : aiState.phase === 'error' ? (
                    <>
                      <p className="text-sm font-semibold text-red-800">
                        {t('v2.manual_guide.add_tracking.ai_error_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-red-600/90 leading-relaxed">
                        {aiState.errorMessage}
                      </p>
                    </>
                  ) : aiState.phase === 'saving' ? (
                    <>
                      <p className="text-sm font-semibold text-violet-900">
                        {t('v2.manual_guide.add_tracking.ai_saving_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-violet-700/80">
                        {t('v2.manual_guide.add_tracking.ai_saving_desc')}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="shrink-0">
                  {aiState.phase === 'saving' && (
                    <Button size="sm" disabled className="bg-violet-600 text-white opacity-60">
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      {t('v2.manual_guide.add_tracking.ai_saving_cta')}
                    </Button>
                  )}
                  {aiState.phase === 'done' && (
                    <Button size="sm" variant="outline" onClick={onComplete}>
                      {t('v2.manual_guide.add_tracking.ai_done_cta')}
                    </Button>
                  )}
                  {aiState.phase === 'error' && (
                    <Button
                      size="sm"
                      onClick={resetAiSetup}
                      className="bg-violet-600 text-white hover:bg-violet-700"
                    >
                      {t('v2.manual_guide.add_tracking.ai_error_cta')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or add manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-700">
                {t('v2.manual_guide.add_tracking.lead_event_title')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('v2.manual_guide.add_tracking.lead_event_desc')}
              </p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700">
                  {t('v2.manual_guide.add_tracking.click_id_title')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('v2.manual_guide.add_tracking.client_click_id_note')}
                </p>
              </div>
              <CodeBlock
                code={clientFramework === 'react' ? CLIENT_REACT_LEAD : CLIENT_HTML_LEAD}
                section="form-client-lead"
                title={clientFramework === 'react' ? 'React / NPM' : 'HTML'}
              />
            </div>
          </div>
          <LeadParamsCollapsible sdkMode={true} />
        </div>
      )}

      {mode === 'server' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
            <Key className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('v2.manual_guide.add_tracking.api_key_title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('v2.manual_guide.add_tracking.api_key_desc')}
                </p>
              </div>
              <CreateApiKeyDialog onCreateApiKey={handleCreateApiKey} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
              {SUBTABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    subTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-4 flex flex-col gap-3">
              {subTab === 'node' && (
                <>
                  <CodeBlock
                    code={NODE_INSTALL_SNIPPET}
                    section="form-node-install"
                    title={t('v2.manual_guide.add_tracking.node_install_title')}
                  />
                  <CodeBlock
                    code={snippets.init}
                    section="form-node-init"
                    title={t('v2.manual_guide.add_tracking.node_init_title')}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-700">
                      {t('v2.manual_guide.add_tracking.click_id_title')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('v2.manual_guide.add_tracking.click_id_desc')
                        .split('li_cid')
                        .map((part, i) =>
                          i === 0 ? (
                            part
                          ) : (
                            <>
                              <code key={i} className="font-mono text-xs bg-slate-100 px-1 rounded">
                                li_cid
                              </code>
                              {part}
                            </>
                          )
                        )}
                    </p>
                  </div>
                  <CodeBlock
                    code={snippets.track}
                    section="form-node-track"
                    title="Track form submit lead"
                  />
                </>
              )}
              {subTab === 'api' && (
                <>
                  <p className="text-xs text-slate-500">
                    {t('v2.manual_guide.add_tracking.api_desc')
                      .split(/(click_id|\?uid=|li_cid)/)
                      .map((part, i) =>
                        ['click_id', '?uid=', 'li_cid'].includes(part) ? (
                          <code key={i} className="font-mono bg-slate-100 px-1 rounded">
                            {part}
                          </code>
                        ) : (
                          part
                        )
                      )}
                  </p>
                  <CodeBlock
                    tabs={API_FORM_TABS}
                    section="form-api-track"
                    title="Track form submit lead"
                  />
                </>
              )}
            </div>
          </div>
          <LeadParamsCollapsible sdkMode={subTab === 'node'} />
        </div>
      )}

      <div>
        <Button onClick={onComplete} size="sm">
          {t('v2.manual_guide.add_tracking.cta')}
        </Button>
      </div>
    </div>
  )
}

type SaleSubTab = 'node' | 'api'

function SalePurchaseContent({
  org_id,
  framework,
  onBack,
  onComplete,
}: {
  org_id: string
  framework: ManualFramework
  onBack: () => void
  onComplete: () => void
}) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [mode, setMode] = useState<TrackingMode>('server')
  const [subTab, setSubTab] = useState<SaleSubTab>('node')
  const [apiKey, setApiKey] = useState('')

  const { mutateAsync: createApiKey } = useCreateApiKey(org_id)

  const handleCreateApiKey = async (request: CreateApiKeyRequest): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey(request)
    if (result.secret_key) setApiKey(result.secret_key)
    return result
  }

  const snippets = buildNodeSnippets(apiKey || 'li2_sk_...')
  const clientFramework = framework === 'react' ? 'react' : 'html'

  const MODES: { id: TrackingMode; icon: typeof Server; labelKey: string; badgeKey?: string }[] = [
    { id: 'server', icon: Server, labelKey: 'mode_server', badgeKey: 'badge_recommended' },
    { id: 'client', icon: Monitor, labelKey: 'mode_client' },
  ]

  const SUBTABS: { id: SaleSubTab; label: string }[] = [
    { id: 'node', label: t('v2.manual_guide.add_tracking.tab_node') },
    { id: 'api', label: t('v2.manual_guide.add_tracking.tab_api') },
  ]

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('v2.manual_guide.add_tracking.back_to_selection')}
      </button>

      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, labelKey, badgeKey }) => {
          const selected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                selected
                  ? 'border-primary bg-primary/[0.04] text-primary'
                  : 'border-border bg-card text-slate-500 hover:border-primary/30 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`v2.manual_guide.add_tracking.${labelKey}`)}</span>
              {badgeKey && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {t(`v2.manual_guide.add_tracking.${badgeKey}`)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {mode === 'server' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
            <Key className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('v2.manual_guide.add_tracking.api_key_title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('v2.manual_guide.add_tracking.api_key_desc')}
                </p>
              </div>
              <CreateApiKeyDialog onCreateApiKey={handleCreateApiKey} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
              {SUBTABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    subTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-4 flex flex-col gap-3">
              {subTab === 'node' && (
                <>
                  <CodeBlock
                    code={NODE_INSTALL_SNIPPET}
                    section="sale-node-install"
                    title={t('v2.manual_guide.add_tracking.node_install_title')}
                  />
                  <CodeBlock
                    code={snippets.init}
                    section="sale-node-init"
                    title={t('v2.manual_guide.add_tracking.node_init_title')}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-700">
                      {t('v2.manual_guide.add_tracking.click_id_title')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('v2.manual_guide.add_tracking.click_id_desc')
                        .split('li_cid')
                        .map((part, i) =>
                          i === 0 ? (
                            part
                          ) : (
                            <>
                              <code key={i} className="font-mono text-xs bg-slate-100 px-1 rounded">
                                li_cid
                              </code>
                              {part}
                            </>
                          )
                        )}
                    </p>
                  </div>
                  <CodeBlock
                    code={snippets.sale}
                    section="sale-node-track"
                    title="Track purchase"
                  />
                </>
              )}
              {subTab === 'api' && (
                <>
                  <p className="text-xs text-slate-500">
                    {t('v2.manual_guide.add_tracking.api_desc')
                      .split(/(click_id|\?uid=|li_cid)/)
                      .map((part, i) =>
                        ['click_id', '?uid=', 'li_cid'].includes(part) ? (
                          <code key={i} className="font-mono bg-slate-100 px-1 rounded">
                            {part}
                          </code>
                        ) : (
                          part
                        )
                      )}
                  </p>
                  <CodeBlock tabs={API_SALE_TABS} section="sale-api-track" title="Track purchase" />
                </>
              )}
            </div>
          </div>

          <SaleParamsCollapsible sdkMode={subTab === 'node'} />
        </div>
      )}

      {mode === 'client' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-amber-200 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200 bg-amber-50">
              <p className="text-sm font-medium text-slate-700">
                {t('v2.manual_guide.add_tracking.sale_event_title')}
              </p>
              <div className="flex items-start gap-1.5 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-amber-700">
                  {t('v2.manual_guide.add_tracking.sale_event_warning')}
                </p>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700">
                  {t('v2.manual_guide.add_tracking.click_id_title')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('v2.manual_guide.add_tracking.client_click_id_note')}
                </p>
              </div>
              <CodeBlock
                code={clientFramework === 'react' ? CLIENT_REACT_SALE : CLIENT_HTML_SALE}
                section="sale-client-track"
                title={clientFramework === 'react' ? 'React / NPM' : 'HTML'}
              />
            </div>
          </div>
          <SaleParamsCollapsible sdkMode={true} />
        </div>
      )}

      <div>
        <Button onClick={onComplete} size="sm">
          {t('v2.manual_guide.add_tracking.cta')}
        </Button>
      </div>
    </div>
  )
}

const buildRegistrationSnippets = (apiKey: string) => ({
  init: `import { initServer } from '@li2/analytics'

const li2 = initServer({
  apiKey: '${apiKey}', // Use process.env.LI2_API_KEY in production
})`,
  track: `// Inside your registration handler — after the user record is created
const clickId = req.cookies['li_cid'] // or req.query.uid

await li2.trackLead({
  clickId,
  eventName: 'registration',
  customerExternalId: user.id,    // your DB user ID
  customerEmail: user.email,
})`,
})

const API_REGISTRATION_TABS = [
  {
    label: 'HTTP',
    code: `POST ${CONVERSIONS_API_BASE_URL}/track/lead
X-Li2-API-Key: <YOUR_SECRET_API_KEY>
Content-Type: application/json

{
  "click_id": "uid_from_query_param",
  "event_name": "registration",
  "external_id": "user_id_from_db",
  "email": "user@example.com"
}`,
  },
  {
    label: 'Python',
    code: `import requests

response = requests.post(
    "${CONVERSIONS_API_BASE_URL}/track/lead",
    headers={
        "X-Li2-API-Key": "<YOUR_SECRET_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "click_id": "uid_from_query_param",
        "event_name": "registration",
        "external_id": "user_id_from_db",
        "email": "user@example.com",
    },
)
print(response.json())`,
  },
  {
    label: 'PHP',
    code: `<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => '${CONVERSIONS_API_BASE_URL}/track/lead',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'X-Li2-API-Key: <YOUR_SECRET_API_KEY>',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'click_id'   => 'uid_from_query_param',
        'event_name' => 'registration',
        'external_id'=> 'user_id_from_db',
        'email'      => 'user@example.com',
    ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
  },
]

type RegistrationSubTab = 'node' | 'api'

function LeadRegistrationContent({
  org_id,
  framework,
  onBack,
  onComplete,
}: {
  org_id: string
  framework: ManualFramework
  onBack: () => void
  onComplete: () => void
}) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { normalizedSiteUrl } = useConversionTracking()
  const [mode, setMode] = useState<TrackingMode>('server')
  const [subTab, setSubTab] = useState<RegistrationSubTab>('node')
  const [apiKey, setApiKey] = useState('')
  const [manualPath, setManualPath] = useState('/register')
  const {
    state: aiState,
    start: startAiSetup,
    submitManualPath,
    confirmSave,
    proceedWithConflicts,
    reset: resetAiSetup,
  } = useAiSetup(org_id)
  const [scriptPreviewOpen, setScriptPreviewOpen] = useState(false)
  const [conflictDeleteIds, setConflictDeleteIds] = useState<string[]>([])
  const scriptPreview = aiState.detectedSuggestion
    ? composeConversionScript(
        aiState.detectedSuggestion,
        aiState.detectedSuggestion.suggested_params
      )
    : ''

  const { mutateAsync: createApiKey } = useCreateApiKey(org_id)

  const handleCreateApiKey = async (request: CreateApiKeyRequest): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey(request)
    if (result.secret_key) setApiKey(result.secret_key)
    return result
  }

  const snippets = buildRegistrationSnippets(apiKey || 'li2_sk_...')
  const clientFramework = framework === 'react' ? 'react' : 'html'

  const MODES: { id: TrackingMode; icon: typeof Server; labelKey: string; badgeKey?: string }[] = [
    { id: 'server', icon: Server, labelKey: 'mode_server', badgeKey: 'badge_recommended' },
    { id: 'client', icon: Monitor, labelKey: 'mode_client' },
  ]

  const SUBTABS: { id: RegistrationSubTab; label: string }[] = [
    { id: 'node', label: t('v2.manual_guide.add_tracking.tab_node') },
    { id: 'api', label: t('v2.manual_guide.add_tracking.tab_api') },
  ]

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('v2.manual_guide.add_tracking.back_to_selection')}
      </button>

      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, labelKey, badgeKey }) => {
          const selected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                selected
                  ? 'border-primary bg-primary/[0.04] text-primary'
                  : 'border-border bg-card text-slate-500 hover:border-primary/30 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`v2.manual_guide.add_tracking.${labelKey}`)}</span>
              {badgeKey && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {t(`v2.manual_guide.add_tracking.${badgeKey}`)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {mode === 'client' && (
        <div className="flex flex-col gap-4">
          {/* AI Setup banner */}
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border transition-colors',
              aiState.phase === 'done'
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
                : aiState.phase === 'error'
                  ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                  : aiState.phase === 'awaiting-path-input' ||
                      aiState.phase === 'conflicting-scripts'
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                    : 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50'
            )}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-200/25 blur-2xl pointer-events-none" />

            {/* Conflicting scripts phase — existing scripts on same site */}
            {aiState.phase === 'conflicting-scripts' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t('v2.manual_guide.add_tracking.ai_conflict_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_conflict_desc')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {aiState.conflictingScripts.map((script) => {
                    const checked = conflictDeleteIds.includes(script.id)
                    return (
                      <label
                        key={script.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                          checked
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setConflictDeleteIds((prev) =>
                              e.target.checked
                                ? [...prev, script.id]
                                : prev.filter((id) => id !== script.id)
                            )
                          }
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              checked ? 'text-red-700 line-through' : 'text-slate-700'
                            )}
                          >
                            {script.name}
                          </p>
                          {script.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {script.description}
                            </p>
                          )}
                        </div>
                        {checked && <Trash2 className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />}
                      </label>
                    )
                  })}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      proceedWithConflicts(conflictDeleteIds)
                      setConflictDeleteIds([])
                    }}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {conflictDeleteIds.length > 0
                      ? t('v2.manual_guide.add_tracking.ai_conflict_delete_n', {
                          count: conflictDeleteIds.length,
                        })
                      : t('v2.manual_guide.add_tracking.ai_conflict_keep_all')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAiSetup}>
                    {t('v2.manual_guide.add_tracking.ai_conflict_cancel')}
                  </Button>
                </div>
              </div>
            ) : aiState.phase === 'confirming' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <Sparkles className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      {t('v2.manual_guide.add_tracking.ai_confirm_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-violet-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_confirm_desc')}
                    </p>
                  </div>
                </div>

                {/* Event summary */}
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      {t('v2.manual_guide.add_tracking.ai_confirm_event_badge')}
                    </span>
                    <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {aiState.detectedSuggestion?.event_name}
                    </code>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {aiState.detectedSuggestion?.trigger.type.replace(/_/g, ' ')}
                      {aiState.detectedSuggestion?.trigger.selector && (
                        <>
                          {' '}
                          on{' '}
                          <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 not-capitalize">
                            {aiState.detectedSuggestion.trigger.selector}
                          </code>
                        </>
                      )}
                      {aiState.detectedSuggestion?.trigger.page_path && (
                        <>
                          {' '}
                          at{' '}
                          <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 not-capitalize">
                            {aiState.detectedSuggestion.trigger.page_path}
                          </code>
                        </>
                      )}
                    </span>
                  </div>
                  {aiState.detectedSuggestion?.description && (
                    <p className="text-xs text-slate-500">
                      {aiState.detectedSuggestion.description}
                    </p>
                  )}
                </div>

                {/* Fields collected */}
                {(aiState.detectedSuggestion?.suggested_params?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-slate-600">
                      {t('v2.manual_guide.add_tracking.ai_confirm_fields_title')}
                    </p>
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {aiState.detectedSuggestion!.suggested_params.map((param, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                          <code className="text-[11px] font-mono text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded shrink-0">
                            {param.sdk_param}
                          </code>
                          <span className="text-xs text-slate-600 flex-1 min-w-0">
                            {param.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script preview — collapsed by default */}
                <Collapsible open={scriptPreviewOpen} onOpenChange={setScriptPreviewOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span>{t('v2.manual_guide.add_tracking.ai_confirm_view_script')}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-slate-400 transition-transform',
                          scriptPreviewOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5">
                    <CodeBlock code={scriptPreview} section="ai-script-preview" />
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={confirmSave}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {t('v2.manual_guide.add_tracking.ai_confirm_save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAiSetup}>
                    {t('v2.manual_guide.add_tracking.ai_confirm_retry')}
                  </Button>
                </div>
              </div>
            ) : /* Active detection phases — expanded step-by-step layout */
            aiState.phase === 'scanning-site' ||
              aiState.phase === 'opening-tab' ||
              aiState.phase === 'awaiting-page' ||
              aiState.phase === 'detecting-form' ? (
              (() => {
                const steps: { label: string; done: boolean; active: boolean }[] = [
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_find_page'),
                    done: aiState.phase !== 'scanning-site',
                    active: aiState.phase === 'scanning-site',
                  },
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_scan_content'),
                    done: aiState.phase === 'detecting-form',
                    active: aiState.phase === 'opening-tab' || aiState.phase === 'awaiting-page',
                  },
                  {
                    label: t('v2.manual_guide.add_tracking.ai_step_analyze'),
                    done: false,
                    active: aiState.phase === 'detecting-form',
                  },
                ]
                const activeLabel =
                  aiState.phase === 'scanning-site'
                    ? t('v2.manual_guide.add_tracking.ai_active_finding')
                    : aiState.phase === 'detecting-form'
                      ? t('v2.manual_guide.add_tracking.ai_active_analyzing')
                      : t('v2.manual_guide.add_tracking.ai_active_scanning')
                return (
                  <div className="relative px-4 py-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Loader2 className="h-4.5 w-4.5 text-violet-600 animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-violet-900">{activeLabel}</p>
                        <p className="mt-0.5 text-xs text-violet-700/80">
                          {t('v2.manual_guide.add_tracking.ai_active_tab_hint')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-1">
                      {steps.map((step) => (
                        <div
                          key={step.label}
                          className={cn(
                            'flex items-center gap-2 text-xs',
                            step.done
                              ? 'text-emerald-600'
                              : step.active
                                ? 'text-violet-700 font-medium'
                                : 'text-slate-400'
                          )}
                        >
                          {step.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          ) : step.active ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          ) : (
                            <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                          )}
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })() /* Path input phase — expanded layout */
            ) : aiState.phase === 'awaiting-path-input' ? (
              <div className="relative px-4 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <Sparkles className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t('v2.manual_guide.add_tracking.ai_path_title')}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700/80 leading-relaxed">
                      {t('v2.manual_guide.add_tracking.ai_path_desc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitManualPath(manualPath)}
                    placeholder={`${normalizedSiteUrl}/register`}
                    className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                  <Button
                    size="sm"
                    onClick={() => submitManualPath(manualPath)}
                    className="bg-violet-600 text-white hover:bg-violet-700 shrink-0"
                  >
                    {t('v2.manual_guide.add_tracking.ai_path_cta')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative px-4 py-4 flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    aiState.phase === 'done'
                      ? 'bg-emerald-100'
                      : aiState.phase === 'error'
                        ? 'bg-red-100'
                        : 'bg-violet-100'
                  )}
                >
                  {aiState.phase === 'done' ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  ) : aiState.phase === 'error' ? (
                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                  ) : aiState.phase === 'saving' ? (
                    <Loader2 className="h-4.5 w-4.5 text-violet-600 animate-spin" />
                  ) : (
                    <Sparkles className="h-4.5 w-4.5 text-violet-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {aiState.phase === 'done' ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-900">
                        {t('v2.manual_guide.add_tracking.ai_done_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700/80 leading-relaxed">
                        {t('v2.manual_guide.add_tracking.ai_done_desc', {
                          name: aiState.savedScriptName,
                        })}
                      </p>
                    </>
                  ) : aiState.phase === 'error' ? (
                    <>
                      <p className="text-sm font-semibold text-red-800">
                        {t('v2.manual_guide.add_tracking.ai_error_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-red-600/90 leading-relaxed">
                        {aiState.errorMessage}
                      </p>
                    </>
                  ) : aiState.phase === 'saving' ? (
                    <>
                      <p className="text-sm font-semibold text-violet-900">
                        {t('v2.manual_guide.add_tracking.ai_saving_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-violet-700/80">
                        {t('v2.manual_guide.add_tracking.ai_saving_desc')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-violet-900">
                        {t('v2.manual_guide.add_tracking.ai_idle_title')}
                      </p>
                      <p className="mt-0.5 text-xs text-violet-700/80 leading-relaxed">
                        {t('v2.manual_guide.add_tracking.ai_idle_desc')}
                      </p>
                    </>
                  )}
                </div>
                <div className="shrink-0">
                  {aiState.phase === 'idle' && (
                    <Button
                      size="sm"
                      onClick={startAiSetup}
                      className="bg-violet-600 text-white hover:bg-violet-700"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      {t('v2.manual_guide.add_tracking.ai_idle_cta')}
                    </Button>
                  )}
                  {aiState.phase === 'saving' && (
                    <Button size="sm" disabled className="bg-violet-600 text-white opacity-60">
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      {t('v2.manual_guide.add_tracking.ai_saving_cta')}
                    </Button>
                  )}
                  {aiState.phase === 'done' && (
                    <Button size="sm" variant="outline" onClick={onComplete}>
                      {t('v2.manual_guide.add_tracking.ai_done_cta')}
                    </Button>
                  )}
                  {aiState.phase === 'error' && (
                    <Button
                      size="sm"
                      onClick={resetAiSetup}
                      className="bg-violet-600 text-white hover:bg-violet-700"
                    >
                      {t('v2.manual_guide.add_tracking.ai_error_cta')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or add manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-700">
                {t('v2.manual_guide.add_tracking.lead_event_title')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('v2.manual_guide.add_tracking.lead_event_desc')}
              </p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700">
                  {t('v2.manual_guide.add_tracking.click_id_title')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('v2.manual_guide.add_tracking.client_click_id_note')}
                </p>
              </div>
              <CodeBlock
                code={clientFramework === 'react' ? CLIENT_REACT_LEAD : CLIENT_HTML_LEAD}
                section="reg-client-lead"
                title={clientFramework === 'react' ? 'React / NPM' : 'HTML'}
              />
            </div>
          </div>
          <LeadParamsCollapsible sdkMode={true} />
        </div>
      )}

      {mode === 'server' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
            <Key className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('v2.manual_guide.add_tracking.api_key_title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('v2.manual_guide.add_tracking.api_key_desc')}
                </p>
              </div>
              <CreateApiKeyDialog onCreateApiKey={handleCreateApiKey} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
              {SUBTABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    subTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-4 flex flex-col gap-3">
              {subTab === 'node' && (
                <>
                  <CodeBlock
                    code={NODE_INSTALL_SNIPPET}
                    section="reg-node-install"
                    title={t('v2.manual_guide.add_tracking.node_install_title')}
                  />
                  <CodeBlock
                    code={snippets.init}
                    section="reg-node-init"
                    title={t('v2.manual_guide.add_tracking.node_init_title')}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-700">
                      {t('v2.manual_guide.add_tracking.click_id_title')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('v2.manual_guide.add_tracking.click_id_desc')
                        .split('li_cid')
                        .map((part, i) =>
                          i === 0 ? (
                            part
                          ) : (
                            <>
                              <code key={i} className="font-mono text-xs bg-slate-100 px-1 rounded">
                                li_cid
                              </code>
                              {part}
                            </>
                          )
                        )}
                    </p>
                  </div>
                  <CodeBlock
                    code={snippets.track}
                    section="reg-node-track"
                    title="Track registration lead"
                  />
                </>
              )}
              {subTab === 'api' && (
                <>
                  <p className="text-xs text-slate-500">
                    {t('v2.manual_guide.add_tracking.api_desc')
                      .split(/(click_id|\?uid=|li_cid)/)
                      .map((part, i) =>
                        ['click_id', '?uid=', 'li_cid'].includes(part) ? (
                          <code key={i} className="font-mono bg-slate-100 px-1 rounded">
                            {part}
                          </code>
                        ) : (
                          part
                        )
                      )}
                  </p>
                  <CodeBlock
                    tabs={API_REGISTRATION_TABS}
                    section="reg-api-track"
                    title="Track registration lead"
                  />
                </>
              )}
            </div>
          </div>
          <LeadParamsCollapsible sdkMode={subTab === 'node'} />
        </div>
      )}

      <div>
        <Button onClick={onComplete} size="sm">
          {t('v2.manual_guide.add_tracking.cta')}
        </Button>
      </div>
    </div>
  )
}

interface Props {
  org_id: string
  framework: ManualFramework
  onComplete: () => void
}

export function StepAddTracking({ org_id, framework, onComplete }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const [selectedUseCase, setSelectedUseCase] = useState<TrackingUseCase | null>(null)
  const [mode, setMode] = useState<TrackingMode>('server')
  const [serverSubTab, setServerSubTab] = useState<ServerSubTab>('node')
  const [apiKey, setApiKey] = useState<string>('')

  const { mutateAsync: createApiKey } = useCreateApiKey(org_id)

  const handleCreateApiKey = async (request: CreateApiKeyRequest): Promise<ApiKeyWithSecret> => {
    const result = await createApiKey(request)
    if (result.secret_key) setApiKey(result.secret_key)
    return result
  }

  const nodeSnippets = buildNodeSnippets(apiKey || 'li2_sk_...')

  const MODES: { id: TrackingMode; icon: typeof Server; labelKey: string; badgeKey?: string }[] = [
    { id: 'server', icon: Server, labelKey: 'mode_server', badgeKey: 'badge_recommended' },
    { id: 'client', icon: Monitor, labelKey: 'mode_client' },
  ]

  const SERVER_SUBTABS: { id: ServerSubTab; labelKey: string }[] = [
    { id: 'node', labelKey: 'tab_node' },
    { id: 'api', labelKey: 'tab_api' },
  ]

  const clientFramework = framework === 'react' ? 'react' : 'html'

  if (!selectedUseCase) {
    return <UseCaseSelector onSelect={setSelectedUseCase} />
  }

  if (selectedUseCase === 'lead_registration') {
    return (
      <LeadRegistrationContent
        org_id={org_id}
        framework={framework}
        onBack={() => setSelectedUseCase(null)}
        onComplete={onComplete}
      />
    )
  }

  if (selectedUseCase === 'lead_form') {
    return (
      <LeadFormContent
        org_id={org_id}
        framework={framework}
        onBack={() => setSelectedUseCase(null)}
        onComplete={onComplete}
      />
    )
  }

  if (selectedUseCase === 'sale_purchase') {
    return (
      <SalePurchaseContent
        org_id={org_id}
        framework={framework}
        onBack={() => setSelectedUseCase(null)}
        onComplete={onComplete}
      />
    )
  }

  if (selectedUseCase !== 'manual') {
    return <PlaceholderContent onBack={() => setSelectedUseCase(null)} onComplete={onComplete} />
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setSelectedUseCase(null)}
        className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('v2.manual_guide.add_tracking.back_to_selection')}
      </button>
      <p className="text-s text-muted-foreground">{t('v2.manual_guide.add_tracking.subtitle')}</p>

      {/* Mode selector — large tabs */}
      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, labelKey, badgeKey }) => {
          const selected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                selected
                  ? 'border-primary bg-primary/[0.04] text-primary'
                  : 'border-border bg-card text-slate-500 hover:border-primary/30 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`v2.manual_guide.add_tracking.${labelKey}`)}</span>
              {badgeKey && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {t(`v2.manual_guide.add_tracking.${badgeKey}`)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Server-side content */}
      {mode === 'server' && (
        <div className="flex flex-col gap-4">
          {/* API Key section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
            <Key className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('v2.manual_guide.add_tracking.api_key_title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('v2.manual_guide.add_tracking.api_key_desc')}
                </p>
              </div>
              <CreateApiKeyDialog onCreateApiKey={handleCreateApiKey} />
            </div>
          </div>

          {/* Sub-tabs: Node.js SDK / REST API */}
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
              {SERVER_SUBTABS.map((tab) => {
                const selected = serverSubTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setServerSubTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      selected
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {t(`v2.manual_guide.add_tracking.${tab.labelKey}`)}
                  </button>
                )
              })}
            </div>

            <div className="p-4 flex flex-col gap-3">
              {serverSubTab === 'node' && (
                <>
                  <CodeBlock
                    code={NODE_INSTALL_SNIPPET}
                    section="node-install"
                    title={t('v2.manual_guide.add_tracking.node_install_title')}
                  />
                  <CodeBlock
                    code={nodeSnippets.init}
                    section="node-init"
                    title={t('v2.manual_guide.add_tracking.node_init_title')}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-700">
                      {t('v2.manual_guide.add_tracking.click_id_title')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('v2.manual_guide.add_tracking.click_id_desc')
                        .split('li_cid')
                        .map((part, i) =>
                          i === 0 ? (
                            part
                          ) : (
                            <>
                              <code key={i} className="font-mono text-xs bg-slate-100 px-1 rounded">
                                li_cid
                              </code>
                              {part}
                            </>
                          )
                        )}
                    </p>
                  </div>
                  <CodeBlock
                    code={nodeSnippets.lead}
                    section="node-lead"
                    title={t('v2.manual_guide.add_tracking.track_lead')}
                  />
                  <CodeBlock
                    code={nodeSnippets.sale}
                    section="node-sale"
                    title={t('v2.manual_guide.add_tracking.track_sale')}
                  />
                </>
              )}

              {serverSubTab === 'api' && (
                <>
                  <p className="text-xs text-slate-500">
                    {t('v2.manual_guide.add_tracking.api_desc')
                      .split(/(click_id|\?uid=|li_cid)/)
                      .map((part, i) =>
                        ['click_id', '?uid=', 'li_cid'].includes(part) ? (
                          <code key={i} className="font-mono bg-slate-100 px-1 rounded">
                            {part}
                          </code>
                        ) : (
                          part
                        )
                      )}
                  </p>
                  <CodeBlock
                    tabs={API_LEAD_TABS}
                    section="api-lead"
                    title={t('v2.manual_guide.add_tracking.track_lead')}
                  />
                  <CodeBlock
                    tabs={API_SALE_TABS}
                    section="api-sale"
                    title={t('v2.manual_guide.add_tracking.track_sale')}
                  />
                </>
              )}
            </div>
          </div>

          {/* Parameters collapsible */}
          <ParamsCollapsible sdkMode={serverSubTab === 'node'} />
        </div>
      )}

      {/* Client-side content */}
      {mode === 'client' && (
        <div className="flex flex-col gap-4">
          {/* Lead */}
          <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-700">
                {t('v2.manual_guide.add_tracking.lead_event_title')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('v2.manual_guide.add_tracking.lead_event_desc')}
              </p>
            </div>
            <div className="p-4">
              <CodeBlock
                code={clientFramework === 'react' ? CLIENT_REACT_LEAD : CLIENT_HTML_LEAD}
                section="client-lead"
                title={clientFramework === 'react' ? 'React / NPM' : 'HTML'}
              />
            </div>
          </div>

          {/* Sale — with inline warning as description */}
          <div className="rounded-xl border border-amber-200 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200 bg-amber-50">
              <p className="text-sm font-medium text-slate-700">
                {t('v2.manual_guide.add_tracking.sale_event_title')}
              </p>
              <div className="flex items-start gap-1.5 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-amber-700">
                  {t('v2.manual_guide.add_tracking.sale_event_warning')}
                </p>
              </div>
            </div>
            <div className="p-4">
              <CodeBlock
                code={clientFramework === 'react' ? CLIENT_REACT_SALE : CLIENT_HTML_SALE}
                section="client-sale"
                title={clientFramework === 'react' ? 'React / NPM' : 'HTML'}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Button onClick={onComplete} size="sm">
          {t('v2.manual_guide.add_tracking.cta')}
        </Button>
      </div>
    </div>
  )
}
