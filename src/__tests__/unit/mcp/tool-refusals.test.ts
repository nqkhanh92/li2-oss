/**
 * `core/mcp/tool-refusals.ts` — the short-link refusal table and the widened body-reading list (SL-0 §1).
 *
 * The property worth testing is NOT "each key returns a sentence". It is that a key returns a
 * sentence ONLY for the right tool and the right status, because the cost of a wrong mapping is a
 * confident lie: telling a user nothing was created when a link WAS, or sending a model to change a
 * slug when the destination was the problem. Every case therefore pins (tool, status, key) together,
 * and the negative cases are half the file.
 */
import { describe, it, expect } from 'vitest'

import {
  BODY_READING_TOOL_NAMES,
  isBodyReadingTool,
  isShortLinkTool,
  SHORT_LINK_TOOL_NAMES,
  shortLinkRefusalFor,
  toolRefusalFor,
} from '@/core/mcp/tool-refusals'
import { ARTIFACT_TOOL_NAMES, isArtifactTool } from '@/core/mcp/artifact-refusals'
import { MCP_TOOL_NAMES } from '@/core/mcp/tools'

const body = (key: string, params?: Record<string, unknown>) => ({
  error: true,
  message: 'some upstream prose nobody is allowed to forward',
  i18nMessage: { key, ...(params ? { params } : {}) },
})

describe('the body-reading list', () => {
  it('⭐ is exactly the artifact tools plus the short-link tools, and nothing else', () => {
    expect([...BODY_READING_TOOL_NAMES].sort()).toEqual(
      [...ARTIFACT_TOOL_NAMES, ...SHORT_LINK_TOOL_NAMES].sort()
    )
    for (const name of BODY_READING_TOOL_NAMES) expect(isBodyReadingTool(name)).toBe(true)
  })

  it('⛔ leaves the analytics and docs tools OUT — their 4xx body is never parsed', () => {
    // The narrow rule `errors.ts` states ("never forward upstream bodies") is widened only where a
    // refusal needs a cause. These five have no such refusal, and a body read for them would be a
    // body that could be forwarded by a later mistake.
    for (const name of [
      'get_org_overview',
      'get_analytics_summary',
      'get_clicks_timeseries',
      'get_top_links',
      'get_link_details',
      'list_orgs',
      'find_li2_docs',
      'get_doc_page',
    ]) {
      expect(isBodyReadingTool(name)).toBe(false)
    }
  })

  it('every name on the list is a real advertised tool', () => {
    // A typo here would silently switch body reading OFF for the tool it was meant to switch on.
    for (const name of BODY_READING_TOOL_NAMES) {
      expect(MCP_TOOL_NAMES as readonly string[]).toContain(name)
    }
  })

  it('the two membership predicates are disjoint', () => {
    for (const name of SHORT_LINK_TOOL_NAMES) expect(isArtifactTool(name)).toBe(false)
    for (const name of ARTIFACT_TOOL_NAMES) expect(isShortLinkTool(name)).toBe(false)
  })
})

