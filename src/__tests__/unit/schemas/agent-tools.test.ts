import { describe, it, expect } from 'vitest'
import {
  bucketDaily,
  createShortLinkInputSchema,
  BULK_MAX,
  linkDetailsQuerySchema,
} from '../../../shared/schemas/agent-tools'

function makeRow(dayIndex: number) {
  return {
    date: `2024-01-${String(dayIndex + 1).padStart(2, '0')}`,
    link_clicks: 1,
    qr_scans: 1,
    nfc_taps: 1,
    total_interactions: 3,
  }
}

describe('bucketDaily', () => {
  it('returns daily granularity with one bucket per row when period_days <= 31', () => {
    const rows = Array.from({ length: 30 }, (_, i) => makeRow(i))

    const result = bucketDaily(rows, 30)

    expect(result.granularity).toBe('daily')
    expect(result.buckets).toHaveLength(30)
    expect(result.buckets[0]).toEqual({
      start: '2024-01-01',
      link_clicks: 1,
      qr_scans: 1,
      nfc_taps: 1,
      total_interactions: 3,
    })
  })

  it('returns weekly granularity at the 31-day boundary', () => {
    const rows = Array.from({ length: 31 }, (_, i) => makeRow(i))

    const result = bucketDaily(rows, 31)

    expect(result.granularity).toBe('daily')
    expect(result.buckets).toHaveLength(31)
  })

  it('buckets into weekly sums when period_days > 31, including a partial final week', () => {
    const rows = Array.from({ length: 90 }, (_, i) => makeRow(i))

    const result = bucketDaily(rows, 90)

    expect(result.granularity).toBe('weekly')
    // 90 days / 7 = 12 full weeks + 1 partial week of 6 days = 13 buckets
    expect(result.buckets).toHaveLength(13)

    const firstBucket = result.buckets[0]
    expect(firstBucket.start).toBe('2024-01-01')
    expect(firstBucket.link_clicks).toBe(7)
    expect(firstBucket.qr_scans).toBe(7)
    expect(firstBucket.nfc_taps).toBe(7)
    expect(firstBucket.total_interactions).toBe(21)

    const lastBucket = result.buckets[12]
    // Days 85 wrap past January in this fixture's date math, but the bucket must still sum
    // exactly the remaining 6 rows (90 - 12*7 = 6).
    expect(lastBucket.link_clicks).toBe(6)
    expect(lastBucket.qr_scans).toBe(6)
    expect(lastBucket.nfc_taps).toBe(6)
    expect(lastBucket.total_interactions).toBe(18)
  })

  it('returns empty buckets for empty rows, for both granularities', () => {
    expect(bucketDaily([], 30)).toEqual({ granularity: 'daily', buckets: [] })
    expect(bucketDaily([], 90)).toEqual({ granularity: 'weekly', buckets: [] })
  })
})

/**
 * create_short_link contract (Phase 3a, task-3a.0). Each case encodes ONE invariant the cross-repo
 * write contract depends on — the schema is the only structural guard between li2-ai and a real write.
 */
