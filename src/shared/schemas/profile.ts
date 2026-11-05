import { z } from 'zod'

export const profileFormSchema = z.object({
  name: z.string().min(2).max(64),
  display_name: z.string().min(2).max(64).or(z.literal('')).or(z.undefined()),
  email: z.string().email(),
  address: z.string().max(256).optional(),
  dob: z.string().optional(),
  timezone: z.string().optional(),
})

export const SetPasswordFormSchema = z
  .object({
    oldPassword: z.string().min(6).max(64),
    newPassword: z.string().min(6).max(64),
    confirmPassword: z.string().min(6).max(64),
  })
  .superRefine(({ confirmPassword, newPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirmPassword'],
      })
    }
  })
  .superRefine(({ oldPassword, newPassword }, ctx) => {
    if (oldPassword === newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'The new password must be different from the old password',
        path: ['newPassword'],
      })
    }
  })
