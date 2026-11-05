import {
  ruleBlockSchema,
  RuleOperator,
  ruleSchema,
} from '@/shared/schemas/touch-points/dynamic-targeting'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
import {
  Edit2Icon,
  ArrowRight,
  Layers3,
  PlusIcon,
  Trash2Icon,
  ChevronDownIcon,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  TrashIcon,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DynamicTargetingType, DynamicTargetingTypes } from '@/core/types/touch-point.type'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { GeographyRule } from './rules/geography-rule'
import { DeviceRule } from './rules/device-rule'
import { InteractionRule } from './rules/interaction-rule'
import { singleRules } from './constants'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import countries from '@/shared/constants/countries.json'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Switch } from '@/shared/components/ui/switch'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { Separator } from '@/shared/components/ui/separator'
import { cn } from '@/shared/lib/utils'

const getBlockOperatorLabel = (operator: RuleOperator) => {
  switch (operator) {
    case RuleOperator.OR:
      return (
        <div className="px-3 py-1 rounded-full text-xs font-bold uppercase text-semantic-warning bg-yellow-50">
          | OR
        </div>
      )
    case RuleOperator.AND:
      return (
        <div className="px-3 py-1 rounded-full text-xs font-bold uppercase text-semantic-success bg-green-50">
          & AND
        </div>
      )
    default:
      return null
  }
}

