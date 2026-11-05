import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Organization } from '@/app/api/organizations/route'
import { axiosApiInstance } from '@/shared/lib/axios'
import {
  organizationFormSchema,
  updateOrganizationSchema,
  setupOrganizationSchema,
} from '@/shared/schemas/organizations'
import { z } from 'zod'
import { revalidatePath } from '@/app/actions/revalidate-path'

export const useCreateOrganization = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof organizationFormSchema>) => {
      const { data: createdOrganization } = await axiosApiInstance.post<{
        data: Organization
        message: string
      }>(`/organizations`, data)
      return {
        organization: createdOrganization.data,
        message: createdOrganization.message,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useUpdateOrganization = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof updateOrganizationSchema>) => {
      return await axiosApiInstance.patch(`/organizations/${org_id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations', org_id] })
    },
  })
}

export const useDeleteOrganization = (org_id: string) => {
  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.delete(`/organizations/${org_id}`)
    },
  })
}

export const useSetupOrganization = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof setupOrganizationSchema>) => {
      const { data: updatedOrganization } = await axiosApiInstance.patch<{
        data: Organization
        message: string
      }>(`/organizations/${org_id}/setup`, data)
      const org = updatedOrganization.data
      if (!org?.org_slug) {
        throw new Error('Setup failed: organization slug was not saved')
      }
      return {
        organization: org,
        message: updatedOrganization.message,
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations', org_id] })
      await revalidatePath(`/org`)
    },
  })
}
