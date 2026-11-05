import { axiosApiInstance } from '@/shared/lib/axios'
import { AvailableEvents } from '@/features/bootstrap/stores/bootstrap-store'
import { useMutation } from '@tanstack/react-query'
export const useTriggerBootstrapEvent = () => {
  return useMutation({
    mutationFn: async (_data: { event: AvailableEvents; anonId: string }) => {
      const { anonId, event } = _data
      const headers = {
        'anon-id': anonId,
      }
      const { data } = await axiosApiInstance.post<{ data: any; message: string }>(
        `/users/bootstrap`,
        { event },
        { headers }
      )
      return data
    },
  })
}
