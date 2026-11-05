import type { PageviewDetail, FunnelStep } from '../types'

/**
 * Checks whether a pageview's event_name matches any event-type funnel step.
 * Used for funnel-aware sorting: event records that match event steps
 * are sorted last so that page-type steps consume "safe" records first.
 */
function matchesAnyEventStep(
  pv: PageviewDetail,
  eventSteps: FunnelStep[]
): boolean {
  if (!pv.event_name) return false
  return eventSteps.some((s) => matchesStep(s, pv))
}

/**
 * Sort pageviews for deterministic funnel walk results.
 *
 * Within the same timestamp, records are sorted:
 *   0 — Non-matching events (page-type steps can safely consume these)
 *   1 — Matching events (preserved for event-type steps)
 *   2 — Regular pageviews (available after events are processed)
 *
 * This prevents page-type steps from consuming event records that are
 * needed by later event-type steps — a problem that occurs when events
 * share the same page_path as the page they fired on.
 */
function sortForFunnelWalk(
  pageviews: PageviewDetail[],
  funnelSteps: FunnelStep[]
): PageviewDetail[] {
  const eventSteps = funnelSteps.filter((s) => s.pattern_type === 'event')
  if (eventSteps.length === 0) {
    // No event steps — basic timestamp sort is sufficient
    return [...pageviews].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  return [...pageviews].sort((a, b) => {
    const tsA = new Date(a.timestamp).getTime()
    const tsB = new Date(b.timestamp).getTime()
    if (tsA !== tsB) return tsA - tsB

    // Within same timestamp: non-matching events → matching events → regular
    const aPriority =
      a.event_name == null ? 2 : matchesAnyEventStep(a, eventSteps) ? 1 : 0
    const bPriority =
      b.event_name == null ? 2 : matchesAnyEventStep(b, eventSteps) ? 1 : 0
    return aPriority - bPriority
  })
}

/**
 * Client-side port of Go walkSessionFunnel() algorithm.
 * Walks pageviews against funnel steps using 3-case matching logic:
 *   1. Match → advance step + pageview
 *   2. No match + optional step → scan forward through remaining pageviews
 *      to find a match; if none found, skip step without consuming pageviews
 *   3. No match + required step → advance pageview
 *
 * Pageviews are pre-sorted with funnel-aware ordering to ensure
 * deterministic results regardless of DB record ordering.
 */
export function computeStepMatches(
  pageviews: PageviewDetail[],
  funnelSteps: FunnelStep[]
): Map<string, FunnelStep> {
  const sorted = sortForFunnelWalk(pageviews, funnelSteps)
  const matches = new Map<string, FunnelStep>()
  let stepIdx = 0
  let pvIdx = 0

  while (stepIdx < funnelSteps.length && pvIdx < sorted.length) {
    const step = funnelSteps[stepIdx]
    const pv = sorted[pvIdx]

    if (matchesStep(step, pv)) {
      matches.set(pv.id, step) // Case 1: match
      stepIdx++
      pvIdx++
    } else if (!step.is_required) {
      // Case 2: scan forward for optional step match
      let found = false
      for (let scanIdx = pvIdx + 1; scanIdx < sorted.length; scanIdx++) {
        if (matchesStep(step, sorted[scanIdx])) {
          matches.set(sorted[scanIdx].id, step)
          pvIdx = scanIdx + 1
          found = true
          break
        }
      }
      if (!found) {
        // No match anywhere → skip step, pvIdx unchanged
      }
      stepIdx++
    } else {
      pvIdx++ // Case 3: try next pageview
    }
  }

  return matches
}

export function matchesStep(step: FunnelStep, pv: PageviewDetail): boolean {
  const field =
    step.pattern_type === 'page_path'
      ? pv.page_path
      : step.pattern_type === 'page_url'
        ? pv.page_url
        : step.pattern_type === 'page_title'
          ? pv.page_title
          : step.pattern_type === 'event'
            ? pv.event_name
            : step.pattern_type === 'search_query'
              ? pv.search_query
              : step.pattern_type === 'link'
                ? pv.tp_id
                : step.pattern_type === 'conversion'
                  ? pv.event_type
                  : ''

  const value = field ?? ''

  switch (step.condition) {
    case 'contains':
      return value.includes(step.pattern)
    case 'equals':
      return value === step.pattern
    case 'starts_with':
      return value.startsWith(step.pattern)
    case 'ends_with':
      return value.endsWith(step.pattern)
    case 'matches_regex':
      try {
        return new RegExp(step.pattern).test(value)
      } catch {
        return false
      }
    case 'in':
      return step.pattern
        .split(',')
        .map((v) => v.trim())
        .includes(value)
    default:
      return false
  }
}

export function findNextUnmatchedStep(
  matchedSteps: Map<string, FunnelStep>,
  funnelSteps: FunnelStep[]
): FunnelStep | null {
  const matchedPositions = new Set(
    Array.from(matchedSteps.values()).map((s) => s.position)
  )
  return funnelSteps.find((s) => !matchedPositions.has(s.position)) ?? null
}
