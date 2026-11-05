import { z } from 'zod'
import { urlSchema } from '..'
import { validateUrl } from '@/shared/lib/utils'

export const validStatusCode = [301, 302, 307, 308]

const linkPasswordSchema = z
  .string()
  .max(256)
  .refine((val) => !/\s/.test(val), {
    params: { i18n: { key: 'errors.no_whitespace' } },
  })
  .or(z.literal(''))
const linkExpiresAtSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return null
    if (val === 'null' || val === '') return null
    return val
  },
  z.union([z.date(), z.string().transform((val) => new Date(val)), z.null()])
)
const limitAccessSchema = z
  .number()
  .or(z.literal('').transform(() => null))
  .or(z.string().transform((val) => Number(val)))
  .transform((val) => {
    if (Number(val) < 0) {
      return null
    }
    return val
  })
  .nullable()
  .optional()

const customRedirectCodeSchema = z
  .number()
  .or(z.string().transform((val) => Number(val)))
  .refine((val) => validStatusCode.includes(val), {
    message: 'Invalid status code',
  })
  .optional()

export const notFoundUrlSchema = urlSchema.optional().superRefine((data, ctx) => {
  if (!data) return
  const valid = validateUrl(data)
  if (!valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: {
        i18n: {
          key: 'errors.invalid_url',
        },
      },
    })
  }
})

export const abTestingSchema = z
  .array(
    z.object({
      url: urlSchema,
      percentage: z.number().min(0).max(100),
    })
  )
  .superRefine((data, ctx) => {
    if (data.length > 0 && data.map((item) => item.percentage).reduce((a, b) => a + b, 0) !== 100) {
      ctx.addIssue({
        path: [''],
        code: z.ZodIssueCode.custom,
        params: {
          i18n: {
            key: 'errors.ab_testing_percentage',
          },
        },
      })
    }
  })

export const linkPasswordFormSchema = z.object({
  password: linkPasswordSchema.optional(),
})
export const linkExpiresAtFormSchema = z.object({
  expires_at: linkExpiresAtSchema.optional(),
  valid_from: linkExpiresAtSchema.optional(),
})
export const limitAccessFormSchema = z.object({
  limit: limitAccessSchema.optional(),
})

export const customRedirectCodeFormSchema = z.object({
  status_code: customRedirectCodeSchema,
})

export const notFoundUrlFormSchema = z.object({
  not_found_url: notFoundUrlSchema,
})

export const accessControlSchema = z
  .object({})
  .extend(linkExpiresAtFormSchema.shape)
  .extend(linkPasswordFormSchema.shape)
  .extend(limitAccessFormSchema.shape)

export const redirectSettingSchema = z
  .object({})
  .extend(customRedirectCodeFormSchema.shape)
  .extend(notFoundUrlFormSchema.shape)
