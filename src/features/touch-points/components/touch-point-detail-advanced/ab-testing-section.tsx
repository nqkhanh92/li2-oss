import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { AbTestingForm } from '../forms/targeting/ab-testing-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { abTestingSchema } from '@/shared/schemas/touch-points/advanced.schema'

const abTestingFormSchema = z.object({
  ab_testing: abTestingSchema,
})

export const AbTestingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)

  const handleSubmit = (data: z.infer<typeof abTestingFormSchema>) => {
    handleUpdate(
      {
        targeting: {
          ab_testing: data.ab_testing,
        },
      },
      { multipart: false }
    )
  }

  const defaultValues: z.infer<typeof abTestingFormSchema> = useMemo(() => {
    return {
      ab_testing: touchPoint?.targeting?.ab_testing || [],
    }
  }, [touchPoint])

  return (
    <AbTestingForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
  )
}
