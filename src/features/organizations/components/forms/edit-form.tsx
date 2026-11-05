'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { updateOrganizationSchema } from '@/shared/schemas/organizations'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useParams } from 'next/navigation'
import { useUpdateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Organization } from '@/app/api/organizations/route'
import { useTranslation } from 'react-i18next'

export const EditOrganizationForm = ({ initialValues }: { initialValues: Organization | null }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const form = useForm<z.infer<typeof updateOrganizationSchema>>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
    },
  })
  const { mutate, isPending } = useUpdateOrganization(org_id)
  const handleSubmit = (values: z.infer<typeof updateOrganizationSchema>) => {
    mutate(values)
  }
  const { t } = useTranslation('organization')
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1 space-y-0">
              <FormLabel className="text-foreground text-sm">
                {t('common:form.fields.name', {
                  field: t('common:module.organization'),
                })}
              </FormLabel>
              <div className="flex items-center gap-2 space-y-0!">
                <FormControl>
                  <Input
                    placeholder={t('common:form.fields.name', {
                      field: t('common:module.organization'),
                    })}
                    {...field}
                    className="placeholder:text-slate-700 text-slate-700"
                  />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          isLoading={isPending}
          className="w-fit"
          disabled={!form.formState.isDirty || isPending}
        >
          {t('common:buttons.save', { field: '' })}
        </LoadingButton>
      </form>
    </Form>
  )
}
