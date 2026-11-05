'use client'

import type React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Edit,
  Trash,
  MousePointerClick,
  ScanEye,
  ClipboardCheck,
  SquarePen,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { cn } from '@/shared/lib/utils'
import type { EventRule, EventRuleTriggerType } from '../types'
import { AiBadge } from '@/features/smart-setup/components/ai-badge'

type EventRuleCardProps = {
  rule: EventRule
  orgId: string
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isSelected?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

const TRIGGER_CONFIG: Record<
  EventRuleTriggerType,
  { headerBg: string; iconBg: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  click: {
    headerBg: 'bg-blue-50',
    iconBg: 'bg-[#437ef7]',
    Icon: MousePointerClick,
  },
  element_visibility: {
    headerBg: 'bg-violet-50',
    iconBg: 'bg-secondary',
    Icon: ScanEye,
  },
  form_submit: {
    headerBg: 'bg-green-50',
    iconBg: 'bg-green-600',
    Icon: ClipboardCheck,
  },
  form_fill: {
    headerBg: 'bg-orange-50',
    iconBg: 'bg-orange-600',
    Icon: SquarePen,
  },
}

export const EventRuleCard = ({
  rule,
  orgId,
  onDelete,
  onToggle,
  isSelected,
  canEdit = true,
  canDelete = true,
}: EventRuleCardProps) => {
  const { dayjs } = useDayjs()
  const { t } = useTranslation('event-rules')

  const baseConfig = TRIGGER_CONFIG[rule.trigger_type]
  const config = rule.is_active
    ? baseConfig
    : { ...baseConfig, headerBg: 'bg-slate-100', iconBg: 'bg-slate-400' }

  const { Icon } = config

  const criteria: string[] = []
  if (rule.element_text) criteria.push(`Text: ${rule.element_text}`)
  if (rule.element_href) criteria.push(rule.element_href)
  if (rule.page_path) criteria.push(`Page: ${rule.page_path}`)
  if (rule.selector_path) criteria.push(`Selector: ${rule.selector_path}`)
  if (rule.element_id) criteria.push(`ID: ${rule.element_id}`)
  if (rule.form_name) criteria.push(`Form: ${rule.form_name}`)
  if (rule.form_id) criteria.push(`Form ID: ${rule.form_id}`)
  if (rule.form_action) criteria.push(`Action: ${rule.form_action}`)

  return (
    <Link
      href={`/org/${orgId}/event-rules/${rule.id}/edit`}
      className={cn(
        'bg-white border rounded-lg p-2 flex flex-col gap-5 transition-colors hover:border-primary cursor-pointer',
        isSelected ? 'border-primary' : 'border-slate-300'
      )}
    >
      {/* Header strip with icon circle overflowing into the gap */}
      <div
        className={cn(
          'relative h-10 rounded-md flex items-center justify-end shrink-0',
          config.headerBg
        )}
      >
        {/* Tracking toggle – right side */}
        <div className="flex items-center gap-1 pr-3 z-10" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-foreground">Tracking</span>
          <Switch
            checked={rule.is_active}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
            className="scale-[0.65] origin-right"
            disabled={!canEdit}
          />
        </div>
        {/* Icon circle – top at header mid-point, overflows into gap below */}
        <div
          className={cn(
            'absolute left-[15px] top-5 p-[11px] rounded-full flex items-center justify-center',
            config.iconBg
          )}
        >
          <Icon className="w-[18px] h-[18px] text-white" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col p-2 flex-1 justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-mono font-medium text-sm text-slate-900 truncate">{rule.name}</h3>
            {(rule as any).source === 'ai_suggestion' && <AiBadge />}
          </div>

          <div className="flex flex-wrap gap-1">
            {criteria.map((c, i) => (
              <span
                key={i}
                className="bg-gray-100 text-slate-600 text-xs px-2 py-0.5 rounded-sm whitespace-nowrap max-w-[180px] truncate"
              >
                {c}
              </span>
            ))}
            {criteria.length === 0 && (
              <span className="text-xs text-slate-400 italic">{t('card.noCriteria')}</span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-1">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{dayjs(rule.created_at).format('MMM D, YYYY')}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/org/${orgId}/event-rules/${rule.id}/edit`}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {t('card.edit')}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled className="flex items-center gap-2">
                  <Edit className="w-3.5 h-3.5" />
                  {t('card.edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-500 focus:text-red-600 focus:bg-red-50"
                onClick={() => onDelete(rule.id)}
                disabled={!canDelete}
              >
                <Trash className="w-4 h-4" />
                {t('card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Link>
  )
}
