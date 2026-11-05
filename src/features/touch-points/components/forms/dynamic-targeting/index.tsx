'use client'
import { useParams } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  dynamicTargetingSchema,
  ruleBlockSchema,
  ruleItemSchema,
  ruleSingleSchema,
  RuleType,
} from '@/shared/schemas/touch-points/dynamic-targeting'
import { Form } from '@/shared/components/ui/form'
import { RegionSelect, RegionSelectRef } from '@/shared/components/customize/region-select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { ChevronDownIcon, InfoIcon, PlusIcon } from 'lucide-react'
import { DynamicTargetingType, DynamicTargetingTypes } from '@/core/types/touch-point.type'
import { RuleItem } from './rule-item'
import { blockRules, singleRules } from './constants'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { zodResolver } from '@hookform/resolvers/zod'
import { RuleSingleEditDialog } from './rule-single'
import { RuleBlockEditDialog } from './rule-block'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useDebounce, useDebounceFn } from '@/shared/hooks/use-debounce'
import { cn } from '@/shared/lib/cn'
import useDebouncedMutation from '@/shared/hooks/use-debounce-mutation'
import { CancelToken } from 'axios'

interface DynamicTargetingProps {
  initialData: z.infer<typeof dynamicTargetingSchema>
  onSubmit: (
    data: z.infer<typeof dynamicTargetingSchema>,
    options?: { cancelToken?: CancelToken }
  ) => Promise<void>
  isLoading: boolean
}
export const DynamicTargeting = ({ initialData, onSubmit, isLoading }: DynamicTargetingProps) => {
  const { t } = useTranslation('touchpoint')
  const form = useForm<z.infer<typeof dynamicTargetingSchema>>({
    defaultValues: initialData,
    resolver: zodResolver(dynamicTargetingSchema),
  })
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const { confirm } = useConfirmDialog()

  const { fields, update, move } = useFieldArray({
    control: form.control,
    name: 'targets',
  })

  useEffect(() => {
    form.reset(initialData)
  }, [initialData])

  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [addingRule, setAddingRule] = useState<
    z.infer<typeof ruleSingleSchema> | z.infer<typeof ruleBlockSchema> | null
  >(null)
  const onEditRule = (index: number) => {
    setEditingRuleIndex(index)
  }

  const { debounceMutation, cancel } = useDebouncedMutation(
    (data, { cancelToken }) => onSubmit(data, { cancelToken }),
    1000
  )

  const handleAddRule = async (
    rule: z.infer<typeof ruleBlockSchema> | z.infer<typeof ruleSingleSchema>
  ) => {
    await onSubmit({
      targets: [...fields, rule],
    })
    setAddingRule(null)
  }
  const handleUpdateRule = async (rule: z.infer<typeof ruleItemSchema>) => {
    if (editingRuleIndex !== null) {
      await onSubmit({
        targets: fields.map((field, index) => (index === editingRuleIndex ? rule : field)),
      })
      setEditingRuleIndex(null)
    }
  }

  const handleDeleteRule = async (index: number) => {
    const confirmResult = await confirm({
      title: t('dynamic_targeting.dialog.delete_rule_title'),
      description: t('dynamic_targeting.dialog.delete_rule_description'),
      confirmButtonText: t('dynamic_targeting.dialog.delete_button'),
      cancelButtonText: t('dynamic_targeting.dialog.cancel_button'),
    })
    if (!confirmResult) return
    await onSubmit({
      targets: fields.filter((_, i) => i !== index),
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (form.formState.isDirty) {
      debounceMutation({
        targets: fields,
      })
    }
  }, [fields])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id && over?.id && active.id !== over.id) {
      const activeIndex = fields.findIndex((field) => field.id === active.id)
      const overIndex = fields.findIndex((field) => field.id === over.id)

      if (activeIndex !== -1 && overIndex !== -1) {
        move(activeIndex, overIndex)
      }
    }
    setDraggingId(null)
  }
  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    if (active.id) {
      cancel()
      setDraggingId(active.id.toString())
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => onSubmit(data))}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-2 text-xs font-medium line-clamp-[16px] text-semantic-info">
            <InfoIcon className="w-4 h-4" />
            <p>{t('dynamic_targeting.note')}</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" iconRight={<ChevronDownIcon />} variant={'default'}>
                  {t('dynamic_targeting.add_rule')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.entries(singleRules).map(([k, v]) => (
                  <DropdownMenuItem
                    className="flex gap-[6px] px-[22px] py-[8px] font-medium line-clamp-[20px] text-slate-600 hover:text-primary"
                    key={k}
                    onClick={() => setAddingRule(v.defaultValues)}
                  >
                    <v.icon className="w-[18px] h-[18px]" />
                    {t(v.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" iconRight={<ChevronDownIcon />} variant={'secondary'}>
                  {t('dynamic_targeting.add_rule_block')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.entries(blockRules).map(([k, v]) => (
                  <DropdownMenuItem
                    className={cn(
                      'flex gap-[6px] px-[22px] py-[8px] font-medium line-clamp-[20px] text-slate-600 hover:text-primary',
                      v.className
                    )}
                    key={k}
                    onClick={() => setAddingRule(v.defaultValues)}
                  >
                    <v.icon className="w-[18px] h-[18px]" />
                    {t(v.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => {
                  return (
                    <RuleItem
                      id={field.id}
                      key={field.id}
                      field={field}
                      onChange={(field) => update(index, field)}
                      index={index}
                      onDelete={async () => await handleDeleteRule(index)}
                      onEdit={() => onEditRule(index)}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          </div>
        </form>
      </Form>
      {/* Top nhung dong code ta dao nhat hanh tinh */}
      {addingRule !== null && (
        <>
          {addingRule.type === RuleType.SINGLE ? (
            <RuleSingleEditDialog
              key={`add-single-${editingRuleIndex}`}
              initialData={addingRule}
              onSubmit={handleAddRule}
              onClose={() => setAddingRule(null)}
            />
          ) : (
            <RuleBlockEditDialog
              key={`add-block-${editingRuleIndex}`}
              initialData={addingRule}
              onSubmit={handleAddRule}
              onClose={() => setAddingRule(null)}
            />
          )}
        </>
      )}
      {editingRuleIndex !== null && fields[editingRuleIndex] && (
        <>
          {fields[editingRuleIndex].type === RuleType.SINGLE ? (
            <RuleSingleEditDialog
              onDelete={async () => {
                await onSubmit({
                  targets: fields.filter((_, i) => i !== editingRuleIndex),
                })
                setEditingRuleIndex(null)
              }}
              key={`edit-single-${editingRuleIndex}`}
              initialData={fields[editingRuleIndex]}
              onSubmit={(data) => handleUpdateRule(data)}
              onClose={() => setEditingRuleIndex(null)}
            />
          ) : (
            <RuleBlockEditDialog
              onDelete={async () => {
                await onSubmit({
                  targets: fields.filter((_, i) => i !== editingRuleIndex),
                })
                setEditingRuleIndex(null)
              }}
              key={`edit-block-${editingRuleIndex}`}
              initialData={fields[editingRuleIndex]}
              onSubmit={(data) => handleUpdateRule(data)}
              onClose={() => setEditingRuleIndex(null)}
            />
          )}
        </>
      )}
    </>
  )
}
