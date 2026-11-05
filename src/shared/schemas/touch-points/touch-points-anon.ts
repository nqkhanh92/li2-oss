import { z } from 'zod'
import { validateUrl } from '../../lib/utils'
import { TouchPointContentType, TouchPointVariants } from '../../../features/touch-points/types'
import { strictBoolean } from '..'
const urlSchema = z
  .string()
  .trim()
  .transform((val) => {
    if (!/^https?:\/\//i.test(val) && !!val) {
      return `https://${val}`
    }
    return val
  })

export const touchPointAnonSchema = z.object({
  content_type: z.nativeEnum(TouchPointContentType).default(TouchPointContentType.URL),
  content_value: urlSchema.superRefine((data, ctx) => {
    const valid = validateUrl(data)
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid URL',
      })
    }
  }),
  variants_content: z
    .record(
      z.nativeEnum(TouchPointVariants),
      z
        .object({
          enabled: strictBoolean.optional(),
          content_value: urlSchema.optional(),
        })
        .superRefine((data, ctx) => {
          if (!data.enabled) {
            return true
          } else {
            const valid = validateUrl(data.content_value)
            if (!valid) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid URL',
                path: ['content_value'],
              })
            }
          }
        })
    )
    .optional(),
  qr_customize_options: z.record(z.string(), z.any()).optional().default({}),
  qr_logo_image: z
    .instanceof(File)
    .refine((file) => file.type.startsWith('image/'), 'File must be an image')
    .optional(),
})