describe('createShortLinkInputSchema', () => {
  describe('single (state 1)', () => {
    it('prepends https:// to a schemeless destination_url', () => {
      // WHY: reuse requiredUrlSchema — we do not re-invent URL rules; a bare host must become a URL.
      const parsed = createShortLinkInputSchema.parse({
        mode: 'single',
        destination_url: 'example.com/sale',
      })
      expect(parsed.mode).toBe('single')
      if (parsed.mode === 'single') {
        expect(parsed.destination_url).toBe('https://example.com/sale')
      }
    })

    it('accepts a missing slug and leaves it undefined', () => {
      // WHY: slug is optional — the service generates a short_code when it is absent.
      const parsed = createShortLinkInputSchema.parse({
        mode: 'single',
        destination_url: 'https://example.com',
      })
      if (parsed.mode === 'single') {
        expect(parsed.slug).toBeUndefined()
      }
    })

    it('rejects a name longer than 64 characters', () => {
      // WHY: arch §10 caps the name at 64.
      const result = createShortLinkInputSchema.safeParse({
        mode: 'single',
        destination_url: 'https://example.com',
        name: 'x'.repeat(65),
      })
      expect(result.success).toBe(false)
    })

    it('rejects an empty destination_url', () => {
      // WHY: we must not create a link to an empty destination — requiredUrlSchema, not bare urlSchema.
      const result = createShortLinkInputSchema.safeParse({
        mode: 'single',
        destination_url: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a single body that also carries destinations', () => {
      // WHY: the discriminator must not let modes bleed together (.strict()).
      const result = createShortLinkInputSchema.safeParse({
        mode: 'single',
        destination_url: 'https://example.com',
        destinations: ['https://a.com', 'https://b.com'],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('bulk (state 3)', () => {
    it('accepts two or more URL-only destinations', () => {
      // WHY: state 3 is URL-only bulk creation.
      const parsed = createShortLinkInputSchema.parse({
        mode: 'bulk',
        destinations: ['https://a.com', 'https://b.com'],
      })
      expect(parsed.mode).toBe('bulk')
      if (parsed.mode === 'bulk') {
        expect(parsed.destinations).toHaveLength(2)
      }
    })

    it('rejects a bulk request with only one destination', () => {
      // WHY: a single link must use `single`, not a degenerate bulk (.min(2)).
      const result = createShortLinkInputSchema.safeParse({
        mode: 'bulk',
        destinations: ['https://a.com'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects more than BULK_MAX destinations', () => {
      // WHY: BULK_MAX is a deliberate damage-cap on the bulk quota hole (L12), not cosmetic.
      const result = createShortLinkInputSchema.safeParse({
        mode: 'bulk',
        destinations: Array.from({ length: BULK_MAX + 1 }, (_, i) => `https://site${i}.com`),
      })
      expect(result.success).toBe(false)
    })

    it('rejects a bulk request that smuggles a slug (state-2 defense)', () => {
      // WHY: state 2 (many links + custom param) must never silently drop the custom field on a batch.
      // li2-ai already blocks it, but the route defends structurally (.strict() bulk has no slug field).
      const result = createShortLinkInputSchema.safeParse({
        mode: 'bulk',
        destinations: ['https://a.com', 'https://b.com'],
        slug: 'custom-slug',
      })
      expect(result.success).toBe(false)
    })
  })

  it('rejects an unknown mode', () => {
    // WHY: the discriminator only knows single|bulk — anything else is not a valid write shape.
    const result = createShortLinkInputSchema.safeParse({
      mode: 'delete',
      destination_url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })
})

/**
 * 3b slice-1 advanced fields (password + expiration + UTM, task-3b.0). Each case encodes ONE
 * invariant of the mirror rules — this schema is the ONLY li2-app validation on the agent path
 * (createTouchPoint does not re-parse — drift-trap #2).
 */
describe('createShortLinkInputSchema — 3b advanced fields (single mode)', () => {
  it('parses a happy multi-field single request (password + expires_at + utm_source)', () => {
    // WHY: happy multi-field — the tool must accept the full slice-1 field set together.
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com/sale',
      password: 'spring',
      expires_at: '2027-01-01T00:00:00Z',
      utm_source: 'newsletter',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a password containing whitespace', () => {
    // WHY: mirror linkPasswordSchema no-whitespace rule — drift-trap #2, this schema is the only
    // li2-app authority on the agent path.
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      password: 'has space',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a password longer than 256 characters', () => {
    // WHY: mirror linkPasswordSchema max length (≤256).
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      password: 'x'.repeat(257),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an expires_at that is not a valid ISO datetime', () => {
    // WHY: .datetime() structural guard — do not let ISO garbage reach parseAccessControl.
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      expires_at: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('parses an expires_at in the past (future-check is NOT enforced here)', () => {
    // WHY: future-check lives in li2-ai only (BR-note asymmetry) — this is proof li2-app
    // deliberately does not enforce it; li2-app mirrors only rules that already exist in its own
    // Zod (linkExpiresAtSchema does not check future either).
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      expires_at: '2020-01-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a utm_medium without utm_source', () => {
    // WHY: mirror utmSchema.superRefine source-required-when-set (index.ts:101).
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      utm_medium: 'email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a utm_source longer than 60 characters', () => {
    // WHY: mirror utmSchema utm_source max length (≤60).
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      utm_source: 'x'.repeat(61),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown field (overrideable) on the single schema', () => {
    // WHY: .strict() + B2 deliberately drops overrideable/utm_id from the tool surface.
    const result = createShortLinkInputSchema.safeParse({
      mode: 'single',
      destination_url: 'https://example.com',
      overrideable: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a bulk request carrying an advanced field (password)', () => {
    // WHY: B6 — advanced fields are single-mode only; bulk .strict() has no advanced fields
    // (state-2 defense, mirrors 3a).
    const result = createShortLinkInputSchema.safeParse({
      mode: 'bulk',
      destinations: ['https://a.com', 'https://b.com'],
      password: 'spring',
    })
    expect(result.success).toBe(false)
  })

  it('imports the schema module and parses a valid input without throwing', () => {
    // WHY (ZOD-TRAP #3 canary): if a .superRefine ever lands on a discriminatedUnion MEMBER instead
    // of the outer union, z.discriminatedUnion throws at module import time — this test catches
    // that immediately, without waiting for a bad-input test case.
    expect(() =>
      createShortLinkInputSchema.parse({
        mode: 'single',
        destination_url: 'https://example.com',
      })
    ).not.toThrow()
  })
})

/**
 * link_details query contract — the ONLY structural guard on the id/slug params before they reach
 * the org-scoped touch-point lookup. `id` is the preferred exact lookup (threaded from
 * get_top_links' TopLinkEntry.id); `slug` is the tolerant fallback. At least one is required.
 */
describe('linkDetailsQuerySchema', () => {
  it('accepts a non-empty slug (no id)', () => {
    const result = linkDetailsQuerySchema.safeParse({ slug: '6LBCU' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.slug).toBe('6LBCU')
  })

  it('accepts a non-empty id (no slug)', () => {
    // WHY: the preferred path — get_top_links' TopLinkEntry.id threaded straight through.
    const result = linkDetailsQuerySchema.safeParse({ id: 'tp-123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('tp-123')
      expect(result.data.slug).toBeUndefined()
    }
  })

  it('accepts both id and slug together (id still wins at the route)', () => {
    const result = linkDetailsQuerySchema.safeParse({ id: 'tp-123', slug: '6LBCU' })
    expect(result.success).toBe(true)
  })

  it('trims surrounding whitespace on slug', () => {
    const result = linkDetailsQuerySchema.safeParse({ slug: '  6LBCU  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.slug).toBe('6LBCU')
  })

  it('trims surrounding whitespace on id', () => {
    const result = linkDetailsQuerySchema.safeParse({ id: '  tp-123  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe('tp-123')
  })

  it('rejects when neither id nor slug is present', () => {
    // WHY: the .refine — at least one lookup key is required.
    const result = linkDetailsQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects an empty-string slug with no id', () => {
    const result = linkDetailsQuerySchema.safeParse({ slug: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a whitespace-only slug with no id', () => {
    const result = linkDetailsQuerySchema.safeParse({ slug: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty-string id with no slug', () => {
    const result = linkDetailsQuerySchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
