'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/shared/components/ui/form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useForm } from 'react-hook-form'
import { useMemo } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { profileFormSchema } from '@/shared/schemas/profile'
import { DatePicker } from '@/shared/components/customize/date-picker'
import { useUpdateProfile } from '@/features/profile/hooks/mutations'
import { useTranslation } from 'react-i18next'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import timezones from 'timezones-list'

type ProfileFormProps = {
  profile?: any
}
export const ProfileForm = ({ profile }: ProfileFormProps) => {
  const defaultValues = useMemo(() => {
    if (profile) {
      const values = profile as unknown as z.infer<typeof profileFormSchema>
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
  }, [profile])

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  })

  const { mutate: updateUserProfile, isPending: isPending } = useUpdateProfile()

  const handleSubmit = (values: z.infer<typeof profileFormSchema>) => {
    updateUserProfile(values)
  }

  const { t } = useTranslation('setting')
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.name', { field: '' })}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('common:form.fields.name', { field: '' })}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400">{t('common:form.fields.email')}</FormLabel>
                  <FormControl className="max-h-10">
                    <Input
                      disabled
                      variant="default"
                      value={field.value}
                      className="bg-neutral-500! text-foreground"
                      endAdornment={<></>}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.address')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('common:form.fields.address')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.dob')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      className="border border-transparent flex bg-slate-100 rounded-[8px] text-slate-400
                      hover:bg-slate-100 hover:border-slate-400 hover:text-slate-500 focus:border-slate-400 
                      focus-within:border-slate-400 focus-visible:border-slate-400 active:border-slate-400"
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(value) => field.onChange(value ? value.toISOString() : null)}
                      disableFuture
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      captionLayout="dropdown"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.timezone')}</FormLabel>
                  <FormControl>
                    <SingleCommandSelect
                      value={field.value || undefined}
                      onChange={field.onChange}
                      options={timezones.map((timezone) => ({
                        value: timezone.tzCode,
                        label: `${timezone.label}`,
                      }))}
                      placeholder={t('common:form.fields.timezone')}
                      commandPlaceholder={t('common:filter.search_by_field', {
                        field: t('common:form.fields.timezone'),
                      })}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-start mt-4 gap-2">
          <LoadingButton
            type="submit"
            className="rounded-[8px] py-2 px-6"
            isLoading={isPending}
            disabled={!form.formState.isDirty}
          >
            {t('common:buttons.save', { field: '' })}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
