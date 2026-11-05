import { z } from "zod";

const orgCreditFormSchema = z.object({
    ai_credits_balance: z.number(),
})

export const orgCreditUpdateFormSchema = orgCreditFormSchema;
