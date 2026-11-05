/**
 * `core/mcp/artifact-refusals.ts` — the ten approved sentences (spec artifact-wave3-mcp-publish R8c),
 * one test per row, plus the two properties that make the body read safe: the mapper never reads
 * `message`, and anything it does not recognise is `null` (→ the old status bucket).
 */
import { describe, it, expect } from 'vitest'
import {
  artifactRefusalFor,
  fmtMb,
  isAlreadyRemovedDelete,
  isArtifactTool,
} from '@/core/mcp/artifact-refusals'
import { McpToolError } from '@/core/mcp/errors'

const MB = 1048576

const body = (key: string, params?: Record<string, unknown>) => ({
  error: true,
  message: 'SECRET upstream text that must never cross',
  i18nMessage: { key, params },
})

describe('fmtMb', () => {
  it('formats binary megabytes with one decimal', () => {
    expect(fmtMb(12.4 * MB)).toBe('12.4 MB')
    expect(fmtMb(4 * MB)).toBe('4.0 MB')
    expect(fmtMb(0)).toBe('0.0 MB')
  })
})

describe('isArtifactTool', () => {
  it('is true for exactly the seven artifact tools', () => {
    // It decides whether `call-tool.ts` READS the 4xx body at all, so it is the fence around the one
    // controlled widening of "never forward upstream bodies". Every non-artifact tool stays outside.
    for (const name of [
      'publish_artifact',
      'update_artifact',
      'get_artifact',
      'list_artifacts',
      'delete_artifact',
      // Wave 4 WP2 — both need the body: every refusal they can produce is a status whose bucket
      // points at the wrong fix.
      'set_artifact_access',
      'set_artifact_slug',
    ])
      expect(isArtifactTool(name), name).toBe(true)

    expect(isArtifactTool('create_short_link')).toBe(false)
    expect(isArtifactTool('get_org_overview')).toBe(false)
    expect(isArtifactTool('list_orgs')).toBe(false)
  })
})

