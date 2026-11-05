import { useParams } from 'next/navigation'
import { useShowTouchPoint } from '../../hooks/queries'
import { z } from 'zod'
import { useMemo } from 'react'
import { E2EEncryptionForm } from '../forms/privacy-security/e2e-encryption-form'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { e2eEncryptionSchema } from '@/shared/schemas/touch-points/privacy-security'

export const E2EEncryptionSection = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { form, handleUpdate, isUpdating } = useUpdateTouchPointForm(touchPoint)

  const handleSubmit = (data: z.infer<typeof e2eEncryptionSchema>) => {
    handleUpdate({ privacy_security: { e2e_encryption: data } }, { multipart: false })
  }

  const defaultValues = useMemo(() => {
    return touchPoint?.privacy_security?.e2e_encryption
  }, [touchPoint])

  return (
    <>
      {touchPoint.content_value && (
        <E2EEncryptionForm
          destination={touchPoint.content_value}
          initialData={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
        />
      )}
    </>
  )
}
