import { z } from 'zod'

export const analyzeRequestSchema = z.object({
  url: z.string().url(),
  force: z.boolean().optional().default(false),
  locale: z.enum(['en', 'vi']),
})

export const applyRequestSchema = z.object({
  cache_id: z.string().uuid(),
  selected_funnels: z.array(z.number().int().min(0)),
  selected_event_rules: z.array(z.number().int().min(0)),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
export type ApplyRequest = z.infer<typeof applyRequestSchema>
