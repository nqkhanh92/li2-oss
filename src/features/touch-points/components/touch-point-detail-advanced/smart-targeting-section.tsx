import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { z } from 'zod'
import { useMemo } from 'react'
import { dynamicTargetingSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { DynamicTargeting } from '../forms/dynamic-targeting'
import { CancelToken } from 'axios'

export const SmartTargetingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = async (
    data: z.infer<typeof dynamicTargetingSchema>,
    options?: { cancelToken?: CancelToken }
  ) => {
    await handleUpdate(
      {
        targeting: data,
      },
      { multipart: false, cancelToken: options?.cancelToken }
    )
  }
  const defaultValues: z.infer<typeof dynamicTargetingSchema> = useMemo(() => {
    if (touchPoint?.targeting) return touchPoint?.targeting
    return {
      targets: [],
    }
  }, [touchPoint])
  return (
    <DynamicTargeting initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
  )
}
