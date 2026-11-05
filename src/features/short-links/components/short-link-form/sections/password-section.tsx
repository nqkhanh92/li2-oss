'use client'

import { useState, useTransition } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeClosedIcon } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkPasswordSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <FormField
      control={control}
      name="access_control.password"
      render={({ field }) => {
        const handleGenerate = () => {
          startTransition(async () => {
            const password = Math.random().toString(36).slice(-24)
            await new Promise((resolve) => setTimeout(resolve, 700))
            field.onChange(password)
          })
        }

        return (
          <FormItem>
            <FormLabel>
              {t('touchpoint:advancedSettings.password.fields.password.label')}
            </FormLabel>
            <FormControl>
              <div className="flex gap-2">
                <Input
                  placeholder={t(
                    'touchpoint:advancedSettings.password.fields.password.placeholder'
                  )}
                  {...field}
                  value={field.value ?? ''}
                  type={showPassword ? 'text' : 'password'}
                  size="sm"
                  endAdornment={
                    showPassword ? (
                      <EyeIcon
                        onClick={() => setShowPassword(false)}
                        className="cursor-pointer"
                      />
                    ) : (
                      <EyeClosedIcon
                        onClick={() => setShowPassword(true)}
                        className="cursor-pointer"
                      />
                    )
                  }
                />
                <LoadingButton
                  type="button"
                  variant="secondary"
                  isLoading={isPending}
                  onClick={handleGenerate}
                >
                  {t('touchpoint:advancedSettings.password.actions.random')}
                </LoadingButton>
              </div>
            </FormControl>
            <FormDescription>
              {t('touchpoint:advancedSettings.password.fields.password.description')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
