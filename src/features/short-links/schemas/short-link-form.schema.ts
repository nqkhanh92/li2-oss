import { z } from 'zod'
import { touchPointFormCreateWithAdvanceSchema, MAX_TOUCHPOINTS_NAME_LENGTH } from '@/shared/schemas/touch-points'
import { trackingSchema, facebookTrackingSchema, googleTrackingSchema, tiktokTrackingSchema } from '@/shared/schemas/touch-points/tracking.schema'
import { accessControlSchema, redirectSettingSchema, linkPasswordFormSchema, linkExpiresAtFormSchema, limitAccessFormSchema, customRedirectCodeFormSchema, notFoundUrlFormSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { privacySecuritySchema, linkCloakingSchema } from '@/shared/schemas/touch-points/privacy-security'
import { utmSchema } from '@/shared/schemas/touch-points'
import { smartTargetingFormSchema } from '@/shared/schemas/touch-points/dynamic-targeting'

// ── Master form schema ──────────────────────────────────────────────────────
// Extends the create schema to also include pixel tracking fields

export const shortLinkFormSchema = touchPointFormCreateWithAdvanceSchema.extend({
  tracking: trackingSchema.optional(),
  // FE-only field for the new Smart Targeting UI. Never persisted directly;
  // serialized into `targeting.targets[]` at submit time via
  // `prepareSubmitValues` (see src/features/short-links/utils).
  smart_targeting: smartTargetingFormSchema.optional(),
})

export const shortLinkEditFormSchema = shortLinkFormSchema.extend({
  name: z.string().min(4).max(MAX_TOUCHPOINTS_NAME_LENGTH).trim(),
})

export type ShortLinkFormValues = z.infer<typeof shortLinkFormSchema>
export type ShortLinkEditFormValues = z.infer<typeof shortLinkEditFormSchema>

// ── Section schemas (for individual section forms) ──────────────────────────

/** UTM parameters */
export { utmSchema }
export type ShortLinkUtmValues = z.infer<typeof utmSchema>

/** Facebook Pixel */
export { facebookTrackingSchema }
export type ShortLinkFbPixelValues = z.infer<typeof facebookTrackingSchema>

/** Google Analytics */
export { googleTrackingSchema }
export type ShortLinkGaValues = z.infer<typeof googleTrackingSchema>

/** TikTok Pixel */
export { tiktokTrackingSchema }
export type ShortLinkTikTokValues = z.infer<typeof tiktokTrackingSchema>

/** Password protection */
export { linkPasswordFormSchema }
export type ShortLinkPasswordValues = z.infer<typeof linkPasswordFormSchema>

/** Link expiration (valid_from + expires_at) */
export { linkExpiresAtFormSchema }
export type ShortLinkExpirationValues = z.infer<typeof linkExpiresAtFormSchema>

/** Click / visit limitation */
export { limitAccessFormSchema }
export type ShortLinkLimitValues = z.infer<typeof limitAccessFormSchema>

/** Custom HTTP redirect code (301/302/307/308) */
export { customRedirectCodeFormSchema }
export type ShortLinkRedirectCodeValues = z.infer<typeof customRedirectCodeFormSchema>

/** Custom 404 / not-found redirect URL */
export { notFoundUrlFormSchema }
export type ShortLinkNotFoundValues = z.infer<typeof notFoundUrlFormSchema>

/** Link cloaking */
export const linkCloakingFormSchema = z.object({
  link_cloaking: linkCloakingSchema,
})
export type ShortLinkCloakingValues = z.infer<typeof linkCloakingFormSchema>
