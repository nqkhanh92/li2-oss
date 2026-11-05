import { z } from 'zod'

// Field length constraints matching the database schema
export const MAX_UTM_TEMPLATE_NAME_LENGTH = 100
export const MAX_UTM_TEMPLATE_DESCRIPTION_LENGTH = 500
export const MAX_UTM_SOURCE_LENGTH = 60
export const MAX_UTM_MEDIUM_LENGTH = 60
export const MAX_UTM_CAMPAIGN_LENGTH = 60
export const MAX_UTM_TERM_LENGTH = 255
export const MAX_UTM_CONTENT_LENGTH = 255

export const createUTMTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Template name is required')
    .max(MAX_UTM_TEMPLATE_NAME_LENGTH, `Template name must not exceed ${MAX_UTM_TEMPLATE_NAME_LENGTH} characters`),
  description: z
    .string()
    .max(MAX_UTM_TEMPLATE_DESCRIPTION_LENGTH, `Description must not exceed ${MAX_UTM_TEMPLATE_DESCRIPTION_LENGTH} characters`)
    .optional()
    .nullable(),
  utm_source: z
    .string()
    .max(MAX_UTM_SOURCE_LENGTH, `UTM source must not exceed ${MAX_UTM_SOURCE_LENGTH} characters`)
    .optional()
    .nullable(),
  utm_medium: z
    .string()
    .max(MAX_UTM_MEDIUM_LENGTH, `UTM medium must not exceed ${MAX_UTM_MEDIUM_LENGTH} characters`)
    .optional()
    .nullable(),
  utm_campaign: z
    .string()
    .max(MAX_UTM_CAMPAIGN_LENGTH, `UTM campaign must not exceed ${MAX_UTM_CAMPAIGN_LENGTH} characters`)
    .optional()
    .nullable(),
  utm_term: z
    .string()
    .max(MAX_UTM_TERM_LENGTH, `UTM term must not exceed ${MAX_UTM_TERM_LENGTH} characters`)
    .optional()
    .nullable(),
  utm_content: z
    .string()
    .max(MAX_UTM_CONTENT_LENGTH, `UTM content must not exceed ${MAX_UTM_CONTENT_LENGTH} characters`)
    .optional()
    .nullable(),
})

export const updateUTMTemplateSchema = createUTMTemplateSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined && v !== null),
  'At least one field must be provided for update'
)

export type CreateUTMTemplate = z.infer<typeof createUTMTemplateSchema>
export type UpdateUTMTemplate = z.infer<typeof updateUTMTemplateSchema>