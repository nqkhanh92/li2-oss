/**
 * MCP tool descriptors (Phase 2).
 *
 * These tests guard three failure modes that are all SILENT — nothing crashes, the server just
 * quietly advertises the wrong surface to every connected client:
 *   1. A tool appears or disappears (especially `search_docs`, which must never be exposed).
 *   2. `create_short_link` loses one branch of its union — symptom would be "the client can never
 *      create links in bulk", with no error anywhere.
 *   3. `org_id` goes missing on a data tool, or appears on a tool that has no org axis.
 */
import { describe, it, expect } from 'vitest'
import {
  MCP_TOOLS,
  MCP_TOOL_NAMES,
  getMcpTool,
  type JsonSchemaObject,
  type JsonSchemaNode,
} from '@/core/mcp/tools'
/**
 * ⭐ DERIVED, no longer hand-copied (wave 4 WP1 §1). The two lists used to be literals in this file,
 * which meant the assertions below could not fail for the bug they exist to catch: whoever adds an
 * org-scoped tool and forgets `withOrgId` is exactly the person who also forgets the list here. Now
 * they come from the registry, and a missing registry row does not compile.
 */
import { MUTATING_TOOLS, ORG_FREE_TOOLS, ORG_SCOPED_TOOLS } from '@/core/mcp/tool-registry'

/** Every object shape a client would validate an argument set against. */
function objectVariants(schema: JsonSchemaObject): JsonSchemaObject[] {
  return schema.anyOf ?? [schema]
}

describe('MCP tool descriptors — the advertised set', () => {
  it('is exactly 22 tools, matching the declared name list', () => {
    expect(MCP_TOOLS).toHaveLength(22)
    expect(MCP_TOOLS.map((t) => t.name).sort()).toEqual([...MCP_TOOL_NAMES].sort())
  })

  it('appends every wave at the END — a stable prefix is a prompt-cache hit', () => {
    const appended = [
      'publish_artifact',
      'update_artifact',
      'get_artifact',
      'list_artifacts',
      'delete_artifact',
      // Wave 4 WP2, appended after WP1's three for the same reason: every tool added in front of an
      // existing one invalidates the prompt prefix every connected client has cached.
      'set_artifact_access',
      'set_artifact_slug',
      // SL-1, appended after the artifact wave for the same reason again.
      'list_short_links',
      'get_short_link',
      // SL-2's two writes, then SL-3's delete. Order inside the short-link wave matters for the
      // same cache reason: each WP appended after the one before it rather than beside it.
      'update_short_link',
      'set_short_link_slug',
      'delete_short_link',
      // Chat-1: sinh ra từ dock chat, nơi `publish_artifact` không dùng được vì nó chỉ nhận HTML
      // dạng chữ. Nối ở CUỐI như mọi đợt trước, cùng một lý do cache prefix.
      'publish_draft_artifact',
    ]
    expect(MCP_TOOLS.slice(-13).map((t) => t.name)).toEqual(appended)
    expect([...MCP_TOOL_NAMES].slice(-13)).toEqual(appended)
  })

  it('never exposes search_docs', () => {
    // It is a trigger into li2-ai's 3-LLM-call pipeline with no back-hop route, not a data call.
    // `find_li2_docs` + `get_doc_page` are the replacement and the different names are deliberate
    // (plan §4.2) — the day li2-ai consumes this server the two tool lists merge.
    expect(MCP_TOOLS.map((t) => t.name)).not.toContain('search_docs')
    expect(getMcpTool('search_docs')).toBeUndefined()
    expect(getMcpTool('find_li2_docs')).toBeDefined()
    expect(getMcpTool('get_doc_page')).toBeDefined()
  })

  it('has unique names and a non-empty description on every tool', () => {
    const names = MCP_TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const tool of MCP_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(40)
    }
  })

  /**
   * ⭐ `title` is the field a HUMAN reads — the row in a consent dialog and in both directory
   * listings — and it is the one thing in a descriptor that no other test would catch missing: a
   * tool with no title still works, still calls, still passes every other assertion here, and only
   * looks broken in a UI nobody runs in CI. Pinned by SHAPE, not by wording, so renaming a label is
   * not a failing test: present on all 22, short enough to render, and never the snake_case `name`
   * copied over, which would defeat the whole point of having a second field.
   */
  it('⭐ gives every tool a short human-readable title, distinct from its name', () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.title, tool.name).toBeTruthy()
      expect(tool.title.trim(), tool.name).toBe(tool.title)
      expect(tool.title.length, tool.name).toBeLessThanOrEqual(40)
      expect(tool.title, tool.name).not.toContain('_')
      expect(tool.title, tool.name).not.toBe(tool.name)
    }
  })

  it('gates exactly the ten write tools behind the write scope', () => {
    // Phase 4 hides out-of-scope tools from tools/list, so this list IS the write surface — and a
    // read-only grant must never see a tool that publishes public content or deletes one.
    const writeTools = MCP_TOOLS.filter((t) => t.requiredScope === 'write').map((t) => t.name)
    expect(writeTools).toEqual([
      'create_short_link',
      'publish_artifact',
      'update_artifact',
      'delete_artifact',
      // Wave 4 WP2: one changes who can open a page, the other changes its address. Neither may be
      // visible to a read-only grant.
      'set_artifact_access',
      'set_artifact_slug',
      // SL-2 and SL-3: one changes where a printed QR sends people, one changes the address it
      // encodes, one destroys the link outright. A read-only grant must see none of the three.
      'update_short_link',
      'set_short_link_slug',
      'delete_short_link',
      // Chat-1: nó công bố một trang ra Internet. Một grant chỉ đọc không được thấy nó.
      'publish_draft_artifact',
    ])
  })

  it('⭐ the write scope and the registry agree on which tools mutate', () => {
    // Two independent declarations of the same fact, and a tool that writes while advertising
    // `requiredScope: 'read'` would be visible to a read-only grant — the exact failure the scope
    // gate exists to prevent. `get_artifact`/`list_artifacts` are read in both, by construction.
    const scopedWrite = MCP_TOOLS.filter((t) => t.requiredScope === 'write').map((t) => t.name)
    expect(scopedWrite.sort()).toEqual([...MUTATING_TOOLS].sort())
  })
})

