import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { Invitation } from '@/core/types/invitation.type'

type InvitationByToken = Omit<Invitation, 'org_id' | 'invite_by'> & {
  org_id: { id: string; name: string; org_slug: string }
  invite_by: { email: string }
}

export const useShowInvitationByToken = (token: string) => {
  return useQuery<InvitationByToken>({
    queryKey: ['invitations-by-token', token],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{
        data: InvitationByToken
      }>(`public/invitations/${token}`)
      return data.data
    },
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

export const useGetOrgInvitation = (org_id: string, { enabled = true } = {}) => {
  return useQuery<Invitation[]>({
    queryKey: ['organizations', org_id, 'invitations'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: Invitation[] }>(
        `/organizations/${org_id}/invitations`
      )
      return data.data
    },
    enabled,
  })
}
