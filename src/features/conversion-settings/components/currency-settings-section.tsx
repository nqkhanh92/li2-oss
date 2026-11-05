'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useEffect } from 'react'

import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { getCurrencyOptions } from '@/shared/lib/currency'
import { useUpdateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { currencySchema } from '@/shared/schemas/organizations'

const formSchema = z.object({
  default_currency: currencySchema,
})

interface Props {
  org_id: string
  currentCurrency: string
}

export const CurrencySettingsSection = ({ org_id, currentCurrency }: Props) => {
  const { t } = useTranslation('setting')
  const { mutate, isPending } = useUpdateOrganization(org_id)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_currency: (currentCurrency as 'USD' | 'VND') || 'USD',
    },
  })

  useEffect(() => {
    form.reset({ default_currency: (currentCurrency as 'USD' | 'VND') || 'USD' })
  }, [org_id, currentCurrency, form])

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    mutate(values, {
      onSuccess: () => {
        toast.success(
          t('conversion_settings.currency.saved', 'Currency setting saved successfully')
        )
        form.reset(values)
      },
      onError: () => {
        toast.error(t('common:messages.error.default', 'An error occurred'))
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          {t(
            'conversion_settings.currency.description',
            'Currency used for conversion tracking when not specified in sale events. This affects how revenue is displayed across your analytics.'
          )}
        </p>

        <FormField
          control={form.control}
          name="default_currency"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1 space-y-0">
              <FormLabel className="text-foreground text-sm">
                {t('conversion_settings.currency.title', 'Default Currency')}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full md:w-60">
                    <SelectValue
                      placeholder={t(
                        'conversion_settings.currency.select_placeholder',
                        'Select currency'
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getCurrencyOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
