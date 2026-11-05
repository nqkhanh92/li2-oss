import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { linkExpiresAtFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
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
import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useTranslation } from 'react-i18next'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'
import { inputVariants } from '@/features/touch-points/constants/variants'
import { cn } from '@/shared/lib/utils'

type LinkExpirationFormProps = {
  onSubmit: (data: z.infer<typeof linkExpiresAtFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof linkExpiresAtFormSchema>
}
export const LinkExpirationForm = ({
  onSubmit,
  isLoading,
  initialData,
}: LinkExpirationFormProps) => {
  const defaultValues = useMemo(() => {
    return {
      expires_at: initialData?.expires_at,
      valid_from: initialData?.valid_from,
    }
  }, [initialData])
  const form = useForm<z.infer<typeof linkExpiresAtFormSchema>>({
    resolver: zodResolver(linkExpiresAtFormSchema),
    defaultValues: defaultValues,
  })
  const { t } = useTranslation(['touchpoint', 'common'])
  const watchExpiresAt = form.watch('expires_at')
  console.log({ watchExpiresAt })

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="valid_from"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel>
                      {t('touchpoint:advancedSettings.linkExpires.fields.validFrom.label')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        {field.value && (
                          <Button
                            type="button"
                            onClick={() => {
                              form.setValue('valid_from', null)
                            }}
                            className="absolute top-1/2 -translate-y-1/2 right-0 hover:bg-transparent"
                            variant="ghost"
                            size="icon"
                          >
                            <X className="size-[18px]" />
                          </Button>
                        )}
                        <DateTimePicker
                          disablePast
                          value={field.value || undefined}
                          onChange={field.onChange}
                          className={cn(inputVariants({ variant: 'muted' }), 'border-none')}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('touchpoint:advancedSettings.linkExpires.fields.validFrom.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => {
                console.log({ v: field.value })
                return (
                  <FormItem>
                    <FormLabel>
                      {t('touchpoint:advancedSettings.linkExpires.fields.expiresAt.label')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        {field.value && (
                          <Button
                            type="button"
                            onClick={() => {
                              form.setValue('expires_at', null)
                            }}
                            className="absolute top-1/2 -translate-y-1/2 right-0 hover:bg-transparent"
                            variant="ghost"
                            size="icon"
                          >
                            <X className="size-[18px]" />
                          </Button>
                        )}
                        <DateTimePicker
                          disablePast
                          value={field.value || undefined}
                          onChange={field.onChange}
                          className={cn(inputVariants({ variant: 'muted' }), 'border-none')}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('touchpoint:advancedSettings.linkExpires.fields.expiresAt.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </div>
          <div className="flex gap-4 justify-end items-center pt-4">
            <LoadingButton isLoading={isLoading} type="submit">
              {t('common:buttons.apply')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
