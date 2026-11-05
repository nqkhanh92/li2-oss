import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { z } from 'zod'
import { orgMemberUpdateFormSchema } from '@/shared/schemas/org-members'

export const useUpdateOrgMember = (org_id: string, id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof orgMemberUpdateFormSchema>) => {
      return axiosApiInstance.patch(`/organizations/${org_id}/members/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'members'],
      })
    },
  })
}

export const useDeleteOrgMember = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return axiosApiInstance.delete(`/organizations/${org_id}/members/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'members'],
      })
    },
  })
}

export const useLeaveOrganization = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return axiosApiInstance.delete(`/organizations/${org_id}/members/leave`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'members'],
      })
    },
  })
}
