/**
 * `shared/schemas/agent-tools.ts` — the two SL-1 input schemas.
 *
 * These schemas are the only validation between a model's output and the service layer, and they are
 * ALSO the source of the JSON Schema a client validates against. So two things are pinned here:
 * what is accepted, and the two rules that deliberately do NOT survive JSON Schema generation (the
 * `.refine` xor, and `.strict()`'s rejection of a leftover `org_id`) and therefore have to be
 * re-enforced in the route.
 */
import { describe, it, expect } from 'vitest'

import {
  getShortLinkInputSchema,
  listShortLinksInputSchema,
  setShortLinkSlugInputSchema,
  updateShortLinkInputSchema,
} from '@/shared/schemas/agent-tools'

const UUID = '22222222-2222-4222-8222-222222222222'

describe('listShortLinksInputSchema', () => {
  it('defaults limit to 20 and leaves every filter absent', () => {
    expect(listShortLinksInputSchema.parse({})).toEqual({ limit: 20 })
  })

  it('coerces a limit that arrived as a query string', () => {
    // Query parameters are strings. Without `z.coerce` every call would 400 on `limit=10`.
    expect(listShortLinksInputSchema.parse({ limit: '10' }).limit).toBe(10)
  })

  it('⭐ caps limit at 50 — half the UI route, because every item costs context', () => {
    expect(listShortLinksInputSchema.safeParse({ limit: 50 }).success).toBe(true)
    expect(listShortLinksInputSchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ limit: 1.5 }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ limit: 'many' }).success).toBe(false)
  })

  it('accepts the three filters, and refuses a non-uuid id', () => {
    const parsed = listShortLinksInputSchema.parse({
      search: ' bảng giá ',
      collection_id: UUID,
      tag_ids: [UUID],
    })
    expect(parsed.search).toBe('bảng giá') // trimmed
    expect(parsed.tag_ids).toEqual([UUID])

    expect(listShortLinksInputSchema.safeParse({ collection_id: 'not-a-uuid' }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ tag_ids: ['not-a-uuid'] }).success).toBe(false)
    // An empty array is a filter that matches nothing — a caller bug, not "no filter".
    expect(listShortLinksInputSchema.safeParse({ tag_ids: [] }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ search: '   ' }).success).toBe(false)
  })

  it('⭐ accepts tag_ids as a COMMA-SEPARATED STRING, which is how the back hop sends them', () => {
    // `call-tool.ts` builds a GET query with `String(value)`, so an array of uuids arrives as
    // `tag_ids=a,b`. A plain `z.array()` would 400 every real MCP call while passing a unit test
    // written against an array.
    const TAG_2 = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee'
    expect(listShortLinksInputSchema.parse({ tag_ids: `${UUID},${TAG_2}` }).tag_ids).toEqual([
      UUID,
      TAG_2,
    ])
    expect(listShortLinksInputSchema.parse({ tag_ids: ` ${UUID} , ${TAG_2} ` }).tag_ids).toEqual([
      UUID,
      TAG_2,
    ])
    // A single id with no comma is still a one-element list, not a string.
    expect(listShortLinksInputSchema.parse({ tag_ids: UUID }).tag_ids).toEqual([UUID])
    // …and the string form is validated just as strictly as the array form.
    expect(listShortLinksInputSchema.safeParse({ tag_ids: 'not-a-uuid' }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ tag_ids: '' }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ tag_ids: ',,' }).success).toBe(false)
  })

  it('refuses more than 20 tag ids and an over-long cursor', () => {
    expect(listShortLinksInputSchema.safeParse({ tag_ids: Array(21).fill(UUID) }).success).toBe(
      false
    )
    expect(listShortLinksInputSchema.safeParse({ cursor: 'x'.repeat(257) }).success).toBe(false)
  })

  it('⛔ .strict() refuses a leftover org_id — the MCP layer must strip it before the hop', () => {
    // `org_id` is an MCP-layer argument; the back hop reads the org from the PASETO. A schema that
    // tolerated it would make a forwarding bug invisible instead of a 400.
    expect(listShortLinksInputSchema.safeParse({ org_id: UUID }).success).toBe(false)
    expect(listShortLinksInputSchema.safeParse({ page: 2 }).success).toBe(false)
  })
})

