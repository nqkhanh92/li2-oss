import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { TiktokTrackingForm } from '../forms/tracking/tiktok-tracking-form'
import { tiktokTrackingSchema } from '@/shared/schemas/touch-points/tracking.schema'

export const TiktokTrackingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof tiktokTrackingSchema>) => {
    handleUpdate({ tracking: { tiktok: data } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof tiktokTrackingSchema> = useMemo(() => {
    return touchPoint?.tracking?.tiktok ?? {}
  }, [touchPoint])

  return (
    <>
      <TiktokTrackingForm
        initialData={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isUpdating}
      />
    </>
  )
}
