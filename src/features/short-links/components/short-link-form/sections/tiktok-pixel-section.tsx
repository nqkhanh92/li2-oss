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

const tiktokEvents = [
  { value: 'AddPaymentInfo', label: 'Add Payment Info' },
  { value: 'AddToCart', label: 'Add To Cart' },
  { value: 'AddToWishlist', label: 'Add To Wishlist' },
  { value: 'CompleteRegistration', label: 'Complete Registration' },
  { value: 'CompletePayment', label: 'Complete Payment' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Download', label: 'Download' },
  { value: 'InitiateCheckout', label: 'Initiate Checkout' },
  { value: 'PlaceAnOrder', label: 'Place An Order' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Search', label: 'Search' },
  { value: 'Subscribe', label: 'Subscribe' },
  { value: 'ViewContent', label: 'View Content' },
]

export const ShortLinkTikTokSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint', 'common'])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tracking.tiktok.custom_data' as FieldArrayPath<ShortLinkFormValues>,
  })

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="tracking.tiktok.pixel_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.tiktokTracking.fields.pixelId.label')}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  'touchpoint:advancedSettings.tiktokTracking.fields.pixelId.placeholder'
                )}
                {...field}
                value={field.value ?? ''}
                size="sm"
              />
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.tiktokTracking.fields.pixelId.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="tracking.tiktok.event_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.tiktokTracking.fields.eventName.label')}
            </FormLabel>
            <FormControl>
              <SingleCommandSelect
                {...field}
                options={tiktokEvents}
                placeholder={t(
                  'touchpoint:advancedSettings.tiktokTracking.fields.eventName.placeholder'
                )}
              />
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.tiktokTracking.fields.eventName.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <div>
          <FormLabel>
            {t('touchpoint:advancedSettings.tiktokTracking.fields.customData.label')}
          </FormLabel>
          <FormDescription>
            {t('touchpoint:advancedSettings.tiktokTracking.fields.customData.description')}
          </FormDescription>
        </div>
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <FormField
                control={control}
                name={`tracking.tiktok.custom_data.${index}.key` as Path<ShortLinkFormValues>}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && (
                      <FormLabel>
                        {t(
                          'touchpoint:advancedSettings.tiktokTracking.fields.customData.keyLabel'
                        )}
                      </FormLabel>
                    )}
                    <FormControl>
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.tiktokTracking.fields.customData.keyPlaceholder'
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
                name={`tracking.tiktok.custom_data.${index}.value` as Path<ShortLinkFormValues>}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && (
                      <FormLabel>
                        {t(
                          'touchpoint:advancedSettings.tiktokTracking.fields.customData.valueLabel'
                        )}
                      </FormLabel>
                    )}
                    <FormControl>
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.tiktokTracking.fields.customData.valuePlaceholder'
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
            {t('touchpoint:advancedSettings.tiktokTracking.fields.customData.addButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
