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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { validStatusCode } from '@/shared/schemas/touch-points/advanced.schema'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkRedirectCodeSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])

  return (
    <FormField
      control={control}
      name="redirect_setting.status_code"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t('touchpoint:advancedSettings.redirectSettings.fields.customRedirectCode.label')}
          </FormLabel>
          <FormControl>
            <Select
              value={field.value ? field.value.toString() : '302'}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={t(
                    'touchpoint:advancedSettings.redirectSettings.fields.customRedirectCode.placeholder'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {validStatusCode.map((code) => (
                  <SelectItem key={code} value={code.toString()}>
                    {code}{' '}
                    {code === 302 && (
                      <span className="text-muted-foreground">
                        ({t('touchpoint:advancedSettings.redirectSettings.labels.defaultCode')})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription>
            {t(
              'touchpoint:advancedSettings.redirectSettings.fields.customRedirectCode.description'
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
