'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray, Control, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { createFunnelSchema, CreateFunnelInput } from '@/shared/schemas/funnels'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { AlertTriangle, ArrowDown, GripVertical, HelpCircle, Info, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { EventNameCombobox } from '@/ee/features/event-rules/components/event-name-combobox'
import { useGetEventNames, useGetEventRules } from '@/ee/features/event-rules/hooks/queries'
import { useGetConversionEventNames } from '@/ee/features/conversions/hooks/queries'
import { TouchPointCombobox } from './touch-point-combobox'
import { TouchPointMultiSelect } from './touch-point-multi-select'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

const PATTERN_TYPES = [
  { value: 'page_path', tKey: 'form.patternTypes.page_path', helpTKey: 'form.patternTypes.page_path_help' },
  { value: 'page_url', tKey: 'form.patternTypes.page_url', helpTKey: 'form.patternTypes.page_url_help' },
  { value: 'page_title', tKey: 'form.patternTypes.page_title', helpTKey: 'form.patternTypes.page_title_help' },
  { value: 'event', tKey: 'form.patternTypes.event', helpTKey: 'form.patternTypes.event_help' },
  { value: 'search_query', tKey: 'form.patternTypes.search_query', helpTKey: 'form.patternTypes.search_query_help' },
  { value: 'link', tKey: 'form.patternTypes.link', helpTKey: 'form.patternTypes.link_help' },
  { value: 'conversion', tKey: 'form.patternTypes.conversion', helpTKey: 'form.patternTypes.conversion_help' },
] as const

const CONDITIONS = [
  { value: 'contains', tKey: 'form.conditions.contains' },
  { value: 'equals', tKey: 'form.conditions.equals' },
  { value: 'starts_with', tKey: 'form.conditions.starts_with' },
  { value: 'ends_with', tKey: 'form.conditions.ends_with' },
  { value: 'matches_regex', tKey: 'form.conditions.matches_regex' },
  { value: 'in', tKey: 'form.conditions.in' },
] as const

type FunnelFormProps = {
  onSubmit: (values: CreateFunnelInput) => void
  isPending: boolean
  initialData?: CreateFunnelInput
  orgId: string
  sourceTpId?: string | null
  formId?: string
}

const PATTERN_INPUT_CONFIG: Record<string, { labelTKey: string; placeholderTKey: string }> = {
  page_path: { labelTKey: 'form.patternInputs.pattern', placeholderTKey: 'form.patternInputs.patternPlaceholder' },
  page_url: { labelTKey: 'form.patternInputs.pattern', placeholderTKey: 'form.patternInputs.pageUrlPlaceholder' },
  page_title: { labelTKey: 'form.patternInputs.pattern', placeholderTKey: 'form.patternInputs.pageTitlePlaceholder' },
  event: { labelTKey: 'form.patternInputs.eventNameLabel', placeholderTKey: 'form.patternInputs.eventNamePlaceholder' },
  search_query: { labelTKey: 'form.patternInputs.pattern', placeholderTKey: 'form.patternInputs.searchQueryPlaceholder' },
  link: { labelTKey: 'form.patternInputs.touchPointLabel', placeholderTKey: 'form.patternInputs.touchPointPlaceholder' },
  conversion: { labelTKey: 'form.patternInputs.conversionTypeLabel', placeholderTKey: 'form.patternInputs.conversionTypePlaceholder' },
}