describe('MCP tool descriptors — input schemas', () => {
  it('gives every tool an object-rooted schema, as MCP requires', () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.inputSchema.type, tool.name).toBe('object')
    }
  })

  it('emits no $schema or $ref — the schema must be self-contained and embeddable', () => {
    for (const tool of MCP_TOOLS) {
      const serialized = JSON.stringify(tool.inputSchema)
      expect(serialized, tool.name).not.toContain('"$schema"')
      expect(serialized, tool.name).not.toContain('"$ref"')
    }
  })

  it('requires org_id on every org-scoped tool, in every branch of the schema', () => {
    for (const name of ORG_SCOPED_TOOLS) {
      const tool = getMcpTool(name)!
      for (const variant of objectVariants(tool.inputSchema)) {
        expect(variant.required, name).toContain('org_id')
        expect(variant.properties?.org_id, name).toBeDefined()
      }
    }
  })

  it('keeps org_id off list_orgs and the two docs tools', () => {
    for (const name of ORG_FREE_TOOLS) {
      const tool = getMcpTool(name)!
      expect(tool.inputSchema.properties?.org_id, name).toBeUndefined()
      expect(tool.inputSchema.required ?? [], name).not.toContain('org_id')
    }
  })

  it('describes every property it advertises, so a model is never guessing', () => {
    for (const tool of MCP_TOOLS) {
      for (const variant of objectVariants(tool.inputSchema)) {
        for (const [prop, node] of Object.entries(variant.properties ?? {})) {
          expect((node as JsonSchemaNode).description, `${tool.name}.${prop}`).toBeTruthy()
        }
      }
    }
  })
})

