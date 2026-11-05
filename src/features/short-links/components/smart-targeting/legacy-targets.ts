import type { z } from 'zod'
import {
  RuleType,
  type ruleItemSchema,
  type dynamicTargetingSchema,
  type SmartTargetingFormValues,
} from '@/shared/schemas/touch-points/dynamic-targeting'
import { DynamicTargetingTypes } from '@/core/types/touch-point.type'

type WireTarget = z.infer<typeof ruleItemSchema>
type WireTargeting = z.infer<typeof dynamicTargetingSchema>

export type LegacyDropReason =
  | 'duplicate_device'
  | 'cross_axis_and'
  | 'unsupported_interaction'
  | 'unsupported_continent'
  | 'unsupported_city'
  | 'malformed'

export interface LegacyDrop {
  reason: LegacyDropReason
  description: string
  original: WireTarget
}

export interface ParseResult {
  form: SmartTargetingFormValues
  dropped: LegacyDrop[]
  decomposed: number
}

interface RawSubRule {
  ruleType?: string
  config?: { type?: string; values?: string[] }
}

interface RawTarget extends RawSubRule {
  type?: string
  operator?: string
  rules?: RawSubRule[]
  destination?: string
}

const safeArray = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : [])

/**
 * SSR-safe random ID. Older Node runtimes (and some bundlers' SSR shims) do
 * not expose `globalThis.crypto.randomUUID`, so fall back to `Math.random`
 * for non-cryptographic UI keys. Used as the RHF stable key on country rules
 * and the synthetic ID for legacy-decomposed entries.
 */
export const safeRandomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

const describeSingle = (t: RawTarget): string => {
  const dest = t.destination ?? '(no URL)'
  const values = safeArray(t.config?.values).join(', ')
  if (t.ruleType === 'interaction') return `Interaction (${values}) → ${dest}`
  if (t.ruleType === 'device') return `Device (${values}) → ${dest}`
  if (t.ruleType === 'geography') {
    const cfg = t.config ?? {}
    return `${cfg.type ?? 'region'} (${values}) → ${dest}`
  }
  return `Unknown rule → ${dest}`
}

const describeBlock = (t: RawTarget): string => {
  const op = (t.operator ?? '').toUpperCase()
  const sub = safeArray(t.rules).map(describeSingle).join(` ${op} `)
  return `[${sub}] → ${t.destination ?? '(no URL)'}`
}

const isCountryGeography = (sub: RawSubRule): boolean =>
  sub.ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING && sub.config?.type === 'country'

/**
 * Best-effort decomposition of legacy `targeting.targets[]` into the new form
 * shape. See README §D5 for the full ordering. Returns the form value, plus a
 * structured drop log so the UI can describe each lossy entry to the user.
 */
