'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkClickLimitSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])

  return (
    <FormField
      control={control}
      name={'access_control.limit'}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('touchpoint:advancedSettings.limitAccess.fields.limit.label')}</FormLabel>
          <FormControl>
            <Input
              placeholder={t('touchpoint:advancedSettings.limitAccess.fields.limit.placeholder')}
              {...field}
              value={field.value ?? ''}
              type="number"
              size="sm"
            />
          </FormControl>
          <FormDescription>
            {t('touchpoint:advancedSettings.limitAccess.fields.limit.description')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
