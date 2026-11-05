import { DynamicTargetingTypes } from '@/core/types/touch-point.type'
import { z } from 'zod'
import { abTestingSchema } from './advanced.schema'
export enum TargetingInteractionTypes {
  // LINK = 'LINK',
  QR = 'QR',
  // NFC = 'NFC',
  // WIFI = 'WIFI',
}

export enum RuleType {
  SINGLE = 'single',
  BLOCK = 'block',
}
export enum RuleOperator {
  AND = 'and',
  OR = 'or',
}

export const regionRuleConfigSchema = z.object({
  values: z.array(z.string()).min(1),
  type: z.enum(['continent', 'country', 'city']).optional(),
})

export const deviceRuleConfigSchema = z.object({
  values: z.array(z.string()).min(1),
})

export const interactionRuleConfigSchema = z.object({
  values: z.array(z.string()).min(1),
})

// Matches any RFC-3986 URI scheme followed by `://`. Permissive on purpose so
// app schemes (myapp://, intent://) work alongside http(s) for D7.
const URL_OR_APP_SCHEME_RE = /^[a-z][a-z0-9+\-.]*:\/\//i

// Wire shape destinations accept http(s) AND app schemes. The wire schema is
// shared with the touch-point form, where device/QR rules can legitimately
// route to native app schemes (D7).
const targetingDestinationSchema = z
  .string()
  .min(1)
  .refine((v) => URL_OR_APP_SCHEME_RE.test(v), {
    message: 'dynamic_targeting.errors.invalid_destination',
  })

export const ruleSchema = z.object({
  ruleType: z.nativeEnum(DynamicTargetingTypes),
  config: z.union([regionRuleConfigSchema, deviceRuleConfigSchema, interactionRuleConfigSchema]),
})
export const ruleSingleSchema = ruleSchema.extend({
  type: z.literal(RuleType.SINGLE),
  destination: targetingDestinationSchema,
})

export const ruleBlockSchema = z.object({
  type: z.literal(RuleType.BLOCK),
  operator: z.nativeEnum(RuleOperator),
  rules: z.array(ruleSchema).min(1),
  destination: targetingDestinationSchema,
})

// FE-only shape used by the new short-link Smart Targeting UI.
// Marshalled to/from the wire shape (`dynamicTargetingSchema`) via
// `legacy-targets.ts`. Touch-point form continues to use `dynamicTargetingSchema`.
//
// - Device URLs accept http(s) AND app schemes (myapp://, intent://) per D7.
// - Country URLs accept http(s) ONLY — country routing serves browsers and
//   unfurlers; app schemes there are a misconfiguration trap (S2).
const deviceDestinationSchema = z
  .string()
  .refine((v) => v === '' || URL_OR_APP_SCHEME_RE.test(v), {
    message: 'smart_targeting.errors.invalid_device_destination',
  })

const countryDestinationSchema = z.string().url({
  message: 'smart_targeting.errors.invalid_country_destination',
})

export const smartTargetingFormSchema = z.object({
  devices: z.object({
    android: deviceDestinationSchema,
    ios: deviceDestinationSchema,
  }),
  countries: z.array(
    z.object({
      id: z.string(), // RHF stable key, not persisted to wire
      values: z.array(z.string().length(2)).min(1), // ISO2 country codes
      destination: countryDestinationSchema,
    })
  ),
})

export type SmartTargetingFormValues = z.infer<typeof smartTargetingFormSchema>

export const ruleItemSchema = ruleBlockSchema.or(ruleSingleSchema)

export const dynamicTargetingSchema = z
  .object({
    targets: z
      .preprocess((val) => {
        if (Array.isArray(val)) return val
        if (typeof val === 'string') return JSON.parse(val)
        return []
      }, z.array(ruleItemSchema))
      .optional(),
    ab_testing: z
      .preprocess((val) => {
        if (Array.isArray(val)) return val
        if (typeof val === 'string') return JSON.parse(val)
        return []
      }, abTestingSchema)
      .optional(),
  })
  .default({ targets: [], ab_testing: [] })
