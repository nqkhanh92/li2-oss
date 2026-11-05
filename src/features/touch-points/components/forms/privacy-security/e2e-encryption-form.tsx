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
import { Input } from '@/shared/components/ui/input'
import { useMemo } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTranslation } from 'react-i18next'
import { e2eEncryptionSchema } from '@/shared/schemas/touch-points/privacy-security'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

type E2EEncryptionFormProps = {
  onSubmit: (data: z.infer<typeof e2eEncryptionSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof e2eEncryptionSchema>
  destination: string
}

export const E2EEncryptionForm = ({
  onSubmit,
  isLoading,
  initialData,
  destination,
}: E2EEncryptionFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
  }, [initialData])

  const form = useForm<z.infer<typeof e2eEncryptionSchema>>({
    resolver: zodResolver(e2eEncryptionSchema),
    defaultValues: defaultValues,
  })

  const { t } = useTranslation(['touchpoint'])

  return (
    <div>
      <Form {...form}>
        <form>
          {initialData ? (
            <Alert variant={'info'}>
              <AlertTitle>{t('touchpoint:e2ee.form.enabled.title')}</AlertTitle>
              <AlertDescription>{t('touchpoint:e2ee.form.enabled.description')}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant={'info'}>
              <AlertTitle>{t('touchpoint:e2ee.form.disabled.title')}</AlertTitle>
              <AlertDescription>{t('touchpoint:e2ee.form.disabled.description')}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </div>
  )
}
