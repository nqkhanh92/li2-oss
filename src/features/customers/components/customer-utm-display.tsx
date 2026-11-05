'use client'

import { useTranslation } from 'react-i18next'
import { Link2, Target, Megaphone, Tag, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface UtmTags {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

interface CustomerUtmDisplayProps {
  utmTags: UtmTags | null
  referrer: string | null
}

const utmConfig = {
  utm_source: {
    icon: Link2,
    label: 'Source',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  utm_medium: {
    icon: Target,
    label: 'Medium',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  utm_campaign: {
    icon: Megaphone,
    label: 'Campaign',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  },
  utm_content: {
    icon: FileText,
    label: 'Content',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  utm_term: {
    icon: Tag,
    label: 'Term',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
}

export function CustomerUtmDisplay({ utmTags, referrer }: CustomerUtmDisplayProps) {
  const { t } = useTranslation('customers')

  const hasUtmData = utmTags && Object.values(utmTags).some((v) => v)

  // No data at all
  if (!hasUtmData && !referrer) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Link2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {t('detail.traffic_source', 'Traffic Source')}
          </h4>
        </div>
        <div className="pl-9">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
            {t('detail.direct_traffic', 'Direct traffic')}
          </span>
        </div>
      </div>
    )
  }

  // Parse referrer domain
  let referrerDomain: string | null = null
  if (referrer && !hasUtmData) {
    try {
      referrerDomain = new URL(referrer).hostname
    } catch {
      referrerDomain = referrer
    }
  }

  // Get active UTM params
  const activeUtmParams = Object.entries(utmConfig).filter(
    ([key]) => utmTags && utmTags[key as keyof UtmTags]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Megaphone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          {t('detail.traffic_source', 'Traffic Source')}
        </h4>
      </div>
      <div className="pl-9 space-y-2">
        {/* UTM Tags as badges */}
        {activeUtmParams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeUtmParams.map(([key, config]) => {
              const value = utmTags![key as keyof UtmTags]
              if (!value) return null
              const Icon = config.icon
              return (
                <span
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                    config.color
                  )}
                  title={`${config.label}: ${value}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{value}</span>
                </span>
              )
            })}
          </div>
        )}

        {/* Referrer (only if no UTM data) */}
        {referrerDomain && !hasUtmData && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate max-w-[150px]" title={referrer || ''}>
                {referrerDomain}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
