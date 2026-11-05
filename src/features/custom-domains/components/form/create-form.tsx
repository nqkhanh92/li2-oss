import { createCustomDomainSchema } from '@/shared/schemas/custom-domains'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useCreateCustomDomain } from '@/features/custom-domains/hooks/mutations'
import { useParams } from 'next/navigation'
import { CustomDomain } from '@/app/api/organizations/[org_id]/custom-domains/[domain_id]/route'
import { useTranslation } from 'react-i18next'
type CreateDomainFormProps = {
  onFinish: (data: CustomDomain) => void
}
export const CreateDomainForm = ({ onFinish }: CreateDomainFormProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate, isPending } = useCreateCustomDomain(org_id)
  const { t } = useTranslation('domain')
  const form = useForm<z.infer<typeof createCustomDomainSchema>>({
    resolver: zodResolver(createCustomDomainSchema),
    defaultValues: {
      domain: '',
    },
  })

  const handleSubmit = (values: z.infer<typeof createCustomDomainSchema>) => {
    mutate(values, {
      onSuccess: (data) => {
        onFinish(data.data.data)
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                {t('forms.addDomainStep.inputLabel')}
              </FormLabel>
              <FormControl>
                <Input placeholder={t('forms.addDomainStep.inputPlaceholder')} {...field} />
              </FormControl>
              {/* <FormDescription>
                Domain name for your organization
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <LoadingButton className="w-full" type="submit" isLoading={isPending}>
            {t('common:buttons.next')}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
