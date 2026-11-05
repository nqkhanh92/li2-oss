import { axiosApiInstance } from '@/shared/lib/axios'
import { checkMomoTransactionSchema, createMomoPaymentSchema } from '@/shared/schemas/payment/momo'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'

type CreateMomoPaymentResponse = {
  partnerCode: string
  orderId: string
  requestId: string
  amount: string
  responseTime: string
  resultCode: number
  payUrl: string
  shortLink: string
  message: string
}

export const useCreateMomoPayment = () => {
  return useMutation<CreateMomoPaymentResponse, Error, z.infer<typeof createMomoPaymentSchema>>({
    mutationFn: async (data: z.infer<typeof createMomoPaymentSchema>) => {
      const response = await axiosApiInstance.post(`/payment/momo`, data)
      return response.data.data
    },
    onSuccess: (data) => {
      if (data.resultCode === 0) {
        window.location.href = data.payUrl
      } else {
        throw new Error(data.message)
      }
    },
  })
}

export const useCheckMomoTransaction = () => {
  return useMutation({
    mutationFn: async (data: z.infer<typeof checkMomoTransactionSchema>) => {
      return await axiosApiInstance.post(`/payment/momo/check-transaction`, data)
    },
  })
}
