import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { linkPasswordFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
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

type PasswordFormProps = {
  onSubmit: (data: z.infer<typeof linkPasswordFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof linkPasswordFormSchema>

  handleModalClose?: () => void
  isCreateNew?: boolean
}
export const PasswordForm = ({
  onSubmit,
  handleModalClose,
  isLoading,
  initialData,
  isCreateNew,
}: PasswordFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return initialData
  }, [initialData])
  const form = useForm<z.infer<typeof linkPasswordFormSchema>>({
    resolver: zodResolver(linkPasswordFormSchema),
    defaultValues: defaultValues,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [transition, startTransition] = useTransition()
  const { t } = useTranslation(['touchpoint'])

  const handleGeneratePassword = () => {
    startTransition(async () => {
      const password = Math.random().toString(36).slice(-24)
      await new Promise((resolve) => setTimeout(resolve, 700))
      form.setValue('password', password)
    })
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('touchpoint:advancedSettings.password.fields.password.label') || 'Password'}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder={
                          t('touchpoint:advancedSettings.password.fields.password.placeholder') ||
                          'Enter password'
                        }
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        endAdornment={
                          showPassword ? (
                            <EyeIcon
                              onClick={() => setShowPassword(false)}
                              className="cursor-pointer"
                            />
                          ) : (
                            <EyeClosedIcon
                              onClick={() => setShowPassword(true)}
                              className="cursor-pointer"
                            />
                          )
                        }
                        size="sm"
                      />
                      <LoadingButton
                        variant={'secondary'}
                        onClick={handleGeneratePassword}
                        isLoading={transition}
                      >
                        {t('touchpoint:advancedSettings.password.actions.random')}
                      </LoadingButton>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('touchpoint:advancedSettings.password.fields.password.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {!isCreateNew ? (
            <div className="flex justify-end">
              <LoadingButton isLoading={isLoading} type="submit">
                {t('common:buttons.save')}
              </LoadingButton>
            </div>
          ) : (
            <div className="flex gap-4 justify-end items-center pt-4 border-t">
              <Button type="button" variant="ghost" onClick={handleModalClose}>
                {t('touchpoint:advancedSettings.linkPreview.actions.discard')}
              </Button>
              <LoadingButton type="submit">
                {t('touchpoint:advancedSettings.linkPreview.actions.apply')}
              </LoadingButton>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
