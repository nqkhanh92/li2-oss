'use client'

import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import dayjs from '@/shared/lib/dayjs'
import { Card } from '@/shared/components/ui/card'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Calendar, Ellipsis, Pen, Trash } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'
import { Typography } from '@/shared/components/ui/typography'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'

interface UTMTemplateCardProps {
  template: UTMTemplateListItem
  onEdit?: (template: UTMTemplateListItem) => void
  onDelete?: (template: UTMTemplateListItem) => void
  isSelected?: boolean
  onSelectChange?: (isSelected: boolean) => void
  onActionClick?: (action: 'edit' | 'delete', template: UTMTemplateListItem) => void
}

export const UTMTemplateCard = ({
  template,
  onEdit,
  onDelete,
  isSelected,
  onSelectChange,
  onActionClick,
}: UTMTemplateCardProps) => {
  const { t } = useTranslation('common')

  return (
    <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:shadow-sm transition-all hover:bg-card">
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <Checkbox
          checked={isSelected || false}
          onCheckedChange={(checked) => onSelectChange?.(checked === true)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center gap-1 px-2 py-1 min-w-0">
        {/* Title and Actions Row */}
        <div className="flex items-center gap-9 w-full">
          <h3 className="flex-1 font-medium text-sm text-foreground truncate">{template.name}</h3>

          {/* Actions */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-slate-200 rounded-md bg-inherit"
              >
                <Ellipsis className="w-[18px] h-[18px] text-slate-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px] p-1">
              <DropdownMenuItem
                onClick={() => {
                  onActionClick?.('edit', template)
                  onEdit?.(template)
                }}
                className="flex items-center justify-between gap-1 px-4 py-1.5 cursor-pointer"
              >
                <span className="flex-1 text-sm text-slate-700">Edit</span>
                <Pen className="w-[10.667px] h-[10.667px] text-slate-400" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onActionClick?.('delete', template)
                  onDelete?.(template)
                }}
                className="flex items-center justify-between gap-1 px-4 py-1.5 cursor-pointer"
              >
                <span className="flex-1 text-sm text-slate-700">Delete</span>
                <Trash className="w-[10.667px] h-[10.667px] text-slate-400" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* UTM Parameters and Date Row */}
        <div className="flex items-center gap-6 w-full">
          {/* UTM Parameters */}
          <div className="flex-1 flex flex-wrap gap-2 items-center text-xs">
            {template.utm_source && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                <span className="font-medium">Source:</span>
                <span className="font-normal">{template.utm_source}</span>
              </div>
            )}
            {template.utm_campaign && (
              <div className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full">
                <span className="font-medium">Campaign:</span>
                <span className="font-normal">{template.utm_campaign}</span>
              </div>
            )}
            {template.utm_medium && (
              <div className="flex items-center gap-1 bg-violet-50 text-violet-600 px-3 py-1 rounded-full">
                <span className="font-medium">Medium:</span>
                <span className="font-normal">{template.utm_medium}</span>
              </div>
            )}
            {template.utm_term && (
              <div className="flex items-center gap-1 bg-pink-50 text-pink-600 px-3 py-1 rounded-full">
                <span className="font-medium">Term:</span>
                <span className="font-normal">{template.utm_term}</span>
              </div>
            )}
            {template.utm_content && (
              <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full">
                <span className="font-medium">Content:</span>
                <span className="font-normal">{template.utm_content}</span>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-slate-500 text-xs shrink-0">
            <CustomAvatar
              src={template?.created_by?.avatar}
              name={template?.created_by?.name}
              email={template?.created_by?.email}
              size={16}
            />
            <span className="font-normal">{dayjs(template.created_at).format('MMM D, YYYY')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
