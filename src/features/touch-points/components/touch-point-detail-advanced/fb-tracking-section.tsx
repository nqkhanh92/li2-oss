import { PasswordForm } from '../forms/access-control/password-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { FbTrackingForm } from '../forms/tracking/fb-tracking-form'
import { facebookTrackingSchema } from '@/shared/schemas/touch-points/tracking.schema'

export const FbTrackingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof facebookTrackingSchema>) => {
    handleUpdate({ tracking: { facebook: data } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof facebookTrackingSchema> = useMemo(() => {
    return touchPoint?.tracking?.facebook ?? {}
  }, [touchPoint])

  return (
    <>
      <FbTrackingForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
    </>
  )
}
