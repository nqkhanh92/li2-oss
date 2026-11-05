import { PasswordForm } from '../forms/access-control/password-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { notFoundUrlFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { z } from 'zod'
import { useMemo } from 'react'
import { CustomNotFoundForm } from '../forms/redirect-settings/custom-notfound-form'

export const CustomNotFoundSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof notFoundUrlFormSchema>) => {
    handleUpdate({ redirect_setting: { not_found_url: data.not_found_url } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof notFoundUrlFormSchema> = useMemo(() => {
    return {
      not_found_url: touchPoint?.redirect_setting?.not_found_url,
    }
  }, [touchPoint])

  return (
    <CustomNotFoundForm
      initialData={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isUpdating}
    />
  )
}
