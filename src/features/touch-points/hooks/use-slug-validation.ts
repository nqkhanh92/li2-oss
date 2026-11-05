import { useMutation } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'

interface CheckSlugResponse {
  exists: boolean
}

export function useSlugValidation() {
  const { org_id } = useParams<{ org_id: string }>()

  return useMutation({
    mutationFn: async (slug: string) => {
      const { data } = await axiosApiInstance.post<APIResponse<CheckSlugResponse>>(
        `/organizations/${org_id}/slugs/check`,
        { slug }
      )
      return data.data
    },
  })
}
