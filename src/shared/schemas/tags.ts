import { z } from 'zod'

export const MAX_TAG_LENGTH = 32
export const tagSchema = z.object({
  name: z.string().trim().min(3).max(MAX_TAG_LENGTH),
  desc: z.string().max(256).optional(),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i),
})

export const createTagSchema = tagSchema
export const updateTagSchema = tagSchema.partial()
