import { z } from 'zod'
import { validate } from 'uuid'

// Currency schema for conversion tracking
export const currencySchema = z.enum(['USD', 'VND'])
export type Currency = z.infer<typeof currencySchema>

export const orgSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Slug must start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens'
  )
  .nonempty()
  .refine((value) => !validate(value), 'Slug cant be UUID')
export const organizationFormSchema = z.object({
  name: z.string().trim().max(64).nonempty(),
  org_slug: orgSlugSchema,
})

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().max(64).nonempty().optional(),
    default_domain_id: z.string().optional(),
    default_currency: currencySchema.optional(),
  })
  .partial()

export const setupOrganizationSchema = z.object({
  name: z.string().trim().max(64).nonempty(),
  org_slug: orgSlugSchema,
})

export const DeleteOrganizationFormSchema = z
  .object({
    name: z.string().trim().max(64).nonempty(),
    confirmName: z.string().trim().nonempty(),
  })
  .superRefine(({ confirmName, name }, ctx) => {
    if (confirmName !== name) {
      ctx.addIssue({
        code: 'custom',
        params: {
          i18n: {
            key: 'errors.names_did_not_match',
          },
        },
        path: ['confirmName'],
      })
    }
  })
