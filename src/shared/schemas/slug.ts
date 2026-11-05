import { z } from 'zod'

export const slugBlacklist = []
export const slugMaxLength = 64
export const slugMinLength = 6
const slugPrefixBlacklist = ['f-']

export const slugSchema = z
  .string()
  .min(slugMinLength)
  .max(slugMaxLength)
  .trim()
  .refine((val) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val || ''), {
    params: {
      i18n: {
        key: 'errors.field_only_contain_for_slug',
      },
    },
  })
  .superRefine((field, context) => {
    let blackWord = null
    if (
      slugPrefixBlacklist.some((prefix) => {
        if (field.startsWith(prefix)) {
          blackWord = prefix
          return true
        }
      })
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        params: {
          i18n: {
            key: 'errors.field_startwith_blacklist',
            values: {
              blackWords: blackWord,
            },
          },
        },
      })
    }
  })
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val))
