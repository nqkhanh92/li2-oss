import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { useMemo, useEffect } from 'react'
import { getDefaultFormValues } from '../components/forms/touch-point-form.constants'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'

type TouchPointFormValues = z.infer<typeof touchPointFormCreateWithAdvanceSchema>

/**
 * Hook to initialize and manage touch point form
 */
export const useTouchPointForm = () => {
  const defaultValues = useMemo(() => getDefaultFormValues(), [])

  const form = useForm<TouchPointFormValues>({
    resolver: zodResolver(touchPointFormCreateWithAdvanceSchema),
    defaultValues,
  })

  const { setEnabled } = useFormWarningProvider()

  useEffect(() => {
    setEnabled(form.formState.isDirty && !form.formState.isSubmitSuccessful)
  }, [form.formState.isDirty, form.formState.isSubmitSuccessful, setEnabled])

  const isFormDirty = useMemo(
    () => Object.keys(form.formState.dirtyFields).length > 0,
    [form.formState.dirtyFields]
  )

  return {
    form,
    isFormDirty,
  }
}

export type { TouchPointFormValues, UseFormReturn }
