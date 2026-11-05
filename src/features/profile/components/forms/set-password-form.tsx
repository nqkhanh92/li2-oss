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
import { useForm } from 'react-hook-form'
import { useMemo } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { SetPasswordFormSchema } from '@/shared/schemas/profile'
import { PasswordInput } from '@/shared/components/ui/custom-password-input'
import { useTranslation } from 'react-i18next'

type SetPasswordFormProps = {
  onSubmit: (values: z.infer<typeof SetPasswordFormSchema>) => void
  isPending: boolean
  profile?: any
  close?: () => void
}
export const SetPasswordForm = ({ onSubmit, isPending, profile, close }: SetPasswordFormProps) => {
  const defaultValues = useMemo(() => {
    if (profile) {
      const values = profile as unknown as z.infer<typeof SetPasswordFormSchema>
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
  }, [profile])

  const form = useForm<z.infer<typeof SetPasswordFormSchema>>({
    resolver: zodResolver(SetPasswordFormSchema),
    defaultValues,
  })
  const handleSubmit = (values: z.infer<typeof SetPasswordFormSchema>) => {
    onSubmit(values)
  }
  const { t } = useTranslation('setting')
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('common:form.fields.current_field', {
                      field: t('common:form.fields.password'),
                    })}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput {...field} placeholder="*********" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4 w-full">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>
                      {t('common:form.fields.new_field', {
                        field: t('common:form.fields.password'),
                      })}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput {...field} placeholder="*********" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>{t('common:form.fields.confirm_password')}</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} disabled={isPending} placeholder="*********" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="flex justify-start mt-2 gap-2">
            <LoadingButton
              type="submit"
              className="rounded-[8px] py-2 px-6"
              isLoading={isPending}
              disabled={!form.formState.isDirty}
            >
              {t('common:buttons.save', { field: '' })}
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
