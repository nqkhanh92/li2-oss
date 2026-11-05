import { IntegrationType } from '@/features/integrations/constants'
import { z } from 'zod'

export const baseIntegrationSchema = z.object({
  name: z.string().min(2).max(64),
  desc: z.string().max(256).optional(),
})

export const parcelvoyConfigSchema = baseIntegrationSchema.extend({
  type: z.literal(IntegrationType.PARCELVOY),
  config: z.object({
    base_url: z.string().url().trim().min(2).max(128),
    api_key: z.string().min(2).max(64),
  }),
})

export const googleSheetsConfigSchema = baseIntegrationSchema.extend({
  type: z.literal(IntegrationType.GOOGLE_SHEETS),
  config: z.object({
    auth_code: z.string().min(64).max(256),
    refresh_token: z.string().optional(),
    access_token: z.string().optional(),
    expiry_date: z.number().optional(),
    id_token: z.string().optional(),
  }),
})

export const createIntegrationSchema = z.discriminatedUnion('type', [
  parcelvoyConfigSchema,
  googleSheetsConfigSchema,
])

export const updateIntegrationSchema = z.discriminatedUnion('type', [
  parcelvoyConfigSchema,
  googleSheetsConfigSchema,
])

export const verifyIntegrationSchema = z.object({
  type: z.nativeEnum(IntegrationType),
  config: z.object({
    base_url: z.string().url().trim().min(2).max(128),
    api_key: z.string().min(2).max(64),
  }),
})
