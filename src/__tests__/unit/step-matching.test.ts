import { describe, it, expect } from 'vitest'
import {
  computeStepMatches,
  matchesStep,
  findNextUnmatchedStep,
} from '@/ee/features/funnels/lib/step-matching'
import {
  mockPageviews,
  mockFunnelSteps,
  makeStep,
  makePv,
} from '../__mocks__/visitor-detail.mock'

// ─── matchesStep ─────────────────────────────────────────────────────

describe('matchesStep', () => {
  const pv = makePv({ id: 'pv-1', page_path: '/products/shoes', page_url: 'https://example.com/products/shoes', page_title: 'Running Shoes' })

  it('contains: matches when field includes pattern', () => {
    const step = makeStep({ position: 1, name: 'Products', condition: 'contains', pattern: '/products' })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('contains: no match when pattern not found', () => {
    const step = makeStep({ position: 1, name: 'Cart', condition: 'contains', pattern: '/cart' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('equals: matches exact path', () => {
    const step = makeStep({ position: 1, name: 'Shoes', condition: 'equals', pattern: '/products/shoes' })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('equals: no match for partial path', () => {
    const step = makeStep({ position: 1, name: 'Products', condition: 'equals', pattern: '/products' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('starts_with: matches prefix', () => {
    const step = makeStep({ position: 1, name: 'Products', condition: 'starts_with', pattern: '/products' })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('starts_with: no match when prefix differs', () => {
    const step = makeStep({ position: 1, name: 'Cart', condition: 'starts_with', pattern: '/cart' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('ends_with: matches suffix', () => {
    const step = makeStep({ position: 1, name: 'Shoes', condition: 'ends_with', pattern: '/shoes' })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('ends_with: no match when suffix differs', () => {
    const step = makeStep({ position: 1, name: 'Boots', condition: 'ends_with', pattern: '/boots' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('matches_regex: matches regex pattern', () => {
    const step = makeStep({ position: 1, name: 'Products', condition: 'matches_regex', pattern: '/products/\\w+' })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches_regex: no match when regex fails', () => {
    const step = makeStep({ position: 1, name: 'Checkout', condition: 'matches_regex', pattern: '^/checkout$' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('matches_regex: handles invalid regex gracefully', () => {
    const step = makeStep({ position: 1, name: 'Bad', condition: 'matches_regex', pattern: '[invalid(' })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('unknown condition returns false', () => {
    const step = makeStep({ position: 1, name: 'X', condition: 'unknown_op' as never })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('matches page_url pattern type', () => {
    const step = makeStep({
      position: 1,
      name: 'Full URL',
      pattern_type: 'page_url',
      condition: 'contains',
      pattern: 'example.com/products',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches page_title pattern type', () => {
    const step = makeStep({
      position: 1,
      name: 'Title',
      pattern_type: 'page_title',
      condition: 'equals',
      pattern: 'Running Shoes',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches search_query pattern type', () => {
    const pvWithSearch = makePv({ id: 'pv-s', page_path: '/search', search_query: 'red shoes' })
    const step = makeStep({
      position: 1,
      name: 'Search',
      pattern_type: 'search_query',
      condition: 'contains',
      pattern: 'shoes',
    })
    expect(matchesStep(step, pvWithSearch)).toBe(true)
  })

  it('handles null page_title gracefully', () => {
    const pvNoTitle = makePv({ id: 'pv-nt', page_path: '/foo', page_title: null })
    const step = makeStep({
      position: 1,
      name: 'Title',
      pattern_type: 'page_title',
      condition: 'contains',
      pattern: 'foo',
    })
    expect(matchesStep(step, pvNoTitle)).toBe(false)
  })

  it('handles null search_query gracefully', () => {
    const pvNoSearch = makePv({ id: 'pv-ns', page_path: '/foo', search_query: null })
    const step = makeStep({
      position: 1,
      name: 'Search',
      pattern_type: 'search_query',
      condition: 'contains',
      pattern: 'bar',
    })
    expect(matchesStep(step, pvNoSearch)).toBe(false)
  })
})

// ─── computeStepMatches ──────────────────────────────────────────────

describe('computeStepMatches', () => {
  it('matches steps sequentially (same walk algorithm as Go backend)', () => {
    // pageviews: /, /products, /products/shoes, /cart
    // steps: starts_with /products, contains /cart, equals /checkout
    const matches = computeStepMatches(mockPageviews, mockFunnelSteps)

    // pv-2 (/products) matches step 1 (starts_with /products)
    expect(matches.get('pv-2')?.position).toBe(1)
    // pv-4 (/cart) matches step 2 (contains /cart)
    expect(matches.get('pv-4')?.position).toBe(2)
    // step 3 (/checkout) is never matched
    expect(matches.size).toBe(2)
  })

  it('skips unmatched pageviews for required steps (Case 3)', () => {
    const pvs = [
      makePv({ id: 'a', page_path: '/home' }),
      makePv({ id: 'b', page_path: '/about' }),
      makePv({ id: 'c', page_path: '/products' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Products', condition: 'starts_with', pattern: '/products', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('c')?.position).toBe(1)
    expect(matches.size).toBe(1)
  })

  it('skips optional steps that do not match (Case 2)', () => {
    const pvs = [
      makePv({ id: 'a', page_path: '/products' }),
      makePv({ id: 'b', page_path: '/cart' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Products', condition: 'starts_with', pattern: '/products', is_required: true }),
      makeStep({ position: 2, name: 'Wishlist', condition: 'equals', pattern: '/wishlist', is_required: false }),
      makeStep({ position: 3, name: 'Cart', condition: 'contains', pattern: '/cart', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('a')?.position).toBe(1)
    // Step 2 (Wishlist, optional) is skipped
    expect(matches.get('b')?.position).toBe(3)
    expect(matches.size).toBe(2)
  })

  it('returns empty map when no pageviews', () => {
    const matches = computeStepMatches([], mockFunnelSteps)
    expect(matches.size).toBe(0)
  })

  it('returns empty map when no funnel steps', () => {
    const matches = computeStepMatches(mockPageviews, [])
    expect(matches.size).toBe(0)
  })

  it('handles all steps matched (full conversion)', () => {
    const pvs = [
      makePv({ id: 'a', page_path: '/products' }),
      makePv({ id: 'b', page_path: '/cart' }),
      makePv({ id: 'c', page_path: '/checkout' }),
    ]
    const matches = computeStepMatches(pvs, mockFunnelSteps)

    expect(matches.get('a')?.position).toBe(1)
    expect(matches.get('b')?.position).toBe(2)
    expect(matches.get('c')?.position).toBe(3)
    expect(matches.size).toBe(3)
  })

  it('does not match same pageview to multiple steps', () => {
    // /products matches step 1 (starts_with /products)
    // but should NOT also match step 2 (contains /products) since step already advanced
    const pvs = [
      makePv({ id: 'a', page_path: '/products' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'S1', condition: 'starts_with', pattern: '/products', is_required: true }),
      makeStep({ position: 2, name: 'S2', condition: 'contains', pattern: '/products', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.size).toBe(1)
    expect(matches.get('a')?.position).toBe(1)
  })

  it('handles multiple optional steps in a row', () => {
    const pvs = [
      makePv({ id: 'a', page_path: '/checkout' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Opt1', condition: 'equals', pattern: '/a', is_required: false }),
      makeStep({ position: 2, name: 'Opt2', condition: 'equals', pattern: '/b', is_required: false }),
      makeStep({ position: 3, name: 'Checkout', condition: 'equals', pattern: '/checkout', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('a')?.position).toBe(3)
    expect(matches.size).toBe(1)
  })
})

// ─── matchesStep: event pattern type ─────────────────────────────────

describe('matchesStep — event pattern type', () => {
  it('matches event_name with equals condition', () => {
    const pv = makePv({ id: 'ev-1', page_path: '/pricing', event_name: 'signup_click' })
    const step = makeStep({
      position: 1,
      name: 'Signup Click',
      pattern_type: 'event',
      condition: 'equals',
      pattern: 'signup_click',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches event_name with contains condition', () => {
    const pv = makePv({ id: 'ev-2', page_path: '/pricing', event_name: 'cta_signup_click' })
    const step = makeStep({
      position: 1,
      name: 'Signup',
      pattern_type: 'event',
      condition: 'contains',
      pattern: 'signup',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches event_name with starts_with condition', () => {
    const pv = makePv({ id: 'ev-3', page_path: '/', event_name: 'purchase_completed' })
    const step = makeStep({
      position: 1,
      name: 'Purchase',
      pattern_type: 'event',
      condition: 'starts_with',
      pattern: 'purchase_',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('does not match when event_name is null', () => {
    const pv = makePv({ id: 'ev-4', page_path: '/products' })
    const step = makeStep({
      position: 1,
      name: 'Click',
      pattern_type: 'event',
      condition: 'equals',
      pattern: 'click',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('does not match when event_name differs', () => {
    const pv = makePv({ id: 'ev-5', page_path: '/', event_name: 'logout' })
    const step = makeStep({
      position: 1,
      name: 'Login',
      pattern_type: 'event',
      condition: 'equals',
      pattern: 'login',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })
})

// ─── computeStepMatches: mixed page + event steps ───────────────────

describe('computeStepMatches — mixed page + event steps', () => {
  it('matches page step then event step in sequence', () => {
    const pvs = [
      makePv({ id: 'mix-1', page_path: '/pricing', timestamp: '2026-02-14T10:30:00Z' }),
      makePv({ id: 'mix-2', page_path: '/pricing', event_name: 'signup_click', timestamp: '2026-02-14T10:30:01Z' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Pricing', pattern_type: 'page_path', condition: 'equals', pattern: '/pricing', is_required: true }),
      makeStep({ position: 2, name: 'Signup Click', pattern_type: 'event', condition: 'equals', pattern: 'signup_click', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('mix-1')?.position).toBe(1)
    expect(matches.get('mix-2')?.position).toBe(2)
    expect(matches.size).toBe(2)
  })

  it('skips optional event step when no matching event', () => {
    const pvs = [
      makePv({ id: 'mix-3', page_path: '/products' }),
      makePv({ id: 'mix-4', page_path: '/checkout' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Products', pattern_type: 'page_path', condition: 'starts_with', pattern: '/products', is_required: true }),
      makeStep({ position: 2, name: 'Add to Cart', pattern_type: 'event', condition: 'equals', pattern: 'add_to_cart', is_required: false }),
      makeStep({ position: 3, name: 'Checkout', pattern_type: 'page_path', condition: 'equals', pattern: '/checkout', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('mix-3')?.position).toBe(1)
    // Event step skipped (optional)
    expect(matches.get('mix-4')?.position).toBe(3)
    expect(matches.size).toBe(2)
  })
})

// ─── matchesStep: link pattern type ──────────────────────────────────

describe('matchesStep — link pattern type', () => {
  it('matches when tp_id equals pattern', () => {
    const pv = makePv({ id: 'lnk-1', page_path: '/home', tp_id: 'tp-uuid-123' })
    const step = makeStep({
      position: 1,
      name: 'Campaign Link',
      pattern_type: 'link',
      condition: 'equals',
      pattern: 'tp-uuid-123',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('does not match when tp_id differs', () => {
    const pv = makePv({ id: 'lnk-2', page_path: '/home', tp_id: 'tp-uuid-456' })
    const step = makeStep({
      position: 1,
      name: 'Campaign Link',
      pattern_type: 'link',
      condition: 'equals',
      pattern: 'tp-uuid-123',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('does not match when tp_id is null (organic traffic)', () => {
    const pv = makePv({ id: 'lnk-3', page_path: '/home', tp_id: null })
    const step = makeStep({
      position: 1,
      name: 'Campaign Link',
      pattern_type: 'link',
      condition: 'equals',
      pattern: 'tp-uuid-123',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })
})

// ─── computeStepMatches: link + page_path combo ─────────────────────

describe('computeStepMatches — link + page_path combo', () => {
  it('matches link as step 1 and page_path as step 2', () => {
    const pvs = [
      makePv({ id: 'lp-1', page_path: '/home', tp_id: 'tp-uuid-123' }),
      makePv({ id: 'lp-2', page_path: '/pricing', tp_id: null }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Campaign Link', pattern_type: 'link', condition: 'equals', pattern: 'tp-uuid-123', is_required: true }),
      makeStep({ position: 2, name: 'Pricing', pattern_type: 'page_path', condition: 'contains', pattern: '/pricing', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('lp-1')?.position).toBe(1)
    expect(matches.get('lp-2')?.position).toBe(2)
    expect(matches.size).toBe(2)
  })

  it('link step does not match when landing page has no tp_id', () => {
    const pvs = [
      makePv({ id: 'lp-3', page_path: '/home', tp_id: null }),
      makePv({ id: 'lp-4', page_path: '/pricing', tp_id: null }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Campaign Link', pattern_type: 'link', condition: 'equals', pattern: 'tp-uuid-123', is_required: true }),
      makeStep({ position: 2, name: 'Pricing', pattern_type: 'page_path', condition: 'contains', pattern: '/pricing', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    // Link step never matches, so step 2 is never reached
    expect(matches.size).toBe(0)
  })
})

// ─── matchesStep: conversion pattern type ────────────────────────────

describe('matchesStep — conversion pattern type', () => {
  it('matches when event_type equals lead', () => {
    const pv = makePv({ id: 'conv-1', page_path: '/thank-you', event_type: 'lead' })
    const step = makeStep({
      position: 1,
      name: 'Lead Conversion',
      pattern_type: 'conversion',
      condition: 'equals',
      pattern: 'lead',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('matches when event_type equals sale', () => {
    const pv = makePv({ id: 'conv-2', page_path: '/receipt', event_type: 'sale' })
    const step = makeStep({
      position: 1,
      name: 'Sale Conversion',
      pattern_type: 'conversion',
      condition: 'equals',
      pattern: 'sale',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('does not match when event_type is null (regular pageview)', () => {
    const pv = makePv({ id: 'conv-3', page_path: '/products' })
    const step = makeStep({
      position: 1,
      name: 'Any Conversion',
      pattern_type: 'conversion',
      condition: 'equals',
      pattern: 'lead',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('sale pattern does not match lead event_type', () => {
    const pv = makePv({ id: 'conv-4', page_path: '/thank-you', event_type: 'lead' })
    const step = makeStep({
      position: 1,
      name: 'Sale Only',
      pattern_type: 'conversion',
      condition: 'equals',
      pattern: 'sale',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('supports contains condition on event_type', () => {
    const pv = makePv({ id: 'conv-5', page_path: '/checkout', event_type: 'sale' })
    const step = makeStep({
      position: 1,
      name: 'Any sale',
      pattern_type: 'conversion',
      condition: 'contains',
      pattern: 'sal',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })
})

// ─── computeStepMatches: full cross-world funnel (link → page → conversion)

describe('computeStepMatches — cross-world funnel (link + page_path + conversion)', () => {
  it('matches 3-step funnel: link → page_path → conversion', () => {
    const pvs = [
      makePv({ id: 'cw-1', page_path: '/landing', tp_id: 'tp-campaign-1', li2_cid: 'cid-abc' }),
      makePv({ id: 'cw-2', page_path: '/pricing', tp_id: null, li2_cid: 'cid-abc' }),
      makePv({ id: 'cw-3', page_path: '/pricing', tp_id: null, li2_cid: 'cid-abc', event_type: 'lead' }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Campaign Click', pattern_type: 'link', condition: 'equals', pattern: 'tp-campaign-1', is_required: true }),
      makeStep({ position: 2, name: 'Pricing Page', pattern_type: 'page_path', condition: 'equals', pattern: '/pricing', is_required: true }),
      makeStep({ position: 3, name: 'Lead Conversion', pattern_type: 'conversion', condition: 'equals', pattern: 'lead', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('cw-1')?.position).toBe(1)
    expect(matches.get('cw-2')?.position).toBe(2)
    expect(matches.get('cw-3')?.position).toBe(3)
    expect(matches.size).toBe(3)
  })

  it('stops at conversion step when no conversion event exists', () => {
    const pvs = [
      makePv({ id: 'cw-4', page_path: '/landing', tp_id: 'tp-campaign-1' }),
      makePv({ id: 'cw-5', page_path: '/pricing', tp_id: null }),
      makePv({ id: 'cw-6', page_path: '/about', tp_id: null }),
    ]
    const steps = [
      makeStep({ position: 1, name: 'Campaign Click', pattern_type: 'link', condition: 'equals', pattern: 'tp-campaign-1', is_required: true }),
      makeStep({ position: 2, name: 'Pricing Page', pattern_type: 'page_path', condition: 'equals', pattern: '/pricing', is_required: true }),
      makeStep({ position: 3, name: 'Lead Conversion', pattern_type: 'conversion', condition: 'equals', pattern: 'lead', is_required: true }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('cw-4')?.position).toBe(1)
    expect(matches.get('cw-5')?.position).toBe(2)
    // Step 3 (conversion) never matched — no pageview has event_type='lead'
    expect(matches.size).toBe(2)
  })
})

// ─── matchesStep: in condition ───────────────────────────────────────

describe('matchesStep - in condition', () => {
  it('matches when tp_id is in the comma list (link type)', () => {
    const pv = makePv({ id: 'in-1', page_path: '/home', tp_id: 'tp-ig' })
    const step = makeStep({
      position: 1,
      name: 'Social Campaign',
      pattern_type: 'link',
      condition: 'in',
      pattern: 'tp-fb,tp-ig,tp-tw',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('does not match when tp_id is not in the list', () => {
    const pv = makePv({ id: 'in-2', page_path: '/home', tp_id: 'tp-email' })
    const step = makeStep({
      position: 1,
      name: 'Social Campaign',
      pattern_type: 'link',
      condition: 'in',
      pattern: 'tp-fb,tp-ig,tp-tw',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })

  it('trims whitespace in the comma list', () => {
    const pv = makePv({ id: 'in-3', page_path: '/home', tp_id: 'tp-ig' })
    const step = makeStep({
      position: 1,
      name: 'Social Campaign',
      pattern_type: 'link',
      condition: 'in',
      pattern: 'tp-fb , tp-ig , tp-tw',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('works for page_path type (not just link)', () => {
    const pv = makePv({ id: 'in-4', page_path: '/pricing' })
    const step = makeStep({
      position: 1,
      name: 'Key Pages',
      pattern_type: 'page_path',
      condition: 'in',
      pattern: '/home,/pricing,/contact',
    })
    expect(matchesStep(step, pv)).toBe(true)
  })

  it('does not match when field is null (organic traffic)', () => {
    const pv = makePv({ id: 'in-5', page_path: '/home', tp_id: null })
    const step = makeStep({
      position: 1,
      name: 'Social Campaign',
      pattern_type: 'link',
      condition: 'in',
      pattern: 'tp-fb,tp-ig,tp-tw',
    })
    expect(matchesStep(step, pv)).toBe(false)
  })
})

// ─── computeStepMatches: multi-link campaign funnel ──────────────────

describe('computeStepMatches - multi-link campaign funnel', () => {
  it('full walk: link in [tp-fb, tp-ig] → page_path contains /pricing, session via tp-ig matches both steps', () => {
    const pvs = [
      makePv({ id: 'mlc-1', page_path: '/landing', tp_id: 'tp-ig' }),
      makePv({ id: 'mlc-2', page_path: '/pricing', tp_id: null }),
    ]
    const steps = [
      makeStep({
        position: 1,
        name: 'Social Entry',
        pattern_type: 'link',
        condition: 'in',
        pattern: 'tp-fb,tp-ig',
        is_required: true,
      }),
      makeStep({
        position: 2,
        name: 'Pricing Page',
        pattern_type: 'page_path',
        condition: 'contains',
        pattern: '/pricing',
        is_required: true,
      }),
    ]
    const matches = computeStepMatches(pvs, steps)

    expect(matches.get('mlc-1')?.position).toBe(1)
    expect(matches.get('mlc-2')?.position).toBe(2)
    expect(matches.size).toBe(2)
  })
})

// ─── findNextUnmatchedStep ───────────────────────────────────────────

describe('findNextUnmatchedStep', () => {
  it('returns first unmatched step', () => {
    const matches = new Map<string, (typeof mockFunnelSteps)[0]>()
    matches.set('pv-2', mockFunnelSteps[0]) // step 1 matched

    const next = findNextUnmatchedStep(matches, mockFunnelSteps)
    expect(next?.position).toBe(2)
    expect(next?.name).toBe('Cart')
  })

  it('returns null when all steps matched', () => {
    const matches = new Map<string, (typeof mockFunnelSteps)[0]>()
    matches.set('pv-1', mockFunnelSteps[0])
    matches.set('pv-2', mockFunnelSteps[1])
    matches.set('pv-3', mockFunnelSteps[2])

    const next = findNextUnmatchedStep(matches, mockFunnelSteps)
    expect(next).toBeNull()
  })

  it('returns first step when none matched', () => {
    const matches = new Map<string, (typeof mockFunnelSteps)[0]>()
    const next = findNextUnmatchedStep(matches, mockFunnelSteps)
    expect(next?.position).toBe(1)
  })
})

// ─── computeStepMatches - optional step forward scan ─────────────────

describe('computeStepMatches - optional step forward scan', () => {
  it('should find optional event step match past non-matching events', () => {
    const steps = [
      makeStep({ position: 1, name: 'Home', pattern_type: 'page_path', condition: 'contains', pattern: '/', is_required: true }),
      makeStep({ position: 2, name: 'Buy', pattern_type: 'event', condition: 'contains', pattern: 'click_buy', is_required: false }),
      makeStep({ position: 3, name: 'Checkout', pattern_type: 'event', condition: 'contains', pattern: 'click_checkout', is_required: true }),
    ]

    const pageviews = [
      makePv({ id: 'pv-home', page_path: '/', timestamp: '2026-01-01T00:00:00Z' }),
      makePv({ id: 'pv-banner', page_path: '/', event_name: 'click_banner', timestamp: '2026-01-01T00:01:00Z' }),
      makePv({ id: 'pv-buy', page_path: '/', event_name: 'click_buy', timestamp: '2026-01-01T00:02:00Z' }),
      makePv({ id: 'pv-checkout', page_path: '/', event_name: 'click_checkout', timestamp: '2026-01-01T00:03:00Z' }),
    ]

    const matches = computeStepMatches(pageviews, steps)

    expect(matches.has('pv-home')).toBe(true)
    expect(matches.has('pv-buy')).toBe(true)
    expect(matches.has('pv-checkout')).toBe(true)
  })

  it('should skip optional step when no match exists anywhere', () => {
    const steps = [
      makeStep({ position: 1, name: 'Home', pattern_type: 'page_path', condition: 'contains', pattern: '/', is_required: true }),
      makeStep({ position: 2, name: 'Buy', pattern_type: 'event', condition: 'contains', pattern: 'click_buy', is_required: false }),
      makeStep({ position: 3, name: 'Checkout', pattern_type: 'page_path', condition: 'equals', pattern: '/checkout', is_required: true }),
    ]

    const pageviews = [
      makePv({ id: 'pv-home', page_path: '/', timestamp: '2026-01-01T00:00:00Z' }),
      makePv({ id: 'pv-banner', page_path: '/', event_name: 'click_banner', timestamp: '2026-01-01T00:01:00Z' }),
      makePv({ id: 'pv-checkout', page_path: '/checkout', timestamp: '2026-01-01T00:02:00Z' }),
    ]

    const matches = computeStepMatches(pageviews, steps)

    expect(matches.has('pv-home')).toBe(true)
    expect(matches.has('pv-banner')).toBe(false)
    expect(matches.has('pv-checkout')).toBe(true)
  })

  it('should handle multiple consecutive optional steps with forward scan', () => {
    const steps = [
      makeStep({ position: 1, name: 'Home', pattern_type: 'page_path', condition: 'contains', pattern: '/', is_required: true }),
      makeStep({ position: 2, name: 'Buy', pattern_type: 'event', condition: 'contains', pattern: 'click_buy', is_required: false }),
      makeStep({ position: 3, name: 'Lux', pattern_type: 'event', condition: 'contains', pattern: 'click_lux', is_required: false }),
      makeStep({ position: 4, name: 'Tel', pattern_type: 'event', condition: 'contains', pattern: 'click_tel', is_required: true }),
    ]

    const pageviews = [
      makePv({ id: 'pv-home', page_path: '/', timestamp: '2026-01-01T00:00:00Z' }),
      makePv({ id: 'pv-banner', page_path: '/', event_name: 'click_banner', timestamp: '2026-01-01T00:01:00Z' }),
      makePv({ id: 'pv-buy', page_path: '/', event_name: 'click_buy', timestamp: '2026-01-01T00:02:00Z' }),
      makePv({ id: 'pv-lux', page_path: '/', event_name: 'click_lux', timestamp: '2026-01-01T00:03:00Z' }),
      makePv({ id: 'pv-tel', page_path: '/', event_name: 'click_tel', timestamp: '2026-01-01T00:04:00Z' }),
    ]

    const matches = computeStepMatches(pageviews, steps)

    expect(matches.has('pv-home')).toBe(true)
    expect(matches.has('pv-buy')).toBe(true)
    expect(matches.has('pv-lux')).toBe(true)
    expect(matches.has('pv-tel')).toBe(true)
  })
})
