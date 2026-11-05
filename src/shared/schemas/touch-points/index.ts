import { TouchPointContentType, TouchPointVariants } from '@/features/touch-points/types'
import { imageFileSchema, requiredUrlSchema, strictBoolean, strictNumber } from '..'
import { z } from 'zod'
import { slugSchema } from '../slug'
import { accessControlSchema, redirectSettingSchema } from './advanced.schema'
import { dynamicTargetingSchema } from './dynamic-targeting'
import { trackingSchema, conversionTrackingSchema } from './tracking.schema'
import { privacySecuritySchema } from './privacy-security'

export enum TouchPointType {
  LINK = 'LINK',
  QR = 'QR',
  NFC = 'NFC',
  // WIFI = "WIFI",
}

export const MAX_TOUCHPOINTS_NAME_LENGTH = 64

export const urlSchema = z
  .string()
  .trim()
  .transform((val) => {
    if (!/^https?:\/\//i.test(val) && !!val) {
      return `https://${val}`
    }
    return val
  })

const parcelvoyIntegrationSchema = z
  .object({
    enabled: strictBoolean.default(false),
    integration_id: z.string().optional(),
    integration_config: z
      .object({
        journey_id: z.string().optional(),
        entrance_id: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.enabled &&
      (!data.integration_id ||
        !data.integration_config ||
        !data.integration_config.journey_id ||
        !data.integration_config.entrance_id)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing integration config',
        path: !data?.integration_config?.journey_id
          ? ['integration_config', 'journey_id']
          : ['integration_config', 'entrance_id'],
      })
    }
  })

export const allowedMetaTagImageFormat = ['image/png', 'image/jpeg', 'image/jpg']
export const metaTagsSchema = z.object({
  enabled: strictBoolean.optional().default(false),
  isAutoFetched: strictBoolean.default(false).optional(),
  title: z
    .string()
    .transform((val) => (val.length > 60 ? val.slice(0, 59) : val))
    .optional(),
  description: z
    .string()
    .trim()
    .transform((val) => (val.length > 160 ? val.slice(0, 159) : val))
    .optional(),
  image: z
    .string()
    .or(
      z
        .instanceof(File)
        .refine(
          (file) => allowedMetaTagImageFormat.includes(file.type),
          'Image must be in PNG, JPG, JPEG format'
        )
    )
    .optional(),
})

export const utmSchema = z
  .object({
    enabled: strictBoolean.default(false),
    overrideable: strictBoolean.default(false),
    utm_id: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || /^(G-[A-Z0-9]{8,10}|GTM-[A-Z0-9]{6,8})$/.test(val), {
        message: 'Invalid GTM ID',
      }),
    utm_source: z.string().max(60).trim().optional(),
    utm_medium: z.string().max(60).trim().optional(),
    utm_campaign: z.string().max(60).trim().optional(),
    utm_term: z.string().max(255).trim().optional(),
    utm_content: z.string().max(255).trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled && !data.utm_source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        // message: 'Missing utm_source',
        params: {
          i18n: {
            key: 'errors.missing_field',
            values: {
              field: 'UTM Source',
            },
          },
        },
        path: ['utm_source'],
      })
    }
  })

const qr_customize_options_schema = z
  .object({
    imageOptions: z
      .object({
        hideBackgroundDots: strictBoolean.optional(),
        margin: strictNumber.optional(),
        imageSize: strictNumber.optional(),
      })
      .catchall(z.any())
      .optional(),
  })
  .catchall(z.any())
  .optional()
  .default({})
const baseSchema = z.object({
  name: z.string().min(1).max(MAX_TOUCHPOINTS_NAME_LENGTH).trim().or(z.literal('')).optional(),
  desc: z.string().max(256).optional(),
  enabled: strictBoolean.default(true),
  content_type: z.nativeEnum(TouchPointContentType),
  content_value: requiredUrlSchema,
  is_campaign_based: strictBoolean.default(false),
  tags: z
    .array(z.string())
    .or(z.string().transform((val) => JSON.parse(val)))
    .optional(),
  collection_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().optional(),
  variants_content: z
    .record(
      z.nativeEnum(TouchPointVariants),
      z.object({
        enabled: strictBoolean.optional(),
      })
    )
    .optional(),
  qr_customize_options: qr_customize_options_schema,
  qr_logo_image: z.string().or(imageFileSchema).optional(),
})

export const updateQrCustomizeOptionsSchema = z.object({
  qr_customize_options: z.record(z.string(), z.any()).optional().default({}),
  image_upload: z.instanceof(File).optional(),
  logo_type: z.string().optional(),
})

export const touchPointFormSchema = baseSchema.extend({
  domain_id: z.string().optional(),
  slug: slugSchema.optional(),
  meta_tags: metaTagsSchema.optional(),
})
export const touchPointUpdateSchema = baseSchema
  .extend({
    name: z.string().min(4).max(64).trim(),
    slug: slugSchema.optional(),
    meta_tags: metaTagsSchema.optional(),
    utm_tags: utmSchema.optional(),
    targeting: dynamicTargetingSchema.optional(),
    access_control: accessControlSchema.optional(),
    redirect_setting: redirectSettingSchema.optional(),
    tracking: trackingSchema.optional(),
    privacy_security: privacySecuritySchema.optional(),
    conversion_tracking: conversionTrackingSchema.optional(),
  })
  .partial()
export const advancedTouchPointUpdateSchema = z
  .object({
    meta_tags: metaTagsSchema.optional(),
    integration: parcelvoyIntegrationSchema.optional(),
    utm_tags: utmSchema.optional(),
  })
  .partial()

export const touchPointFormCreateWithAdvanceSchema = touchPointFormSchema
  .extend({
    meta_tags: metaTagsSchema.optional(),
    // integration: parcelvoyIntegrationSchema.optional(),
    targeting: dynamicTargetingSchema.optional(),
    utm_tags: utmSchema.optional(),
    tracking: trackingSchema.optional(),
    access_control: accessControlSchema.optional(),
    redirect_setting: redirectSettingSchema.optional(),
    privacy_security: privacySecuritySchema.optional(),
    conversion_tracking: conversionTrackingSchema.optional(),
  })
  .partial()

export const updateShortLinkSchema = z.object({
  domain_id: z.string().optional(),
  slug: slugSchema.optional(),
  content_value: z.string().optional(),
})

export const generateSlugSchema = z.object({
  url: z.string(),
  touch_point_id: z.string().optional(),
  regenerate: z.boolean().optional(),
})

export const simpleTouchPointSchema = baseSchema.extend({
  qr_logo_image: z.string().or(imageFileSchema).optional(),
})