describe('create_short_link — the union must survive JSON Schema generation', () => {
  const schema = getMcpTool('create_short_link')!.inputSchema
  const branches = schema.anyOf ?? []
  const byMode = (mode: string) =>
    branches.find((b) => (b.properties?.mode as JsonSchemaNode | undefined)?.const === mode)

  it('keeps BOTH branches', () => {
    // Losing one is silent: the tool still works, but "create 10 links" can never succeed and
    // nothing anywhere reports why. This assertion is the only thing standing between us and that.
    expect(branches).toHaveLength(2)
    expect(byMode('single')).toBeDefined()
    expect(byMode('bulk')).toBeDefined()
  })

  it('keeps the single branch able to carry slug, name, UTM, password and expiry', () => {
    const single = byMode('single')!
    expect(single.required).toEqual(expect.arrayContaining(['org_id', 'mode', 'destination_url']))
    for (const field of ['slug', 'name', 'password', 'expires_at', 'utm_source', 'utm_content']) {
      expect(single.properties?.[field], field).toBeDefined()
    }
  })

  it('keeps the bulk branch URL-only and bounded to 2..20', () => {
    const bulk = byMode('bulk')!
    expect(bulk.required).toEqual(expect.arrayContaining(['org_id', 'mode', 'destinations']))
    expect(bulk.properties?.slug).toBeUndefined()
    expect(bulk.properties?.name).toBeUndefined()
    const destinations = bulk.properties?.destinations as JsonSchemaNode
    expect(destinations.type).toBe('array')
    expect(destinations.minItems).toBe(2)
    expect(destinations.maxItems).toBe(20)
  })

  it('states the two rules JSON Schema cannot express', () => {
    // The utm_source conditional and the 2..20 bulk range are `.superRefine`s in the shared Zod;
    // generation drops them and the route re-runs safeParse. Prose is the only thing that lets a
    // model get it right on the first attempt instead of eating a 400.
    const description = getMcpTool('create_short_link')!.description
    expect(description).toContain('utm_source')
    expect(description).toMatch(/2 to 20/)
  })
})

describe('get_link_details — the id-or-slug rule', () => {
  it('advertises both keys as optional but explains that one is mandatory', () => {
    const tool = getMcpTool('get_link_details')!
    // `.refine` does not survive generation, so neither key can be marked required structurally.
    expect(tool.inputSchema.required).toEqual(['org_id'])
    expect(tool.inputSchema.properties?.id).toBeDefined()
    expect(tool.inputSchema.properties?.slug).toBeDefined()
    expect(tool.description).toMatch(/at least one/i)
  })
})

describe('the docs pair — routing insurance (plan §4.2, §4.3)', () => {
  it('carries the negative boundary on BOTH tools', () => {
    // Without this sentence, "how many clicks last month?" picks a docs tool. Models disambiguate
    // mainly on what a tool says it does NOT do — and `get_doc_page` needs it as much as the search
    // half, because it is the one that returns a wall of text a model may reach for by habit.
    for (const name of ['find_li2_docs', 'get_doc_page'] as const) {
      const description = getMcpTool(name)!.description
      expect(description, name).toMatch(/returns none of the organization's own data/i)
      expect(description, name).toContain('get_analytics_summary')
      expect(description, name).toContain('get_top_links')
    }
  })

  it('tells the model the two are a pair, in the order they must be called', () => {
    // F4: a model that calls `get_doc_page` with an invented path gets one clean error and no page.
    // The only supported way to obtain a path is `find_li2_docs`, so both descriptions say so.
    expect(getMcpTool('find_li2_docs')!.description).toContain('get_doc_page')
    expect(getMcpTool('get_doc_page')!.description).toContain('find_li2_docs')
  })

  it('takes a required query / path and nothing about an org', () => {
    expect(getMcpTool('find_li2_docs')!.inputSchema.required).toEqual(['query'])
    expect(getMcpTool('find_li2_docs')!.inputSchema.additionalProperties).toBe(false)
    expect(getMcpTool('get_doc_page')!.inputSchema.required).toEqual(['path'])
    expect(getMcpTool('get_doc_page')!.inputSchema.additionalProperties).toBe(false)
  })

  it('⛔ never advertises a url argument on get_doc_page', () => {
    // THE assertion that protects §4.3's design. A `url` property here would mean fetching a
    // model-supplied string — the SSRF shape Phase 3a had to harden the CIMD fetcher against — and
    // it would arrive as a one-line "convenience" that no other test in this repo would notice.
    const properties = getMcpTool('get_doc_page')!.inputSchema.properties ?? {}
    expect(Object.keys(properties)).toEqual(['path'])
    expect(getMcpTool('get_doc_page')!.description).toMatch(/never a URL/i)
  })
})

describe('transport — the Phase 4 back-hop contract', () => {
  it('sends the 9 read tools over GET query strings and the write tool over a JSON body', () => {
    const readPaths = MCP_TOOLS.filter(
      (t) => t.transport.kind === 'back-hop' && t.transport.method === 'GET'
    ).map((t) => (t.transport as { path: string }).path)

    expect(readPaths).toEqual([
      '/api/agent/tools/org-overview',
      '/api/agent/tools/analytics-summary',
      '/api/agent/tools/clicks-timeseries',
      '/api/agent/tools/top-links',
      '/api/agent/tools/link-details',
      // Wave 4 WP1: two more reads, same GET-with-query shape, appended at the end.
      '/api/agent/tools/get-artifact',
      '/api/agent/tools/list-artifacts',
      // SL-1: two more, same shape again. GET matters here — a read must stay cacheable and must
      // not carry its arguments in a body nobody logs.
      '/api/agent/tools/list-short-links',
      '/api/agent/tools/get-short-link',
    ])

    const write = getMcpTool('create_short_link')!.transport
    expect(write).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/create-short-link',
      argsIn: 'json-body',
    })
  })

  it('sends the two artifact tools over POST json-body to their own agent routes — never mcp-local', () => {
    // §1.3 of the spec: `POST …/artifacts/{id}/replace` is `withAuth` and would 401 a PASETO, so each
    // tool has a dedicated `withAgentAuth` route. And neither is a fourth seam exception.
    expect(getMcpTool('publish_artifact')!.transport).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/publish-artifact',
      argsIn: 'json-body',
    })
    expect(getMcpTool('update_artifact')!.transport).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/update-artifact',
      argsIn: 'json-body',
    })
  })

  it('marks exactly the sanctioned seam exceptions as served at the MCP layer', () => {
    // Three exceptions (plan §3), three names here plus the org check inside `call-tool.ts`. The two
    // docs tools are ONE exception — same file, same public origin (§4.3) — but a name appearing
    // here that is not one of these three is a fourth, and §3 forbids that without amending it.
    const local = MCP_TOOLS.filter((t) => t.transport.kind === 'mcp-local').map((t) => t.name)
    expect(local.sort()).toEqual(['find_li2_docs', 'get_doc_page', 'list_orgs'])
  })

  it('never pairs a GET with a body', () => {
    for (const tool of MCP_TOOLS) {
      if (tool.transport.kind !== 'back-hop') continue
      const expected = tool.transport.method === 'GET' ? 'query' : 'json-body'
      expect(tool.transport.argsIn, tool.name).toBe(expected)
    }
  })
})

