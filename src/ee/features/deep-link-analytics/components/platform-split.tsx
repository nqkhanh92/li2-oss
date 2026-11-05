'use client'

import { useTranslation } from 'react-i18next'
import { DeepLinkPie } from './deep-link-pie'

export function PlatformSplit({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation(['domain'])
  return (
    <DeepLinkPie
      title={t('domain:deepLink.analytics.platform_title')}
      data={data}
      labelFor={(key) => t(`domain:deepLink.analytics.platform.${key}`, { defaultValue: key })}
      emptyLabel="—"
    />
  )
}