export function parseTargetingToForm(targeting: WireTargeting | null | undefined): ParseResult {
  const targets: RawTarget[] = safeArray(targeting?.targets as RawTarget[] | undefined)
  let android = ''
  let ios = ''
  let androidSet = false
  let iosSet = false
  const countries: SmartTargetingFormValues['countries'] = []
  const dropped: LegacyDrop[] = []
  let decomposed = 0

  const dropSingle = (reason: LegacyDropReason, t: RawTarget) =>
    dropped.push({ reason, description: describeSingle(t), original: t as unknown as WireTarget })
  const dropBlock = (reason: LegacyDropReason, t: RawTarget, description?: string) =>
    dropped.push({
      reason,
      description: description ?? describeBlock(t),
      original: t as unknown as WireTarget,
    })

  // Step 1 — flatten BLOCK rules where lossless (D5 cases 3-5). Replace each
  // BLOCK with 1..N synthetic SINGLE entries; drop genuinely lossy BLOCKs.
  const flattened: RawTarget[] = []
  for (const t of targets) {
    if (!t || typeof t !== 'object') {
      dropped.push({
        reason: 'malformed',
        description: 'Unknown rule (not an object)',
        original: t as unknown as WireTarget,
      })
      continue
    }

    if (t.type !== RuleType.BLOCK) {
      flattened.push(t)
      continue
    }

    const subRules = safeArray(t.rules)
    const dest = t.destination ?? ''

    if (subRules.length === 0) {
      dropBlock('cross_axis_and', t)
      continue
    }

    // D5.3: BLOCK with one sub-rule → flatten unconditionally
    if (subRules.length === 1) {
      flattened.push({
        ...subRules[0],
        type: RuleType.SINGLE,
        destination: dest,
      } as RawTarget)
      decomposed++
      continue
    }

    if (t.operator === 'and') {
      // Multi-axis AND cannot be expressed in the new UI.
      dropBlock('cross_axis_and', t)
      continue
    }

    // D5.4-5: OR — split device sub-rules per value, merge country sub-rules.
    const deviceSplit: RawTarget[] = []
    let countryMerged: RawTarget | null = null
    let hasSupportedAxis = false
    let hasUnsupportedAxis = false

    for (const sub of subRules) {
      if (!sub || typeof sub !== 'object') {
        hasUnsupportedAxis = true
        continue
      }
      if (sub.ruleType === DynamicTargetingTypes.INTERACTION_TARGETING) {
        hasUnsupportedAxis = true
        continue
      }
      if (sub.ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING) {
        if (!isCountryGeography(sub)) {
          hasUnsupportedAxis = true
          continue
        }
        const subValues = safeArray(sub.config?.values)
        if (!countryMerged) {
          countryMerged = {
            ruleType: DynamicTargetingTypes.GEOGRAPHY_TARGETING,
            type: RuleType.SINGLE,
            config: { type: 'country', values: [...subValues] },
            destination: dest,
          }
        } else {
          const existingValues = safeArray(countryMerged.config?.values)
          for (const v of subValues) {
            if (!existingValues.includes(v)) existingValues.push(v)
          }
          countryMerged.config = { type: 'country', values: existingValues }
        }
        hasSupportedAxis = true
        continue
      }
      if (sub.ruleType === DynamicTargetingTypes.DEVICE_TARGETING) {
        for (const v of safeArray(sub.config?.values)) {
          deviceSplit.push({
            ruleType: DynamicTargetingTypes.DEVICE_TARGETING,
            type: RuleType.SINGLE,
            config: { values: [v] },
            destination: dest,
          })
        }
        hasSupportedAxis = true
        continue
      }
      hasUnsupportedAxis = true
    }

    if (!hasSupportedAxis) {
      dropBlock('cross_axis_and', t)
      continue
    }

    for (const d of deviceSplit) flattened.push(d)
    if (countryMerged) flattened.push(countryMerged)
    decomposed++

    // S3: when an OR block had supported axes AND unsupported sub-rules, the
    // unsupported branch is lost — record a drop so the toast fires.
    if (hasUnsupportedAxis) {
      dropBlock(
        'unsupported_interaction',
        t,
        `OR-block partial decomposition lost the unsupported branch: ${describeBlock(t)}`
      )
    }
  }

  // Step 2 — assign each flattened SINGLE to devices section or countries list.
  flattened.forEach((t, idx) => {
    const dest = t.destination ?? ''
    const values = safeArray(t.config?.values)

    if (t.ruleType === DynamicTargetingTypes.INTERACTION_TARGETING) {
      dropSingle('unsupported_interaction', t)
      return
    }

    if (t.ruleType === DynamicTargetingTypes.DEVICE_TARGETING) {
      if (values.includes('android')) {
        if (!androidSet) {
          android = dest
          androidSet = true
        } else {
          dropSingle('duplicate_device', t)
        }
      } else if (values.includes('ios')) {
        if (!iosSet) {
          ios = dest
          iosSet = true
        } else {
          dropSingle('duplicate_device', t)
        }
      } else {
        dropSingle('malformed', t)
      }
      return
    }

    if (t.ruleType === DynamicTargetingTypes.GEOGRAPHY_TARGETING) {
      const cfgType = t.config?.type
      if (cfgType === 'country') {
        if (values.length === 0 || !dest) {
          dropSingle('malformed', t)
          return
        }
        countries.push({
          id: `legacy-${idx}-${safeRandomId()}`,
          values,
          destination: dest,
        })
      } else if (cfgType === 'continent') {
        dropSingle('unsupported_continent', t)
      } else if (cfgType === 'city') {
        dropSingle('unsupported_city', t)
      } else {
        dropSingle('malformed', t)
      }
      return
    }

    dropSingle('malformed', t)
  })

  return {
    form: { devices: { android, ios }, countries },
    dropped,
    decomposed,
  }
}

/**
 * Write form shape → wire shape.
 * Order is critical for D3 (Device → Country → Default):
 *   1. Android device rule (if non-empty)
 *   2. iOS device rule (if non-empty)
 *   3. Country rules in user-visible order
 */
export function serializeFormToTargeting(form: SmartTargetingFormValues): WireTargeting {
  const targets: WireTarget[] = []

  if (form.devices.android.trim() !== '') {
    targets.push({
      type: RuleType.SINGLE,
      ruleType: DynamicTargetingTypes.DEVICE_TARGETING,
      config: { values: ['android'] },
      destination: form.devices.android.trim(),
    } as WireTarget)
  }
  if (form.devices.ios.trim() !== '') {
    targets.push({
      type: RuleType.SINGLE,
      ruleType: DynamicTargetingTypes.DEVICE_TARGETING,
      config: { values: ['ios'] },
      destination: form.devices.ios.trim(),
    } as WireTarget)
  }
  for (const c of form.countries) {
    if (c.values.length === 0 || c.destination.trim() === '') continue
    targets.push({
      type: RuleType.SINGLE,
      ruleType: DynamicTargetingTypes.GEOGRAPHY_TARGETING,
      config: { type: 'country', values: c.values },
      destination: c.destination.trim(),
    } as WireTarget)
  }

  return { targets, ab_testing: [] }
}