describe('getShortLinkInputSchema', () => {
  it('⭐ accepts exactly one of id and slug — never both, never neither', () => {
    expect(getShortLinkInputSchema.safeParse({ id: UUID }).success).toBe(true)
    expect(getShortLinkInputSchema.safeParse({ slug: 'bang-gia-t10' }).success).toBe(true)
    // The xor is a `.refine`, so it does NOT survive JSON Schema generation — which is why the tool
    // description states it in prose and the route re-runs `safeParse`.
    expect(getShortLinkInputSchema.safeParse({ id: UUID, slug: 'bang-gia-t10' }).success).toBe(
      false
    )
    expect(getShortLinkInputSchema.safeParse({}).success).toBe(false)
  })

  it('requires a uuid for id', () => {
    expect(getShortLinkInputSchema.safeParse({ id: 'tp-1' }).success).toBe(false)
  })

  it('⭐ takes a LOOSE slug, so a generated code and an OLD ending both resolve', () => {
    // Deliberately not the shared `slugSchema`: that one describes a slug a user may CREATE (6–64
    // chars, no `f-` prefix). What is looked up here is whatever already resolves — including a
    // 5-character `short_code` and an ending the link no longer uses but that is printed on a flyer.
    for (const slug of ['6LAA3', 'f-legacy', 'A Link Name', 'x']) {
      expect(getShortLinkInputSchema.safeParse({ slug }).success).toBe(true)
    }
    expect(getShortLinkInputSchema.safeParse({ slug: '' }).success).toBe(false)
    expect(getShortLinkInputSchema.safeParse({ slug: 'x'.repeat(256) }).success).toBe(false)
  })

  it('trims the slug', () => {
    expect(getShortLinkInputSchema.parse({ slug: '  6LAA3  ' }).slug).toBe('6LAA3')
  })

  it('⛔ .strict() refuses a leftover org_id', () => {
    expect(getShortLinkInputSchema.safeParse({ id: UUID, org_id: UUID }).success).toBe(false)
  })
})

/**
 * The two SL-2 write schemas. More is pinned here than for the reads, because these schemas are the
 * ONLY parse on the write path: `touchPointService.updateAndReturn` takes its argument as a TYPE and
 * never re-validates it, so a rule missing below reaches a column.
 */
