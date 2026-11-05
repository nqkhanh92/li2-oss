import { z } from "zod";

export const contactFormSchema = z
  .object({
    full_name: z.string().min(4).max(64),
    email: z.string().email(),
    phone_number: z.string().min(10),
    company: z.string().optional(),
    industry: z.string().optional(),
    question_about: z.string().optional(),
    agree_policy: z
      .boolean()
      .refine((value) => value === true, {
        params: {
          i18n: {
            key: 'errors.agree_policy',
          },
        },
      }),
  })