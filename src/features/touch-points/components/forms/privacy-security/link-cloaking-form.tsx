import { useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { Switch } from '@/shared/components/ui/switch'
import { useMemo } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTranslation } from 'react-i18next'
import { linkCloakingSchema } from '@/shared/schemas/touch-points/privacy-security'

const linkCloakingFormSchema = z.object({
  link_cloaking: linkCloakingSchema,
})

type LinkCloakingFormProps = {
  onSubmit: (data: z.infer<typeof linkCloakingFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof linkCloakingFormSchema>
}

export const LinkCloakingForm = ({ onSubmit, isLoading, initialData }: LinkCloakingFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return initialData
  }, [initialData])

  const form = useForm<z.infer<typeof linkCloakingFormSchema>>({
    resolver: zodResolver(linkCloakingFormSchema),
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
              name="link_cloaking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('touchpoint:advancedSettings.privacySecurity.fields.linkCloaking.label')}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'touchpoint:advancedSettings.privacySecurity.fields.linkCloaking.description'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
