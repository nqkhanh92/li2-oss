'use client'

import { CodeBlock } from '@/shared/components/customize/code-block'
import { useTranslation } from 'react-i18next'

const buildSnippets = (apiKey: string) => ({
  leadCurl: `curl -X POST https://api.li2.ai/api/v1/track/lead \\
  -H "Content-Type: application/json" \\
  -H "X-Li2-API-Key: ${apiKey}" \\
  -d '{
    "click_id": "abc123",
    "event_name": "signup",
    "external_id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }'`,
  leadPhp: `<?php
$click_id = $_COOKIE['li_cid'] ?? null; // Li2 sets this cookie automatically

wp_remote_post('https://api.li2.ai/api/v1/track/lead', [
    'headers' => [
        'Content-Type' => 'application/json',
        'X-Li2-API-Key' => '${apiKey}',
    ],
    'body' => json_encode([
        'click_id'    => $click_id,
        'event_name'  => 'signup',
        'external_id' => $user_id,
        'email'       => $user_email,
        'name'        => $user_name,
    ]),
]);`,
  saleCurl: `curl -X POST https://api.li2.ai/api/v1/track/sale \\
  -H "Content-Type: application/json" \\
  -H "X-Li2-API-Key: ${apiKey}" \\
  -d '{
    "click_id": "abc123",
    "event_name": "purchase",
    "external_id": "user_123",
    "amount": 9900,
    "invoice_id": "inv_123",
    "payment_processor": "stripe",
    "currency": "usd"  // Supported: "usd" or "vnd"
  }'`,
  salePhp: `<?php
$click_id = $_COOKIE['li_cid'] ?? null;

wp_remote_post('https://api.li2.ai/api/v1/track/sale', [
    'headers' => [
        'Content-Type' => 'application/json',
        'X-Li2-API-Key' => '${apiKey}',
    ],
    'body' => json_encode([
        'click_id'          => $click_id,
        'event_name'        => 'purchase',
        'external_id'       => $user_id,
        'amount'            => $amount_in_cents, // e.g. 9900 for $99.00
        'invoice_id'        => $order_id,
        'payment_processor' => 'stripe',
        'currency'          => 'usd', // Supported: 'usd' or 'vnd'
    ]),
]);`,
})

interface Props {
  apiKey?: string
}

export const HttpApiGuide = ({ apiKey = 'li2_sk_...' }: Props) => {
  const { t } = useTranslation('analytics_settings')
  const s = buildSnippets(apiKey)
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">
        {t('onboarding.http_api.subtitle')}
      </p>

      {/* Endpoint reference */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-medium text-slate-700">{t('onboarding.http_api.endpoints_label')}</p>
        <div className="flex flex-col gap-1 font-mono text-xs text-slate-600">
          <span><span className="text-emerald-700 font-semibold">POST</span>  https://api.li2.ai/api/v1/track/lead</span>
          <span><span className="text-emerald-700 font-semibold">POST</span>  https://api.li2.ai/api/v1/track/sale</span>
        </div>
      </div>

      {/* Auth */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-700">{t('onboarding.http_api.auth_label')}</p>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono">X-Li2-API-Key</code>
          <span>{t('onboarding.http_api.auth_desc')}</span>
        </div>
      </div>

      {/* Lead */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">{t('onboarding.http_api.track_lead_title')}</p>
        <CodeBlock
          section="http-lead"
          tabs={[
            { label: 'cURL', code: s.leadCurl },
            { label: 'PHP', code: s.leadPhp },
          ]}
        />
      </div>

      {/* Sale */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">{t('onboarding.http_api.track_sale_title')}</p>
        <CodeBlock
          section="http-sale"
          tabs={[
            { label: 'cURL', code: s.saleCurl },
            { label: 'PHP', code: s.salePhp },
          ]}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-700 mb-2">{t('onboarding.http_api.notes_title')}</p>
        <ul className="flex flex-col gap-1.5 text-xs text-slate-600 list-disc list-inside">
          <li>{t('onboarding.http_api.note_click_id')}</li>
          <li>{t('onboarding.http_api.note_amount')}</li>
          <li>{t('onboarding.http_api.note_id_required')}</li>
          <li>{t('onboarding.http_api.note_sale_required')}</li>
        </ul>
      </div>
    </div>
  )
}
