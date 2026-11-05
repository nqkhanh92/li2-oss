'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { UserRound, Mail, Link2, MoveRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'
import type { CustomerProfile } from '../../types'

interface HeaderCardProps {
  customer: CustomerProfile
  org_id: string
}

export function HeaderCard({ customer, org_id }: HeaderCardProps) {
  const { t } = useTranslation('customers')
  const customerName = customer.name || customer.email || t('detail.anonymous', 'Anonymous')

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-2">
      {/* Row 1: avatar + name + badges */}
      <div className="flex items-center gap-1.5">
        <CustomAvatar name={customerName} email={customer.email} size={24} />
        <h1 className="text-l font-semibold text-foreground dark:text-slate-200 truncate">
          {customerName}
        </h1>
        {customer.is_anonymous && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 shrink-0"
          >
            {t('detail.anonymous_badge', 'Anonymous')}
          </Badge>
        )}
        {customer.merged_from_ids && customer.merged_from_ids.length > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 shrink-0"
          >
            {t('detail.merged_badge', 'Merged')}
          </Badge>
        )}
      </div>

      {/* Row 2: external id + mail */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {customer.external_id && (
          <div className="flex items-center gap-1">
            <UserRound className="h-4 w-4 text-secondary-blue shrink-0" />
            <span className="text-s text-foreground dark:text-slate-200">External ID:</span>
            <span className="text-s text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {customer.external_id}
            </span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4 text-secondary-blue shrink-0" />
            <span className="text-s text-foreground dark:text-slate-200">Mail:</span>
            <a
              href={`mailto:${customer.email}`}
              className="text-s text-slate-500 dark:text-slate-400 truncate max-w-[220px] hover:text-primary transition-colors"
            >
              {customer.email}
            </a>
          </div>
        )}
      </div>

      {/* Row 3: source link */}
      <div className="flex items-center gap-1">
        <Link2 className="h-4 w-4 text-secondary-blue shrink-0" />
        <span className="text-s text-foreground dark:text-slate-200 shrink-0">
          {t('detail.source_link', 'Source Link:')}
        </span>
        {customer.touch_points ? (
          <>
            <Link
              href={`/org/${org_id}/short-links/${customer.touch_points.id}`}
              className="text-s text-slate-600 dark:text-slate-400 hover:text-primary transition-colors truncate max-w-[140px]"
            >
              {customer.touch_points.name}
            </Link>
            {customer.touch_points.short_url && (
              <>
                <MoveRight className="h-3 w-3 text-slate-500 shrink-0" />
                <span className="text-s text-slate-500 dark:text-slate-400 truncate min-w-0">
                  {customer.touch_points.short_url}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-s text-slate-500 dark:text-slate-400">
            {t('detail.direct', 'Direct')}
          </span>
        )}
      </div>
    </div>
  )
}
