'use client'

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
import { facebookTrackingSchema } from '@/shared/schemas/touch-points/tracking.schema'
import { cn } from '@/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { useShowTouchPoint } from '@/features/touch-points/hooks/queries'
import { useParams } from 'next/navigation'

type FbTrackingFormProps = {
  onSubmit: (data: z.infer<typeof facebookTrackingSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof facebookTrackingSchema>
}
const availableEvents = [
  {
    value: 'AddPaymentInfo',
    label: 'Add Payment Info',
  },
  {
    value: 'AddToCart',
    label: 'Add To Cart',
  },
  {
    value: 'AddToWishlist',
    label: 'Add To Wishlist',
  },
  {
    value: 'CompleteRegistration',
    label: 'Complete Registration',
  },
  {
    value: 'Contact',
    label: 'Contact',
  },
  {
    value: 'CustomizeProduct',
    label: 'Customize Product',
  },
  {
    value: 'Donate',
    label: 'Donate',
  },
  {
    value: 'FindLocation',
    label: 'Find Location',
  },
  {
    value: 'InitiateCheckout',
    label: 'Initiate Checkout',
  },
  {
    value: 'Lead',
    label: 'Lead',
  },
  {
    value: 'Purchase',
    label: 'Purchase',
  },
  {
    value: 'Schedule',
    label: 'Schedule',
  },
  {
    value: 'Search',
    label: 'Search',
  },
  {
    value: 'StartTrial',
    label: 'Start Trial',
  },
  {
    value: 'SubmitApplication',
    label: 'Submit Application',
  },
  {
    value: 'Subscribe',
    label: 'Subscribe',
  },
  {
    value: 'ViewContent',
    label: 'View Content',
  },
]
export const defaultFacebookEventName = 'Lead'

export const FbTrackingForm = ({ onSubmit, isLoading, initialData }: FbTrackingFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      return pickDefinedAndNotNull(initialData)
    }
    return {
      event_name: defaultFacebookEventName,
    }
  }, [initialData])

  const form = useForm<z.infer<typeof facebookTrackingSchema>>({
    resolver: zodResolver(facebookTrackingSchema),
    defaultValues: defaultValues,
  })
  const { t } = useTranslation(['touchpoint', 'common'])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'custom_data',
  })

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="pixel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.fbTracking.fields.pixelId.label')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.fbTracking.fields.pixelId.placeholder'
                        )}
                        {...field}
                        value={field.value ?? ''}
                        type="text"
                        size="sm"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.fbTracking.fields.pixelId.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="event_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.fbTracking.fields.eventName.label')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <SingleCommandSelect
                        {...field}
                        options={availableEvents}
                        placeholder={t(
                          'touchpoint:advancedSettings.fbTracking.fields.eventName.placeholder'
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.fbTracking.fields.eventName.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>
                  {t('touchpoint:advancedSettings.fbTracking.fields.customData.label')}
                </FormLabel>
                <FormDescription>
                  {t('touchpoint:advancedSettings.fbTracking.fields.customData.description')}
                </FormDescription>
              </div>
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`custom_data.${index}.key`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          {index === 0 && (
                            <FormLabel>
                              {t(
                                'touchpoint:advancedSettings.fbTracking.fields.customData.keyLabel'
                              )}
                            </FormLabel>
                          )}
                          <FormControl>
                            <Input
                              placeholder={t(
                                'touchpoint:advancedSettings.fbTracking.fields.customData.keyPlaceholder'
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
                      name={`custom_data.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          {index === 0 && (
                            <FormLabel>
                              {t(
                                'touchpoint:advancedSettings.fbTracking.fields.customData.valueLabel'
                              )}
                            </FormLabel>
                          )}
                          <FormControl>
                            <Input
                              placeholder={t(
                                'touchpoint:advancedSettings.fbTracking.fields.customData.valuePlaceholder'
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
                    size="sm"
                    onClick={() => append({ key: '', value: '' })}
                  >
                    {t('touchpoint:advancedSettings.fbTracking.fields.customData.addButton')}
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
