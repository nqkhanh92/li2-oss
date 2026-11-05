'use client'

import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { formatLocation, countryCodeToFlag } from '@/shared/lib/location'

interface CustomerLocationDisplayProps {
  country: string | null
  city: string | null
  region: string | null
}

export function CustomerLocationDisplay({ country, city, region }: CustomerLocationDisplayProps) {
  const { t } = useTranslation('customers')

  const location = formatLocation(city, region, country)
  const flag = countryCodeToFlag(country)

  // Don't render if no location data
  if (location === 'Unknown location') {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          {t('detail.location', 'Location')}
        </h4>
      </div>
      <div className="flex items-center gap-2 pl-9">
        {flag && (
          <span className="text-lg" role="img" aria-label={country || 'country flag'}>
            {flag}
          </span>
        )}
        <span className="text-sm text-slate-700 dark:text-slate-300">{location}</span>
      </div>
    </div>
  )
}
