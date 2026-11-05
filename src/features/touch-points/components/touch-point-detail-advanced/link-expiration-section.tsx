import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { linkExpiresAtFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { z } from 'zod'
import { useMemo } from 'react'
import { LinkExpirationForm } from '../forms/access-control/link-expiration-form'

export const LinkExpirationSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof linkExpiresAtFormSchema>) => {
    handleUpdate(
      { access_control: { expires_at: data.expires_at, valid_from: data.valid_from } },
      { multipart: false }
    )
  }
  const defaultValues: z.infer<typeof linkExpiresAtFormSchema> = useMemo(() => {
    return {
      expires_at: touchPoint?.access_control?.expires_at,
      valid_from: touchPoint?.access_control?.valid_from,
    }
  }, [touchPoint])

  return (
    <LinkExpirationForm
      initialData={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isUpdating}
    />
  )
}
