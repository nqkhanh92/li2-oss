/**
 * Zod contract of the two MCP-only artifact tools (spec artifact-wave3-mcp-publish R2). The JSON Schema
 * in `core/mcp/tools.ts` is GENERATED from these, so what is pinned here is what every MCP client sees.
 */
import { describe, it, expect } from 'vitest'
import {
  deleteArtifactInputSchema,
  getArtifactInputSchema,
  listArtifactsInputSchema,
  publishArtifactInputSchema,
  setArtifactAccessInputSchema,
  setArtifactSlugInputSchema,
  updateArtifactInputSchema,
} from '../../../shared/schemas/agent-tools'
import { ARTIFACT_ACCESS_MODES } from '../../../core/types/artifact.type'

const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const UUID = '33333333-3333-4333-8333-333333333333'
const HTML = '<!doctype html><h1>v1</h1>'

describe('publishArtifactInputSchema', () => {
  it('accepts the minimal shape and trims name', () => {
    const r = publishArtifactInputSchema.safeParse({ name: '  Bảng giá ', html: HTML })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ name: 'Bảng giá', html: HTML })
  })

  it('.strict(): a leftover org_id is rejected — the only thing that makes the MCP strip testable', () => {
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, org_id: ORG }).success).toBe(false)
  })

  it('name is required, 1..64 characters', () => {
    expect(publishArtifactInputSchema.safeParse({ html: HTML }).success).toBe(false)
    expect(publishArtifactInputSchema.safeParse({ name: '   ', html: HTML }).success).toBe(false)
    expect(publishArtifactInputSchema.safeParse({ name: 'a'.repeat(64), html: HTML }).success).toBe(true)
    expect(publishArtifactInputSchema.safeParse({ name: 'a'.repeat(65), html: HTML }).success).toBe(false)
  })

  it('html "" fails (minLength 1) — the byte cap itself is NOT here, it is a service check', () => {
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: '' }).success).toBe(false)
    // Characters, not bytes: a 10 MB-character page passes Zod; the route measures UTF-8 bytes.
    const big = 'x'.repeat(10 * 1024 * 1024 + 1)
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: big }).success).toBe(true)
  })

  it('slug: "" → undefined, otherwise the shared slug rules (6-64, lowercase, hyphens, no f- prefix)', () => {
    const empty = publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, slug: '' })
    expect(empty.success).toBe(true)
    if (empty.success) expect(empty.data.slug).toBeUndefined()

    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, slug: 'bang-gia-t10' }).success).toBe(true)
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, slug: 'abc' }).success).toBe(false)
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, slug: 'Bang-Gia' }).success).toBe(false)
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, slug: 'f-secret' }).success).toBe(false)
  })

  it('domain_id must be a uuid (tighter than the UI schema, so a bad id is a 400 and not a 22P02 500)', () => {
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, domain_id: UUID }).success).toBe(true)
    expect(publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, domain_id: 'li2.link' }).success).toBe(false)
  })

  it('idempotency_key is optional and absent by default — the tool is not idempotent without one', () => {
    const r = publishArtifactInputSchema.safeParse({ name: 'x', html: HTML })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.idempotency_key).toBeUndefined()
  })

  it('idempotency_key: 1..128 characters', () => {
    const parse = (idempotency_key: string) =>
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, idempotency_key }).success

    expect(parse('')).toBe(false)
    expect(parse('a')).toBe(true)
    expect(parse('a'.repeat(128))).toBe(true)
    expect(parse('a'.repeat(129))).toBe(false)
  })

  it.each([
    ['a uuid', '0b5f1e2c-9a77-4c31-8d4a-2f3b6e5c7d81'],
    ['dots, underscores, colons and hyphens', 'publish.v2_retry:bang-gia-t10'],
    ['a hex digest', 'a'.repeat(64)],
  ])('idempotency_key accepts %s', (_label, key) => {
    expect(
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, idempotency_key: key }).success
    ).toBe(true)
  })

  it.each([
    ['a space', 'publish bang gia'],
    ['a tab', 'publish\tx'],
    ['a newline', 'publish\nx'],
    ['a slash', 'publish/x'],
    ['a brace', 'publish{x}'],
    ['a hash', 'publish#x'],
    ['an accented letter', 'bảng-giá'],
    // ⚠️ NOT trimmed, refused: trimming would silently make "k" and "k " the same key, i.e. the
    // server deciding two caller-chosen identifiers are one.
    ['a trailing space', 'publish-x '],
  ])('idempotency_key rejects %s', (_label, key) => {
    expect(
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, idempotency_key: key }).success
    ).toBe(false)
  })

  it('⭐ takes access as a NESTED block, never a flat access_mode (wave 4 WP2)', () => {
    // The flat spelling was never part of the contract and `.strict()` keeps it that way: a model
    // that guesses `access_mode` gets a 400 rather than a silently public page, which is the one
    // failure mode that matters here.
    expect(
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, access_mode: 'private' }).success
    ).toBe(false)
    expect(
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, password: 'hunter22' }).success
    ).toBe(false)
    expect(
      publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, access: { mode: 'private' } })
        .success
    ).toBe(true)
  })
})

