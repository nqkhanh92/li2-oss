/**
 * ⭐ P0.4 — `outputSchema`: the shape every MCP tool promises its answer will have.
 *
 * The spec makes this field more than documentation: a tool that publishes one MUST answer with
 * `structuredContent` that validates against it, so a wrong schema is a client-side failure on a
 * call the server handled perfectly. Three failure modes are guarded here, and all three are silent:
 *
 *   1. A tool ships with no `outputSchema`, or with one that is not object-rooted, so a client
 *      cannot validate the structured block it is now being sent.
 *   2. A schema arrives CLOSED (`additionalProperties: false`, which is what `zod-to-json-schema`
 *      emits by default). The next field any route adds then makes every strict client reject a
 *      correct payload — in production, for a change that passed review.
 *   3. A schema carries `$schema` or `$ref`. It is embedded in a tool descriptor rather than served
 *      as a document, and `$ref` support across MCP clients is uneven.
 *
 * The payloads below cover the SIX tools with no route test of their own (the three analytics reads,
 * the overview, and the three MCP-local ones). The other fifteen are checked against a real route
 * response in `src/__tests__/integration/agent/*` via `expectValidToolOutput` — the same helper this
 * file uses, so both paths validate through one implementation.
 */
import { describe, it, expect } from 'vitest'
import {
  MCP_TOOLS,
  MCP_TOOL_NAMES,
  MCP_TOOL_OUTPUT_ZOD,
  getMcpTool,
  type JsonSchemaNode,
} from '@/core/mcp/tools'
import { expectValidToolOutput } from '../../utils/mcp-output-schema'

/** Every object node in a schema, root included. */
function objectNodes(node: JsonSchemaNode, found: JsonSchemaNode[] = []): JsonSchemaNode[] {
  if (node.type === 'object') found.push(node)
  for (const child of Object.values((node.properties ?? {}) as Record<string, JsonSchemaNode>)) {
    objectNodes(child, found)
  }
  if (node.items) objectNodes(node.items as JsonSchemaNode, found)
  return found
}

describe('outputSchema — what every tool publishes', () => {
  it('gives all 22 tools an object-rooted schema', () => {
    expect(MCP_TOOLS).toHaveLength(22)
    for (const tool of MCP_TOOLS) {
      expect(tool.outputSchema, `${tool.name} has no outputSchema`).toBeDefined()
      expect(tool.outputSchema?.type, tool.name).toBe('object')
      expect(Object.keys(tool.outputSchema?.properties ?? {}).length, tool.name).toBeGreaterThan(0)
    }
  })

  it('⭐ leaves every object OPEN, so a field added later cannot break a connected client', () => {
    // This is the one deliberate departure from how `inputSchema` is generated. An input is closed
    // because an unexpected argument is a caller mistake worth reporting; an output is open because
    // the client is not the party that can fix a field it did not expect.
    for (const tool of MCP_TOOLS) {
      for (const node of objectNodes(tool.outputSchema as JsonSchemaNode)) {
        expect(node.additionalProperties, `${tool.name} has a closed object node`).toBe(true)
      }
    }
  })

  it('emits no $schema or $ref — the schema is embedded, not served', () => {
    for (const tool of MCP_TOOLS) {
      const serialized = JSON.stringify(tool.outputSchema)
      expect(serialized, tool.name).not.toContain('$schema')
      expect(serialized, tool.name).not.toContain('$ref')
      expect(serialized, tool.name).not.toContain('definitions')
    }
  })

  it('declares one answer shape per advertised tool name, and no orphans', () => {
    expect(Object.keys(MCP_TOOL_OUTPUT_ZOD).sort()).toEqual([...MCP_TOOL_NAMES].sort())
  })

  it('marks the optional-only fields optional: warning, idempotent_replay, note', () => {
    // Each is PRESENT ONLY ON ONE PATH (an access failure, a replay, an empty list). A schema that
    // required them would reject the ordinary answer; one that omitted them would reject the
    // exceptional one — which is the answer the user most needs to hear.
    const publish = getMcpTool('publish_artifact')?.outputSchema
    expect(publish?.properties).toHaveProperty('warning')
    expect(publish?.properties).toHaveProperty('idempotent_replay')
    expect(publish?.required).not.toContain('warning')
    expect(publish?.required).not.toContain('idempotent_replay')

    const create = getMcpTool('create_short_link')?.outputSchema
    expect(create?.required).toEqual(['created'])

    const orgs = getMcpTool('list_orgs')?.outputSchema
    expect(orgs?.properties).toHaveProperty('note')
    expect(orgs?.required).toEqual(['organizations'])
  })

  it('keeps a nullable field nullable rather than dropping the null', () => {
    // `short_url` is null for a draft and `next_cursor` is null on the last page. A schema that
    // said plain "string" would make a client reject the end of every list.
    const artifact = getMcpTool('get_artifact')?.outputSchema
    expect(artifact?.properties?.short_url).toEqual({ type: ['string', 'null'] })
    const list = getMcpTool('list_artifacts')?.outputSchema
    expect(list?.properties?.next_cursor).toEqual({ type: ['string', 'null'] })
  })
})