describe('artifactRefusalFor — the ten sentences', () => {
  it('1 · 403 quota_live (publish) — byte-exact, says Nothing was created', () => {
    const err = artifactRefusalFor('publish_artifact', 403, body('artifact:errors.quota_live', { limit: 3 }))!
    expect(McpToolError.is(err)).toBe(true)
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toBe(
      'This organization already has 3 published artifacts, which is the maximum on its plan. Delete one in the li2 dashboard, then call this tool again. Nothing was created — there is no draft to clean up.'
    )
  })

  it('2a · 400/413 file over limit with size_bytes — "after decoding"', () => {
    for (const status of [400, 413]) {
      const err = artifactRefusalFor(
        'publish_artifact',
        status,
        body('common:messages.error.field_exceed_limit', {
          field: '$t(label.file)',
          limit: 10,
          size_bytes: 12.4 * MB,
        })
      )!
      expect(err.reason).toBe('rejected')
      expect(err.clientMessage).toBe(
        'The HTML is 12.4 MB after decoding; the limit is 10 MB per file. Nothing was uploaded.'
      )
    }
  })

  it('2b · 413 layer 0 with declared_bytes only — "request body is"', () => {
    const err = artifactRefusalFor(
      'update_artifact',
      413,
      body('common:messages.error.field_exceed_limit', {
        field: '$t(label.file)',
        limit: 10,
        declared_bytes: 12 * MB,
      })
    )!
    expect(err.clientMessage).toBe(
      'The request body is 12.0 MB; the limit is 10 MB of HTML per file. Nothing was uploaded.'
    )
  })

  it('3 · 403 storage quota on PUBLISH — used / needs', () => {
    const err = artifactRefusalFor(
      'publish_artifact',
      403,
      body('common:messages.error.field_exceed_limit', {
        field: '$t(label.storage)',
        limit: 30,
        used_bytes: 28.3 * MB,
        need_bytes: 4 * MB,
        free_bytes: 1.7 * MB,
      })
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toBe(
      'This organization has used 28.3 MB of 30 MB. This file needs 4.0 MB. Delete an artifact in the li2 dashboard to free space.'
    )
  })

  it('4 · 403 storage quota on UPDATE — delta / free, content unchanged', () => {
    const err = artifactRefusalFor(
      'update_artifact',
      403,
      body('common:messages.error.field_exceed_limit', {
        field: '$t(label.storage)',
        limit: 30,
        used_bytes: 26 * MB,
        need_bytes: 2.5 * MB,
        free_bytes: 1 * MB,
      })
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toBe(
      'Replacing this file needs 2.5 MB more than the file it replaces, and only 1.0 MB is free. The current content is unchanged.'
    )
  })

  it('5 · 400 html_empty — both tools', () => {
    for (const tool of ['publish_artifact', 'update_artifact']) {
      const err = artifactRefusalFor(tool, 400, body('agent:artifact.html_empty'))!
      expect(err.reason).toBe('rejected')
      expect(err.clientMessage).toBe('The html field is empty.')
    }
  })

  it('6 · org not entitled is refused BEFORE the hop — not this mapper\'s row (documented, no mapping)', () => {
    // `orgNotEntitled()` in errors.ts; nothing for the mapper to do. Pinned so the row count stays 10.
    expect(artifactRefusalFor('publish_artifact', 403, body('plan:not_entitled'))).toBeNull()
  })

  it('7 · 404 not_found on update — no "belongs to another org"', () => {
    const err = artifactRefusalFor(
      'update_artifact',
      404,
      body('common:messages.error.not_found', { field: '$t(label.artifact)' })
    )!
    expect(err.reason).toBe('not_found')
    expect(err.clientMessage).toBe('No artifact with that id in this organization.')
    expect(err.clientMessage).not.toMatch(/another org/i)
  })

  it('8 · 404 removed on update — taken down, publish a new one', () => {
    const err = artifactRefusalFor('update_artifact', 404, body('artifact:errors.removed'))!
    expect(err.reason).toBe('not_found')
    expect(err.clientMessage).toBe(
      'That artifact has been taken down and cannot be updated. Publish a new one.'
    )
  })

  it('9 · rate limit is refused BEFORE the hop — not this mapper\'s row (documented, no mapping)', () => {
    expect(artifactRefusalFor('publish_artifact', 429, body('rate_limited'))).toBeNull()
  })

  it('10 · 409 status_refuses on update — held by Li2, content unchanged', () => {
    const err = artifactRefusalFor('update_artifact', 409, body('artifact:update.status_refuses'))!
    expect(err.reason).toBe('conflict')
    expect(err.clientMessage).toBe(
      'That artifact is being held by Li2 (blocked, quarantined, expired or still scanning) and cannot be updated right now. Check it in the li2 dashboard. The current content is unchanged.'
    )
  })
})

describe('artifactRefusalFor — what it refuses to map', () => {
  it('never reads message: every produced sentence is free of upstream text', () => {
    const rows: [string, number, ReturnType<typeof body>][] = [
      ['publish_artifact', 403, body('artifact:errors.quota_live', { limit: 3 })],
      ['update_artifact', 404, body('artifact:errors.removed')],
      ['update_artifact', 409, body('artifact:update.status_refuses')],
      ['publish_artifact', 400, body('agent:artifact.html_empty')],
    ]
    for (const [tool, status, b] of rows) {
      const err = artifactRefusalFor(tool, status, b)!
      expect(err.clientMessage).not.toContain('SECRET')
    }
  })

  it('returns null for the other tools, whatever the body', () => {
    expect(
      artifactRefusalFor('create_short_link', 403, body('artifact:errors.quota_live', { limit: 3 }))
    ).toBeNull()
  })

  it('returns null for an unknown key, a missing i18nMessage, a non-object body, or no body', () => {
    expect(artifactRefusalFor('publish_artifact', 409, body('common:messages.error.slug_is_taken'))).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 400, { error: true, message: 'x' })).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 400, 'a string')).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 400, null)).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 400, { i18nMessage: { key: 42 } })).toBeNull()
  })

  it('returns null when the status does not match the key — the bucket stays authoritative', () => {
    expect(artifactRefusalFor('publish_artifact', 400, body('artifact:errors.quota_live', { limit: 3 }))).toBeNull()
    expect(artifactRefusalFor('update_artifact', 403, body('artifact:errors.removed'))).toBeNull()
    expect(artifactRefusalFor('update_artifact', 404, body('artifact:update.status_refuses'))).toBeNull()
  })

  it('returns null for update-only rows on publish and the publish-only row on update', () => {
    expect(artifactRefusalFor('publish_artifact', 404, body('common:messages.error.not_found'))).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 404, body('artifact:errors.removed'))).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 409, body('artifact:update.status_refuses'))).toBeNull()
    expect(artifactRefusalFor('update_artifact', 403, body('artifact:errors.quota_live', { limit: 3 }))).toBeNull()
  })

  it('returns null when the numbers a sentence needs are missing or not numbers', () => {
    const storage = (params: Record<string, unknown>) =>
      body('common:messages.error.field_exceed_limit', { field: '$t(label.storage)', limit: 30, ...params })
    expect(artifactRefusalFor('publish_artifact', 403, storage({}))).toBeNull()
    expect(artifactRefusalFor('publish_artifact', 403, storage({ used_bytes: '28', need_bytes: 1 }))).toBeNull()
    expect(artifactRefusalFor('update_artifact', 403, storage({ need_bytes: 1 }))).toBeNull()

    const file = body('common:messages.error.field_exceed_limit', { field: '$t(label.file)', limit: 10 })
    expect(artifactRefusalFor('publish_artifact', 400, file)).toBeNull()
  })

  it('returns null for field_exceed_limit on a field it does not know', () => {
    expect(
      artifactRefusalFor(
        'publish_artifact',
        400,
        body('common:messages.error.field_exceed_limit', { field: '$t(label.name)', limit: 64 })
      )
    ).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP1 — the role refusal, the tool-aware not-found, and the 404 that is a SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('11 · 403 permission_error on delete — the ROLE, not the OAuth scope', () => {
  it('names the role as the cause and says nothing was deleted', () => {
    // The plain 403 bucket would read as a quota problem, which is the wrong thing for the user to
    // go and fix: `deleteForOrg` resolves DELETE_TOUCH_POINT, and the grant's binary `write` scope
    // says nothing about it.
    const err = artifactRefusalFor(
      'delete_artifact',
      403,
      body('common:messages.error.permission_error')
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toBe(
      'Your role in this organization does not include permission to delete touch points, so this artifact was not deleted. Ask an owner or admin of the organization to remove it, or to change your role.'
    )
  })

  it('is delete-only: publish 403s are the two quota rows, which carry numbers', () => {
    for (const tool of ['publish_artifact', 'update_artifact', 'get_artifact'])
      expect(
        artifactRefusalFor(tool, 403, body('common:messages.error.permission_error')),
        tool
      ).toBeNull()
    // Wrong status for the key → the bucket stays authoritative.
    expect(
      artifactRefusalFor('delete_artifact', 404, body('common:messages.error.permission_error'))
    ).toBeNull()
  })
})

describe('7 (wave 4) · 404 not_found is worded per tool', () => {
  it('get_artifact mentions slug too, and that a tombstone reads the same way', () => {
    // It is the only tool that can be given a slug, and a user who asks "why can I not read it" is
    // told the two possibilities without being told which — "it exists but in another org" is an
    // oracle we do not hand out.
    const err = artifactRefusalFor('get_artifact', 404, body('common:messages.error.not_found'))!
    expect(err.reason).toBe('not_found')
    expect(err.clientMessage).toMatch(/artifact_id or slug/)
    expect(err.clientMessage).toContain('list_artifacts')
    expect(err.clientMessage).not.toMatch(/another org/i)
  })

  it('delete_artifact says nothing was deleted, so a model cannot report a removal', () => {
    const err = artifactRefusalFor('delete_artifact', 404, body('common:messages.error.not_found'))!
    expect(err.clientMessage).toBe(
      'No artifact with that id in this organization. Nothing was deleted.'
    )
  })
})

describe('⭐ isAlreadyRemovedDelete — the one 4xx that is not an error', () => {
  it('is true only for delete_artifact + 404 + the removed key', () => {
    expect(isAlreadyRemovedDelete('delete_artifact', 404, body('artifact:errors.removed'))).toBe(true)
  })

  it('⛔ is FALSE for a bare not_found — a typo must never read as "already deleted"', () => {
    // THE assertion behind the whole two-key change in the service. Before wave 4 `deleteForOrg`
    // threw the same `not_found` for "no such id" and "already a tombstone"; treating any 404 as
    // success here would report a completed delete for an id that never existed — including an id
    // belonging to another organization.
    expect(isAlreadyRemovedDelete('delete_artifact', 404, body('common:messages.error.not_found'))).toBe(false)
    expect(isAlreadyRemovedDelete('delete_artifact', 404, null)).toBe(false)
    expect(isAlreadyRemovedDelete('delete_artifact', 404, { error: true })).toBe(false)
  })

  it('is false for every other tool and every other status', () => {
    expect(isAlreadyRemovedDelete('update_artifact', 404, body('artifact:errors.removed'))).toBe(false)
    expect(isAlreadyRemovedDelete('get_artifact', 404, body('artifact:errors.removed'))).toBe(false)
    expect(isAlreadyRemovedDelete('delete_artifact', 403, body('artifact:errors.removed'))).toBe(false)
    expect(isAlreadyRemovedDelete('delete_artifact', 410, body('artifact:errors.removed'))).toBe(false)
  })

  it('and the refusal mapper leaves that same pair alone — no "cannot be updated" for a delete', () => {
    // Belt and braces against a reordering in `call-tool.ts`: if the success check ever moved after
    // the mapper, a completed delete would come back as the UPDATE tool's sentence.
    expect(artifactRefusalFor('delete_artifact', 404, body('artifact:errors.removed'))).toBeNull()
  })
})

/**
 * WP3 — the three answers `publish_artifact.idempotency_key` adds. All three exist because the plain
 * status bucket points the model at the wrong fix, and in two of the three the wrong fix is "mint a
 * new key", which is precisely how the duplicate publish happens.
 */
describe('idempotency refusals (WP3)', () => {
  const IN_PROGRESS = 'agent:artifact.idem_in_progress'
  const UNAVAILABLE = 'agent:artifact.idem_unavailable'
  const GONE = 'agent:artifact.idem_artifact_gone'

  it('409 in-progress → wait and retry with the SAME key, never a new one', () => {
    const error = artifactRefusalFor('publish_artifact', 409, body(IN_PROGRESS))

    expect(error).toBeInstanceOf(McpToolError)
    expect(error!.reason).toBe('conflict')
    expect(error!.clientMessage).toMatch(/retry in a few seconds/i)
    expect(error!.clientMessage).toMatch(/SAME key/)
    // ⛔ The generic 409 would have said "a slug already in use is the usual cause. Try a different
    // value" — which would have the model change the one thing that is not wrong.
    expect(error!.clientMessage).not.toMatch(/slug/i)
    expect(error!.clientMessage).not.toContain('SECRET')
  })

  it('503 store unavailable → nothing was created, and do NOT retry without the key', () => {
    const error = artifactRefusalFor('publish_artifact', 503, body(UNAVAILABLE))

    expect(error!.reason).toBe('upstream_unavailable')
    expect(error!.clientMessage).toMatch(/nothing was created/i)
    expect(error!.clientMessage).toMatch(/same key/i)
    // The sentence has to forbid the "workaround" explicitly: dropping the key makes the call
    // succeed and makes the duplicate.
    expect(error!.clientMessage).toMatch(/without the key/i)
  })

  it('404 the replayed artifact was deleted → publish under a NEW key, not under this one', () => {
    const error = artifactRefusalFor('publish_artifact', 404, body(GONE))

    expect(error!.reason).toBe('not_found')
    expect(error!.clientMessage).toMatch(/taken down/i)
    expect(error!.clientMessage).toMatch(/new idempotency_key/i)
    expect(error!.clientMessage).toMatch(/nothing was published/i)
  })

  it.each([
    ['update_artifact', 409, IN_PROGRESS],
    ['delete_artifact', 409, IN_PROGRESS],
    ['update_artifact', 503, UNAVAILABLE],
    ['set_artifact_slug', 404, GONE],
  ])('%s never gets these sentences — only publish takes a key', (tool, status, key) => {
    expect(artifactRefusalFor(tool, status, body(key))).toBeNull()
  })

  it.each([
    [404, IN_PROGRESS],
    [409, UNAVAILABLE],
    [409, GONE],
    [500, UNAVAILABLE],
  ])('status %i with the wrong key → null, so the status bucket runs unchanged', (status, key) => {
    expect(artifactRefusalFor('publish_artifact', status, body(key))).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP2 — set_artifact_access / set_artifact_slug
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('set_artifact_access refusals (WP2)', () => {
  const PASSWORD_FIELD = { field: '$t(label.password)' }

  it('15 · 400 field_required password → names the 8-128 rule the schema does not carry', () => {
    const err = artifactRefusalFor(
      'set_artifact_access',
      400,
      body('common:messages.error.field_required', PASSWORD_FIELD)
    )!
    expect(McpToolError.is(err)).toBe(true)
    expect(err.reason).toBe('rejected')
    expect(err.clientMessage).toContain('8 to 128')
    // Says what did NOT happen: a model that reports "locked" after this would be lying to the user.
    expect(err.clientMessage).toMatch(/nothing changed/i)
    expect(err.clientMessage).not.toContain('SECRET')
  })

  it('16 · 400 field_invalid password → the range again, and nothing changed', () => {
    const err = artifactRefusalFor(
      'set_artifact_access',
      400,
      body('common:messages.error.field_invalid', PASSWORD_FIELD)
    )!
    expect(err.reason).toBe('rejected')
    expect(err.clientMessage).toContain('8 to 128')
    expect(err.clientMessage).toMatch(/nothing changed/i)
  })

  it('17 · 400 field_invalid access_mode → the mode is off on THIS server, use password', () => {
    // `google` is in the enum a client validates against, so this 400 is not something a model can
    // predict from the schema — the sentence has to explain that it is a server-side switch.
    const err = artifactRefusalFor(
      'set_artifact_access',
      400,
      body('common:messages.error.field_invalid', { field: 'access_mode' })
    )!
    expect(err.reason).toBe('rejected')
    expect(err.clientMessage).toMatch(/turned off on this Li2 server/i)
    expect(err.clientMessage).toMatch(/"password" or "private"/)
  })

  it('18 · 409 access.conflict → call get_artifact and retry, not retry blindly', () => {
    const err = artifactRefusalFor('set_artifact_access', 409, body('artifact:access.conflict'))!
    expect(err.reason).toBe('conflict')
    expect(err.clientMessage).toMatch(/changed by someone else/i)
    expect(err.clientMessage).toContain('get_artifact')
    expect(err.clientMessage).toMatch(/nothing was written/i)
  })

  it('19 · 403 permission_error → the ROLE, and it names add_touch_point, not delete', () => {
    const err = artifactRefusalFor(
      'set_artifact_access',
      403,
      body('common:messages.error.permission_error')
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toMatch(/change a touch point/i)
    expect(err.clientMessage).toMatch(/was NOT changed/)
    // ⛔ Not the delete sentence: `setAccess` resolves `add_touch_point`, and telling a user to get
    // delete permission would be the wrong thing to ask an admin for.
    expect(err.clientMessage).not.toMatch(/delete/i)
  })

  it('20 · 409 status_refuses → held by Li2, and NOT the update sentence', () => {
    const err = artifactRefusalFor(
      'set_artifact_access',
      409,
      body('artifact:update.status_refuses')
    )!
    expect(err.reason).toBe('conflict')
    expect(err.clientMessage).toMatch(/being held by Li2/i)
    expect(err.clientMessage).toMatch(/who can open it/i)
    // The wave-3 wording talks about content; this tool never touches content.
    expect(err.clientMessage).not.toMatch(/content is unchanged/i)
  })

  it('21 · 404 removed → nothing about it can be CHANGED (not "updated")', () => {
    const err = artifactRefusalFor('set_artifact_access', 404, body('artifact:errors.removed'))!
    expect(err.reason).toBe('not_found')
    expect(err.clientMessage).toMatch(/taken down/i)
    expect(err.clientMessage).toMatch(/can be changed/i)
  })

  it('404 not_found → the shared "no artifact with that id" sentence, no org oracle', () => {
    const err = artifactRefusalFor('set_artifact_access', 404, body('common:messages.error.not_found'))!
    expect(err.reason).toBe('not_found')
    expect(err.clientMessage).toBe('No artifact with that id in this organization.')
    expect(err.clientMessage).not.toMatch(/another organization/i)
  })
})

describe('set_artifact_slug refusals (WP2)', () => {
  it('22 · 400 slug_is_taken → the old link keeps working, suggest another ending', () => {
    const err = artifactRefusalFor(
      'set_artifact_slug',
      400,
      body('common:messages.error.slug_is_taken')
    )!
    expect(err.reason).toBe('rejected')
    expect(err.clientMessage).toMatch(/already in use/i)
    expect(err.clientMessage).toMatch(/keeps working/i)
    // ⛔ No hint about WHOSE it is: the `slugs` unique index is global across organizations.
    expect(err.clientMessage).not.toMatch(/organization owns|another organization/i)
  })

  it('23 · 403 the plan cap on slugs per touch point → explains WHY old slugs count', () => {
    const err = artifactRefusalFor(
      'set_artifact_slug',
      403,
      body('common:messages.error.plan_errors.max_slugs_per_tp')
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toMatch(/as many times as the organization's plan allows/i)
    expect(err.clientMessage).toMatch(/kept alive/i)
    expect(err.clientMessage).toMatch(/keeps working/i)
  })

  it('⭐ 24 · 409 status_refuses → "it is a DRAFT, publish it first", not "held by Li2"', () => {
    // THE sentence that makes this tool usable. `changeSlug` throws the same key for a draft as
    // `replaceContent` throws for a blocked artifact, and the wave-3 wording would send a model to
    // the dashboard to appeal a block that does not exist.
    const err = artifactRefusalFor('set_artifact_slug', 409, body('artifact:update.status_refuses'))!
    expect(err.reason).toBe('conflict')
    expect(err.clientMessage).toMatch(/not published/i)
    expect(err.clientMessage).toMatch(/publish it first/i)
    expect(err.clientMessage).toMatch(/no short link or QR/i)
  })

  it('25 · 403 permission_error → the link was NOT renamed, ask an admin', () => {
    const err = artifactRefusalFor(
      'set_artifact_slug',
      403,
      body('common:messages.error.permission_error')
    )!
    expect(err.reason).toBe('forbidden')
    expect(err.clientMessage).toMatch(/NOT renamed/)
    expect(err.clientMessage).toMatch(/keeps working/i)
    expect(err.clientMessage).not.toMatch(/delete/i)
  })

  it('404 removed / not_found keep their shared sentences', () => {
    expect(
      artifactRefusalFor('set_artifact_slug', 404, body('artifact:errors.removed'))!.clientMessage
    ).toMatch(/can be changed/i)
    expect(
      artifactRefusalFor('set_artifact_slug', 404, body('common:messages.error.not_found'))!
        .clientMessage
    ).toBe('No artifact with that id in this organization.')
  })
})

describe('the WP2 rows do not bleed across tools or statuses', () => {
  it.each([
    // A key that belongs to the OTHER setter.
    ['set_artifact_access', 400, 'common:messages.error.slug_is_taken'],
    ['set_artifact_access', 403, 'common:messages.error.plan_errors.max_slugs_per_tp'],
    ['set_artifact_slug', 400, 'common:messages.error.field_required'],
    ['set_artifact_slug', 409, 'artifact:access.conflict'],
    // Keys that belong to publish/update only.
    ['set_artifact_access', 403, 'artifact:errors.quota_live'],
    ['set_artifact_slug', 400, 'agent:artifact.html_empty'],
    // The read tools still map nothing.
    ['get_artifact', 400, 'common:messages.error.field_required'],
    ['list_artifacts', 409, 'artifact:access.conflict'],
    // A tool outside the artifact family never even reaches the table.
    ['create_short_link', 400, 'common:messages.error.slug_is_taken'],
  ])('%s + %i + %s → null (the status bucket runs unchanged)', (tool, status, key) => {
    expect(artifactRefusalFor(tool, status, body(key))).toBeNull()
  })

  it.each([
    ['set_artifact_access', 403, 'common:messages.error.field_invalid'],
    ['set_artifact_access', 400, 'artifact:access.conflict'],
    ['set_artifact_slug', 409, 'common:messages.error.slug_is_taken'],
    ['set_artifact_slug', 500, 'artifact:update.status_refuses'],
  ])('%s with the wrong STATUS for its key → %i null', (tool, status, key) => {
    // `slug_is_taken` at 409 is the one exception, kept because `touch-point.service.ts` raises the
    // same key from two places and only one of them is a 400 today.
    const result = artifactRefusalFor(tool, status, body(key))
    if (tool === 'set_artifact_slug' && status === 409) expect(result).not.toBeNull()
    else expect(result).toBeNull()
  })

  it('a field it does not recognise on a key it does → null, never a wrong sentence', () => {
    expect(
      artifactRefusalFor(
        'set_artifact_access',
        400,
        body('common:messages.error.field_invalid', { field: 'slug' })
      )
    ).toBeNull()
    expect(
      artifactRefusalFor('set_artifact_access', 400, body('common:messages.error.field_required', {
        field: '$t(label.file)',
      }))
    ).toBeNull()
  })
})

/**
 * WP3 của `docs/artifact-scan-clamav-spec.md`: `artifact:errors.status_refuses_publish` — publish bị
 * chính status của hàng từ chối.
 *
 * KHOÁ RIÊNG, không dùng lại `artifact:update.status_refuses`, và đây là chỗ test giữ ranh giới đó:
 * ba tool đã chia nhau khoá cũ với ba nghĩa khác nhau, và câu của nó nói về "thay nội dung" — sai
 * hẳn cho một publish chưa từng có nội dung đang chạy.
 */
describe('WP3 · 409 status_refuses_publish — Li2 đang giữ hàng, publish không xảy ra', () => {
  const KEY = 'artifact:errors.status_refuses_publish'

  it('publish_artifact + 409 → conflict, câu nói rõ KHÔNG được thử lại', () => {
    const err = artifactRefusalFor('publish_artifact', 409, body(KEY))!
    expect(err).toBeInstanceOf(McpToolError)
    expect(err.reason).toBe('conflict')
    expect(err.clientMessage).toBe(
      'Li2 is holding that artifact (blocked, quarantined, expired, or taken down), so it was NOT ' +
        'published and nothing is serving at a public address. Do not retry — the hold refuses the ' +
        'same way every time. Check the artifact in the li2 dashboard; if it was quarantined, the ' +
        'content itself is what has to change.'
    )
  })

  it('không bao giờ là câu của update — hai khoá, hai hành động', () => {
    const publish = artifactRefusalFor('publish_artifact', 409, body(KEY))!
    const update = artifactRefusalFor('update_artifact', 409, body('artifact:update.status_refuses'))!
    expect(publish.clientMessage).not.toBe(update.clientMessage)
    expect(publish.clientMessage).not.toContain('content is unchanged')
  })

  it('không đọc message của upstream', () => {
    expect(artifactRefusalFor('publish_artifact', 409, body(KEY))!.clientMessage).not.toContain(
      'SECRET'
    )
  })

  it.each([
    // Chỉ `publish()` ném khoá này; mọi tool khác phải rơi về status bucket.
    ['update_artifact', 409],
    ['set_artifact_slug', 409],
    ['set_artifact_access', 409],
    ['delete_artifact', 409],
    ['get_artifact', 409],
    ['list_artifacts', 409],
    ['create_short_link', 409],
    // Đúng tool, sai status.
    ['publish_artifact', 403],
    ['publish_artifact', 404],
    ['publish_artifact', 400],
    ['publish_artifact', 500],
  ])('%s + %i + status_refuses_publish → null', (tool, status) => {
    expect(artifactRefusalFor(tool, status, body(KEY))).toBeNull()
  })
})


/**
 * `artifact:errors.scan_encrypted` — tập tin có mật khẩu nên không mở ra kiểm tra được.
 *
 * CÙNG STATUS 400 VỚI `scan_infected`, NÊN CHỈ CÒN KHOÁ PHÂN BIỆT — và hai câu dẫn tới hai hành động
 * trái nhau: `scan_infected` nói "đừng thử lại, gọi support", còn khoá này có cách sửa cụ thể là xin
 * bản không đặt mật khẩu. Map lẫn nhau là tốn một vòng và nói oan cho một tài liệu hợp lệ.
 */
describe('28 · 400 scan_encrypted — tập tin có mật khẩu, không phải mã độc', () => {
  const KEY = 'artifact:errors.scan_encrypted'

  it.each(['publish_artifact', 'update_artifact'])('%s + 400 → rejected', (tool) => {
    const err = artifactRefusalFor(tool, 400, body(KEY))!
    expect(err).toBeInstanceOf(McpToolError)
    expect(err.reason).toBe('rejected')
    expect(err.clientMessage).toBe(
      'That file is protected by a password, so Li2 could not open it to run its safety check and ' +
        'refused it — nothing was uploaded. This does NOT mean the file is unsafe. Ask the user ' +
        'for a copy of the same document saved WITHOUT a password and send that instead. Do not ' +
        'retry the same file and do not try to remove the password yourself.'
    )
  })

  it('không gọi tập tin là mã độc, và không nhắc tên heuristic', () => {
    const message = artifactRefusalFor('publish_artifact', 400, body(KEY))!.clientMessage
    expect(message).not.toMatch(/malware|virus|infected/i)
    expect(message).not.toContain('Heuristics')
  })

  it('khác hẳn câu của scan_infected — hai khoá, hai hành động', () => {
    const encrypted = artifactRefusalFor('publish_artifact', 400, body(KEY))!
    const infected = artifactRefusalFor(
      'publish_artifact',
      400,
      body('artifact:errors.scan_infected')
    )!
    expect(encrypted.clientMessage).not.toBe(infected.clientMessage)
    // Câu của `scan_infected` đẩy người dùng sang support; câu này có cách sửa ngay.
    expect(encrypted.clientMessage).not.toContain('contact Li2 support')
    expect(infected.clientMessage).toMatch(/malware/i)
  })

  it('không đọc message của upstream', () => {
    expect(artifactRefusalFor('update_artifact', 400, body(KEY))!.clientMessage).not.toContain(
      'SECRET'
    )
  })

  it.each([
    // Chỉ hai tool ghi mới chạy qua cổng quét.
    ['set_artifact_slug', 400],
    ['set_artifact_access', 400],
    ['delete_artifact', 400],
    ['get_artifact', 400],
    ['list_artifacts', 400],
    ['create_short_link', 400],
    // Đúng tool, sai status: 503 là `scan_unavailable`, không phải khoá này.
    ['publish_artifact', 503],
    ['publish_artifact', 403],
    ['update_artifact', 409],
  ])('%s + %i + scan_encrypted → null', (tool, status) => {
    expect(artifactRefusalFor(tool, status, body(KEY))).toBeNull()
  })
})
