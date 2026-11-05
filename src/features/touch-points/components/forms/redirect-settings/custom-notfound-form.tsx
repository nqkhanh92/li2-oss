import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  customRedirectCodeFormSchema,
  limitAccessFormSchema,
  linkPasswordFormSchema,
  notFoundUrlFormSchema,
  validStatusCode,
} from '@/shared/schemas/touch-points/advanced.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  FormControl,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { EyeClosedIcon, EyeIcon } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTranslation } from 'react-i18next'

type CustomNotFoundFormProps = {
  onSubmit: (data: z.infer<typeof notFoundUrlFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof notFoundUrlFormSchema>
}
export const CustomNotFoundForm = ({
  onSubmit,
  isLoading,
  initialData,
}: CustomNotFoundFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return initialData
  }, [initialData])
  const form = useForm<z.infer<typeof notFoundUrlFormSchema>>({
    resolver: zodResolver(notFoundUrlFormSchema),
    defaultValues: defaultValues,
  })
  const { t } = useTranslation(['touchpoint'])

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="not_found_url"
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
                    />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'touchpoint:advancedSettings.redirectSettings.fields.customNotFound.description'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-4 justify-end items-center pt-4">
            <LoadingButton isLoading={isLoading} type="submit">
              {t('touchpoint:advancedSettings.linkPreview.actions.apply')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
