'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'
import { inputVariants } from '@/features/touch-points/constants/variants'
import { cn } from '@/shared/lib/utils'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkExpirationSection = () => {
  const { control, setValue } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint', 'common'])

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="access_control.valid_from"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.linkExpires.fields.validFrom.label')}
            </FormLabel>
            <FormControl>
              <div className="relative">
                {field.value && (
                  <Button
                    type="button"
                    onClick={() =>
                      setValue('access_control.valid_from', null, { shouldDirty: true })
                    }
                    className="absolute top-1/2 -translate-y-1/2 right-0 hover:bg-transparent"
                    variant="ghost"
                    size="icon"
                  >
                    <X className="size-[18px]" />
                  </Button>
                )}
                <DateTimePicker
                  disablePast
                  value={field.value || undefined}
                  onChange={field.onChange}
                  className={cn(inputVariants({ variant: 'muted' }), 'border-none')}
                />
              </div>
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.linkExpires.fields.validFrom.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="access_control.expires_at"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.linkExpires.fields.expiresAt.label')}
            </FormLabel>
            <FormControl>
              <div className="relative">
                {field.value && (
                  <Button
                    type="button"
                    onClick={() =>
                      setValue('access_control.expires_at', null, { shouldDirty: true })
                    }
                    className="absolute top-1/2 -translate-y-1/2 right-0 hover:bg-transparent"
                    variant="ghost"
                    size="icon"
                  >
                    <X className="size-[18px]" />
                  </Button>
                )}
                <DateTimePicker
                  disablePast
                  value={field.value || undefined}
                  onChange={field.onChange}
                  className={cn(inputVariants({ variant: 'muted' }), 'border-none')}
                />
              </div>
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.linkExpires.fields.expiresAt.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