export const RuleBlock = ({
  field,
  actions,
  grabbableButton,
}: {
  field: z.infer<typeof ruleBlockSchema>
  actions: React.ReactNode
  grabbableButton?: React.ReactNode
}) => {
  const { t } = useTranslation('touchpoint')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const getRuleTypeLabel = (ruleType: DynamicTargetingType) => {
    switch (ruleType) {
      case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
        return t('dynamic_targeting.rule_labels.geography')
      case DynamicTargetingTypes.DEVICE_TARGETING:
        return t('dynamic_targeting.rule_labels.device')
      case DynamicTargetingTypes.INTERACTION_TARGETING:
        return t('dynamic_targeting.rule_labels.interaction')
      default:
        return 'Rule'
    }
  }

  const renderRuleValues = (values: string[], ruleType: DynamicTargetingType) => {
    if (!values || values.length === 0) {
      return <span className="text-sm text-slate-500">{t('dynamic_targeting.no_values')}</span>
    }
    const getDisplayValues = () => {
      if (ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING) {
        // Map country codes to country names
        return values.map((code) => {
          const country = countries.find((c) => c.iso2 === code)
          return country ? country.name : code
        })
      }
      return values
    }

    const displayValues = getDisplayValues()
    const visibleCount = 4
    const visibleValues = displayValues.slice(0, visibleCount)
    const remaining = displayValues.length - visibleCount

    return (
      <div className="flex gap-2 items-center truncate min-w-0">
        {visibleValues.map((value: string, idx: number) => (
          <span
            key={idx}
            className="bg-blue-50 px-3 py-1 rounded-full text-sm font-medium text-foreground text-nowrap"
          >
            {value}
          </span>
        ))}
        {remaining > 0 && (
          <span className="bg-blue-50 px-3 py-1 rounded-full text-sm font-medium text-foreground">
            +{remaining}
          </span>
        )}
      </div>
    )
  }

  const getRuleIcon = (ruleType: DynamicTargetingType) => {
    switch (ruleType) {
      case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
        return <Globe2 className="w-5 h-5 text-slate-600" />
      case DynamicTargetingTypes.DEVICE_TARGETING:
        return <MonitorSmartphone className="w-5 h-5 text-slate-600" />
      case DynamicTargetingTypes.INTERACTION_TARGETING:
        return <MousePointerClick className="w-5 h-5 text-slate-600" />
      default:
        return <Layers3 className="w-5 h-5 text-slate-600" />
    }
  }
  return (
    <div className="flex gap-3 w-full">
      {/* Content */}
      <div className="flex flex-col gap-3 flex-1 w-full">
        {/* Block Header */}
        <div className="flex gap-2 items-center border-b border-slate-300 pb-2 min-w-0">
          {grabbableButton}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex gap-2 items-center">
              <Layers3 className="w-5 h-5 text-slate-600 hidden md:block" />
              <span className="text-xs font-semibold text-slate-600 uppercase hidden md:block">
                Rule Block
              </span>
              {getBlockOperatorLabel(field.operator)}
              <div className="md:hidden block ml-auto">{actions}</div>
            </div>

            {/* Destination Row */}
            <div className="flex gap-2 md:gap-4 items-center min-w-0">
              <div className="gap-1 items-center shrink-0 flex">
                <ArrowRight className="w-5 h-5 text-slate-700" />
                <span className="text-sm text-slate-700 hidden md:flex">
                  {t('dynamic_targeting.dialog.direct_to_url')}
                </span>
              </div>
              <p className="flex-1 text-base text-foreground truncate min-w-0">
                {field.destination || t('dynamic_targeting.no_url_set')}
              </p>
            </div>
          </div>
          <div className="hidden md:block">{actions}</div>
        </div>
        <div className="pl-5 md:px-12 space-y-2">
          {/* Rules List */}
          {field.rules && field.rules.length > 0 && (
            <>
              {field.rules.map((rule, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  {getRuleIcon(rule.ruleType)}
                  <div className="flex gap-1 flex-1 min-w-0 items-center">
                    <span className="text-xs font-medium text-slate-600 hidden md:block">
                      {getRuleTypeLabel(rule.ruleType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {renderRuleValues(rule.config.values, rule.ruleType)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const RuleBlockEditDialog = ({
  initialData,
  onSubmit,
  onClose,
  onDelete,
}: {
  initialData: z.infer<typeof ruleBlockSchema>
  onSubmit: (data: z.infer<typeof ruleBlockSchema>) => void
  onClose?: () => void
  onDelete?: () => Promise<void>
}) => {
  const { t } = useTranslation('touchpoint')
  const form = useForm<z.infer<typeof ruleBlockSchema>>({
    defaultValues: initialData,
    resolver: zodResolver(ruleBlockSchema),
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'rules',
  })
  const dialogRef = useRef<DialogCustomRef>(null)
  const [transition, startTransition] = useTransition()
  const [deleteTransition, startDeleteTransition] = useTransition()
  const handleDelete = () => {
    if (!onDelete) return
    startDeleteTransition(async () => {
      await onDelete()
    })
  }

  const handleSubmit = (data: z.infer<typeof ruleBlockSchema>) => {
    startTransition(async () => {
      await onSubmit(data)
    })
  }

  // const handleSubmit = (data: z.infer<typeof ruleBlockSchema>) => {
  //   onSubmit(data)
  //   dialogRef.current?.close()
  //   onClose?.()
  // }

  const handleAddRule = (rule: z.infer<typeof ruleSchema>) => {
    append(rule)
  }

  const getRuleTypeLabel = (ruleType: DynamicTargetingType) => {
    switch (ruleType) {
      case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
        return t('dynamic_targeting.rule_labels.geography')
      case DynamicTargetingTypes.DEVICE_TARGETING:
        return t('dynamic_targeting.rule_labels.device')
      case DynamicTargetingTypes.INTERACTION_TARGETING:
        return t('dynamic_targeting.rule_labels.interaction')
      default:
        return 'Rule'
    }
  }

  const availableRules = useMemo(() => {
    const ruleTypes = fields.map((field) => field.ruleType)

    return Object.entries(singleRules).map(([k, v]) => ({
      ...v,
      disabled: ruleTypes.includes(v.defaultValues.ruleType),
    }))
  }, [fields])

  return (
    <CustomDialogV2
      ref={dialogRef}
      initialOpen={true}
      onOpenChange={(open) => !open && onClose?.()}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          {t('dynamic_targeting.dialog.rule_block_title')}
          <CustomSwitch
            checked={form.watch('operator') === RuleOperator.AND}
            onCheckedChange={(v) =>
              form.setValue('operator', v ? RuleOperator.AND : RuleOperator.OR)
            }
            checkedLabel={`& AND`}
            uncheckedLabel={`| OR`}
            checkedColor="bg-semantic-success"
            uncheckedColor="bg-semantic-warning"
          />
        </div>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.stopPropagation()
            form.handleSubmit(handleSubmit)(e)
          }}
        >
          <div className="flex flex-col gap-6 pt-4">
            {/* Rules List (if any) */}
            {fields.length > 0 && (
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-center w-full">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-sm font-medium text-foreground">
                        {getRuleTypeLabel(field.ruleType)}
                      </label>
                      <FormField
                        control={form.control}
                        name={`rules.${index}.config`}
                        render={({ field: configField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex gap-2 items-center">
                                <div className="w-full">
                                  {field.ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING ? (
                                    <GeographyRule
                                      field={configField.value}
                                      onChange={(config) =>
                                        form.setValue(`rules.${index}.config`, config)
                                      }
                                    />
                                  ) : field.ruleType === DynamicTargetingTypes.DEVICE_TARGETING ? (
                                    <DeviceRule
                                      field={configField.value}
                                      onChange={(config) =>
                                        form.setValue(`rules.${index}.config`, config)
                                      }
                                    />
                                  ) : (
                                    <InteractionRule
                                      field={configField.value}
                                      onChange={(config) =>
                                        form.setValue(`rules.${index}.config`, config)
                                      }
                                    />
                                  )}
                                </div>
                                <Button
                                  className="w-10 h-10"
                                  type="button"
                                  onClick={() => remove(index)}
                                  variant="ghost"
                                >
                                  <Trash2Icon className="w-[18px] h-[18px] text-slate-700" />
                                </Button>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormMessage className="mt-2">
                        {form.formState.errors.rules?.[index]?.config?.values?.message}
                      </FormMessage>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Rule Section */}
            <div className="">
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" iconLeft={<PlusIcon />} variant={'secondary'}>
                    {t('dynamic_targeting.add_new_rule')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.entries(availableRules).map(([k, v]) => (
                    <DropdownMenuItem
                      className="flex gap-[6px] px-[22px] py-[8px] font-medium line-clamp-[20px] text-slate-600 hover:text-primary hover:bg-slate-100"
                      key={k}
                      onClick={() => handleAddRule(v.defaultValues)}
                      disabled={v.disabled}
                    >
                      <v.icon className="w-[18px] h-[18px]" />
                      {t(v.labelKey)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FormMessage className="mt-2">{form.formState.errors.rules?.message}</FormMessage>
            </div>

            {/* Destination URL */}
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t('dynamic_targeting.dialog.direct_to_url')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('dynamic_targeting.dialog.url_placeholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="w-full bg-slate-300" />

            {/* Submit Button */}
            <div className={cn('flex justify-end', onDelete && 'justify-between')}>
              {onDelete && (
                <LoadingButton
                  isLoading={deleteTransition}
                  type="button"
                  variant="tertiary"
                  iconLeft={<TrashIcon />}
                  onClick={handleDelete}
                >
                  {t('dynamic_targeting.actions.delete_rule_block')}
                </LoadingButton>
              )}
              <LoadingButton type="submit" variant={'default'} isLoading={transition}>
                {t('dynamic_targeting.dialog.save')}
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </CustomDialogV2>
  )
}