describe('updateShortLinkInputSchema', () => {
  it('⭐ refuses a patch with nothing to change — the `.refine` JSON Schema cannot carry', () => {
    // A model that believed it had changed something would tell the user so, which is why this is a
    // 400 rather than a silent success. The route re-runs `safeParse` for the same reason.
    expect(updateShortLinkInputSchema.safeParse({ id: UUID }).success).toBe(false)
    // An empty nested object asks for nothing either, and `.strict()` cannot see that.
    expect(updateShortLinkInputSchema.safeParse({ id: UUID, utm: {} }).success).toBe(false)
    expect(updateShortLinkInputSchema.safeParse({ id: UUID, access_control: {} }).success).toBe(
      false
    )
  })

  it('accepts each field on its own', () => {
    for (const patch of [
      { destination_url: 'https://example.com/new' },
      { name: 'Bảng giá tháng 11' },
      { enabled: false },
      { utm: { campaign: 'tet-2027' } },
      { access_control: { expires_at: '2027-01-31T23:59:59+07:00' } },
      { access_control: { password: 'nho-mat-khau' } },
    ]) {
      expect(
        updateShortLinkInputSchema.safeParse({ id: UUID, ...patch }).success,
        JSON.stringify(patch)
      ).toBe(true)
    }
  })

  it('⭐ null is accepted for password and expires_at — it is how a removal is spelled', () => {
    const parsed = updateShortLinkInputSchema.parse({
      id: UUID,
      access_control: { password: null, expires_at: null },
    })
    expect(parsed.access_control).toEqual({ password: null, expires_at: null })
    // ⛔ And `null` is NOT the same as omitting the key: an absent key leaves the stored value, a
    // null overwrites it and is then dropped by the service's `pickDefinedAndNotNull`.
    expect(
      Object.keys(updateShortLinkInputSchema.parse({ id: UUID, enabled: true }))
    ).not.toContain('access_control')
  })

  it("⛔ refuses an empty password — removal has a spelling and it is null, not ''", () => {
    // `''` would store an empty string that `has_password` then reports as `false`: a link in a
    // state no tool can describe.
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, access_control: { password: '' } }).success
    ).toBe(false)
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, access_control: { password: 'has space' } })
        .success
    ).toBe(false)
  })

  it('requires an ISO 8601 expires_at WITH an offset', () => {
    // `linkExpiresAtSchema` only parses-to-Date and would take anything `new Date()` takes, so this
    // schema is the structural backstop — the same one `create_short_link` applies.
    expect(
      updateShortLinkInputSchema.safeParse({
        id: UUID,
        access_control: { expires_at: '2027-01-31T23:59:59Z' },
      }).success
    ).toBe(true)
    for (const bad of ['2027-01-31', 'tomorrow', '2027-01-31T23:59:59']) {
      expect(
        updateShortLinkInputSchema.safeParse({ id: UUID, access_control: { expires_at: bad } })
          .success,
        bad
      ).toBe(false)
    }
  })

  it('mirrors the dashboard rules for name and destination_url', () => {
    // `touchPointUpdateSchema.name` is `min(4).max(64)`; a 3-character name is refused in the UI too.
    expect(updateShortLinkInputSchema.safeParse({ id: UUID, name: 'abc' }).success).toBe(false)
    expect(updateShortLinkInputSchema.safeParse({ id: UUID, name: 'x'.repeat(65) }).success).toBe(
      false
    )
    // `requiredUrlSchema` prepends the scheme, exactly as it does for `create_short_link`.
    expect(
      updateShortLinkInputSchema.parse({ id: UUID, destination_url: 'example.com/pricing' })
        .destination_url
    ).toBe('https://example.com/pricing')
    expect(updateShortLinkInputSchema.safeParse({ id: UUID, destination_url: '' }).success).toBe(
      false
    )
  })

  it('names the five UTM parameters WITHOUT the utm_ prefix, and refuses utm_id', () => {
    const parsed = updateShortLinkInputSchema.parse({
      id: UUID,
      utm: { source: 'facebook', medium: 'qr', campaign: 'tet', term: 'gia', content: 'story-1' },
    })
    expect(parsed.utm).toEqual({
      source: 'facebook',
      medium: 'qr',
      campaign: 'tet',
      term: 'gia',
      content: 'story-1',
    })
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, utm: { utm_source: 'facebook' } }).success
    ).toBe(false)
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, utm: { source: 'x'.repeat(61) } }).success
    ).toBe(false)
  })

  it('⛔ .strict() refuses a leftover org_id and any unknown field', () => {
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, enabled: true, org_id: UUID }).success
    ).toBe(false)
    expect(
      updateShortLinkInputSchema.safeParse({ id: UUID, slug: 'bang-gia-t11' }).success,
      'renaming is set_short_link_slug, not a field of this tool'
    ).toBe(false)
    expect(updateShortLinkInputSchema.safeParse({ id: 'not-a-uuid', enabled: true }).success).toBe(
      false
    )
  })
})

describe('setShortLinkSlugInputSchema', () => {
  it('applies the SHARED slugSchema — the rules the dashboard applies', () => {
    // This tool INSERTS a row into `slugs`, so it must obey exactly what a human obeys; an agent
    // that could mint a slug a human could not is the failure this shares a schema to avoid.
    expect(setShortLinkSlugInputSchema.safeParse({ id: UUID, slug: 'bang-gia-t11' }).success).toBe(
      true
    )
    for (const bad of ['short', 'f-legacy', 'Bang-Gia', 'two--hyphens', 'x'.repeat(65)]) {
      expect(setShortLinkSlugInputSchema.safeParse({ id: UUID, slug: bad }).success, bad).toBe(
        false
      )
    }
  })

  it("⭐ refuses an empty slug — for this tool '' is a missing argument, not 'leave it alone'", () => {
    // `slugSchema` maps `''` to `undefined`, which is harmless where a slug is optional and wrong
    // here. The `.refine` is what turns it into a 400, and the route narrows on the same condition.
    expect(setShortLinkSlugInputSchema.safeParse({ id: UUID, slug: '' }).success).toBe(false)
    expect(setShortLinkSlugInputSchema.safeParse({ id: UUID, slug: '   ' }).success).toBe(false)
    expect(setShortLinkSlugInputSchema.safeParse({ id: UUID }).success).toBe(false)
  })

  it('⛔ .strict() refuses a leftover org_id', () => {
    expect(
      setShortLinkSlugInputSchema.safeParse({ id: UUID, slug: 'bang-gia-t11', org_id: UUID })
        .success
    ).toBe(false)
  })
})
