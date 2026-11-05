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

export const HtmlInstallGuide = ({ publishableKey, autoPageview, autoClicks, autoScroll, autoForms }: Props) => {
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'
  const { t } = useTranslation('analytics_settings')

  const attrs = [
    `    s.setAttribute("data-publishable-key", "${publishableKey}");`,
    isDev ? `    s.setAttribute("data-api-url", "https://example.com");` : null,
    autoPageview ? `    s.setAttribute("data-pageview", "true");` : null,
    autoClicks ? `    s.setAttribute("data-clicks", "true");` : null,
    autoScroll ? `    s.setAttribute("data-scroll", "true");` : null,
    autoForms ? `    s.setAttribute("data-forms", "true");` : null,
  ].filter(Boolean).join('\n')

  const snippet = `<script>
  !(function (c, n) {
    c[n] = c[n] || function () { (c[n].q = c[n].q || []).push(arguments); };
    ["trackLead", "trackSale", "trackEvent", "identify"].forEach((t) => (c[n][t] = (...a) => c[n](t, ...a)));
    var s = document.createElement("script");
    s.defer = 1;
    s.src = "https://unpkg.com/@li2/analytics/dist/index.global.js";
${attrs}
    document.head.appendChild(s);
  })(window, "li2Analytics");
</script>`

  return (
    <CodeBlock
      code={snippet}
      section="html"
      title={t('onboarding.tag_installation.html_snippet_title')}
    />
  )
}
