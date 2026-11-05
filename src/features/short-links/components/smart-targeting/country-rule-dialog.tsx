'use client'

import { useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TrashIcon } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import type { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { CountrySelect } from '@/features/touch-points/components/forms/dynamic-targeting/selections/country-select'
import { cn } from '@/shared/lib/utils'

const countryRuleDialogSchema = z.object({
  values: z.array(z.string().length(2)).min(1, {
    message: 'smart_targeting.errors.at_least_one_country',
  }),
  destination: z.string().url({
    message: 'smart_targeting.errors.invalid_country_destination',
  }),
})

export type CountryRuleDialogValues = z.infer<typeof countryRuleDialogSchema>

type CountryRuleDialogProps = {
  initialData?: { values: string[]; destination: string }
  onSubmit: (data: CountryRuleDialogValues) => void
  onClose: () => void
  onDelete?: () => void
}

export const CountryRuleDialog = ({
  initialData,
  onSubmit,
  onClose,
  onDelete,
}: CountryRuleDialogProps) => {
  const { t } = useTranslation('touchpoint')
  const dialogRef = useRef<DialogCustomRef>(null)
  const form = useForm<CountryRuleDialogValues>({
    defaultValues: {
      values: initialData?.values ?? [],
      destination: initialData?.destination ?? '',
    },
    resolver: zodResolver(countryRuleDialogSchema),
  })
  const [submitting, startSubmitTransition] = useTransition()

  const handleSubmit = (data: CountryRuleDialogValues) => {
    startSubmitTransition(() => {
      onSubmit(data)
    })
  }

  return (
    <CustomDialogV2
      ref={dialogRef}
      initialOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="sm"
      title={t('smart_targeting.countries.dialog_title')}
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.stopPropagation()
            form.handleSubmit(handleSubmit)(e)
          }}
        >
          <div className="flex flex-col gap-6 pt-4">
            <FormField
              control={form.control}
              name="values"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('smart_targeting.countries.dialog_countries_label')}</FormLabel>
                  <FormControl>
                    <CountrySelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('smart_targeting.countries.dialog_destination_label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('smart_targeting.countries.dialog_destination_placeholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="w-full bg-slate-300" />

            <div className={cn('flex justify-end', onDelete && 'justify-between')}>
              {onDelete && (
                <LoadingButton
                  type="button"
                  variant="tertiary"
                  iconLeft={<TrashIcon />}
                  onClick={onDelete}
                >
                  {t('smart_targeting.countries.delete_rule')}
                </LoadingButton>
              )}
              <LoadingButton type="submit" isLoading={submitting}>
                {t('smart_targeting.countries.save_rule')}
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </CustomDialogV2>
  )
}
