import { z } from 'zod'
import { parse } from 'tldts'
import { AVAILABLE_DOMAINS } from '@/core/constants/claimable-domain'

const customDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (val) => {
        const parsed = parse(val)
        return parsed.domain !== null
      },
      {
        params: {
          i18n: {
            key: 'errors.invalid_string.domain',
          },
        },
      }
    ),
})

// Apple Team ID — 10-char uppercase alphanumeric (e.g., "ABCDE12345")
const teamIdRegex = /^[A-Z0-9]{10}$/

// Reverse-domain bundle ID / Android package name (e.g., "com.example.app")
const bundleIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/

/**
 * Normalize a SHA256 fingerprint to uppercase colon-separated hex pairs.
 * Accepts any of: "AA:BB:CC", "aa bb cc", "AABBCC", "aabbcc".
 * Throws via Zod if the cleaned value isn't exactly 32 hex bytes.
 */
const sha256FingerprintSchema = z.string().transform((val, ctx) => {
  const cleaned = val.replace(/[\s:]/g, '').toUpperCase()
  if (cleaned.length !== 64 || !/^[0-9A-F]+$/.test(cleaned)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid SHA256 fingerprint — expected 32 hex bytes',
    })
    return z.NEVER
  }
  return cleaned.match(/.{2}/g)!.join(':')
})

const deepLinkAppSchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('ios'),
    team_id: z.string().regex(teamIdRegex, 'Apple Team ID must be 10 uppercase alphanumeric characters'),
    bundle_id: z.string().regex(bundleIdRegex, 'Invalid bundle identifier format'),
    app_store_url: z.string().url().optional().or(z.literal('')),
    paths: z.array(z.string()).default(['/*']),
  }),
  z.object({
    platform: z.literal('android'),
    package_name: z.string().regex(bundleIdRegex, 'Invalid package name format'),
    sha256_fingerprints: z
      .array(sha256FingerprintSchema)
      .min(1, 'At least one SHA256 fingerprint is required'),
    play_store_url: z.string().url().optional().or(z.literal('')),
    paths: z.array(z.string()).default(['/*']),
  }),
])

const deepLinkAppsConfigSchema = z.object({
  enabled: z.boolean(),
  apps: z.array(deepLinkAppSchema).max(5),
})

export const createCustomDomainSchema = customDomainSchema

// Update schema is intentionally narrow — only allows fields that can be safely
// modified on an existing domain. The `domain` field is deliberately excluded:
// renaming a verified domain would desync nginx configs, cached short-link URLs,
// and mobile-app entitlements with no recovery path. If a rename is ever needed,
// it should be a dedicated endpoint with proper side-effect handling.
export const updateCustomDomainSchema = z.object({
  deep_link_apps: deepLinkAppsConfigSchema.optional().nullable(),
})

export const claimSubdomainSchema = z.object({
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .refine((val) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(val), {
      params: { i18n: { key: 'errors.subdomain_format_invalid' } },
    }),
  baseDomain: z.enum(AVAILABLE_DOMAINS),
})

// Re-exported for the config panel UI (Task 1.4) and verification check (Task 1.5).
export { deepLinkAppsConfigSchema, deepLinkAppSchema }
export type DeepLinkAppsConfig = z.infer<typeof deepLinkAppsConfigSchema>
export type DeepLinkApp = z.infer<typeof deepLinkAppSchema>

/**
 * Narrow the `deep_link_apps` JSONB column (typed as `Json | null` by the Supabase
 * generated types) to the canonical `DeepLinkAppsConfig` shape. Write-side validation
 * in the PATCH route guarantees the stored value always matches the schema, so this
 * is a safe cast — centralised here to avoid the same `as` assertion scattered across
 * UI components and the verify route.
 */
export function parseDeepLinkConfig(
  value: unknown
): DeepLinkAppsConfig | null {
  return (value as DeepLinkAppsConfig | null) ?? null
}