describe('publish_artifact / update_artifact — what the model is told (wave 3 R1/R2)', () => {
  const publish = getMcpTool('publish_artifact')!
  const update = getMcpTool('update_artifact')!

  it('publish_artifact says the page is PUBLIC, before anything else can be misread', () => {
    expect(publish.description).toMatch(/public/i)
    expect(publish.description).toMatch(/anyone with the link/i)
    expect(publish.description).toContain('update_artifact')
  })

  it('update_artifact says the previous version cannot be restored', () => {
    expect(update.description).toMatch(/cannot be restored/i)
    expect(update.description).toContain('previous_size_bytes')
  })

  it('publish_artifact requires org_id, name and html; is strict; byte limit is prose not schema', () => {
    expect(publish.inputSchema.required).toEqual(['org_id', 'name', 'html'])
    expect(publish.inputSchema.additionalProperties).toBe(false)
    expect(Object.keys(publish.inputSchema.properties ?? {}).sort()).toEqual(
      ['access', 'domain_id', 'html', 'idempotency_key', 'name', 'org_id', 'slug'].sort()
    )
    const html = publish.inputSchema.properties!.html as JsonSchemaNode
    expect(html.minLength).toBe(1)
    expect(html.maxLength).toBeUndefined()
    expect(html.description).toMatch(/10 MB/)
    // No access_mode in v1: the MCP path is always public.
    expect(publish.inputSchema.properties!.access_mode).toBeUndefined()
  })

  it('publish_artifact tells the model WHEN to send an idempotency_key, not just that it exists (WP3)', () => {
    // The field is optional, so the only thing that makes it reachable is the prose: a model that is
    // never told "reuse the key when you retry" will mint a new one and get the duplicate.
    const key = publish.inputSchema.properties!.idempotency_key as JsonSchemaNode
    expect(key.type).toBe('string')
    expect(key.maxLength).toBe(128)
    expect(key.description).toMatch(/retry/i)
    expect(key.description).toMatch(/same/i)
    expect(publish.inputSchema.required).not.toContain('idempotency_key')

    expect(publish.description).toContain('idempotency_key')
    expect(publish.description).toMatch(/idempotent_replay/)
    expect(publish.description).toMatch(/times out|timed out/i)
  })

  it('update_artifact requires org_id, artifact_id and html; is strict; takes no name', () => {
    expect(update.inputSchema.required).toEqual(['org_id', 'artifact_id', 'html'])
    expect(update.inputSchema.additionalProperties).toBe(false)
    expect(Object.keys(update.inputSchema.properties ?? {}).sort()).toEqual(
      ['artifact_id', 'html', 'org_id'].sort()
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP1 — annotations, and the three read/delete tools
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('annotations — the hints a client acts on (WP1 §1)', () => {
  it('gives EVERY tool all four hints, with openWorldHint always false', () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.annotations, tool.name).toEqual({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        // Not a per-tool judgement: every tool reads or writes Li2's own closed domain.
        openWorldHint: false,
      })
    }
  })

  it('⭐ destructiveHint is true for exactly the seven tools that can cost you something', () => {
    // Each of these overwrites or removes something a user already had, with no copy to restore
    // from: the replaced HTML, the deleted file, the previous password (a scrypt hash nobody can
    // read back), and the page's protection itself when `set_artifact_access` is handed "public".
    // `create_short_link` and `publish_artifact` only ADD, so marking them destructive would train
    // clients (and users) to click through the confirmation that matters.
    const destructive = MCP_TOOLS.filter((t) => t.annotations.destructiveHint).map((t) => t.name)
    expect(destructive).toEqual([
      'update_artifact',
      'delete_artifact',
      'set_artifact_access',
      'set_artifact_slug',
      // SL-2/SL-3. `update_short_link` keeps no copy of the destination it overwrites, and the
      // link it edits is already printed on things; `set_short_link_slug` renders a new QR image
      // over the old one at the same storage path; `delete_short_link` is a hard delete.
      'update_short_link',
      'set_short_link_slug',
      'delete_short_link',
    ])
  })

  it('marks every get_/list_/find_ tool readOnly, and nothing that writes', () => {
    for (const tool of MCP_TOOLS) {
      const looksLikeARead = /^(get|list|find)_/.test(tool.name)
      expect(tool.annotations.readOnlyHint, tool.name).toBe(looksLikeARead)
      // A read-only tool is trivially idempotent, and must never be flagged destructive.
      if (looksLikeARead) {
        expect(tool.annotations.idempotentHint, tool.name).toBe(true)
        expect(tool.annotations.destructiveHint, tool.name).toBe(false)
      }
    }
  })

  it('says publish is NOT idempotent and delete IS', () => {
    // Measured (checklist A13): two `publish_artifact` calls make two artifacts and burn two live
    // slots, so a client that retries a timeout on this hint would double-charge the quota. WP3's
    // `idempotency_key` is what changes that line — and this assertion with it.
    expect(getMcpTool('publish_artifact')!.annotations.idempotentHint).toBe(false)
    expect(getMcpTool('update_artifact')!.annotations.idempotentHint).toBe(false)
    // Delete: the second call changes nothing and answers `already_removed: true`, so a retry after
    // a timeout is safe — while the FIRST call is still destructive. Both hints at once, on purpose.
    expect(getMcpTool('delete_artifact')!.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    })
  })
})

describe('get_artifact / list_artifacts / delete_artifact — what the model is told', () => {
  const get = getMcpTool('get_artifact')!
  const list = getMcpTool('list_artifacts')!
  const remove = getMcpTool('delete_artifact')!

  it('get_artifact advertises both keys optional but states the exactly-one rule in prose', () => {
    // `.refine` does not survive JSON Schema generation (same as get_link_details), so the only
    // thing that lets a model get it right first try is the sentence.
    expect(get.inputSchema.required).toEqual(['org_id'])
    expect(Object.keys(get.inputSchema.properties ?? {}).sort()).toEqual(
      ['artifact_id', 'org_id', 'slug'].sort()
    )
    expect(get.inputSchema.additionalProperties).toBe(false)
    expect(get.description).toMatch(/exactly one/i)
  })

  it('get_artifact warns that a draft has no short_url / qr_url, so null is not an error', () => {
    expect(get.description).toMatch(/null/)
    expect(get.description).toMatch(/never published/i)
  })

  it('list_artifacts caps limit at 50 and tells the model to stop on a null cursor', () => {
    const limit = list.inputSchema.properties!.limit as JsonSchemaNode
    expect(limit.maximum).toBe(50)
    expect(limit.default).toBe(20)
    expect(list.description).toMatch(/next_cursor/)
    expect(list.description).toMatch(/null/)
    // Opaque: a model that parses it would depend on the offset pagination underneath.
    expect((list.inputSchema.properties!.cursor as JsonSchemaNode).description).toMatch(/opaque/i)
  })

  it('⭐ delete_artifact says the printed QR survives, answers 410, and cannot be undone', () => {
    // The three consequences a user cannot discover afterwards. Without the first one a model tells
    // someone to reprint codes that still work; without the third it deletes on a maybe.
    expect(remove.description).toMatch(/cannot be undone/i)
    expect(remove.description).toMatch(/already printed/i)
    expect(remove.description).toMatch(/410/)
    // Consent belongs BEFORE the call — annotations.destructiveHint is the client-side half.
    expect(remove.description).toMatch(/before you call/i)
    expect(remove.description).toContain('update_artifact')
  })

  it('delete_artifact promises the second call succeeds, and takes no confirm flag', () => {
    expect(remove.description).toMatch(/already_removed/)
    // ⛔ A `confirm` ARGUMENT is not a safety rail — the model fills it in itself (checklist §D).
    expect(Object.keys(remove.inputSchema.properties ?? {}).sort()).toEqual(
      ['artifact_id', 'org_id'].sort()
    )
    expect(remove.inputSchema.required).toEqual(['org_id', 'artifact_id'])
  })

  it('routes the three to their own agent endpoints — never mcp-local', () => {
    expect(get.transport).toEqual({
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/get-artifact',
      argsIn: 'query',
    })
    expect(list.transport).toEqual({
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/list-artifacts',
      argsIn: 'query',
    })
    expect(remove.transport).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/delete-artifact',
      argsIn: 'json-body',
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP2 — publish_artifact.access, set_artifact_access, set_artifact_slug
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('publish_artifact.access — what the model is told (WP2 §3)', () => {
  const publish = getMcpTool('publish_artifact')!
  const access = publish.inputSchema.properties!.access as JsonSchemaObject

  it('advertises access as an OPTIONAL nested object, never a flat access_mode', () => {
    expect(publish.inputSchema.required).toEqual(['org_id', 'name', 'html'])
    expect(access).toBeDefined()
    expect(access.type).toBe('object')
    expect(publish.inputSchema.properties!.access_mode).toBeUndefined()
    expect(publish.inputSchema.properties!.password).toBeUndefined()
  })

  it('offers all four modes, requires only the mode, and stays strict', () => {
    const mode = access.properties!.mode as JsonSchemaNode
    expect(mode.enum).toEqual(['public', 'private', 'password', 'google'])
    expect(access.required).toEqual(['mode'])
    expect(access.additionalProperties).toBe(false)
  })

  it('⭐ describes the nested fields too — including the 8-128 rule the schema cannot carry', () => {
    // `describeFields` only reaches the top level, so without `describeObjectField` these two would
    // be the only arguments in the whole surface with no explanation, and `password` is the one that
    // needs it most: its length rule is enforced by the service and exists nowhere in the schema.
    expect((access.properties!.mode as JsonSchemaNode).description).toMatch(/anyone with the link/i)
    const password = (access.properties!.password as JsonSchemaNode).description as string
    expect(password).toMatch(/8 to 128/)
    expect(password).toMatch(/never returns it/i)
    expect(access.description).toMatch(/PUBLIC/)
  })

  it('⭐ no longer claims there is no private option, and warns the page stays public on failure', () => {
    // The wave-3 sentence said "there is no private option", which WP2 makes false. A model reading
    // a stale promise would refuse to pass `access` at all.
    expect(publish.description).not.toMatch(/no private option/i)
    expect(publish.description).toMatch(/by default the page is public/i)
    expect(publish.description).toMatch(/anyone with the link/i)
    expect(publish.description).toMatch(/LEFT PUBLIC/)
    expect(publish.description).toContain('warning')
  })
})

describe('set_artifact_access / set_artifact_slug — what the model is told (WP2)', () => {
  const setAccess = getMcpTool('set_artifact_access')!
  const setSlug = getMcpTool('set_artifact_slug')!

  it('set_artifact_access takes a FLAT artifact_id + mode + optional password, strictly', () => {
    expect(setAccess.inputSchema.required).toEqual(['org_id', 'artifact_id', 'mode'])
    expect(Object.keys(setAccess.inputSchema.properties ?? {}).sort()).toEqual(
      ['artifact_id', 'mode', 'org_id', 'password'].sort()
    )
    expect(setAccess.inputSchema.additionalProperties).toBe(false)
    expect((setAccess.inputSchema.properties!.mode as JsonSchemaNode).enum).toEqual([
      'public',
      'private',
      'password',
      'google',
    ])
    // ⛔ No access_version: the optimistic lock is the server's, and a model must not be able to
    // steer it. The conflict comes back as a refusal telling it to re-read instead.
    expect(setAccess.inputSchema.properties!.access_version).toBeUndefined()
  })

  it('⭐ set_artifact_access says the password is never returned, and that modes REPLACE', () => {
    // The two things a user cannot discover afterwards: that we cannot tell them the password later,
    // and that switching to "public" silently removes the protection.
    expect(setAccess.description).toMatch(/8 to 128/)
    expect(setAccess.description).toMatch(/NEVER returns it/)
    expect(setAccess.description).toMatch(/tell the user the password/i)
    expect(setAccess.description).toMatch(/REPLACES/)
    expect(setAccess.description).toMatch(/removes the protection/i)
    expect(setAccess.description).toContain('password_set_at')
    // `google` may be refused by the server's own configuration, which the enum cannot express.
    expect(setAccess.description).toMatch(/switched off on some Li2 servers/i)
    // The conflict answer names the recovery, so a model does not retry blindly.
    expect(setAccess.description).toContain('get_artifact')
  })

  it('⭐ set_artifact_slug says the OLD link keeps working and nothing needs reprinting', () => {
    // The consequence that is the opposite of everyone's intuition, and the one the product owner
    // specifically asked to be stated (B4/C5): Li2 resolves every slug an artifact ever had.
    expect(setSlug.description).toMatch(/OLD LINK KEEPS WORKING/)
    expect(setSlug.description).toMatch(/already printed/i)
    expect(setSlug.description).toMatch(/has to be reprinted/i)
  })

  it('set_artifact_slug explains the QR is re-rendered and qr_url may not change', () => {
    // The image is written back to the same storage path, so a client comparing `qr_url` would
    // conclude nothing happened. `updated_at` is the only signal, and the description says so.
    expect(setSlug.description).toMatch(/NEW QR image/)
    expect(setSlug.description).toContain('qr_url')
    expect(setSlug.description).toContain('updated_at')
  })

  it('set_artifact_slug states the slug rules, the global uniqueness and the plan cap', () => {
    expect(setSlug.description).toMatch(/6 to 64 characters/)
    expect(setSlug.description).toMatch(/must not start with "f-"/)
    expect(setSlug.description).toMatch(/free across all of Li2/i)
    expect(setSlug.description).toMatch(/only so many slugs/i)
    // And the draft case, which is the most likely refusal of all.
    expect(setSlug.description).toMatch(/never published/i)
    // And the idempotency the registry claims.
    expect(setSlug.description).toMatch(/already has succeeds and changes nothing/i)
  })

  it('set_artifact_slug requires org_id, artifact_id and slug, strictly', () => {
    expect(setSlug.inputSchema.required).toEqual(['org_id', 'artifact_id', 'slug'])
    expect(Object.keys(setSlug.inputSchema.properties ?? {}).sort()).toEqual(
      ['artifact_id', 'org_id', 'slug'].sort()
    )
    expect(setSlug.inputSchema.additionalProperties).toBe(false)
    // The shared `slugSchema` accepts `''` and maps it to undefined, so the generated node carries
    // that branch; for THIS tool an empty slug is a 400, which only the description can say.
    expect((setSlug.inputSchema.properties!.slug as JsonSchemaNode).description).toMatch(
      /empty string is not accepted/i
    )
  })

  it('⭐ both are destructive, idempotent, write-scoped, and routed to their own POST endpoints', () => {
    for (const tool of [setAccess, setSlug]) {
      expect(tool.requiredScope, tool.name).toBe('write')
      expect(tool.annotations, tool.name).toEqual({
        readOnlyHint: false,
        // `replace`: the previous password (or the previous primary link) is not recoverable.
        destructiveHint: true,
        // The same arguments twice leave the same state — see the registry rows for the proof.
        idempotentHint: true,
        openWorldHint: false,
      })
    }
    expect(setAccess.transport).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/set-artifact-access',
      argsIn: 'json-body',
    })
    expect(setSlug.transport).toEqual({
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/set-artifact-slug',
      argsIn: 'json-body',
    })
  })

  it('⛔ set_artifact_access is a POST, so the password never lands in a URL', () => {
    // A GET would put the password in a query string, which `withAgentAuth` logs as `request.url`
    // on failure and every proxy in front of the app logs always. This is the assertion that keeps
    // someone from "simplifying" it into the read tools' shape.
    expect(setAccess.transport.kind).toBe('back-hop')
    if (setAccess.transport.kind === 'back-hop') expect(setAccess.transport.method).toBe('POST')
  })
})

/**
 * SL-2 — what the model is told about the two short-link writes.
 *
 * The descriptions carry three facts the schema cannot, and each one is a decision a model makes
 * wrongly without them: that an update reaches every QR already printed and cannot be undone, that
 * `enabled: false` is the reversible alternative, and that a rename does NOT break the old link.
 */
describe('update_short_link / set_short_link_slug — what the model is told (SL-2)', () => {
  const update = getMcpTool('update_short_link')!
  const setSlug = getMcpTool('set_short_link_slug')!

  it('⭐ update_short_link says the change is immediate, printed and irreversible', () => {
    expect(update.description).toMatch(/takes effect immediately/i)
    expect(update.description).toMatch(/already printed/i)
    expect(update.description).toMatch(/no undo/i)
    // The reversible alternative, named before deletion is ever an option.
    expect(update.description).toContain('enabled: false')
  })

  it('states the two rules the JSON Schema cannot carry', () => {
    // The `.refine` "at least one field" rule, and what `null` means inside `access_control`.
    expect(update.description).toMatch(/at least one field/i)
    expect(update.description).toMatch(/`null` to REMOVE/i)
    // And that `changed: []` is a real answer rather than a failure.
    expect(update.description).toContain('changed')
  })

  it('⭐ set_short_link_slug says the OLD link keeps working', () => {
    // The counter-intuitive half, and the one that decides whether a user reprints flyers:
    // `updateTpSlug` only ever INSERTS into `slugs` (checklist S4).
    expect(setSlug.description).toMatch(/old link keeps working/i)
    expect(setSlug.description).toMatch(/still redirect/i)
    expect(setSlug.description).toMatch(/nothing has to be reprinted/i)
    // …and the QR caveat: the image is written in place, so `qr_url` may not change.
    expect(setSlug.description).toMatch(/updated_at/)
  })

  it('both point an artifact id at the artifact tools instead of at a wrong id', () => {
    for (const tool of [update, setSlug]) {
      expect(tool.description, tool.name).toMatch(/artifact/i)
    }
  })

  it('⭐ both are destructive, idempotent, write-scoped and routed to their own POST endpoints', () => {
    for (const tool of [update, setSlug]) {
      expect(tool.requiredScope, tool.name).toBe('write')
      expect(tool.annotations, tool.name).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      })
      expect(tool.transport.kind).toBe('back-hop')
      if (tool.transport.kind === 'back-hop') {
        expect(tool.transport.method, tool.name).toBe('POST')
        expect(tool.transport.argsIn, tool.name).toBe('json-body')
      }
    }
  })

  it('requires org_id and id, strictly, and keeps the nested objects described', () => {
    for (const tool of [update, setSlug]) {
      expect(tool.inputSchema.required, tool.name).toContain('org_id')
      expect(tool.inputSchema.required, tool.name).toContain('id')
      expect(tool.inputSchema.additionalProperties, tool.name).toBe(false)
    }
    // ⭐ The nested objects are the only arguments on the whole surface a model would otherwise get
    // with no explanation — `null` means remove, and UTM parameters are inert without a source.
    const properties = update.inputSchema.properties as Record<string, JsonSchemaNode>
    for (const key of ['utm', 'access_control']) {
      const node = properties[key] as JsonSchemaObject
      expect(typeof node.description, key).toBe('string')
      const inner = node.properties as Record<string, JsonSchemaNode>
      for (const field of Object.keys(inner)) {
        expect(typeof (inner[field] as JsonSchemaNode).description, `${key}.${field}`).toBe(
          'string'
        )
      }
    }
  })
})
