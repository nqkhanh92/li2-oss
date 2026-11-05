import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  FormControl,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { EyeClosedIcon, EyeIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTranslation } from 'react-i18next'
import {
  facebookTrackingSchema,
  googleTrackingSchema,
} from '@/shared/schemas/touch-points/tracking.schema'
import { cn } from '@/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
const availableEvents = [
  { value: 'first_visit', label: 'First Visit' },
  { value: 'session_start', label: 'Session Start' },
  { value: 'user_engagement', label: 'User Engagement' },
  { value: 'page_view', label: 'Page View' },
]
export const defaultGAEventName = 'page_view'

type GATrackingFormProps = {
  onSubmit: (data: z.infer<typeof googleTrackingSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof googleTrackingSchema>
}
export const GATrackingForm = ({ onSubmit, isLoading, initialData }: GATrackingFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      return pickDefinedAndNotNull(initialData)
    }
    return {
      ga_event_name: defaultGAEventName,
    }
  }, [initialData])
  const form = useForm<z.infer<typeof googleTrackingSchema>>({
    resolver: zodResolver(googleTrackingSchema),
    defaultValues: defaultValues,
  })
  const { t } = useTranslation(['touchpoint', 'common'])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ga_event_params',
  })

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="ga_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.gaTracking.fields.measurementId.label')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.gaTracking.fields.measurementId.placeholder'
                        )}
                        {...field}
                        value={field.value ?? ''}
                        type="text"
                        size="sm"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.gaTracking.fields.measurementId.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ga_event_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.gaTracking.fields.eventName.label')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <SingleCommandSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={availableEvents}
                        placeholder={t(
                          'touchpoint:advancedSettings.gaTracking.fields.eventName.placeholder'
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.gaTracking.fields.eventName.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <div className="space-y-2">
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
                      control={form.control}
                      name={`ga_event_params.${index}.key`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          {index === 0 && (
                            <FormLabel>
                              {t(
                                'touchpoint:advancedSettings.gaTracking.fields.eventParams.keyLabel'
                              )}
                            </FormLabel>
                          )}
                          <FormControl>
                            <Input
                              placeholder={t(
                                'touchpoint:advancedSettings.gaTracking.fields.eventParams.keyPlaceholder'
                              )}
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              size="sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ga_event_params.${index}.value`}
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
                              type="text"
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
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ key: '', value: '' })}
                  >
                    {t('touchpoint:advancedSettings.gaTracking.fields.eventParams.addButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-end items-center pt-4">
            <LoadingButton isLoading={isLoading} type="submit">
              {t('common:buttons.apply')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