describe('shortLinkRefusalFor — one case per key', () => {
  it('refuses nothing for a tool that is not a short-link tool', () => {
    expect(
      shortLinkRefusalFor('publish_artifact', 403, body('common:messages.error.permission_error'))
    ).toBeNull()
    expect(
      shortLinkRefusalFor('get_top_links', 404, body('common:messages.error.not_found'))
    ).toBeNull()
  })

  it('refuses nothing for a body with no readable i18n key', () => {
    for (const malformed of [
      null,
      undefined,
      'a string',
      42,
      {},
      { i18nMessage: {} },
      { i18nMessage: { key: 7 } },
    ]) {
      expect(shortLinkRefusalFor('create_short_link', 400, malformed)).toBeNull()
    }
  })

  it('⭐ slug_is_taken — names the slug as the thing to change, and does not blame the org', () => {
    const error = shortLinkRefusalFor(
      'create_short_link',
      400,
      body('common:messages.error.slug_is_taken')
    )!
    expect(error.reason).toBe('rejected')
    expect(error.clientMessage).toContain('already in use somewhere in Li2')
    expect(error.clientMessage).toContain('no link was created')
    // ⛔ The `slugs.slug` index is GLOBAL, so the holder may be another organization. The sentence
    // must not suggest the caller can go and free it, and must not hint at whose it is.
    expect(error.clientMessage).not.toMatch(/another organi[sz]ation|delete the/i)
    // A 409 carries the same meaning from the same mapping.
    expect(
      shortLinkRefusalFor('create_short_link', 409, body('common:messages.error.slug_is_taken'))
    ).not.toBeNull()
    // …but a 500 is not this refusal; it is our bug and must keep the status bucket.
    expect(
      shortLinkRefusalFor('create_short_link', 500, body('common:messages.error.slug_is_taken'))
    ).toBeNull()
  })

  it('plan_errors.max_slugs_per_tp — 403 only, and says the current link keeps working', () => {
    const key = 'common:messages.error.plan_errors.max_slugs_per_tp'
    const error = shortLinkRefusalFor('create_short_link', 403, body(key))!
    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).toContain('current link keeps working')
    expect(error.clientMessage).toContain('Upgrading the plan')
    expect(shortLinkRefusalFor('create_short_link', 400, body(key))).toBeNull()
  })

  it('⭐ ambiguous_link_name — sends the model to an id, not to a retry of the same name', () => {
    const error = shortLinkRefusalFor(
      'get_short_link',
      400,
      body('common:messages.error.ambiguous_link_name')
    )!
    expect(error.reason).toBe('rejected')
    expect(error.clientMessage).toContain('list_short_links')
    expect(error.clientMessage).toContain('retry with the id')
  })

  it('⭐ flagged_frozen_notice — a 403 that is neither a role nor a quota', () => {
    const error = shortLinkRefusalFor(
      'create_short_link',
      403,
      body('common:safety.flagged_frozen_notice')
    )!
    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).toContain('safety violation')
    expect(error.clientMessage).toContain('nothing was changed')
    // The plain 403 bucket blames quota; neither deleting something nor changing a role lifts this.
    expect(error.clientMessage).not.toMatch(/quota|storage/i)
  })

  it('⭐ blacklisted — tells the model that retrying the SAME url cannot work', () => {
    // The real key raised by `validateUrls`, measured in the code rather than assumed from the spec
    // (the spec said `field_invalid`).
    const error = shortLinkRefusalFor(
      'create_short_link',
      400,
      body('common:messages.error.blacklisted', { url: 'https://bad.example' })
    )!
    expect(error.reason).toBe('rejected')
    expect(error.clientMessage).toContain('blocked list')
    expect(error.clientMessage).toContain('will not work')
    // ⛔ The caller's own URL travels in `params.url`. It must not be echoed — nothing is learned
    // from it and it is the one string in the body a reader might mistake for server text.
    expect(error.clientMessage).not.toContain('bad.example')
  })

  it('⭐ a role 403 arrives under TWO keys, and both are mapped', () => {
    // `getPermissionScopeOrThrow` raises `permission_error`; `ensureCanViewTouchPoint` raises a bare
    // `ForbiddenError`, i.e. `forbidden`. Mapping only the first would leave the per-collection gate
    // — the one an agent trips most — in the "quota" bucket.
    for (const key of [
      'common:messages.error.permission_error',
      'common:messages.error.forbidden',
    ]) {
      expect(shortLinkRefusalFor('get_short_link', 403, body(key))!.reason).toBe('forbidden')
      expect(shortLinkRefusalFor('create_short_link', 403, body(key))!.reason).toBe('forbidden')
    }
  })

  it('⭐ the role sentence differs for a READ and a WRITE', () => {
    const key = 'common:messages.error.forbidden'
    const read = shortLinkRefusalFor('list_short_links', 403, body(key))!.clientMessage
    const write = shortLinkRefusalFor('create_short_link', 403, body(key))!.clientMessage

    expect(read).toContain('does not let you see this link')
    expect(read).toContain('collection')
    // "nothing was created or changed" after a refused LIST would describe an action the tool never
    // attempts — the kind of sentence a model repeats to a user as if something had been at risk.
    expect(read).not.toContain('nothing was created')
    expect(write).toContain('nothing was created or changed')
  })

  it('field_invalid — mapped as the generic rejected value, 400 only', () => {
    const key = 'common:messages.error.field_invalid'
    expect(shortLinkRefusalFor('create_short_link', 400, body(key))!.reason).toBe('rejected')
    expect(shortLinkRefusalFor('create_short_link', 403, body(key))).toBeNull()
  })

  it('⭐ not_found — answered for the lookups, NEVER for create', () => {
    const key = 'common:messages.error.not_found'
    const get = shortLinkRefusalFor('get_short_link', 404, body(key))!
    expect(get.reason).toBe('not_found')
    expect(get.clientMessage).toContain('list_short_links')
    expect(get.clientMessage).toContain('cannot be restored')
    // ⛔ Not "it belongs to another organization" — that is an existence oracle.
    expect(get.clientMessage).not.toMatch(/another organi[sz]ation/i)

    expect(shortLinkRefusalFor('list_short_links', 404, body(key))!.reason).toBe('not_found')
    // `create_short_link` looks nothing up, so a 404 from it is not this.
    expect(shortLinkRefusalFor('create_short_link', 404, body(key))).toBeNull()
    expect(shortLinkRefusalFor('get_short_link', 400, body(key))).toBeNull()
  })

  it('⭐ is_artifact — names get_artifact instead of sending the model to re-check a correct id', () => {
    const error = shortLinkRefusalFor('get_short_link', 404, body('agent:short_link.is_artifact'))!
    expect(error.reason).toBe('not_found')
    expect(error.clientMessage).toContain('get_artifact')
    expect(error.clientMessage).toContain('list_artifacts')
    // The id is RIGHT. A sentence implying otherwise costs the user the whole task.
    expect(error.clientMessage).not.toMatch(/no short link with that id|check the id/i)
  })

  describe('SL-3 — delete_short_link and the idempotency_key answers', () => {
    it('⭐ is_artifact names delete_artifact for the DELETE tool, not get_artifact', () => {
      // A model told to "read it with get_artifact" after a refused delete has been handed a tool
      // that cannot do what it was asked to do, and its next move is usually to retry this one.
      const error = shortLinkRefusalFor(
        'delete_short_link',
        404,
        body('agent:short_link.is_artifact')
      )!
      expect(error.reason).toBe('not_found')
      expect(error.clientMessage).toContain('delete_artifact')
      expect(error.clientMessage).toContain('NOTHING WAS DELETED')
      // And it says the two deletes are not equivalent, before the user agrees to anything.
      expect(error.clientMessage).toMatch(/printed QR keep working/i)
      expect(error.clientMessage).not.toContain('get_artifact')
    })

    it('⭐ a role 403 says the link was NOT deleted and still works', () => {
      // "nothing was created or changed" would be read as "the link is gone"; after a refusal from
      // `ensureCanDeleteTouchPoint` that is exactly the wrong conclusion.
      for (const key of [
        'common:messages.error.permission_error',
        'common:messages.error.forbidden',
      ]) {
        const error = shortLinkRefusalFor('delete_short_link', 403, body(key))!
        expect(error.reason).toBe('forbidden')
        expect(error.clientMessage).toMatch(/NOT deleted/)
        expect(error.clientMessage).toMatch(/still works/i)
        // The reversible alternative is named, because it may well be allowed for this role.
        expect(error.clientMessage).toContain('update_short_link')
      }
    })

    it('idem_in_progress — 409, create only, and forbids minting a new key', () => {
      const error = shortLinkRefusalFor(
        'create_short_link',
        409,
        body('agent:short_link.idem_in_progress')
      )!
      expect(error.reason).toBe('conflict')
      expect(error.clientMessage).toContain('still in progress')
      expect(error.clientMessage).toMatch(/SAME key/)
      // A new key is precisely how the duplicate the key exists to prevent gets created.
      expect(error.clientMessage).toMatch(/do not change the key/i)

      expect(
        shortLinkRefusalFor('delete_short_link', 409, body('agent:short_link.idem_in_progress'))
      ).toBeNull()
      expect(
        shortLinkRefusalFor('create_short_link', 400, body('agent:short_link.idem_in_progress'))
      ).toBeNull()
    })

    it('⭐ idem_unavailable — 503, says nothing was created, and forbids dropping the key', () => {
      const error = shortLinkRefusalFor(
        'create_short_link',
        503,
        body('agent:short_link.idem_unavailable')
      )!
      expect(error.reason).toBe('upstream_unavailable')
      expect(error.clientMessage).toMatch(/NOT attempted/)
      expect(error.clientMessage).toMatch(/nothing\s+was created/)
      // Retrying WITHOUT the key is the workaround that creates the duplicate.
      expect(error.clientMessage).toMatch(/do not retry without the key/i)

      expect(
        shortLinkRefusalFor('get_short_link', 503, body('agent:short_link.idem_unavailable'))
      ).toBeNull()
    })

    it('idem_link_gone — 404, create only, and sends the model to a NEW key', () => {
      const error = shortLinkRefusalFor(
        'create_short_link',
        404,
        body('agent:short_link.idem_link_gone')
      )!
      expect(error.reason).toBe('not_found')
      expect(error.clientMessage).toMatch(/NEW idempotency_key/)
      expect(error.clientMessage).toMatch(/cannot be restored/i)

      expect(
        shortLinkRefusalFor('update_short_link', 404, body('agent:short_link.idem_link_gone'))
      ).toBeNull()
    })

    it('the three idempotency keys are short-link keys only — the artifact table ignores them', () => {
      // `agent:artifact.*` and `agent:short_link.*` are deliberately different strings: one tool's
      // "still in progress" must never be answered with the other's sentence.
      for (const key of [
        'agent:short_link.idem_in_progress',
        'agent:short_link.idem_unavailable',
        'agent:short_link.idem_link_gone',
      ]) {
        for (const status of [404, 409, 503]) {
          expect(toolRefusalFor('publish_artifact', status, body(key))).toBeNull()
        }
      }
    })
  })

  it('an unknown key falls through to the status bucket', () => {
    expect(
      shortLinkRefusalFor('create_short_link', 400, body('something:we.do.not.own'))
    ).toBeNull()
  })

  it('⛔ never forwards the upstream `message` string', () => {
    for (const key of [
      'common:messages.error.slug_is_taken',
      'common:messages.error.blacklisted',
      'common:messages.error.forbidden',
      'common:messages.error.not_found',
      'agent:short_link.is_artifact',
    ]) {
      for (const status of [400, 403, 404, 409]) {
        const error = shortLinkRefusalFor('get_short_link', status, body(key))
        if (error) expect(error.clientMessage).not.toContain('upstream prose')
      }
    }
  })
})

