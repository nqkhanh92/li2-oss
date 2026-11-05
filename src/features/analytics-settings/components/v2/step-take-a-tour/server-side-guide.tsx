'use client'

import { CodeBlock } from '@/shared/components/customize/code-block'
import { useTranslation } from 'react-i18next'

const INSTALL_SNIPPET = `npm install @li2/analytics
# or
pnpm add @li2/analytics`

const INIT_SNIPPET = `import { initServer } from '@li2/analytics'

// Initialize once, reuse across your server
const li2 = initServer({
  apiKey: process.env.LI2_API_KEY, // Secret key — never expose client-side
})`

const CAPTURE_SNIPPET = `// Capture the clickId from query params on your landing page
// (The SDK stores this in a cookie automatically when using client-side init)

// Server-side: read clickId from the request
app.post('/api/signup', async (req, res) => {
  const { clickId, userId, email } = req.body

  await li2.trackLead({
    clickId,                    // Required for attribution
    customerExternalId: userId,
    customerEmail: email,
    eventName: 'signup',
  })

  res.json({ success: true })
})`

export const ServerSideGuide = () => {
  const { t } = useTranslation('analytics_settings')
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">
        {t('onboarding.server_side.subtitle')}
      </p>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('onboarding.server_side.prerequisites')}</p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('onboarding.server_side.prerequisites_desc')}
        </div>
      </div>

      <CodeBlock code={INSTALL_SNIPPET} section="install" title={t('onboarding.server_side.install_title')} />
      <CodeBlock code={INIT_SNIPPET} section="init" title={t('onboarding.server_side.init_title')} />
      <CodeBlock code={CAPTURE_SNIPPET} section="capture" title={t('onboarding.server_side.capture_title')} />
    </div>
  )
}
