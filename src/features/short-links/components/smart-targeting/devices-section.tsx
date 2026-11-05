'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Apple, Smartphone } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const DevicesSection = () => {
  const { t } = useTranslation('touchpoint')
  const { control } = useFormContext<ShortLinkFormValues>()

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {t('smart_targeting.devices.heading')}
      </h3>

      <FormField
        control={control}
        name="smart_targeting.devices.android"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-slate-600" />
              {t('smart_targeting.devices.android')}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                type="text"
                placeholder={t('smart_targeting.devices.android_placeholder')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="smart_targeting.devices.ios"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-sm">
              <Apple className="h-4 w-4 text-slate-600" />
              {t('smart_targeting.devices.ios')}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                type="text"
                placeholder={t('smart_targeting.devices.ios_placeholder')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  )
}
