import { z } from 'zod'

export const confirmMfaSchema = z.object({
  passcode: z
    .string()
    .trim()
    .refine(
      (val) => {
        return val.length === 6
      },
      {
        params: {
          i18n: {
            key: 'errors.invalid_code',
          },
        },
      }
    ),
})
