import { axiosApiInstance } from '@/shared/lib/axios'
import { useMutation } from '@tanstack/react-query'

export const useRefreshToken = () => {
  return useMutation({
    mutationKey: ['refreshToken'],
    mutationFn: async () => {
      const response = await axiosApiInstance.post('/auth/refresh')
      return response.data
    },
    retry: false,
  })
}
