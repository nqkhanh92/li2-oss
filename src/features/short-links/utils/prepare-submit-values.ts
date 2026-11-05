import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'
import { serializeFormToTargeting } from '@/features/short-links/components/smart-targeting/legacy-targets'

/**
 * Transform RHF form values into the API payload shape.
 *
 * - Serializes `smart_targeting.{devices,countries}` → `targeting.targets[]`.
 * - Strips the FE-only `smart_targeting` field before sending.
 * - Preserves any existing `ab_testing` entries on the original `targeting`.
 *
 * Cross-surface defense (D10 / S1): when `smart_targeting` is the seeded-empty
 * shape — which happens both for links with no targeting AND for users who
 * clicked "Keep legacy rules" on the cross-surface banner — we preserve the
 * existing wire-shape `targeting` instead of overwriting with an empty
 * `targets[]`. This protects unrelated edits (slug, password, etc.) from
 * silently destroying legacy BLOCK / interaction rules created in the
 * touch-point form.
 */
export function prepareSubmitValues(values: ShortLinkFormValues) {
  const { smart_targeting, targeting: existing, ...rest } = values

  const isEmpty =
    !smart_targeting ||
    (smart_targeting.devices.android === '' &&
      smart_targeting.devices.ios === '' &&
      smart_targeting.countries.length === 0)

  if (isEmpty) {
    return {
      ...rest,
      targeting: existing ?? { targets: [], ab_testing: [] },
    }
  }

  const next = serializeFormToTargeting(smart_targeting)
  return {
    ...rest,
    targeting: {
      targets: next.targets,
      ab_testing: existing?.ab_testing ?? [],
    },
  }
}
