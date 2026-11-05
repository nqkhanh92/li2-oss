import { z } from 'zod'

const patternTypes = [
  'page_path',
  'page_url',
  'page_title',
  'event',
  'search_query',
  'link',
  'conversion',
] as const

const conditions = [
  'contains',
  'equals',
  'starts_with',
  'ends_with',
  'matches_regex',
  'in',
] as const

const funnelStepSchema = z.object({
  name: z.string().trim().min(1, 'Step name is required').max(256),
  pattern_type: z.enum(patternTypes),
  condition: z.enum(conditions),
  pattern: z.string().trim().min(1, 'Pattern is required').max(2048),
  is_required: z.boolean().default(true),
  event_name: z.string().max(255).optional().nullable(),
})

export const createFunnelSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(256),
  description: z.string().max(1024).optional().nullable(),
  steps: z.array(funnelStepSchema).min(1, 'At least one step is required').max(20, 'Maximum 20 steps'),
})

export const updateFunnelSchema = createFunnelSchema

export type CreateFunnelInput = z.infer<typeof createFunnelSchema>
export type UpdateFunnelInput = z.infer<typeof updateFunnelSchema>
export type FunnelStepInput = z.infer<typeof funnelStepSchema>
