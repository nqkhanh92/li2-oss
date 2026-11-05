/**
 * `core/mcp/tool-registry.ts` — the one place that says what a tool DOES (wave 4 WP1 §1).
 *
 * The failure this file exists to catch is the quiet one: a new tool is added to `MCP_TOOL_NAMES`
 * and to `MCP_TOOLS`, ships, and every connected client is told nothing about whether it writes —
 * or worse, is told `readOnlyHint: undefined`, which a client reads as "no information" on a tool
 * that deletes files. TypeScript catches a MISSING row (the `Record<McpToolName, …>` type); only a
 * test catches a STALE one, and only a test can check that the derived lists stay in step with the
 * descriptors.
 */
import { describe, it, expect } from 'vitest'
import { MCP_TOOLS, MCP_TOOL_NAMES } from '@/core/mcp/tools'
import {
  MCP_TOOL_REGISTRY,
  MUTATING_TOOLS,
  ORG_FREE_TOOLS,
  ORG_SCOPED_TOOLS,
  annotationsFor,
} from '@/core/mcp/tool-registry'

describe('the registry covers the advertised set, in both directions', () => {
  it('⭐ has exactly one row per tool in MCP_TOOL_NAMES — and no row for anything else', () => {
    // BOTH directions on purpose. The first catches "added a tool, forgot the row" (which the
    // compiler also catches). The second catches "removed a tool, left the row" — which nothing else
    // in the repo notices, and which leaves `ORG_SCOPED_TOOLS` naming a tool `getMcpTool` returns
    // `undefined` for, so every assertion that iterates it crashes on a `!`.
    expect(Object.keys(MCP_TOOL_REGISTRY).sort()).toEqual([...MCP_TOOL_NAMES].sort())
  })

  it('declares a complete row for every tool — no partial entries', () => {
    for (const name of MCP_TOOL_NAMES) {
      expect(MCP_TOOL_REGISTRY[name], name).toEqual({
        mutation: expect.stringMatching(/^(none|add|replace|remove)$/),
        needsOrg: expect.any(Boolean),
        idempotent: expect.any(Boolean),
      })
    }
  })

  it('throws loudly rather than publishing undefined hints for an unknown name', () => {
    // Not reachable through `MCP_TOOL_NAMES`, but a descriptor built from a cast string would
    // otherwise advertise a write tool as neither read-only nor destructive.
    expect(() => annotationsFor('search_docs' as never)).toThrow(/no registry row/)
  })
})

describe('the derived lists', () => {
  it('ORG_SCOPED_TOOLS and ORG_FREE_TOOLS partition the whole set', () => {
    expect([...ORG_SCOPED_TOOLS, ...ORG_FREE_TOOLS].sort()).toEqual([...MCP_TOOL_NAMES].sort())
    for (const name of ORG_SCOPED_TOOLS) expect(ORG_FREE_TOOLS).not.toContain(name)
  })

  it('names exactly the three tools outside the org axis (plan §4.1 / §4.2 / §4.3)', () => {
    // The three sanctioned seam exceptions and nothing else. A fourth org-free tool is a plan
    // amendment, not an edit.
    expect([...ORG_FREE_TOOLS].sort()).toEqual(['find_li2_docs', 'get_doc_page', 'list_orgs'])
  })

  it('⭐ needsOrg agrees with the schema that actually requires org_id', () => {
    // THE assertion that makes the registry trustworthy. `needsOrg` is a claim; `inputSchema` is
    // what a client validates against. If they disagree, either a tool takes an org it never checks
    // or `authorizeOrg` is handed nothing to check — and the second one is cross-tenant exposure.
    for (const tool of MCP_TOOLS) {
      const variants = tool.inputSchema.anyOf ?? [tool.inputSchema]
      const schemaWantsOrg = variants.every((v) => (v.required ?? []).includes('org_id'))
      expect(schemaWantsOrg, tool.name).toBe(MCP_TOOL_REGISTRY[tool.name].needsOrg)
    }
  })

  it('MUTATING_TOOLS is every tool whose annotations are not read-only', () => {
    const notReadOnly = MCP_TOOLS.filter((t) => !t.annotations.readOnlyHint).map((t) => t.name)
    expect(notReadOnly.sort()).toEqual([...MUTATING_TOOLS].sort())
  })
})

describe('mutation → annotations', () => {
  it('maps the four mutation kinds the way the hints are defined', () => {
    expect(annotationsFor('get_org_overview')).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
    // `add` is NOT destructive: a new short link cannot cost you something you already had.
    expect(annotationsFor('create_short_link')).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    })
    // `replace`: the previous HTML is deleted with no copy to restore from.
    expect(annotationsFor('update_artifact')).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    })
    // `remove`: destructive AND idempotent — two different client questions (see the registry).
    expect(annotationsFor('delete_artifact')).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    })
  })

  it('never calls a mutating tool read-only, nor a read-only tool destructive', () => {
    for (const name of MCP_TOOL_NAMES) {
      const { mutation } = MCP_TOOL_REGISTRY[name]
      const annotations = annotationsFor(name)
      expect(annotations.readOnlyHint, name).toBe(mutation === 'none')
      if (annotations.readOnlyHint) expect(annotations.destructiveHint, name).toBe(false)
    }
  })

  it('openWorldHint is false for every tool, including the two docs tools', () => {
    // The docs tools read OUR published manifest — `get_doc_page` has no `url` argument and must
    // never get one, so nothing here reaches a caller-named origin.
    for (const name of MCP_TOOL_NAMES) expect(annotationsFor(name).openWorldHint, name).toBe(false)
  })
})
