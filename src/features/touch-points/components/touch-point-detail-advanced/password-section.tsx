import { PasswordForm } from '../forms/access-control/password-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { linkPasswordFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { z } from 'zod'
import { useMemo } from 'react'

export const PasswordSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof linkPasswordFormSchema>) => {
    handleUpdate({
      access_control: {
        password: data.password,
      },
    })
  }
  const defaultValues: z.infer<typeof linkPasswordFormSchema> = useMemo(() => {
    return {
      password: touchPoint?.access_control?.password,
    }
  }, [touchPoint])

  return <PasswordForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
}
