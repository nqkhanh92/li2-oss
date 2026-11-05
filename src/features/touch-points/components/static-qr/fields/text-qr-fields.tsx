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
import { Textarea } from '@/shared/components/ui/textarea'

export const TextQrFields = () => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const form = useFormContext()

  return (
    <FormField
      control={form.control}
      name="text"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('touchpoint:static_qr.fields.text', { defaultValue: 'Text' })}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder={t('touchpoint:static_qr.placeholders.text', {
                defaultValue: 'Enter your text content',
              })}
              rows={4}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
