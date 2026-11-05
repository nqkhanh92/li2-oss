import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { useForm } from 'react-hook-form'
import { useEffect, useMemo } from 'react'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useUpdateTouchPoint } from './mutations'
import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { CancelToken } from 'axios'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { useParams } from 'next/navigation'

export const useUpdateTouchPointForm = (
  touchPoint: z.infer<typeof touchPointUpdateSchema> & GetTouchPointObject
) => {
  const { org_id } = useParams<{ org_id: string }>()

  const queryClient = useQueryClient()
  const defaultValues = useMemo(() => {
    if (touchPoint) {
      return {
        ...pickDefinedAndNotNull(touchPoint),
        tags: touchPoint.tp_tag_links?.map((link) => link.tag_id) || [],
      }
    }
    return {}
  }, [touchPoint])

  const { mutate: updateTp, isPending: isUpdating } = useUpdateTouchPoint(org_id, touchPoint.id)

  const form = useForm<z.infer<typeof touchPointUpdateSchema>>({
    resolver: zodResolver(touchPointUpdateSchema),
    defaultValues,
  })
  const { setEnabled } = useFormWarningProvider()

  useEffect(() => {
    setEnabled(form.formState.isDirty && !form.formState.isSubmitSuccessful)
  }, [form.formState.isDirty, form.formState.isSubmitSuccessful, setEnabled])
  const isFormDirty = useMemo(
    () => Object.keys(form.formState.dirtyFields).length > 0,
    [form.formState.dirtyFields]
  )

  const handleUpdate = async (
    values: z.infer<typeof touchPointUpdateSchema>,
    options?: { multipart?: boolean; cancelToken?: CancelToken }
  ): Promise<void> => {
    return new Promise<void>((resolve) => {
      updateTp(
        {
          data: values,
          options,
        },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(
              ['organizations', touchPoint.organization_id, 'touch-points', touchPoint.id],
              (pre: z.infer<typeof touchPointUpdateSchema> & GetTouchPointObject) => {
                return {
                  ...pre,
                  ...data,
                }
              }
            )
            resolve()
          },
          onError: () => resolve(),
        }
      )
    })
  }

  const isE2eEnabled = !!touchPoint.privacy_security?.e2e_encryption

  const isAnyUpdating = useIsMutating({
    mutationKey: ['organizations', org_id, 'touch-points', touchPoint.id],
  })

  return {
    form,
    handleUpdate,
    isUpdating: isAnyUpdating > 0,
    isFormDirty,
    isE2eEnabled,
  }
}
