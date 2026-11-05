'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { EventRuleForm } from '@/ee/features/event-rules/components/event-rule-form'
import { useCreateEventRule } from '@/ee/features/event-rules/hooks/mutations'
import type { CreateEventRuleInput } from '@/shared/schemas/event-rules'
import type { HeatmapElement } from '../types'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  element: HeatmapElement | null
  pagePath: string
}

export function CreateEventDialog({
  open,
  onOpenChange,
  element,
  pagePath,
}: CreateEventDialogProps) {
  const { t } = useTranslation('heatmap')
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: createRule, isPending } = useCreateEventRule(org_id)

  const initialData: Partial<CreateEventRuleInput> = {
    selector_path: element?.selector ?? undefined,
    element_text: element?.text ?? undefined,
    element_id: element?.element_id ?? undefined,
    element_href: element?.element_href ?? undefined,
    page_path: pagePath || undefined,
    text_match_mode: 'contains',
  }

  const handleSubmit = (values: CreateEventRuleInput) => {
    createRule(values, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('createEvent.title')}</SheetTitle>
          <SheetDescription>
            {t('createEvent.description')}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <EventRuleForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            submitLabel={t('createEvent.title')}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
