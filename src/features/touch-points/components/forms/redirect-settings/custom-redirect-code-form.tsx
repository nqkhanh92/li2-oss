import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  customRedirectCodeFormSchema,
  limitAccessFormSchema,
  linkPasswordFormSchema,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

type CustomRedirectCodeFormProps = {
  onSubmit: (data: z.infer<typeof customRedirectCodeFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof customRedirectCodeFormSchema>
}
export const CustomRedirectCodeForm = ({
  onSubmit,
  isLoading,
  initialData,
}: CustomRedirectCodeFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return initialData
  }, [initialData])
  const form = useForm<z.infer<typeof customRedirectCodeFormSchema>>({
    resolver: zodResolver(customRedirectCodeFormSchema),
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
              name="status_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(
                      'touchpoint:advancedSettings.redirectSettings.fields.customRedirectCode.label'
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Select
                        value={field.value ? field.value?.toString() : '302'}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
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
                                  (
                                  {t(
                                    'touchpoint:advancedSettings.redirectSettings.labels.defaultCode'
                                  )}
                                  )
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
