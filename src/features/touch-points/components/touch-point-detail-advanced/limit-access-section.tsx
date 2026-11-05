import { PasswordForm } from '../forms/access-control/password-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import {
  limitAccessFormSchema,
  linkPasswordFormSchema,
} from '@/shared/schemas/touch-points/advanced.schema'
import { z } from 'zod'
import { useMemo } from 'react'
import { LimitAccessForm } from '../forms/access-control/limit-access-form'

export const LimitAccessSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof limitAccessFormSchema>) => {
    handleUpdate({ access_control: { limit: data.limit } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof limitAccessFormSchema> = useMemo(() => {
    return {
      limit: touchPoint?.access_control?.limit,
    }
  }, [touchPoint])

  return (
    <LimitAccessForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
  )
}
