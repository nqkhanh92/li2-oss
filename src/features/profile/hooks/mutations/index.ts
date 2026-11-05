import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { profileFormSchema, SetPasswordFormSchema } from '@/shared/schemas/profile'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      return await axiosApiInstance.post(`/users/profile`, { data })
    },
    onSuccess: () => {
      router.refresh()
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async (data: z.infer<typeof SetPasswordFormSchema>) => {
      return await axiosApiInstance.post(`/users/profile/password`, { data })
    },
  })
}

export const useDeleteProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.delete(`/users/profile`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export const useUploadImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      file_name,
      folder,
    }: {
      file: File
      file_name: string
      folder: string
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_name', file_name)
      formData.append('folder', folder)

      return await axiosApiInstance.post(`/users/profile/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