describe('toolRefusalFor — the single entry point', () => {
  it('routes an artifact tool to the artifact table', () => {
    const error = toolRefusalFor(
      'publish_artifact',
      403,
      body('artifact:errors.quota_live', { limit: 3 })
    )!
    expect(error.clientMessage).toContain('published artifacts')
  })

  it('routes a short-link tool to the short-link table', () => {
    const error = toolRefusalFor(
      'create_short_link',
      400,
      body('common:messages.error.slug_is_taken')
    )!
    expect(error.clientMessage).toContain('no link was created')
  })

  it('⭐ a key from one table does NOT answer for a tool on the other', () => {
    // Widening the LIST of tools whose body is read must not widen what a key MEANS. The artifact
    // quota sentence talks about live slots and MB; answering it for a short link would be fiction.
    expect(
      toolRefusalFor('create_short_link', 403, body('artifact:errors.quota_live', { limit: 3 }))
    ).toBeNull()
    expect(
      toolRefusalFor('get_artifact', 403, body('common:safety.flagged_frozen_notice'))
    ).toBeNull()
  })

  it('returns null for a tool on neither list', () => {
    expect(toolRefusalFor('get_top_links', 403, body('common:messages.error.forbidden'))).toBeNull()
  })
})

/**
 * SL-2 — the two write tools' own sentences. What is pinned is where they DIFFER from the
 * create/read sentences, because a sentence that is merely approximate is the expensive kind here:
 * "no link was created" after a refused RENAME tells the user their link is gone.
 */