const StepHelpTooltip = ({
  patternType,
  condition,
  pattern,
}: {
  patternType: string
  condition: string
  pattern: string
}) => {
  const { t } = useTranslation('funnels')
  const typeEntry = PATTERN_TYPES.find((pt) => pt.value === patternType)
  const condLabel = t(`form.conditionLabels.${condition}`, condition)
  const example = pattern || '...'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-slate-400 hover:text-slate-600">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          <p className="font-medium mb-1">{typeEntry ? t(typeEntry.tKey) : patternType}: {typeEntry ? t(typeEntry.helpTKey) : ''}</p>
          {pattern && (
            <p className="text-slate-400">
              Current rule: {typeEntry ? t(typeEntry.tKey) : patternType} {condLabel} &quot;{example}&quot;
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const defaultStep = (): CreateFunnelInput['steps'][number] => ({
  name: '',
  pattern_type: 'page_path',
  condition: 'contains',
  pattern: '',
  is_required: true,
  event_name: null,
})

type SortableStepCardProps = {
  id: string
  index: number
  totalSteps: number
  orgId: string
  onRemove: () => void
  eventNames: string[]
  isEventNamesLoading: boolean
  eventRuleStatusMap: Map<string, boolean>
  conversionEventNames: string[]
}

const SortableStepCard = ({
  id,
  index,
  totalSteps,
  orgId,
  onRemove,
  eventNames,
  isEventNamesLoading,
  eventRuleStatusMap,
  conversionEventNames,
}: SortableStepCardProps) => {
  const { t } = useTranslation('funnels')
  const form = useFormContext<CreateFunnelInput>()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const patternType = form.watch(`steps.${index}.pattern_type`)
  const condition = form.watch(`steps.${index}.condition`)
  const pattern = form.watch(`steps.${index}.pattern`)
  const isFirstStep = index === 0
  const isLastStep = index === totalSteps - 1
  const mustBeRequired = isFirstStep || isLastStep
  const hideCondition = patternType === 'conversion'
  const inputConfig = PATTERN_INPUT_CONFIG[patternType] ?? PATTERN_INPUT_CONFIG.page_path

  const stepNumber = String(index + 1).padStart(2, '0')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border border-slate-200 rounded-[8px] p-4 flex gap-4 items-start bg-card',
        isDragging && 'opacity-50'
      )}
    >
      {/* Left column: number badge + drag handle */}
      <div className="relative self-stretch shrink-0 w-9">
        <div className="absolute top-0 left-0 bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center">
          <span className="text-blue-600 text-s font-semibold leading-5">{stepNumber}</span>
        </div>
        <button
          type="button"
          className="absolute top-1/2 left-0 -translate-y-1/2 flex items-center justify-center p-[9px] rounded-[6px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Center: form fields */}
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        {/* Step name */}
        <FormField
          control={form.control}
          name={`steps.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={t('form.stepNamePlaceholder')}
                  className="bg-slate-100! border-transparent rounded-[6px] h-10 text-s text-slate-700 placeholder:text-slate-500 placeholder:opacity-50 placeholder:italic"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Condition (left) + Pattern type (right) */}
        <div className="flex gap-3">
          {!hideCondition && (
            <FormField
              control={form.control}
              name={`steps.${index}.condition`}
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val)
                      if (val === 'in') {
                        form.setValue(`steps.${index}.pattern`, '')
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700 [&_[data-placeholder]]:text-slate-400">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {t(c.tKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name={`steps.${index}.pattern_type`}
            render={({ field }) => (
              <FormItem className="flex-1 min-w-0">
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val)
                    if (val === 'conversion') {
                      form.setValue(`steps.${index}.condition`, 'equals')
                    }
                    form.setValue(`steps.${index}.pattern`, '')
                    form.setValue(`steps.${index}.event_name`, null)
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700 [&_[data-placeholder]]:text-slate-400">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PATTERN_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {t(pt.tKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pattern value input */}
        <FormField
          control={form.control}
          name={`steps.${index}.pattern`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                {patternType === 'link' && condition === 'in' ? (
                  <TouchPointMultiSelect
                    value={(field.value ?? '').split(',').filter(Boolean)}
                    onChange={(ids) => field.onChange(ids.join(','))}
                    orgId={orgId}
                  />
                ) : patternType === 'link' ? (
                  <TouchPointCombobox
                    value={field.value}
                    onChange={field.onChange}
                    orgId={orgId}
                    placeholder={t(inputConfig.placeholderTKey)}
                    className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700"
                  />
                ) : patternType === 'conversion' ? (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700 [&_[data-placeholder]]:text-slate-400">
                      <SelectValue placeholder={t(inputConfig.placeholderTKey)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">{t('form.lead')}</SelectItem>
                      <SelectItem value="sale">{t('form.sale')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : patternType === 'event' ? (
                  <>
                    <EventNameCombobox
                      value={field.value}
                      onChange={field.onChange}
                      orgId={orgId}
                      placeholder={t(inputConfig.placeholderTKey)}
                      className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700"
                    />
                    {!isEventNamesLoading && field.value.length > 0 && eventRuleStatusMap.get(field.value) === false && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {t('form.eventRulePaused', { name: field.value })}
                      </p>
                    )}
                    {!isEventNamesLoading && field.value.length > 0 && !eventNames.includes(field.value) && eventRuleStatusMap.get(field.value) !== false && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {t('form.noEventMatch', { name: field.value })}
                      </p>
                    )}
                  </>
                ) : condition === 'in' ? (
                  <div className="space-y-1">
                    <Input
                      placeholder={`e.g. ${t(inputConfig.placeholderTKey)}, other-value`}
                      className="bg-slate-100! border-transparent rounded-[6px] h-10 text-s text-slate-700 placeholder:text-slate-500 placeholder:opacity-50 placeholder:italic"
                      {...field}
                    />
                    <p className="text-xs text-muted-foreground">{t('form.separateWithCommas')}</p>
                  </div>
                ) : (
                  <Input
                    placeholder={t(inputConfig.placeholderTKey)}
                    className="bg-slate-100! border-transparent rounded-[6px] h-10 text-s text-slate-700 placeholder:text-slate-500 placeholder:opacity-50 placeholder:italic"
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event name filter for conversion steps */}
        {patternType === 'conversion' && (
          <FormField
            control={form.control}
            name={`steps.${index}.event_name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-s text-slate-500">
                  {t('form.patternInputs.conversionEventNameLabel')}{' '}
                  <span className="text-slate-400">({t('form.optional', 'optional')})</span>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => field.onChange(val === '__all__' ? null : val)}
                  >
                    <SelectTrigger className="bg-slate-100! border-0 rounded-[6px] h-10 text-s text-slate-700 [&_[data-placeholder]]:text-slate-400">
                      <SelectValue placeholder={t('form.patternInputs.conversionEventNamePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('form.patternInputs.conversionEventNameAll')}</SelectItem>
                      {conversionEventNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Required toggle */}
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name={`steps.${index}.is_required`}
            render={({ field }) => {
              const switchEl = (
                <Switch
                  checked={mustBeRequired ? true : field.value}
                  onCheckedChange={mustBeRequired ? undefined : field.onChange}
                  disabled={mustBeRequired}
                />
              )
              return (
                <FormItem className="flex-row items-center gap-2">
                  <FormControl>
                    {mustBeRequired ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{switchEl}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            {isFirstStep ? t('form.firstStepRequired') : t('form.lastStepRequired')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : switchEl}
                  </FormControl>
                  <FormLabel className="text-s text-slate-500 !mt-0 font-normal cursor-pointer self-center">
                    {t('form.requiredStep')}
                  </FormLabel>
                  {!mustBeRequired && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs">
                          <p className="font-medium mb-1">{t('form.requiredVsOptional')}</p>
                          <p><span className="font-medium">Required:</span> {t('form.requiredDetail')}</p>
                          <p className="mt-1"><span className="font-medium">Optional:</span> {t('form.optionalDetail')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </FormItem>
              )
            }}
          />
          <StepHelpTooltip patternType={patternType} condition={condition} pattern={pattern} />
        </div>
      </div>

      {/* Right: delete button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={totalSteps <= 1}
        className="shrink-0 flex items-center justify-center p-1.5 rounded-full text-slate-400 hover:text-destructive hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

type FunnelPreviewProps = {
  steps: CreateFunnelInput['steps']
}

const FunnelPreview = ({ steps }: FunnelPreviewProps) => {
  const { t } = useTranslation('funnels')

  const getConditionLabel = (condition: string) => {
    const entry = CONDITIONS.find((c) => c.value === condition)
    return entry ? t(entry.tKey) : condition
  }

  const getPatternTypeLabel = (patternType: string) => {
    const entry = PATTERN_TYPES.find((pt) => pt.value === patternType)
    return entry ? t(entry.tKey) : patternType
  }

  return (
    <div className="bg-card border border-slate-300 rounded-[12px] p-6 w-[300px] shrink-0 flex flex-col gap-4">
      <p className="text-s font-medium text-slate-700">{t('form.funnelPreview', 'Funnel Preview')}</p>

      <div className="flex flex-col gap-1 items-center">
        {steps.map((step, i) => (
          <div key={i} className="w-full flex flex-col items-center gap-1">
            <div className="bg-card border border-slate-200 rounded-[8px] px-3 py-2 w-full flex gap-3 items-center">
              <div className="bg-blue-50 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-600 text-xs font-semibold leading-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700 truncate leading-[22px]">
                  {step.name || t('form.stepNamePlaceholder')}
                </p>
                <div className="flex flex-col gap-1 text-slate-500">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    {step.pattern_type !== 'conversion' && (
                      <span className="text-xs truncate">{getConditionLabel(step.condition)}</span>
                    )}
                    <span className="font-mono text-[13px] truncate">{getPatternTypeLabel(step.pattern_type)}</span>
                  </div>
                  {step.pattern && (
                    <span className="font-mono text-[13px] truncate block w-full">{step.pattern}</span>
                  )}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center h-4 w-0">
                <ArrowDown className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const FunnelForm = ({
  onSubmit,
  isPending,
  initialData,
  orgId,
  sourceTpId,
  formId,
}: FunnelFormProps) => {
  const { t } = useTranslation('funnels')
  const form = useForm<CreateFunnelInput>({
    resolver: zodResolver(createFunnelSchema),
    defaultValues: initialData ?? {
      name: '',
      description: '',
      steps: [defaultStep()],
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'steps',
  })

  const { data: eventNamesData, isLoading: isEventNamesLoading } = useGetEventNames(orgId)
  const eventNames = eventNamesData?.data ?? []

  const { data: eventRulesData } = useGetEventRules(orgId)
  const eventRuleStatusMap = new Map(
    (eventRulesData?.data ?? []).map((r) => [r.name, r.is_active])
  )

  const { data: conversionEventNamesData } = useGetConversionEventNames(orgId)
  const conversionEventNames = conversionEventNamesData?.data ?? []

  const watchedSteps = form.watch('steps')

  const enforceFirstLastRequired = () => {
    const lastIdx = fields.length - 1
    fields.forEach((_, i) => {
      if (i === 0 || i === lastIdx) {
        form.setValue(`steps.${i}.is_required`, true)
      }
    })
  }

  useEffect(() => {
    enforceFirstLastRequired()
  }, [fields.length])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    move(oldIndex, newIndex)
    setTimeout(enforceFirstLastRequired, 0)
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        {sourceTpId && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>{t('form.sourceAlert')}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-9 items-start">
          {/* Left: form card */}
          <div className="flex-1 min-w-0 bg-card border border-slate-300 rounded-[12px]">
            <div className="flex flex-col gap-4 p-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-s text-foreground font-normal">Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('form.namePlaceholder')}
                        className="bg-slate-100! border-transparent rounded-[6px] h-10 text-s text-slate-700 placeholder:text-slate-500 placeholder:opacity-50 placeholder:italic"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-s text-foreground font-normal">{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('form.descriptionPlaceholder')}
                        className="bg-slate-100! border-transparent rounded-[6px] text-s text-slate-700 placeholder:text-slate-500 placeholder:opacity-50 placeholder:italic min-h-[80px] resize-none"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t border-slate-200" />

              {/* Steps heading */}
              <p className="text-s font-medium text-slate-700">
                {t('form.steps', { count: fields.length })}
              </p>

              {form.formState.errors.steps?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.steps.root.message}
                </p>
              )}

              {/* Steps list with DnD */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-4">
                    {fields.map((field, index) => (
                      <SortableStepCard
                        key={field.id}
                        id={field.id}
                        index={index}
                        totalSteps={fields.length}
                        orgId={orgId}
                        onRemove={() => remove(index)}
                        eventNames={eventNames}
                        isEventNamesLoading={isEventNamesLoading}
                        eventRuleStatusMap={eventRuleStatusMap}
                        conversionEventNames={conversionEventNames}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Step button */}
              {fields.length < 20 && (
                <button
                  type="button"
                  onClick={() => append(defaultStep())}
                  className="flex items-center gap-1 text-base font-medium text-slate-700 hover:text-slate-900 self-start px-3 py-2.5 rounded-[6px] hover:bg-slate-100 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {t('form.addStep')}
                </button>
              )}


            </div>
          </div>

          {/* Right: preview panel */}
          <FunnelPreview steps={watchedSteps ?? []} />
        </div>
      </form>
    </Form>
  )
}
