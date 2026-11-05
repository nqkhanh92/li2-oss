import { z } from 'zod'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { linkPasswordFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { PasswordForm } from '../access-control/password-form'

type PasswordProtectionFormProps = {
  defaultValues?: z.infer<typeof linkPasswordFormSchema>
  close: () => void
  handleSubmit: (values: z.infer<typeof linkPasswordFormSchema>) => void
}

export default function PasswordProtectionForm({
  close,
  handleSubmit,
  defaultValues,
}: PasswordProtectionFormProps) {
  return (
    <PasswordForm
      initialData={defaultValues}
      onSubmit={handleSubmit}
      handleModalClose={close}
      isCreateNew
    />
  )
}
