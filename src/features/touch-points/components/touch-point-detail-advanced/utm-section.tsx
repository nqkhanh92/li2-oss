import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { TouchPointUtmDataFormV2 } from '../forms/create-new/touch-point-utm-data-form-v2'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { touchPointUpdateSchema, utmSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { useMemo } from 'react'

export const UtmSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)

  const { form, handleUpdate, isUpdating: isLoading } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (values: z.infer<typeof utmSchema>) => {
    handleUpdate({ utm_tags: values })
  }
  const defaultValues: z.infer<typeof utmSchema> = useMemo(() => {
    return touchPoint?.utm_tags
  }, [touchPoint])

  return (
    <TouchPointUtmDataFormV2
      org_id={org_id}
      showCloseButton={false}
      shortLink={touchPoint?.short_url || ''}
      destination={touchPoint?.content_value || ''}
      close={() => {}}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      isLoading={isLoading}
    />
  )
}
