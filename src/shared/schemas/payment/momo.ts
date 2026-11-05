import { z } from "zod";


const momoPaymentSchema = z.object({
    retention_days: z.number(),
    plan_name: z.string(),
    plan_price: z.string(),
})

const momoCheckTransactionSchema = z.object({
    requestId: z.string(),
    orderId: z.string(),
})

export const createMomoPaymentSchema = momoPaymentSchema
export const checkMomoTransactionSchema = momoCheckTransactionSchema