describe('updateArtifactInputSchema', () => {
  it('accepts { artifact_id uuid, html }', () => {
    expect(updateArtifactInputSchema.safeParse({ artifact_id: UUID, html: HTML }).success).toBe(true)
  })

  it('rejects a non-uuid artifact_id, a missing html, html "", org_id and name', () => {
    expect(updateArtifactInputSchema.safeParse({ artifact_id: 'abc', html: HTML }).success).toBe(false)
    expect(updateArtifactInputSchema.safeParse({ artifact_id: UUID }).success).toBe(false)
    expect(updateArtifactInputSchema.safeParse({ artifact_id: UUID, html: '' }).success).toBe(false)
    expect(updateArtifactInputSchema.safeParse({ artifact_id: UUID, html: HTML, org_id: ORG }).success).toBe(false)
    expect(updateArtifactInputSchema.safeParse({ artifact_id: UUID, html: HTML, name: 'n' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP1 — get / list / delete
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('getArtifactInputSchema', () => {
  it('⭐ accepts EXACTLY ONE of artifact_id / slug — neither and both are rejected', () => {
    // The `.refine` is the whole contract of this schema, and it is also the one rule JSON Schema
    // cannot carry: the tool advertises both keys optional and the route re-parses here. "Both" has
    // to fail as loudly as "neither" — silently preferring one would make the other argument a
    // no-op the model never learns about.
    expect(getArtifactInputSchema.safeParse({ artifact_id: UUID }).success).toBe(true)
    expect(getArtifactInputSchema.safeParse({ slug: 'bang-gia-t10' }).success).toBe(true)
    expect(getArtifactInputSchema.safeParse({}).success).toBe(false)
    expect(getArtifactInputSchema.safeParse({ artifact_id: UUID, slug: 'bang-gia' }).success).toBe(false)
  })

  it('artifact_id must be a uuid, so a bad id is a 400 and not a 22P02 500', () => {
    expect(getArtifactInputSchema.safeParse({ artifact_id: 'abc' }).success).toBe(false)
  })

  it('slug is LOOSE on purpose — a lookup is not a creation', () => {
    // `slugSchema` describes a slug a user may CREATE (6-64 chars, no `f-` prefix). What is looked up
    // here is whatever the `slugs` table already holds: auto short codes are shorter, and an older
    // slug the artifact was renamed away from still resolves. Validating a LOOKUP against the
    // creation rules would refuse ids that genuinely work.
    expect(getArtifactInputSchema.safeParse({ slug: '6LBCU' }).success).toBe(true)
    expect(getArtifactInputSchema.safeParse({ slug: 'f-secret' }).success).toBe(true)
    expect(getArtifactInputSchema.safeParse({ slug: 'Bang-Gia' }).success).toBe(true)
    // Still bounded: empty is not a lookup, and 255 is the column's reach.
    expect(getArtifactInputSchema.safeParse({ slug: '' }).success).toBe(false)
    expect(getArtifactInputSchema.safeParse({ slug: '  ' }).success).toBe(false)
    expect(getArtifactInputSchema.safeParse({ slug: 'a'.repeat(256) }).success).toBe(false)
  })

  it('.strict(): a leftover org_id is rejected — what makes the MCP strip testable', () => {
    expect(getArtifactInputSchema.safeParse({ artifact_id: UUID, org_id: ORG }).success).toBe(false)
  })
})

describe('listArtifactsInputSchema', () => {
  it('defaults limit to 20 and caps it at 50', () => {
    const empty = listArtifactsInputSchema.safeParse({})
    expect(empty.success).toBe(true)
    if (empty.success) expect(empty.data).toEqual({ limit: 20 })

    expect(listArtifactsInputSchema.safeParse({ limit: 50 }).success).toBe(true)
    expect(listArtifactsInputSchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(listArtifactsInputSchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(listArtifactsInputSchema.safeParse({ limit: 2.5 }).success).toBe(false)
  })

  it('coerces a limit that arrived as a query string — the hop is GET', () => {
    // `call-tool.ts` stringifies every forwarded value, so without `z.coerce` every explicit limit
    // would be a 400 and only the default would ever work.
    const parsed = listArtifactsInputSchema.safeParse({ limit: '10' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.limit).toBe(10)
  })

  it('takes an opaque cursor, bounded, and refuses a leftover org_id', () => {
    expect(listArtifactsInputSchema.safeParse({ cursor: 'eyJwYWdlIjoyfQ' }).success).toBe(true)
    expect(listArtifactsInputSchema.safeParse({ cursor: '' }).success).toBe(false)
    expect(listArtifactsInputSchema.safeParse({ cursor: 'x'.repeat(257) }).success).toBe(false)
    expect(listArtifactsInputSchema.safeParse({ org_id: ORG }).success).toBe(false)
    expect(listArtifactsInputSchema.safeParse({ page: 2 }).success).toBe(false)
  })
})

describe('deleteArtifactInputSchema', () => {
  it('requires a uuid artifact_id and nothing else', () => {
    expect(deleteArtifactInputSchema.safeParse({ artifact_id: UUID }).success).toBe(true)
    expect(deleteArtifactInputSchema.safeParse({}).success).toBe(false)
    expect(deleteArtifactInputSchema.safeParse({ artifact_id: 'bang-gia' }).success).toBe(false)
    expect(deleteArtifactInputSchema.safeParse({ artifact_id: UUID, org_id: ORG }).success).toBe(false)
  })

  it('⛔ takes NO confirm flag — a model fills its own flags in', () => {
    // The MCP spec puts human-in-the-loop in the CLIENT; the channel is
    // `annotations.destructiveHint` plus the description, not an argument (checklist §D).
    expect(deleteArtifactInputSchema.safeParse({ artifact_id: UUID, confirm: true }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP2 — the access block, set_artifact_access, set_artifact_slug
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('publishArtifactInputSchema.access (WP2 §3)', () => {
  const withAccess = (access: unknown) =>
    publishArtifactInputSchema.safeParse({ name: 'x', html: HTML, access })

  it('is OPTIONAL, and omitting it leaves the key absent — the public default is untouched', () => {
    // The compatibility promise of WP2: a wave-3 client that never heard of `access` must parse to
    // exactly what it parsed to before, so the route takes its original branch.
    const parsed = publishArtifactInputSchema.safeParse({ name: 'x', html: HTML })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect('access' in parsed.data).toBe(false)
  })

  it('accepts the four real modes and nothing else', () => {
    for (const mode of ARTIFACT_ACCESS_MODES) {
      // `password` needs a password, but that rule is the SERVICE's (see the schema comment), so
      // structurally all four modes parse on their own.
      expect(withAccess({ mode }).success, mode).toBe(true)
    }
    expect(withAccess({ mode: 'PUBLIC' }).success).toBe(false)
    expect(withAccess({ mode: 'secret' }).success).toBe(false)
    expect(withAccess({}).success).toBe(false)
  })

  it('⭐ does NOT enforce the 8-128 password rule — that is the service, on purpose', () => {
    // Zod rejecting it would produce a bare 400 ("re-read the schema"); the service's keyed error is
    // what `artifact-refusals.ts` turns into a sentence that states the range. One authority.
    expect(withAccess({ mode: 'password', password: 'short' }).success).toBe(true)
    expect(withAccess({ mode: 'password', password: 'x'.repeat(500) }).success).toBe(true)
  })

  it('is .strict(): no extra keys inside the block', () => {
    expect(withAccess({ mode: 'password', password: 'hunter22', confirm: true }).success).toBe(false)
    expect(withAccess({ mode: 'public', access_version: 3 }).success).toBe(false)
  })
})

describe('setArtifactAccessInputSchema', () => {
  it('accepts { artifact_id, mode } and the optional password, flat', () => {
    expect(setArtifactAccessInputSchema.safeParse({ artifact_id: UUID, mode: 'public' }).success).toBe(true)
    expect(
      setArtifactAccessInputSchema.safeParse({
        artifact_id: UUID,
        mode: 'password',
        password: 'hunter22',
      }).success
    ).toBe(true)
  })

  it('requires a uuid artifact_id and a mode from the real vocabulary', () => {
    expect(setArtifactAccessInputSchema.safeParse({ mode: 'public' }).success).toBe(false)
    expect(setArtifactAccessInputSchema.safeParse({ artifact_id: 'bang-gia', mode: 'public' }).success).toBe(false)
    expect(setArtifactAccessInputSchema.safeParse({ artifact_id: UUID }).success).toBe(false)
    expect(setArtifactAccessInputSchema.safeParse({ artifact_id: UUID, mode: 'open' }).success).toBe(false)
  })

  it('.strict(): a leftover org_id, or an access_version a model invented, is a 400', () => {
    expect(
      setArtifactAccessInputSchema.safeParse({ artifact_id: UUID, mode: 'public', org_id: ORG }).success
    ).toBe(false)
    expect(
      setArtifactAccessInputSchema.safeParse({ artifact_id: UUID, mode: 'public', access_version: 2 })
        .success
    ).toBe(false)
  })

  it('leaves the password length to the service, like the nested block does', () => {
    expect(
      setArtifactAccessInputSchema.safeParse({ artifact_id: UUID, mode: 'password', password: 'abc' })
        .success
    ).toBe(true)
  })
})

describe('setArtifactSlugInputSchema', () => {
  it('accepts a slug that obeys the SHARED creation rules', () => {
    const parsed = setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'bang-gia-t10' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.slug).toBe('bang-gia-t10')
  })

  it('⭐ enforces the CREATION rules, not the loose lookup rules get_artifact uses', () => {
    // This tool writes a new row into `slugs`; `get_artifact` only looks one up. Validating a write
    // against lookup rules would let an agent mint a slug no human could create in the dashboard.
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'abc' }).success).toBe(false)
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'Bang-Gia' }).success).toBe(false)
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'f-secret' }).success).toBe(false)
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'a'.repeat(65) }).success).toBe(false)
  })

  it('⭐ rejects an EMPTY slug, which the shared schema would turn into undefined', () => {
    // For every other tool `''` means "leave the slug alone"; for this one it is a missing argument,
    // and without the `.refine` the route would be handed `undefined` for its only real parameter.
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: '' }).success).toBe(false)
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: '   ' }).success).toBe(false)
    expect(setArtifactSlugInputSchema.safeParse({ artifact_id: UUID }).success).toBe(false)
  })

  it('.strict(): a leftover org_id is a 400', () => {
    expect(
      setArtifactSlugInputSchema.safeParse({ artifact_id: UUID, slug: 'bang-gia-t10', org_id: ORG })
        .success
    ).toBe(false)
  })
})
