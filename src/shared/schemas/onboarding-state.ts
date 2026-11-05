import { z } from 'zod'

export const onboardingStateSchema = z.object({
  product_type: z.enum(['link_attribution', 'behavior_activity']).nullable().optional(),
})

export type OnboardingStateInput = z.infer<typeof onboardingStateSchema>
