'use client'

import { AnalyticsSettingsPanel } from '@/features/analytics-settings'
import { ConversionSettings } from '@/features/conversion-settings'
import { ApiKeysSettings } from '@/features/api-keys/components/api-keys-settings'
import { useTranslation } from 'react-i18next'
import { SETTING_SECTIONS } from '../../constants/sections'

export const DeveloperTab = () => {
  const { t } = useTranslation('setting')
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ANALYTICS_SETTINGS}>
        <span className="text-lg font-semibold text-foreground">
          {t('sidebar.developer.sub_label.analytics')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <AnalyticsSettingsPanel />
        </div>
      </div>

      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.CONVERSION_SETTINGS}>
        <span className="text-lg font-semibold text-foreground">
          {t('sidebar.developer.sub_label.conversion_settings')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <ConversionSettings />
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.API_KEYS}>
        <span className="text-lg font-semibold text-foreground">
          {t('sidebar.developer.sub_label.api_keys')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <ApiKeysSettings />
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start h-0 md:h-[calc(100svh-60px-52px-222px)]"></div>
    </div>
  )
}
