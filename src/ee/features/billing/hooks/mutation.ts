import { axiosApiInstance } from '@/shared/lib/axios'
import { useMutation } from '@tanstack/react-query'

type CreateOrderBody = {
  plan_id: string
  cycle: 'monthly' | 'yearly'
  order_type?: 'purchase' | 'extend' | 'upgrade'
}

export type CreateOrderResponse = {
  order_id: string
  plan_id: string
  amount: string
  retention_days: number
  description: string
  order_type?: 'purchase' | 'extend' | 'upgrade'
}

export const useCreateOrder = () => {
  return useMutation<CreateOrderResponse, Error, CreateOrderBody>({
    mutationFn: async (body) => {
      const response = await axiosApiInstance.post('/payment/orders', body)
      return response.data.data
    },
  })
}

export const useConfirmTransfer = () => {
  return useMutation<void, Error, { order_id: string }>({
    mutationFn: async (body) => {
      await axiosApiInstance.patch('/payment/orders/confirm', body)
    },
  })
}
