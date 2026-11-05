'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

export const UrlQrFields = () => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name="url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('touchpoint:static_qr.fields.url', { defaultValue: 'URL' })}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="url"
              placeholder={t('touchpoint:static_qr.placeholders.url', {
                defaultValue: 'https://li2.ai',
              })}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
