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

export const ShortLinkNotFoundSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])

  return (
    <FormField
      control={control}
      name="redirect_setting.not_found_url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t('touchpoint:advancedSettings.redirectSettings.fields.customNotFound.label')}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={t(
                'touchpoint:advancedSettings.redirectSettings.fields.customNotFound.placeholder'
              )}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormDescription>
            {t('touchpoint:advancedSettings.redirectSettings.fields.customNotFound.description')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
