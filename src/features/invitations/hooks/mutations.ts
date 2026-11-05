import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { orgMemberUpdateFormSchema } from '@/shared/schemas/org-members'
import { z } from 'zod'
import { invitationCreateFormSchema } from '@/shared/schemas/invitations'

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const data = await axiosApiInstance.post(`public/invitations/${token}`, {
        action: 'accept',
      })
      return data
    },
  })
}

export const useResendInvitation = (org_id: string) => {
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await axiosApiInstance.post(`/organizations/${org_id}/invitations/${id}/resend`)
      return data
    },
  })
}

export const useDeleteInvitation = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await axiosApiInstance.delete(`/organizations/${org_id}/invitations/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'invitations'],
      })
    },
  })
}
export const useUpdateInvitation = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: z.infer<typeof orgMemberUpdateFormSchema>
    }) => {
      return axiosApiInstance.patch(`/organizations/${org_id}/invitations/${id}`, {
        role_id: data.role_id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'invitations'],
      })
    },
  })
}

export const useInviteMember = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof invitationCreateFormSchema>) => {
      return axiosApiInstance.post(`/organizations/${org_id}/invitations`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'invitations'],
      })
    },
  })
}
