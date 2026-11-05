/**
 * `core/helpers/short-link-agent-tools.ts` — the ONE `ShortLink` projection (SL-0 §3).
 *
 * The test that earns its keep is the LEAK test: this projection reads rows of `touch_points`, a
 * table that holds a password hash, targeting rules and the owner's user id. A `{...row}` refactor
 * would pass every "the fields are right" assertion and quietly put all of it into a model's
 * context, so the shape is pinned as a CLOSED key list and the forbidden columns are named one by
 * one.
 */
import { describe, it, expect } from 'vitest'

import {
  planShortLinkUpdate,
  toShortLink,
  type ShortLinkRow,
  type ShortLinkUpdateSourceRow,
} from '@/core/helpers/short-link-agent-tools'

const row = (overrides: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Bảng giá tháng 10',
  slug: 'bang-gia-t10',
  short_code: '6LAA3',
  short_url: 'https://example.com/bang-gia-t10',
  content_value: 'https://example.com/pricing',
  path_qr_code: 'https://supa.example/qr-tp.svg',
  enabled: true,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-18T09:00:00.000Z',
  access_control: null,
  ...overrides,
})

describe('toShortLink', () => {
  it('projects exactly the declared keys — no more, no fewer', () => {
    expect(Object.keys(toShortLink(row())).sort()).toEqual([
      'created_at',
      'destination_url',
      'enabled',
      'expires_at',
      'has_password',
      'id',
      'name',
      'qr_url',
      'short_code',
      'short_url',
      'slug',
      'tags',
      'updated_at',
    ])
  })

  it('renames content_value to destination_url and path_qr_code to qr_url', () => {
    const link = toShortLink(row())
    expect(link.destination_url).toBe('https://example.com/pricing')
    expect(link.qr_url).toBe('https://supa.example/qr-tp.svg')
  })

  it('⛔ NEVER leaks the password, nor any column it was not asked for', () => {
    const link = toShortLink(
      row({
        access_control: { password: 'scrypt$hash$not-a-secret-but-still-no', expires_at: null },
        // Columns a `{...row}` spread would carry straight through.
        ...({
          user_id: '11111111-1111-4111-8111-111111111111',
          organization_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
          targeting: { rules: ['vn'] },
          privacy_security: { something: true },
          safety_status: 'flagged',
        } as Partial<ShortLinkRow>),
      })
    )

    const serialized = JSON.stringify(link)
    expect(serialized).not.toContain('scrypt')
    expect(serialized).not.toContain('access_control')
    for (const forbidden of [
      'user_id',
      'organization_id',
      'targeting',
      'privacy_security',
      'safety_status',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
    // …and the one thing a caller IS allowed to learn about the password.
    expect(link.has_password).toBe(true)
  })

  it('has_password is false for a missing, null and EMPTY-STRING password', () => {
    // `''` means "no password set" in this schema; reporting `true` would have an agent tell a user
    // their page is protected when anyone can open it.
    expect(toShortLink(row({ access_control: null })).has_password).toBe(false)
    expect(toShortLink(row({ access_control: {} })).has_password).toBe(false)
    expect(toShortLink(row({ access_control: { password: '' } })).has_password).toBe(false)
    expect(toShortLink(row({ access_control: { password: null } })).has_password).toBe(false)
  })

  it('reads expires_at out of access_control, defaulting to null', () => {
    expect(
      toShortLink(row({ access_control: { expires_at: '2027-01-01T00:00:00.000Z' } })).expires_at
    ).toBe('2027-01-01T00:00:00.000Z')
    expect(toShortLink(row()).expires_at).toBeNull()
  })

  it('normalises an absent slug, short_code, destination and QR to null', () => {
    // A link with only a generated code has `slug: null`; `undefined` would vanish from the JSON and
    // leave a model unable to tell "no custom slug" from "the server forgot to tell me".
    const link = toShortLink(
      row({ slug: null, short_code: undefined, content_value: null, path_qr_code: undefined })
    )
    expect(link.slug).toBeNull()
    expect(link.short_code).toBeNull()
    expect(link.destination_url).toBeNull()
    expect(link.qr_url).toBeNull()
  })

  it('⭐ reports enabled: false rather than omitting it', () => {
    // The field that makes a switched-off link distinguishable from a live one. Before SL-0 the
    // agent surface had no way to tell them apart.
    expect(toShortLink(row({ enabled: false })).enabled).toBe(false)
  })

  it('⭐ carries no visits count, on purpose', () => {
    // The list query enriches rows with `visits: [{ count }]`, so including it would have been free.
    // It is left out because it agrees with neither `get_analytics_summary` nor `get_top_links` about
    // what a visit is, and two different totals in one conversation is worse than one.
    const link = toShortLink({ ...row(), ...({ visits: [{ count: 987654 }] } as object) })
    expect(JSON.stringify(link)).not.toContain('987654')
    expect('visits' in link).toBe(false)
  })

  describe('tags', () => {
    it('maps the tag join to NAMES, not ids', () => {
      // A uuid is something a model prints at the user; the word is what it was asked about.
      const link = toShortLink(
        row({
          tp_tag_links: [
            { tag_id: 't1', tags: { id: 't1', name: 'Tết', color: '#f00' } },
            { tag_id: 't2', tags: { id: 't2', name: 'print', color: '#0f0' } },
          ],
        })
      )
      expect(link.tags).toEqual(['Tết', 'print'])
      expect(JSON.stringify(link)).not.toContain('tag_id')
      expect(JSON.stringify(link)).not.toContain('#f00')
    })

    it('handles the ARRAY embed shape PostgREST sometimes returns', () => {
      const link = toShortLink(
        row({ tp_tag_links: [{ tag_id: 't1', tags: [{ id: 't1', name: 'Tết' }] }] })
      )
      expect(link.tags).toEqual(['Tết'])
    })

    it('⭐ is [] for a single-row read, which has no tag join at all', () => {
      // `get_short_link` reads `LinkDetailsRow`, which does not embed tags. `[]` is the honest
      // answer; `undefined` would disappear from the JSON and look like a server bug.
      expect(toShortLink(row({ tp_tag_links: undefined })).tags).toEqual([])
    })

    it('survives a malformed or half-deleted join without throwing', () => {
      for (const malformed of [
        null,
        'nonsense',
        42,
        [null],
        [{ tag_id: 't1' }],
        [{ tag_id: 't1', tags: null }],
        [{ tags: { id: 'x' } }],
        [{ tags: { name: '' } }],
      ]) {
        expect(toShortLink(row({ tp_tag_links: malformed as never })).tags).toEqual([])
      }
    })
  })
})

/**
 * `planShortLinkUpdate` — the SL-2 patch mapper.
 *
 * Two things are pinned per key, and they fail for different reasons: the TRANSLATION (a wrong
 * column name writes nothing and reports success) and `changed` (a wrong answer there has a model
 * telling the user something moved when it did not). The UTM merge gets the most attention because
 * the service assigns `utm_tags` wholesale — a mapper that forgot to merge would silently erase the
 * parameters the patch did not mention.
 */
describe('planShortLinkUpdate — the field translation', () => {
  const ID = '22222222-2222-4222-8222-222222222222'
  const source = (overrides: Partial<ShortLinkUpdateSourceRow> = {}): ShortLinkUpdateSourceRow => ({
    name: 'Bảng giá tháng 10',
    content_value: 'https://example.com/pricing',
    enabled: true,
    utm_tags: null,
    access_control: null,
    ...overrides,
  })

  it('destination_url → content_value, the one rename on the wire', () => {
    const { patch, changed } = planShortLinkUpdate(
      { id: ID, destination_url: 'https://example.com/new' },
      source()
    )
    expect(patch).toEqual({ content_value: 'https://example.com/new' })
    expect(changed).toEqual(['destination_url'])
  })

  it('name and enabled pass through under their own names', () => {
    const { patch, changed } = planShortLinkUpdate(
      { id: ID, name: 'Bảng giá tháng 11', enabled: false },
      source()
    )
    expect(patch).toEqual({ name: 'Bảng giá tháng 11', enabled: false })
    expect(changed).toEqual(['name', 'enabled'])
  })

  it('⭐ reports nothing changed when every value sent is already in place', () => {
    // The service drops these fields itself (`getChangedFields`), so the call succeeds and moves
    // nothing. `changed: []` is what stops a model reporting a change that did not happen.
    const { patch, changed } = planShortLinkUpdate(
      {
        id: ID,
        destination_url: 'https://example.com/pricing',
        name: 'Bảng giá tháng 10',
        enabled: true,
      },
      source()
    )
    // The patch is still sent — the service is the one that compares, and it is the one that owns
    // the URL blacklist check on a destination.
    expect(patch.content_value).toBe('https://example.com/pricing')
    expect(changed).toEqual([])
  })

  it('password and expires_at go INSIDE access_control, where the data lives', () => {
    const { patch, changed } = planShortLinkUpdate(
      { id: ID, access_control: { password: 'nho-mat-khau' } },
      source()
    )
    expect(patch).toEqual({ access_control: { password: 'nho-mat-khau' } })
    expect(changed).toEqual(['password'])
  })

  it('⭐ expires_at becomes a Date, so one spelling of an instant reaches the column', () => {
    // The service normalises a `Date` with `toISOString()`; a raw string would be stored in whatever
    // offset the caller happened to write.
    const { patch } = planShortLinkUpdate(
      { id: ID, access_control: { expires_at: '2027-01-31T23:59:59+07:00' } },
      source()
    )
    expect(patch.access_control!.expires_at).toBeInstanceOf(Date)
    expect((patch.access_control!.expires_at as Date).toISOString()).toBe(
      '2027-01-31T16:59:59.000Z'
    )
  })

  it('⭐ the same instant written in another offset is NOT a change', () => {
    const { changed } = planShortLinkUpdate(
      { id: ID, access_control: { expires_at: '2027-01-31T23:59:59+07:00' } },
      source({ access_control: { expires_at: '2027-01-31T16:59:59.000Z' } })
    )
    expect(changed).toEqual([])
  })

  it('⭐ null survives as null — it is the removal signal the service turns into a drop', () => {
    const { patch, changed } = planShortLinkUpdate(
      { id: ID, access_control: { password: null, expires_at: null } },
      source({ access_control: { password: 'old', expires_at: '2027-01-01T00:00:00.000Z' } })
    )
    expect(patch.access_control).toEqual({ password: null, expires_at: null })
    expect(changed).toEqual(['password', 'expires_at'])
  })

  it('removing something that is not there changes nothing', () => {
    const { changed } = planShortLinkUpdate(
      { id: ID, access_control: { password: null, expires_at: null } },
      source({ access_control: {} })
    )
    expect(changed).toEqual([])
  })

  it('⭐ a password SET is always reported as changed, even if it matches', () => {
    // `has_password` is all any tool can read back, so "no change" would be a claim about a value
    // this code is not entitled to compare.
    const { changed } = planShortLinkUpdate(
      { id: ID, access_control: { password: 'same' } },
      source({ access_control: { password: 'same' } })
    )
    expect(changed).toEqual(['password'])
  })

  it('⭐ utm is MERGED with what is stored — the service would otherwise wipe it', () => {
    // `updateFields.utm_tags = data.utm_tags`, no merge. A patch of one parameter has to carry the
    // other four or they are gone.
    const { patch, changed } = planShortLinkUpdate(
      { id: ID, utm: { campaign: 'tet-2027' } },
      source({
        utm_tags: {
          enabled: true,
          overrideable: true,
          utm_source: 'facebook',
          utm_medium: 'qr',
          utm_campaign: 'tet-2026',
        },
      })
    )
    expect(patch.utm_tags).toEqual({
      enabled: true,
      overrideable: true,
      utm_source: 'facebook',
      utm_medium: 'qr',
      utm_campaign: 'tet-2027',
    })
    expect(changed).toEqual(['utm'])
  })

  it('maps each short name to its utm_ column and turns the block on', () => {
    const { patch } = planShortLinkUpdate(
      {
        id: ID,
        utm: { source: 'facebook', medium: 'qr', campaign: 'tet', term: 'gia', content: 'story-1' },
      },
      source()
    )
    expect(patch.utm_tags).toEqual({
      // `enabled` is not on the tool surface: the service and li2-be both key off it, so a merge
      // that left it false would store parameters nothing reads.
      enabled: true,
      overrideable: false,
      utm_source: 'facebook',
      utm_medium: 'qr',
      utm_campaign: 'tet',
      utm_term: 'gia',
      utm_content: 'story-1',
    })
  })

  it('⛔ refuses a UTM patch that would leave the link with no source', () => {
    // Parameters without a source are INERT — li2-be appends nothing — so accepting this would have
    // the model report a tracking change that never shows up in any report. `field_invalid` is the
    // key whose refusal sentence names the UTM source.
    expect(() => planShortLinkUpdate({ id: ID, utm: { medium: 'qr' } }, source())).toThrow()
    try {
      planShortLinkUpdate({ id: ID, utm: { medium: 'qr' } }, source())
    } catch (error) {
      expect((error as { i18nMessage?: { key?: string } }).i18nMessage?.key).toBe(
        'common:messages.error.field_invalid'
      )
    }
    // …but a patch on a link that ALREADY has a source is fine, which is why the check is on the
    // MERGED block rather than on the arguments.
    expect(() =>
      planShortLinkUpdate(
        { id: ID, utm: { medium: 'qr' } },
        source({ utm_tags: { utm_source: 'f' } })
      )
    ).not.toThrow()
  })

  it('re-sending the UTM block a link already has is not a change', () => {
    const { changed } = planShortLinkUpdate(
      { id: ID, utm: { source: 'facebook' } },
      source({ utm_tags: { enabled: true, overrideable: false, utm_source: 'facebook' } })
    )
    expect(changed).toEqual([])
  })

  it('⛔ changed carries TOOL field names, never column names', () => {
    const { changed } = planShortLinkUpdate(
      {
        id: ID,
        destination_url: 'https://example.com/new',
        utm: { source: 'facebook' },
        access_control: { expires_at: '2027-01-31T23:59:59Z' },
      },
      source()
    )
    // A model that read `content_value` or `utm_tags` here would learn a word no argument accepts.
    expect(changed).toEqual(['destination_url', 'utm', 'expires_at'])
  })
})
