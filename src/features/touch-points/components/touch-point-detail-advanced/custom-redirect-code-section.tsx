import { PasswordForm } from '../forms/access-control/password-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import {
  customRedirectCodeFormSchema,
  limitAccessFormSchema,
  linkPasswordFormSchema,
} from '@/shared/schemas/touch-points/advanced.schema'
import { z } from 'zod'
import { useMemo } from 'react'
import { CustomRedirectCodeForm } from '../forms/redirect-settings/custom-redirect-code-form'

export const CustomRedirectCodeSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)
  const handleSubmit = (data: z.infer<typeof customRedirectCodeFormSchema>) => {
    handleUpdate({ redirect_setting: { status_code: data.status_code } }, { multipart: false })
  }
  const defaultValues: z.infer<typeof customRedirectCodeFormSchema> = useMemo(() => {
    return {
      status_code: touchPoint?.redirect_setting?.status_code,
    }
  }, [touchPoint])

  return (
    <CustomRedirectCodeForm
      initialData={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isUpdating}
    />
  )
}
