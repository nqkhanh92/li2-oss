import { z } from 'zod'

export const DASHBOARD_ACCESS_MODES = ['only_me', 'restricted', 'everyone'] as const
export const DASHBOARD_ASSIGNABLE_ROLES = ['viewer', 'editor'] as const

export const updateAccessSchema = z.object({
  access_mode: z.enum(DASHBOARD_ACCESS_MODES),
  default_role: z.enum(DASHBOARD_ASSIGNABLE_ROLES),
})

export const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(DASHBOARD_ASSIGNABLE_ROLES),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(DASHBOARD_ASSIGNABLE_ROLES),
})

export const transferOwnershipSchema = z.object({
  new_owner_id: z.string().uuid(),
})

export type UpdateAccessInput = z.infer<typeof updateAccessSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>
