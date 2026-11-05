/**
 * `shared/schemas/agent-tools.ts` — SL-3's two schema changes.
 *
 * A separate file from `short-link-agent-tools.test.ts` only because SL-2 and SL-3 were written in
 * parallel against the same schemas file; the subject is the same.
 *
 * Two things are pinned:
 *   · `delete_short_link` takes an `id` AND NOTHING ELSE. There is no `slug`, because a tolerant
 *     identifier (a short code, a NAME, an ending the link no longer uses) is fine for reading a
 *     link and unacceptable for choosing one to hard-delete. `.strict()` is what makes a leftover
 *     `org_id` or a model-invented `confirm` a 400 rather than a silently ignored field.
 *   · `create_short_link.idempotency_key` is the SAME schema the artifact tools use, on BOTH modes.
 */
import { describe, it, expect } from 'vitest'

import {
  artifactIdempotencyKeySchema,
  createShortLinkInputSchema,
  deleteShortLinkInputSchema,
} from '@/shared/schemas/agent-tools'

const UUID = '22222222-2222-4222-8222-222222222222'

describe('deleteShortLinkInputSchema', () => {
  it('accepts a uuid and nothing else', () => {
    expect(deleteShortLinkInputSchema.parse({ id: UUID })).toEqual({ id: UUID })
  })

  it('⭐ has no slug form at all — a hard delete is not chosen by a tolerant identifier', () => {
    expect(deleteShortLinkInputSchema.safeParse({ slug: 'bang-gia-t10' }).success).toBe(false)
    expect(deleteShortLinkInputSchema.safeParse({ id: UUID, slug: 'bang-gia-t10' }).success).toBe(
      false
    )
  })

  it('refuses a missing id, a non-uuid id, and a leftover org_id', () => {
    for (const input of [
      {},
      { id: '' },
      { id: 'bang-gia-t10' },
      { id: UUID, org_id: UUID },
      // ⛔ A model fills in its own arguments, so a `confirm` it sets itself confirms nothing
      // (checklist §D). The human in the loop is the client's, driven by `destructiveHint`.
      { id: UUID, confirm: true },
    ]) {
      expect(deleteShortLinkInputSchema.safeParse(input).success, JSON.stringify(input)).toBe(false)
    }
  })
})

describe('create_short_link.idempotency_key', () => {
  const single = { mode: 'single' as const, destination_url: 'https://example.com/sale' }
  const bulk = { mode: 'bulk' as const, destinations: ['https://a.com', 'https://b.com'] }

  it('is optional on both modes, and absent when not sent', () => {
    expect(createShortLinkInputSchema.parse(single).idempotency_key).toBeUndefined()
    expect(createShortLinkInputSchema.parse(bulk).idempotency_key).toBeUndefined()
  })

  it('⭐ is accepted on BULK too, which is the mode a retry costs the most on', () => {
    const parsed = createShortLinkInputSchema.parse({
      ...bulk,
      idempotency_key: 'create:2026-10-20',
    })
    expect(parsed.idempotency_key).toBe('create:2026-10-20')
  })

  it('⭐ is byte-for-byte the schema the artifact tools use', () => {
    // One regex and one cap for the whole agent surface: a caller whose key names a publish must not
    // discover that the same name is refused for a short link.
    const accepted = ['k', 'a'.repeat(128), 'create:2026-10-20:bang-gia', 'ULID_01J.ABC-9']
    const refused = ['', 'a'.repeat(129), 'has spaces', 'bảng-giá', 'a\nb', '{k}', 'a/b']

    for (const key of accepted) {
      expect(artifactIdempotencyKeySchema.safeParse(key).success, key).toBe(true)
      expect(
        createShortLinkInputSchema.safeParse({ ...single, idempotency_key: key }).success,
        key
      ).toBe(true)
    }
    for (const key of refused) {
      expect(artifactIdempotencyKeySchema.safeParse(key).success, key).toBe(false)
      expect(
        createShortLinkInputSchema.safeParse({ ...single, idempotency_key: key }).success,
        key
      ).toBe(false)
      expect(
        createShortLinkInputSchema.safeParse({ ...bulk, idempotency_key: key }).success,
        key
      ).toBe(false)
    }
  })

  it('⛔ is NOT trimmed — two distinct caller-chosen keys must not silently become one', () => {
    // Trimming would make `"k"` and `"k "` the same key; the regex refuses the whitespace instead,
    // which tells the caller rather than guessing for them.
    expect(createShortLinkInputSchema.safeParse({ ...single, idempotency_key: 'k ' }).success).toBe(
      false
    )
  })
})
