import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  limitAccessFormSchema,
  linkPasswordFormSchema,
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

type LimitAccessFormProps = {
  onSubmit: (data: z.infer<typeof limitAccessFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof limitAccessFormSchema>
}
export const LimitAccessForm = ({ onSubmit, isLoading, initialData }: LimitAccessFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return initialData
  }, [initialData])
  const form = useForm<z.infer<typeof limitAccessFormSchema>>({
    resolver: zodResolver(limitAccessFormSchema),
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
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.limitAccess.fields.limit.label')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t(
                          'touchpoint:advancedSettings.limitAccess.fields.limit.placeholder'
                        )}
                        {...field}
                        value={field.value ?? ''}
                        type="number"
                        size="sm"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.limitAccess.fields.limit.description')}
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