describe('outputSchema — the six tools with no route test of their own', () => {
  it('get_org_overview', () => {
    expectValidToolOutput('get_org_overview', {
      org_name: 'Acme',
      plan: 't2',
      touch_point_count: 3,
    })
  })

  it('get_analytics_summary, including the zeroed fallback a data-less org gets', () => {
    const metric = { value: 0, change_pct: 0, trend: 'stable' }
    expectValidToolOutput('get_analytics_summary', {
      period_days: 30,
      link_clicks: metric,
      qr_scans: metric,
      nfc_taps: metric,
      total_visits: metric,
      unique_visits: metric,
      touchpoints_active: 0,
    })
  })

  it('get_clicks_timeseries, in both granularities', () => {
    const bucket = {
      start: '2026-10-01',
      link_clicks: 4,
      qr_scans: 2,
      nfc_taps: 0,
      total_interactions: 6,
    }
    expectValidToolOutput('get_clicks_timeseries', {
      period_days: 30,
      granularity: 'daily',
      buckets: [bucket],
      summary: {
        peak: { start: '2026-10-01', interactions: 6 },
        trend_direction: 'up',
        buckets_with_activity: 1,
      },
    })
    // The empty org: `bucketDaily([])` and the `{ start: '', interactions: 0 }` peak fallback.
    expectValidToolOutput('get_clicks_timeseries', {
      period_days: 90,
      granularity: 'weekly',
      buckets: [],
      summary: {
        peak: { start: '', interactions: 0 },
        trend_direction: 'stable',
        buckets_with_activity: 0,
      },
    })
  })

  it('list_orgs, with and without the empty-list note', () => {
    expectValidToolOutput('list_orgs', {
      organizations: [{ id: 'org-1', name: 'Acme', has_mcp_access: true }],
    })
    expectValidToolOutput('list_orgs', {
      organizations: [],
      note: 'This user is not a member of any organization.',
    })
  })

  it('find_li2_docs and get_doc_page', () => {
    expectValidToolOutput('find_li2_docs', {
      query: 'deep link',
      results: [
        {
          title: 'Deep links',
          path: '/vi/deep-links/overview.md',
          url: 'https://docs.li2.ai/vi/deep-links/overview.md',
          description: 'How deep links work',
        },
      ],
    })
    expectValidToolOutput('find_li2_docs', {
      query: 'nothing matches this',
      results: [],
      note: 'No Li2 documentation page matched.',
    })
    expectValidToolOutput('get_doc_page', {
      path: '/vi/deep-links/overview.md',
      title: 'Deep links',
      url: 'https://docs.li2.ai/vi/deep-links/overview.md',
      content: '# Deep links\n\nPlain markdown.',
    })
  })
})

describe('the assertion itself can fail — otherwise the 21 calls above prove nothing', () => {
  it('rejects a payload missing a required field', () => {
    expect(() =>
      expectValidToolOutput('get_org_overview', { org_name: 'Acme', plan: 't2' })
    ).toThrow(/touch_point_count/)
  })

  it('⭐ rejects a field no schema declares, even though the shipped schema allows it', () => {
    // The shipped schema is open on purpose (see above), so Zod is what catches this — strict in the
    // repo, forgiving on the wire.
    expect(() =>
      expectValidToolOutput('get_org_overview', {
        org_name: 'Acme',
        plan: 't2',
        touch_point_count: 3,
        internal_user_id: 'leaked',
      })
    ).toThrow(/internal_user_id/)
  })

  it('rejects a null where the schema says a plain string', () => {
    expect(() =>
      expectValidToolOutput('get_org_overview', {
        org_name: null,
        plan: 't2',
        touch_point_count: 3,
      })
    ).toThrow(/org_name/)
  })
})
