'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { EyeOff } from 'lucide-react'
import { FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Switch } from '@/shared/components/ui/switch'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkCloakingSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])

  return (
    <FormField
      control={control}
      name="privacy_security.link_cloaking"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                {t('touchpoint:advancedOptionMenu.items.link_cloaking.title')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('touchpoint:advancedOptionMenu.items.link_cloaking.description', {
                  defaultValue: 'Hide the original URL for better branding or privacy.',
                })}
              </p>
            </div>
            <FormControl>
              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
