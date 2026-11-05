'use client'

import { CodeBlock } from '@/shared/components/customize/code-block'
import { useTranslation } from 'react-i18next'

interface Props {
  publishableKey: string
  autoPageview: boolean
  autoClicks: boolean
  autoScroll: boolean
  autoForms: boolean
}

export const ReactInstallGuide = ({ publishableKey, autoPageview, autoClicks, autoScroll, autoForms }: Props) => {
  const { t } = useTranslation('analytics_settings')
  const installSnippet = `npm install @li2/analytics
# or
pnpm add @li2/analytics`

  const options = [
    `  publishableKey: '${publishableKey}',`,
    autoPageview ? `  pageview: true,` : null,
    autoClicks ? `  clicks: true,` : null,
    autoScroll ? `  scroll: true,` : null,
    autoForms ? `  forms: true,` : null,
  ].filter(Boolean).join('\n')

  const initSnippet = `import { init } from '@li2/analytics'

// Add to your app's entry point (e.g., App.tsx or main.tsx)
init({
${options}
})`

  return (
    <div className="space-y-4">
      <CodeBlock code={installSnippet} section="install" title={t('onboarding.tag_installation.react_install_title')} />
      <CodeBlock code={initSnippet} section="init" title={t('onboarding.tag_installation.react_init_title')} />
    </div>
  )
}
