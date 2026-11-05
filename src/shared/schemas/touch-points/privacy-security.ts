import { z } from 'zod'
import { strictBoolean, strictNumber } from '..'

export const linkCloakingSchema = strictBoolean.optional()

export const e2eEncryptionSchema = z.object({
  cipher: z.string().optional(),
  iv: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return `${crypto.getRandomValues(new Uint8Array(12))}`
      return v
    }),
  algorithm: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return 'AES-128-GCM'
      return v
    }),
  version: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return '2'
      return v
    }),
  tag_length: strictNumber.optional().transform((v) => {
    if (!v) return 128
    return v
  }),
  extra: z.record(z.string(), z.string()).optional(),
})

export const privacySecuritySchema = z.object({
  link_cloaking: linkCloakingSchema.optional(),
  e2e_encryption: e2eEncryptionSchema.optional(),
})
