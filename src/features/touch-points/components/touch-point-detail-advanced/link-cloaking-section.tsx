import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { LinkCloakingForm } from '../forms/privacy-security/link-cloaking-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { linkCloakingSchema } from '@/shared/schemas/touch-points/privacy-security'

const linkCloakingFormSchema = z.object({
  link_cloaking: linkCloakingSchema,
})

export const LinkCloakingSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)

  const handleSubmit = (data: z.infer<typeof linkCloakingFormSchema>) => {
    handleUpdate({ privacy_security: { link_cloaking: data.link_cloaking } }, { multipart: false })
  }

  const defaultValues: z.infer<typeof linkCloakingFormSchema> = useMemo(() => {
    return {
      link_cloaking: touchPoint?.privacy_security?.link_cloaking,
    }
  }, [touchPoint])

  return (
    <LinkCloakingForm initialData={defaultValues} onSubmit={handleSubmit} isLoading={isUpdating} />
  )
}
