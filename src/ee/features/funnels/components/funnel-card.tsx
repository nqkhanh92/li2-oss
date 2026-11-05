'use client'

import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { FunnelWithStepCount } from '../types'
import { BarChart3, Calendar, Edit, Eye, Layers, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { AiBadge } from '@/features/smart-setup/components/ai-badge'

type FunnelCardProps = {
  funnel: FunnelWithStepCount
  orgId: string
  onDelete: (id: string) => void
}

export const FunnelCard = ({ funnel, orgId, onDelete }: FunnelCardProps) => {
  const { t } = useTranslation('funnels')
  const { dayjs } = useDayjs()
  const stepCount = funnel.funnel_steps?.[0]?.count ?? 0

  return (
    <div className="border border-slate-200 rounded-lg p-5 flex flex-col gap-3 bg-white hover:border-slate-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{funnel.name}</h3>
            {(funnel as any).source === 'ai_suggestion' && <AiBadge />}
          </div>
          {funnel.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{funnel.description}</p>
          )}
        </div>
        <Badge variant={funnel.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
          {funnel.is_active ? t('card.active') : t('card.inactive')}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {t('card.step', { count: stepCount })}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {dayjs(funnel.created_at).format('MMM D, YYYY')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <Link href={`/org/${orgId}/funnels/${funnel.id}/report`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            {t('card.report')}
          </Button>
        </Link>
        <Link href={`/org/${orgId}/funnels/${funnel.id}/edit`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs">
            <Edit className="w-3.5 h-3.5" />
            {t('card.edit')}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(funnel.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
