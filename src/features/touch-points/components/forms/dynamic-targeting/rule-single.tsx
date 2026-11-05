import { z } from 'zod'
import { ruleSingleSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { useTranslation } from 'react-i18next'
import { GeographyRule } from './rules/geography-rule'
import { DynamicTargetingType, DynamicTargetingTypes } from '@/core/types/touch-point.type'
import { DeviceRule } from './rules/device-rule'
import { InteractionRule } from './rules/interaction-rule'
import { Globe2, ArrowRight, TrashIcon } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import React, { useRef, useState, useTransition } from 'react'
import countries from '@/shared/constants/countries.json'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { cn } from '@/shared/lib/utils'

const getRuleLabel = (ruleType: DynamicTargetingType, config?: any, t?: any) => {
  if (!t) return 'Rule'
  switch (ruleType) {
    case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
      if (config?.type === 'country') return t('dynamic_targeting.rule_types.countries')
      if (config?.type === 'continent') return t('dynamic_targeting.rule_types.continents')
      if (config?.type === 'city') return t('dynamic_targeting.rule_types.cities')
      return t('dynamic_targeting.rule_labels.geography')
    case DynamicTargetingTypes.DEVICE_TARGETING:
      return t('dynamic_targeting.rule_types.devices')
    case DynamicTargetingTypes.INTERACTION_TARGETING:
      return t('dynamic_targeting.rule_types.interaction_channels')
    default:
      return 'Rule'
  }
}

export const RuleSingle = ({
  field,
  actions,
  grabbableButton,
}: {
  field: z.infer<typeof ruleSingleSchema>
  actions: React.ReactNode
  grabbableButton?: React.ReactNode
}) => {
  const { t } = useTranslation('touchpoint')
  const form = useFormContext()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const getRuleIcon = () => {
    switch (field.ruleType) {
      case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
        return <Globe2 className="w-5 h-5 text-slate-700" />
      default:
        return <Globe2 className="w-5 h-5 text-slate-700" />
    }
  }

  const renderRuleValues = () => {
    if (!field.config?.values || field.config.values.length === 0) {
      return (
        <span className="text-sm text-slate-500">{t('dynamic_targeting.no_values_selected')}</span>
      )
    }

    const getDisplayValues = () => {
      if (field.ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING) {
        // Map country codes to country names
        return field.config.values.slice(0, 3).map((code) => {
          const country = countries.find((c) => c.iso2 === code)
          return country ? country.name : code
        })
      }
      return field.config.values.slice(0, 3)
    }

    const displayValues = getDisplayValues()
    const remaining = field.config.values.length - 3

    return (
      <div className="flex gap-2 items-center flex-wrap">
        {displayValues.map((value: string, idx: number) => (
          <div key={idx} className="bg-blue-50 px-3 py-1 rounded-full text-sm text-foreground">
            {value}
          </div>
        ))}
        {remaining > 0 && (
          <div className="bg-blue-50 px-3 py-1 rounded-full text-sm text-foreground">
            +{remaining}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-center">
      {grabbableButton}
      <div className="flex flex-col gap-2 w-full min-w-0">
        {/* Rule Row */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-1 items-center shrink-0">
            {getRuleIcon()}
            <span className="text-sm text-slate-700">
              {getRuleLabel(field.ruleType, field.config, t)}
            </span>
          </div>
          {renderRuleValues()}
        </div>

        {/* Destination Row */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-1 items-center shrink-0">
            <ArrowRight className="w-5 h-5 text-slate-700" />
            <span className="text-sm text-slate-700">
              {t('dynamic_targeting.dialog.direct_to_url')}
            </span>
          </div>
          <p className="flex-1 text-base text-foreground truncate min-w-0">
            {field.destination || t('dynamic_targeting.no_url_set')}
          </p>
        </div>
      </div>
      {actions}
    </div>
  )
}

export const RuleSingleEditDialog = ({
  initialData,
  onSubmit,
  onClose,
  onDelete,
}: {
  initialData: z.infer<typeof ruleSingleSchema>
  onSubmit: (data: z.infer<typeof ruleSingleSchema>) => Promise<void>
  onClose?: () => void
  onDelete?: () => Promise<void>
}) => {
  const { t } = useTranslation('touchpoint')
  const form = useForm<z.infer<typeof ruleSingleSchema>>({
    defaultValues: initialData,
    resolver: zodResolver(ruleSingleSchema),
  })
  const ruleType = useWatch({
    control: form.control,
    name: 'ruleType',
  })
  const [transition, startTransition] = useTransition()
  const [deleteTransition, startDeleteTransition] = useTransition()
  const handleDelete = () => {
    if (!onDelete) return
    startDeleteTransition(async () => {
      await onDelete()
    })
  }

  const handleSubmit = (data: z.infer<typeof ruleSingleSchema>) => {
    startTransition(async () => {
      await onSubmit(data)
    })
  }
  const dialogRef = useRef<DialogCustomRef>(null)
  const getRuleTitle = () => {
    switch (ruleType) {
      case DynamicTargetingTypes.GEOGRAPHY_TARGETING:
        if (form.getValues('config.type') === 'country')
          return t('dynamic_targeting.dialog.select_countries')
        if (form.getValues('config.type') === 'continent')
          return t('dynamic_targeting.dialog.select_continents')
        if (form.getValues('config.type') === 'city')
          return t('dynamic_targeting.dialog.select_cities')
        return t('dynamic_targeting.dialog.select_countries')
      case DynamicTargetingTypes.DEVICE_TARGETING:
        return t('dynamic_targeting.dialog.select_devices')
      case DynamicTargetingTypes.INTERACTION_TARGETING:
        return t('dynamic_targeting.dialog.select_interactions')
      default:
        return 'Rule'
    }
  }

  return (
    <CustomDialogV2
      ref={dialogRef}
      initialOpen={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose?.()
        }
      }}
      size="sm"
      title={getRuleTitle()}
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.stopPropagation()
            form.handleSubmit(handleSubmit)(e)
          }}
        >
          <div className="flex flex-col gap-6 pt-4">
            {/* Rule Section */}
            <div>
              <FormField
                control={form.control}
                name="config"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getRuleLabel(ruleType, field.value, t)}</FormLabel>
                    <FormControl>
                      {ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING ? (
                        <GeographyRule
                          field={field.value}
                          onChange={(config) => form.setValue('config', config)}
                        />
                      ) : ruleType === DynamicTargetingTypes.DEVICE_TARGETING ? (
                        <DeviceRule
                          field={field.value}
                          onChange={(config) => form.setValue('config', config)}
                        />
                      ) : (
                        <InteractionRule
                          field={field.value}
                          onChange={(config) => form.setValue('config', config)}
                        />
                      )}
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormMessage className="mt-2">
                {form.formState.errors.config?.values?.message}
              </FormMessage>
            </div>

            {/* Destination Section */}
            <div>
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dynamic_targeting.dialog.direct_to_url')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('dynamic_targeting.dialog.url_placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Actions */}
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
                  {t('dynamic_targeting.actions.delete_rule')}
                </LoadingButton>
              )}
              <LoadingButton type="submit" isLoading={transition}>
                {t('dynamic_targeting.dialog.save')}
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </CustomDialogV2>
  )
}