describe('shortLinkRefusalFor — the SL-2 writes', () => {
  it('⭐ both tools are on the body-reading list', () => {
    // A write tool left off keeps working and silently loses every sentence below, falling back to
    // the status bucket where a taken slug and a plan limit are the same answer.
    for (const name of ['update_short_link', 'set_short_link_slug']) {
      expect(isShortLinkTool(name)).toBe(true)
      expect(isBodyReadingTool(name)).toBe(true)
    }
  })

  it('⭐ slug_is_taken says the link was not RENAMED, not that nothing was created', () => {
    const error = shortLinkRefusalFor(
      'set_short_link_slug',
      400,
      body('common:messages.error.slug_is_taken')
    )!
    expect(error.reason).toBe('rejected')
    expect(error.clientMessage).toContain('was not renamed')
    expect(error.clientMessage).toContain('current address keeps working')
    // ⛔ The link exists. Telling the user nothing was created is a sentence about a different tool.
    expect(error.clientMessage).not.toContain('no link was created')
    // …and `create_short_link` keeps its own wording.
    expect(
      shortLinkRefusalFor('create_short_link', 400, body('common:messages.error.slug_is_taken'))!
        .clientMessage
    ).toContain('no link was created')
  })

  it('max_slugs_per_tp reaches the rename tool, where the cap is actually spent', () => {
    const error = shortLinkRefusalFor(
      'set_short_link_slug',
      403,
      body('common:messages.error.plan_errors.max_slugs_per_tp')
    )!
    expect(error.reason).toBe('forbidden')
    expect(error.clientMessage).toContain('current link keeps working')
  })

  it('flagged_frozen_notice and blacklisted answer for update_short_link', () => {
    // Both are raised by `updateAndReturn`: the safety freeze before anything is written, the
    // blacklist when the new destination matches the server's list.
    expect(
      shortLinkRefusalFor('update_short_link', 403, body('common:safety.flagged_frozen_notice'))!
        .clientMessage
    ).toContain('safety violation')
    expect(
      shortLinkRefusalFor('update_short_link', 400, body('common:messages.error.blacklisted'))!
        .clientMessage
    ).toContain('blocked list')
  })

  it('⭐ field_invalid names the UTM source — the one value a model can fix by itself', () => {
    // SL-2 gave this key its first real caller: a UTM patch that would leave the link with
    // parameters but no source, which li2-be ignores entirely.
    const error = shortLinkRefusalFor(
      'update_short_link',
      400,
      body('common:messages.error.field_invalid')
    )!
    expect(error.reason).toBe('rejected')
    expect(error.clientMessage).toContain('UTM source')
    expect(
      shortLinkRefusalFor('update_short_link', 403, body('common:messages.error.field_invalid'))
    ).toBeNull()
  })

  it('a role 403 gets the WRITE sentence, under both keys', () => {
    for (const key of [
      'common:messages.error.permission_error',
      'common:messages.error.forbidden',
    ]) {
      for (const tool of ['update_short_link', 'set_short_link_slug']) {
        const error = shortLinkRefusalFor(tool, 403, body(key))!
        expect(error.reason, `${tool} ${key}`).toBe('forbidden')
        expect(error.clientMessage).toContain('nothing was created or changed')
      }
    }
  })

  it('⭐ a 404 on a write says nothing was changed, which the read sentence cannot', () => {
    const error = shortLinkRefusalFor(
      'update_short_link',
      404,
      body('common:messages.error.not_found')
    )!
    expect(error.reason).toBe('not_found')
    expect(error.clientMessage).toContain('nothing was changed')
    expect(error.clientMessage).toContain('list_short_links')
    // ⛔ Still not an existence oracle.
    expect(error.clientMessage).not.toMatch(/another organi[sz]ation/i)
  })

  it('⭐ an artifact id is refused with a pointer to the artifact tools, on both writes', () => {
    for (const tool of ['update_short_link', 'set_short_link_slug']) {
      const error = shortLinkRefusalFor(tool, 404, body('agent:short_link.is_artifact'))!
      expect(error.reason, tool).toBe('not_found')
      expect(error.clientMessage).toContain('get_artifact')
      // The id is RIGHT — a sentence implying otherwise costs the user the whole task.
      expect(error.clientMessage).not.toMatch(/no short link with that id|check the id/i)
    }
  })
})
