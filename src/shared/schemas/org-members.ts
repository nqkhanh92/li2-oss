import { z } from 'zod'

const orgMemberFormSchema = z.object({
  email: z.string().email(),
  role_id: z.string(),
})

export const orgMemberCreateFormSchema = orgMemberFormSchema

export const orgMemberUpdateFormSchema = z.object({
  role_id: z.string(),
})
