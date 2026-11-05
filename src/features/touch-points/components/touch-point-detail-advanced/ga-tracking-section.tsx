import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { GATrackingForm } from '../forms/tracking/ga-tracking-form'
import { googleTrackingSchema } from '@/shared/schemas/touch-points/tracking.schema'

export const GATrackingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof googleTrackingSchema>) => {
    handleUpdate({ tracking: { google: data } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof googleTrackingSchema> = useMemo(() => {
    return touchPoint?.tracking?.google ?? {}
  }, [touchPoint])

  return (
    <>
      <GATrackingForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
    </>
  )
}
