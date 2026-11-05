import { z } from 'zod'

const invitationFormSchema = z.object({
  email: z.string().email(),
  role_id: z.string().uuid(),
})

export const invitationCreateFormSchema = invitationFormSchema
export const invitationUpdateFormSchema = invitationFormSchema.partial()
