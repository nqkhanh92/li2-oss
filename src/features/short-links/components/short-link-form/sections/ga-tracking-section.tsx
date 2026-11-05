'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { cn } from '@/shared/lib/utils'
import type { FieldArrayPath, Path } from 'react-hook-form'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

const gaEvents = [
  { value: 'first_visit', label: 'First Visit' },
  { value: 'session_start', label: 'Session Start' },
  { value: 'user_engagement', label: 'User Engagement' },
  { value: 'page_view', label: 'Page View' },
]

export const ShortLinkGaSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint', 'common'])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tracking.google.ga_event_params' as FieldArrayPath<ShortLinkFormValues>,
  })

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="tracking.google.ga_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.gaTracking.fields.measurementId.label')}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('touchpoint:advancedSettings.gaTracking.fields.measurementId.placeholder')}
                {...field}
                value={field.value ?? ''}
                size="sm"
              />
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.gaTracking.fields.measurementId.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="tracking.google.ga_event_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.gaTracking.fields.eventName.label')}
            </FormLabel>
            <FormControl>
              <SingleCommandSelect
                {...field}
                options={gaEvents}
                placeholder={t(
                  'touchpoint:advancedSettings.gaTracking.fields.eventName.placeholder'
                )}
              />
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.gaTracking.fields.eventName.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <div>
          <FormLabel>
            {t('touchpoint:advancedSettings.gaTracking.fields.eventParams.label')}
          </FormLabel>
          <FormDescription>
            {t('touchpoint:advancedSettings.gaTracking.fields.eventParams.description')}
          </FormDescription>
        </div>
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <FormField
                control={control}
                name={`tracking.google.ga_event_params.${index}.key` as Path<ShortLinkFormValues>}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && (
                      <FormLabel>
                        {t('touchpoint:advancedSettings.gaTracking.fields.eventParams.keyLabel')}
                      </FormLabel>
                    )}
                    <FormControl>
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.gaTracking.fields.eventParams.keyPlaceholder'
                        )}
                        {...field}
                        value={field.value ?? ''}
                        size="sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`tracking.google.ga_event_params.${index}.value` as Path<ShortLinkFormValues>}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && (
                      <FormLabel>
                        {t(
                          'touchpoint:advancedSettings.gaTracking.fields.eventParams.valueLabel'
                        )}
                      </FormLabel>
                    )}
                    <FormControl>
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.gaTracking.fields.eventParams.valuePlaceholder'
                        )}
                        {...field}
                        value={field.value ?? ''}
                        size="sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
                className={cn(index === 0 ? 'mt-8' : '', 'w-10 h-10')}
              >
                <TrashIcon className="w-[18px] h-[18px]" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => append({ key: '', value: '' })}
          >
            {t('touchpoint:advancedSettings.gaTracking.fields.eventParams.addButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
