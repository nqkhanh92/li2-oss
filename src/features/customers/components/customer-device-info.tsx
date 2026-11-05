'use client'

import { useTranslation } from 'react-i18next'
import { Smartphone, Tablet, Globe, Cpu, Laptop } from 'lucide-react'
import { parseUserAgent } from '@/shared/lib/user-agent'

interface CustomerDeviceInfoProps {
  userAgent: string | null
  os: string | null // Fallback from visits.os
  platform: string | null // Fallback from visits.platform
}

export function CustomerDeviceInfo({ userAgent, os, platform }: CustomerDeviceInfoProps) {
  const { t } = useTranslation('customers')

  const parsed = parseUserAgent(userAgent)

  // Use parsed data, fallback to raw os/platform from visits
  const displayOs = parsed?.os?.name || os || null
  const displayOsVersion = parsed?.os?.version || ''
  const displayBrowser = parsed?.browser?.name || null
  const displayBrowserVersion = parsed?.browser?.version || ''
  const deviceType = parsed?.device?.type || (platform?.toLowerCase() as 'mobile' | 'tablet' | 'desktop') || 'desktop'

  // If no data available, don't render
  if (!displayOs && !displayBrowser && !deviceType) {
    return null
  }

  const DeviceIcon =
    deviceType === 'mobile' ? Smartphone : deviceType === 'tablet' ? Tablet : Laptop

  const deviceLabel =
    deviceType === 'mobile'
      ? t('detail.device.mobile', 'Mobile')
      : deviceType === 'tablet'
        ? t('detail.device.tablet', 'Tablet')
        : t('detail.device.desktop', 'Desktop')

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <DeviceIcon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          {t('detail.device_info', 'Device Info')}
        </h4>
      </div>
      <div className="pl-9 space-y-2">
        {/* Device type badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            <DeviceIcon className="h-3 w-3" />
            {deviceLabel}
          </span>
          {displayOs && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              <Cpu className="h-3 w-3" />
              {displayOs}
              {displayOsVersion && ` ${displayOsVersion}`}
            </span>
          )}
        </div>
        {displayBrowser && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            <span>
              {displayBrowser}
              {displayBrowserVersion && ` ${displayBrowserVersion}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
