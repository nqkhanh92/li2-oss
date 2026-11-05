/**
 * ============================================================================
 * MCP tool descriptors — the tool list a third-party MCP client sees (Phase 2).
 * ============================================================================
 *
 * EXACTLY 18 tools (9 from Phase 2 + `publish_artifact` / `update_artifact` from wave 3 +
 * `get_artifact` / `list_artifacts` / `delete_artifact` from wave 4 WP1 +
 * `set_artifact_access` / `set_artifact_slug` from wave 4 WP2 +
 * `list_short_links` / `get_short_link` from SL-1, `delete_short_link` from SL-3). `search_docs`
 * is deliberately NOT one of them: in li2-ai it is not a data call
 * but a trigger into a 3-LLM-call pipeline (nav → gate → synthesize) that we pay for, and it has no
 * back-hop route at all — advertising it would promise a tool that does not exist. `find_li2_docs`
 * + `get_doc_page` cover the need instead, and the different names are collision insurance for the
 * day li2-ai itself consumes this server (plan §4.2, §4.3).
 *
 * WHY JSON SCHEMA AND NOT ZOD (Phase 0.1): `@modelcontextprotocol/sdk` bundles its OWN nested
 * zod 4, because this app's `3.25.0-canary` prerelease fails the SDK's `^3.25` range. App-side zod
 * objects must therefore never reach the SDK. Plain JSON Schema is the only safe way across that
 * boundary — which is the entire reason this file exists.
 *
 * WHY GENERATED AND NOT HAND-WRITTEN: `src/shared/schemas/agent-tools.ts` is a CROSS-REPO contract
 * — li2-ai mirrors it field-by-field as Pydantic in `app/execution/registry.py`. Hand-copying the
 * shapes here would create a third definition to keep in sync. Generate from it, never edit it.
 *
 * WHAT THIS LAYER ADDS ON TOP:
 *   1. `org_id` on the 6 data tools (plan §4.1 multi-org grant). It is an MCP-only concept — on the
 *      back hop the org travels in the PASETO, not the body — so it is injected HERE and must NOT
 *      be added to the shared Zod.
 *   2. Field descriptions. The shared Zod carries none and cannot be given any (see above), so the
 *      wording a model reads is owned here.
 *   3. Tool descriptions, rewritten from scratch. li2-ai's `TOOLS` text is full of instructions to
 *      its own loop ("never draw the chart as ASCII") that are false for an MCP client.
 *
 * ⚠️ REFINEMENTS ARE LOST IN TRANSLATION. JSON Schema keeps structure, not `.refine`/`.superRefine`.
 * Four rules disappear here and are re-enforced server-side by the route's own `safeParse`:
 *   - create_short_link: `utm_source` required when any other UTM field is set
 *   - create_short_link: destination URL validity + blacklist
 *   - get_link_details: at least one of `id` / `slug`
 *   - get_short_link / get_artifact: EXACTLY one of the two lookup keys
 * Each is restated in prose in the relevant `description` so a model can still get it right first
 * try; a model that ignores the prose gets a clean 400, not corrupt data.
 *
 * ⭐ P0.4 REVERSED THE v1 DECISION ON `outputSchema`. It used to be a non-goal (plan §1.4, §8) on the
 * grounds that tool outputs were plain TS interfaces and backfilling Zod was work for nothing. Two
 * things changed: the spec made `outputSchema` the way a client learns a payload's shape without
 * calling the tool, and the interfaces were converted to Zod with the TYPES INFERRED FROM THEM — so
 * there is still exactly one declaration per shape, and `toOutputJsonSchema` generates from it. Every
 * tool in `MCP_TOOL_NAMES` now publishes one.
 */
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ARTIFACT_QUOTA_FREE_BYTES, ARTIFACT_QUOTA_FREE_LIVE } from '@/core/types/artifact.type'
import type { ZodTypeAny } from 'zod'
import {
  periodDaysQuerySchema,
  topLinksQuerySchema,
  linkDetailsQuerySchema,
  createShortLinkInputSchema,
  publishArtifactInputSchema,
  updateArtifactInputSchema,
  getArtifactInputSchema,
  listArtifactsInputSchema,
  deleteArtifactInputSchema,
  setArtifactAccessInputSchema,
  setArtifactSlugInputSchema,
  listShortLinksInputSchema,
  getShortLinkInputSchema,
  updateShortLinkInputSchema,
  setShortLinkSlugInputSchema,
  deleteShortLinkInputSchema,
  BULK_MAX,
  // ⭐ P0.4 — the OUTPUT shapes. Same file, same rule as the inputs: generated, never hand-written.
  analyticsSummarySchema,
  artifactDetailResultSchema,
  artifactListResultSchema,
  artifactToolResultSchema,
  clicksTimeseriesSchema,
  createShortLinkOutputSchema,
  deleteArtifactResultSchema,
  deleteShortLinkResultSchema,
  docPageResultSchema,
  findDocsResultSchema,
  linkDetailsSchema,
  listOrgsResultSchema,
  orgOverviewSchema,
  publishArtifactOutputSchema,
  publishDraftArtifactInputSchema,
  publishDraftArtifactOutputSchema,
  setArtifactAccessResultSchema,
  shortLinkListResultSchema,
  shortLinkSchema,
  topLinksSchema,
  updateShortLinkResultSchema,
  updatedArtifactSchema,
} from '@/shared/schemas/agent-tools'
import { annotationsFor, type McpToolAnnotations } from './tool-registry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A JSON Schema node. Deliberately loose — this is data crossing a language boundary, not a model. */
export type JsonSchemaNode = { [key: string]: unknown }

/** The object-shaped root MCP requires for every `inputSchema`. */
export interface JsonSchemaObject extends JsonSchemaNode {
  type: 'object'
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  additionalProperties?: boolean
  /** Present only for `create_short_link`, whose source Zod is a discriminated union. */
  anyOf?: JsonSchemaObject[]
}

/**
 * How Phase 4 reaches the implementation.
 *
 * `back-hop` is the default and the reversibility contract (plan §3): the tool layer speaks HTTP to
 * `/api/agent/tools/*`, never imports a service. The union is split by method so a GET can never be
 * paired with a body by accident.
 *
 * `mcp-local` marks the sanctioned seam exceptions — tools served at the MCP layer itself because
 * no back-hop route can serve them. There are exactly THREE exceptions (§3) spread over FOUR
 * `mcp-local` entries: the org check inside `call-tool.ts`, `list_orgs`, and the docs pair
 * `find_li2_docs` + `get_doc_page`, which are one exception because they are one file reaching one
 * public origin (§4.3). §3 forbids a fourth without amending the plan.
 */
export type McpToolTransport =
  | { kind: 'back-hop'; method: 'GET'; path: string; argsIn: 'query' }
  | { kind: 'back-hop'; method: 'POST'; path: string; argsIn: 'json-body' }
  | { kind: 'mcp-local' }

export const MCP_TOOL_NAMES = [
  'get_org_overview',
  'get_analytics_summary',
  'get_clicks_timeseries',
  'get_top_links',
  'get_link_details',
  'create_short_link',
  'list_orgs',
  'find_li2_docs',
  'get_doc_page',
  // Wave 3, appended at the END on purpose: `tools/list` keeps array order and a stable prefix is a
  // prompt-cache hit for the model behind every connected client.
  'publish_artifact',
  'update_artifact',
  // Wave 4 WP1, appended at the END for the same reason as the two above.
  'get_artifact',
  'list_artifacts',
  'delete_artifact',
  // Wave 4 WP2, appended at the END for the same reason again.
  'set_artifact_access',
  'set_artifact_slug',
  // SL-1, appended at the END for the same reason as every wave before it.
  'list_short_links',
  'get_short_link',
  // SL-2's two writes, appended after SL-1's reads for the same reason again.
  'update_short_link',
  'set_short_link_slug',
  // SL-3, appended at the END for the same reason again.
  'delete_short_link',
  /**
   * Chat-1 (2026-10-29), nối vào CUỐI vì đúng lý do `tools.ts:140` đã nêu: `tools/list` giữ nguyên
   * thứ tự mảng, nên một tiền tố ổn định là một lần trúng cache prompt cho mọi client đang nối.
   *
   * Sinh ra từ dock chat: `publish_artifact` chỉ nhận HTML dạng chữ, nên một file PDF kéo vào khung
   * chat không có tool nào đỡ.
   */
  'publish_draft_artifact',
] as const
export type McpToolName = (typeof MCP_TOOL_NAMES)[number]

export interface McpToolDescriptor {
  name: McpToolName
  /**
   * The short human-readable label a client shows instead of `name` — "Publish artifact" rather than
   * `publish_artifact` (MCP `BaseMetadata.title`). REQUIRED here although the spec makes it optional:
   * both directory reviews list it, and a tool list where some rows read as prose and others as
   * identifiers looks broken in a permission dialog. A few words naming the capability — every
   * caveat stays in `description`, which is what the model reads.
   */
  title: string
  description: string
  inputSchema: JsonSchemaObject
  /**
   * The OAuth scope the grant must carry. Phase 4 HIDES a tool the token lacks the scope for rather
   * than rejecting it on call — a read-only grant must not advertise `create_short_link`.
   */
  requiredScope: 'read' | 'write'
  /**
   * ⭐ P0.4 — the shape of the SUCCESS payload, published so a client can validate what it got and a
   * model knows which fields exist before it calls. Optional on the type because the spec makes it
   * optional and a future tool may be added before its answer has a schema; every tool in
   * `MCP_TOOL_NAMES` has one today, and `tools.test.ts` holds that line.
   *
   * ⚠️ IT BINDS `structuredContent`. The spec says a tool that declares an `outputSchema` MUST
   * return `structuredContent` that validates against it — so `call-tool.ts` sends one on every
   * success, and an ERROR result sends none (an error payload is not of this shape). Adding a field
   * to a route's response without adding it here is therefore a real break, not a documentation gap.
   */
  outputSchema?: JsonSchemaObject
  transport: McpToolTransport
  /**
   * The MCP hints a client reads to decide whether to ask the human first, and whether a retry is
   * safe. NOT authored here — derived from `tool-registry.ts`, which is the one place that says what
   * a tool does to the data (WP1 §1).
   */
  annotations: McpToolAnnotations
}

/**
 * A descriptor as it is written below. `annotations` is attached from the registry and
 * `outputSchema` is generated from `MCP_TOOL_OUTPUT_ZOD` — neither is ever written by hand.
 */
type McpToolDescriptorSource = Omit<McpToolDescriptor, 'annotations' | 'outputSchema'>

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

/**
 * `$refStrategy: 'none'` inlines every subschema: `$ref`/`definitions` support across MCP clients is
 * uneven, and none of these schemas is recursive so inlining is free. `$schema` is dropped because
 * an `inputSchema` is embedded in a tool descriptor, not a standalone document.
 */
function toJsonSchema(schema: ZodTypeAny): JsonSchemaObject {
  const generated = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' })
  const { $schema: _dropped, ...rest } = generated as JsonSchemaNode
  return rest as JsonSchemaObject
}

/**
 * ⭐ P0.4 — an `outputSchema`, generated from the same Zod the route's TypeScript is inferred from.
 *
 * ⚠️ THE ONE DIFFERENCE FROM `toJsonSchema`: every object node is reopened with
 * `additionalProperties: true`. zod-to-json-schema closes a `z.object()` because Zod STRIPS unknown
 * keys on parse — correct for an input, wrong for an output. An output schema is a promise to a
 * CLIENT about what it must accept, and the spec has clients validate `structuredContent` against
 * it; a closed schema means the first field a route adds makes every strict client reject a payload
 * the server considers perfectly correct. Open, the same field is simply not validated until it is
 * declared here. Required fields and types are unaffected, so the drift this layer exists to catch
 * (a field REMOVED or retyped) still fails loudly.
 */
function toOutputJsonSchema(schema: ZodTypeAny): JsonSchemaObject {
  return reopen(toJsonSchema(schema)) as JsonSchemaObject
}

function reopen(node: JsonSchemaNode): JsonSchemaNode {
  const next: JsonSchemaNode = { ...node }
  if (next.type === 'object') next.additionalProperties = true
  if (next.properties) {
    const properties: Record<string, JsonSchemaNode> = {}
    for (const [key, value] of Object.entries(next.properties as Record<string, JsonSchemaNode>)) {
      properties[key] = reopen(value)
    }
    next.properties = properties
  }
  if (next.items) next.items = reopen(next.items as JsonSchemaNode)
  return next
}

/**
 * Attach descriptions to generated fields.
 *
 * Throws on an unknown key ON PURPOSE: these descriptors are module-level constants, so a field
 * renamed in the shared Zod fails at import (and in the Phase 2 test) instead of silently shipping a
 * tool whose most important parameter has lost its explanation.
 */
function describeFields<T extends JsonSchemaObject>(
  schema: T,
  descriptions: Record<string, string>
): T {
  const properties: Record<string, JsonSchemaNode> = { ...(schema.properties ?? {}) }
  for (const [key, description] of Object.entries(descriptions)) {
    const node = properties[key]
    if (!node) throw new Error(`describeFields: generated schema has no property "${key}"`)
    properties[key] = { ...node, description }
  }
  return { ...schema, properties }
}

/**
 * Describe a property that is itself an object, AND its own fields (`publish_artifact.access`).
 *
 * `describeFields` only reaches the top level, so without this the nested `mode` and `password`
 * would be the only arguments in the whole surface a model is handed with no explanation — and
 * `password` is the one field whose rule (8–128) is not expressible in the schema at all.
 * Throws on an unknown key for the same reason `describeFields` does.
 */
function describeObjectField<T extends JsonSchemaObject>(
  schema: T,
  key: string,
  description: string,
  inner: Record<string, string>
): T {
  const node = schema.properties?.[key] as JsonSchemaObject | undefined
  if (!node) throw new Error(`describeObjectField: generated schema has no property "${key}"`)
  return {
    ...schema,
    properties: {
      ...schema.properties,
      [key]: { ...describeFields(node, inner), description },
    },
  }
}

/** Pick one branch of `create_short_link`'s union by its discriminator, loudly. */
function branchByMode(schema: JsonSchemaObject, mode: string): JsonSchemaObject {
  const branch = schema.anyOf?.find(
    (b) => (b.properties?.mode as JsonSchemaNode | undefined)?.const === mode
  )
  if (!branch) throw new Error(`branchByMode: generated union has no "${mode}" branch`)
  return branch
}

const ORG_ID_FIELD: JsonSchemaNode = {
  type: 'string',
  description:
    'The Li2 organization to act on. Get valid ids from list_orgs — never invent or guess one, and never reuse an id the user typed without checking it against list_orgs.',
}

function addOrgIdToObject(schema: JsonSchemaObject): JsonSchemaObject {
  return {
    ...schema,
    type: 'object',
    properties: { org_id: ORG_ID_FIELD, ...(schema.properties ?? {}) },
    required: ['org_id', ...(schema.required ?? [])],
  }
}

/**
 * Add the required `org_id` argument (plan §4.1).
 *
 * ⚠️ Phase 4 (`call-tool.ts`) MUST STRIP `org_id` FROM THE ARGS BEFORE FORWARDING. It is not part of
 * the back-hop contract: `/api/agent/tools/*` reads the org from `agent.orgId` in the PASETO, and
 * `create-short-link` parses its body with `.strict()`, so a leftover `org_id` is a 400. The MCP
 * layer's job is: read `org_id` → check membership + `MCP_ACCESS` → mint the token with it → delete
 * it from the args → forward.
 *
 * The union case cannot take `org_id` at the root. `anyOf` subschemas are each validated against the
 * WHOLE object, and both branches carry `additionalProperties: false`, so a root-level `org_id`
 * would fail every branch. It goes inside each branch instead.
 */
function withOrgId(schema: JsonSchemaObject): JsonSchemaObject {
  if (schema.anyOf) {
    return {
      ...schema,
      type: 'object', // the generated union root has no `type`; MCP requires one
      anyOf: schema.anyOf.map(addOrgIdToObject),
    }
  }
  return addOrgIdToObject(schema)
}

/** A schema for a tool whose only argument is the one this layer adds. */
function orgIdOnlySchema(): JsonSchemaObject {
  return withOrgId({ type: 'object', properties: {}, additionalProperties: false })
}

// ---------------------------------------------------------------------------
// Generated input schemas
// ---------------------------------------------------------------------------

const PERIOD_DAYS_DESCRIPTION =
  'How many days back to measure, counting back from today. Defaults to 30, maximum 90.'

const analyticsSummaryInput = withOrgId(
  describeFields(toJsonSchema(periodDaysQuerySchema), {
    period_days: PERIOD_DAYS_DESCRIPTION,
  })
)

const clicksTimeseriesInput = withOrgId(
  describeFields(toJsonSchema(periodDaysQuerySchema), {
    period_days: `${PERIOD_DAYS_DESCRIPTION} 31 or fewer gives daily buckets; more gives weekly ones.`,
  })
)

const topLinksInput = withOrgId(
  describeFields(toJsonSchema(topLinksQuerySchema), {
    period_days: PERIOD_DAYS_DESCRIPTION,
    limit: 'How many links to return, best first. Defaults to 5, maximum 20.',
  })
)

const linkDetailsInput = withOrgId(
  describeFields(toJsonSchema(linkDetailsQuerySchema), {
    id: 'The touch point id, exactly as returned by get_top_links. Preferred — it is an exact lookup.',
    slug: 'Fallback when no id is available: the slug, short code, or name of the link. An ambiguous name is rejected rather than guessed.',
  })
)

// The union survives generation; the refinement on top of it does not (see the file header).
const createShortLinkGenerated = toJsonSchema(createShortLinkInputSchema)
const createShortLinkInput = withOrgId({
  ...createShortLinkGenerated,
  anyOf: [
    describeFields(branchByMode(createShortLinkGenerated, 'single'), {
      mode: 'Use "single" to create one link. This is the only mode that accepts any setting below.',
      destination_url:
        'Where the link sends people. A bare host like "example.com" is accepted and becomes https://.',
      slug: 'Custom ending for the short URL: 6-64 characters, lowercase letters, digits, and single hyphens. Omit it to have one generated.',
      name: 'Internal label shown in the Li2 app, up to 64 characters. Not visible to visitors.',
      password:
        'Require this password before the link resolves. No whitespace, up to 256 characters.',
      expires_at:
        'When the link stops working, as an ISO 8601 timestamp with an offset, e.g. "2026-12-31T23:59:59+07:00". Must be in the future.',
      utm_source:
        'UTM source appended to the destination. Required as soon as any UTM field is set.',
      utm_medium: 'UTM medium appended to the destination.',
      utm_campaign: 'UTM campaign appended to the destination.',
      utm_term: 'UTM term appended to the destination.',
      utm_content: 'UTM content appended to the destination.',
      idempotency_key:
        'Your own name for this create attempt, so a retry after a lost answer returns the link that was already created instead of a second one. Letters, digits and . _ : - only, up to 128 characters. Send one whenever you may have to retry, and reuse the SAME value on every retry of the same call; a new value, or none, always creates new links.',
    }),
    describeFields(branchByMode(createShortLinkGenerated, 'bulk'), {
      mode: 'Use "bulk" to create several links at once. No slug, name, UTM, password, or expiry is available in this mode.',
      destinations: `The destination URLs, 2 to ${BULK_MAX} of them. Each gets a generated slug. For a single URL use mode "single" instead.`,
      idempotency_key:
        'Your own name for this create attempt, exactly as in "single" mode — and it matters more here, because a retried bulk call would otherwise create a second copy of every link in it.',
    }),
  ],
})

/**
 * Hand-written, unlike the six above: `list_orgs` has no back-hop route and therefore no entry in
 * the shared Zod. It takes no arguments — the user is fixed by the OAuth grant.
 */
const listOrgsInput: JsonSchemaObject = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

/**
 * Hand-written for the same reason (plan §4.2): the docs index is public and has no back-hop route,
 * so no shared Zod describes it. Phase 4's `find-docs.ts` owns its own validation.
 */
const findLi2DocsInput: JsonSchemaObject = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description:
        'Words to match against documentation page titles and descriptions, e.g. "deep link setup" or "QR code tracking". Plain keywords work better than a full sentence.',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 20,
      default: 5,
      description: 'How many pages to return. Defaults to 5, maximum 20.',
    },
  },
  required: ['query'],
  additionalProperties: false,
}

/**
 * Hand-written for the same reason again (plan §4.3).
 *
 * ⛔ THERE IS NO `url` FIELD AND THERE MUST NEVER BE ONE. A `url` argument would mean fetching a
 * model-supplied string, which is the SSRF shape Phase 3a's CIMD fetcher needed heavy hardening for.
 * `path` is looked up in the map built from our own parse of the manifest, so the URL fetched is
 * always one we produced. Adding `url` here would delete that property in a single line.
 */
const getDocPageInput: JsonSchemaObject = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      minLength: 1,
      description:
        'The "path" field of a find_li2_docs result, copied exactly, e.g. "/vi/deep-links/overview.md". A URL is not accepted, and any path that did not come from find_li2_docs is rejected.',
    },
  },
  required: ['path'],
  additionalProperties: false,
}

/**
 * The access block's own two fields, shared by `publish_artifact.access` and `set_artifact_access`
 * (WP2) so the two tools cannot describe the same argument differently.
 *
 * The 8–128 rule is PROSE here and nowhere in the schema, deliberately — see the comment above
 * `artifactAccessInputSchema`. `google` says it may be refused because it is gated on a server env
 * var (`availableAccessModes`), so on a Li2 instance without that OAuth client the mode does not
 * exist and the call is a 400 a model cannot predict from the enum alone.
 */
const ACCESS_FIELD_DESCRIPTIONS: Record<string, string> = {
  mode: 'Who may open the page. "public": anyone with the link. "password": anyone who types the password you set. "private": only signed-in members of this Li2 organization. "google": anyone with a Google account, and their email is recorded for the owner — this one is switched off on some Li2 servers and is then refused, so fall back to "password".',
  password:
    'Required when mode is "password", ignored otherwise. 8 to 128 characters. Li2 stores only a one-way hash and NEVER returns it, not even to you, so say the password to the user in your reply — if you lose it the only fix is setting a new one.',
}

/**
 * The two MCP-only artifact tools (wave 3, spec artifact-wave3-mcp-publish R1/R2). Generated from the
 * shared Zod like the six above; `org_id` is added here and stripped before the hop like theirs.
 * The byte limit is deliberately NOT in the schema (`.max()` counts characters, the limit is UTF-8
 * bytes) — it is stated in the field description and enforced by the service.
 */
const publishArtifactInput = withOrgId(
  describeObjectField(
    describeFields(toJsonSchema(publishArtifactInputSchema), {
      name: 'Label shown in the Li2 dashboard, 1–64 characters. Not visible to visitors.',
      html: 'The complete HTML document, as plain text. UTF-8 size must not exceed 10 MB. Not base64.',
      slug: 'Custom ending for the short URL: 6-64 characters, lowercase letters, digits, and single hyphens. Omit it to have one generated.',
      domain_id:
        "Id of a custom domain the organization owns, as a UUID. Omit to use the organization's default domain.",
      idempotency_key:
        'Your own identifier for this one publish, 1-128 characters from letters, digits and . _ : - . Send the SAME value when you retry a call that timed out or failed with a network error, and Li2 returns the artifact it already created instead of publishing a second one. Use a NEW value for every page you genuinely want published. Omit it if you are not retrying.',
    }),
    'access',
    'Who may open the page. Omit it and the page is PUBLIC — that is the default and what every publish did before this field existed. The access mode is applied immediately after the page goes live, so if it cannot be applied the page stays public and the response carries a "warning" field; read it and tell the user.',
    ACCESS_FIELD_DESCRIPTIONS
  )
)

const publishDraftArtifactInput = withOrgId(
  describeObjectField(
    describeFields(toJsonSchema(publishDraftArtifactInputSchema), {
      artifact_id:
        'The artifact_id of a DRAFT the user already uploaded in this conversation. Must belong to org_id.',
      slug: 'Custom ending for the short URL: 6-64 characters, lowercase letters, digits, and single hyphens. Omit it to have one generated.',
      domain_id:
        "Id of a custom domain the organization owns, as a UUID. Omit to use the organization's default domain.",
    }),
    'access',
    'Who may open the page once it goes live. Omit it and the page is PUBLIC. Unlike publish_artifact, the access mode here is written BEFORE the page becomes reachable, so there is no moment when a locked page is briefly public and no "warning" field to check.',
    ACCESS_FIELD_DESCRIPTIONS
  )
)

const updateArtifactInput = withOrgId(
  describeFields(toJsonSchema(updateArtifactInputSchema), {
    artifact_id:
      'The artifact_id returned by publish_artifact (or shown in the Li2 dashboard). Must belong to org_id.',
    html: 'The complete HTML document, as plain text. UTF-8 size must not exceed 10 MB. Not base64.',
  })
)

/**
 * The three wave-4 artifact tools. Generated from the shared Zod like the rest; `org_id` is added
 * here and stripped before the hop.
 *
 * The `artifact_id` XOR `slug` rule of `get_artifact` is a `.refine` and does NOT survive generation
 * (see the file header) — both keys are advertised optional and the rule is stated in the tool's
 * description, exactly as `get_link_details` does with its own id-or-slug rule.
 */
const getArtifactInput = withOrgId(
  describeFields(toJsonSchema(getArtifactInputSchema), {
    artifact_id:
      'The artifact_id returned by publish_artifact or list_artifacts. Preferred — an exact lookup.',
    slug: 'The ending of the artifact\'s short URL or public address, e.g. "bang-gia-t10". Any slug the artifact has ever answered on works, including one it was renamed away from.',
  })
)

const listArtifactsInput = withOrgId(
  describeFields(toJsonSchema(listArtifactsInputSchema), {
    cursor:
      'Pass the `next_cursor` of a previous call, copied exactly, to get the next page. Omit it for the first page. Treat it as opaque — it is not a page number and its contents may change.',
    limit: 'How many artifacts to return, newest first. Defaults to 20, maximum 50.',
  })
)

const deleteArtifactInput = withOrgId(
  describeFields(toJsonSchema(deleteArtifactInputSchema), {
    artifact_id:
      'The artifact_id of the artifact to take down, as returned by list_artifacts or publish_artifact. Must belong to org_id.',
  })
)

/**
 * The two wave-4 WP2 tools. Both are flat objects generated from the shared Zod.
 *
 * `set_artifact_slug.slug` carries `anyOf [{minLength 6, maxLength 64}, {const ""}]` because the
 * shared `slugSchema` accepts an empty string and maps it to `undefined` — harmless for the five
 * tools where the slug is optional, and for THIS one the `.refine` makes `""` a 400. The field
 * description says so, since the generated schema cannot.
 */
const setArtifactAccessInput = withOrgId(
  describeFields(toJsonSchema(setArtifactAccessInputSchema), {
    artifact_id:
      'The artifact_id returned by publish_artifact, get_artifact or list_artifacts. Must belong to org_id.',
    ...ACCESS_FIELD_DESCRIPTIONS,
  })
)

const setArtifactSlugInput = withOrgId(
  describeFields(toJsonSchema(setArtifactSlugInputSchema), {
    artifact_id:
      'The artifact_id of a PUBLISHED artifact. A page that was never published has no link to rename and is rejected.',
    slug: 'The new ending for the short URL: 6-64 characters, lowercase letters, digits, and single hyphens, and it must not start with "f-". It has to be free across all of Li2 — a slug already in use is refused. An empty string is not accepted.',
  })
)

/**
 * The two SL-1 reads.
 *
 * `tag_ids` generates as an array of uuid strings; the description has to say that the ids come from
 * elsewhere in Li2, because there is no tool that lists tags and a model will otherwise invent one.
 */
const listShortLinksInput = withOrgId(
  describeFields(toJsonSchema(listShortLinksInputSchema), {
    cursor:
      'Pass the `next_cursor` of a previous call, copied exactly, to get the next page. Omit it for the first page. Treat it as opaque — it is not a page number and its contents may change.',
    limit: 'How many links to return, newest first. Defaults to 20, maximum 50.',
    search:
      "Optional text matched against the link's name, its custom slug and its generated code. Not a search of the destination URL and not a semantic search.",
    collection_id:
      'Optional: return only links in this Li2 collection. You can only learn a collection id from a link you have already read; do not guess one.',
    tag_ids:
      'Optional: return only links carrying at least one of these tag ids. Tag ids are uuids from the Li2 dashboard — there is no tool that lists them, so only use ids the user supplied.',
  })
)

const getShortLinkInput = withOrgId(
  describeFields(toJsonSchema(getShortLinkInputSchema), {
    id: 'The link id, as returned by list_short_links, create_short_link or get_top_links. Preferred — it is an exact lookup.',
    slug: "The ending of the short URL, or the link's generated code or name. An ending the link used to have still resolves. A name shared by several links is rejected rather than guessed.",
  })
)

/**
 * The two SL-2 writes.
 *
 * `update_short_link` is the only tool on the surface with TWO nested objects, so both go through
 * `describeObjectField`: the generated schema carries their field names and lengths but cannot say
 * that `null` means "remove" or that UTM parameters are inert without a source, and those are the
 * two things a model gets wrong unprompted.
 */
const updateShortLinkInput = withOrgId(
  describeObjectField(
    describeObjectField(
      describeFields(toJsonSchema(updateShortLinkInputSchema), {
        id: 'The link id, as returned by list_short_links, get_short_link, create_short_link or get_top_links. Must belong to org_id.',
        destination_url:
          'The new address people should land on. Replaces the current destination for every scan and click from the moment the call returns, including every QR code already printed.',
        name: "The link's label inside Li2, 4 to 64 characters. Visible to the organization's members only; it is not part of the link and changing it changes nothing a visitor sees.",
        enabled:
          'false switches the link off: every scan then sees a not-found page while the link, its slug and its statistics all stay. true switches it back on, and the destination works again immediately. This is the ONLY reversible way to take a link out of service.',
      }),
      'utm',
      'Campaign tracking parameters appended to the destination URL. Only the parameters you pass are changed; the rest keep their current values. They are appended only once a source is set, so a patch that would leave this link with no source is rejected.',
      {
        source: 'utm_source — where the traffic comes from, e.g. "facebook". Up to 60 characters.',
        medium: 'utm_medium — the channel, e.g. "qr" or "cpc". Up to 60 characters.',
        campaign: 'utm_campaign — the campaign name, e.g. "tet-2027". Up to 60 characters.',
        term: 'utm_term — the paid keyword. Up to 255 characters.',
        content: 'utm_content — which creative or placement. Up to 255 characters.',
      }
    ),
    'access_control',
    'Who may open the link. Pass only the keys you want to change; pass null to REMOVE one.',
    {
      password:
        'A password a visitor must type before being redirected. Li2 never returns it, so tell the user the password in your reply. Pass null to remove the password and make the link open to anyone. Must not contain spaces.',
      expires_at:
        'An ISO 8601 timestamp with a time zone offset, e.g. "2027-01-31T23:59:59+07:00", after which the link stops redirecting. Pass null to remove the expiry. A time already in the past retires the link immediately.',
    }
  )
)

const setShortLinkSlugInput = withOrgId(
  describeFields(toJsonSchema(setShortLinkSlugInputSchema), {
    id: 'The link id, as returned by list_short_links, get_short_link, create_short_link or get_top_links. Must belong to org_id.',
    slug: 'The new ending for the short URL: 6-64 characters, lowercase letters, digits and single hyphens, and it must not start with "f-". It has to be free across all of Li2 — a slug already in use is refused. An empty string is not accepted.',
  })
)

/**
 * ⚠️ `id` ONLY, with no tolerant `slug` twin — the opposite choice from `get_short_link` right above,
 * and the reason is in `shared/schemas/agent-tools.ts`: a slug lookup resolves names and endings a
 * link no longer uses, which is a fine way to READ a link and an unacceptable way to pick one to
 * destroy for good.
 */
const deleteShortLinkInput = withOrgId(
  describeFields(toJsonSchema(deleteShortLinkInputSchema), {
    id: 'The link id, as returned by list_short_links, get_short_link, create_short_link or get_top_links. There is no slug form of this tool: read the link first and delete it by id.',
  })
)

// ---------------------------------------------------------------------------
// Output schemas (P0.4)
// ---------------------------------------------------------------------------

/**
 * ⭐ ONE ZOD PER TOOL, KEYED BY NAME, AND EXHAUSTIVE BY TYPE. `Record<McpToolName, …>` is the whole
 * point: a tool added to `MCP_TOOL_NAMES` without an answer shape here does not compile, which is
 * the only way this map cannot quietly fall behind the tool list.
 *
 * `outputSchema` is attached in `MCP_TOOLS` below rather than written into each descriptor, exactly
 * as `annotations` is — the descriptor says what the tool IS, and both of these are derived from it.
 *
 * Exported because the route tests validate a real payload against the same Zod this schema is
 * generated from; a test that re-declared the shape would pass while the shipped schema was wrong.
 */
export const MCP_TOOL_OUTPUT_ZOD: Record<McpToolName, ZodTypeAny> = {
  get_org_overview: orgOverviewSchema,
  get_analytics_summary: analyticsSummarySchema,
  get_clicks_timeseries: clicksTimeseriesSchema,
  get_top_links: topLinksSchema,
  get_link_details: linkDetailsSchema,
  create_short_link: createShortLinkOutputSchema,
  list_orgs: listOrgsResultSchema,
  find_li2_docs: findDocsResultSchema,
  get_doc_page: docPageResultSchema,
  publish_artifact: publishArtifactOutputSchema,
  publish_draft_artifact: publishDraftArtifactOutputSchema,
  update_artifact: updatedArtifactSchema,
  get_artifact: artifactDetailResultSchema,
  list_artifacts: artifactListResultSchema,
  delete_artifact: deleteArtifactResultSchema,
  set_artifact_access: setArtifactAccessResultSchema,
  set_artifact_slug: artifactToolResultSchema,
  list_short_links: shortLinkListResultSchema,
  get_short_link: shortLinkSchema,
  update_short_link: updateShortLinkResultSchema,
  set_short_link_slug: shortLinkSchema,
  delete_short_link: deleteShortLinkResultSchema,
}

// ---------------------------------------------------------------------------
// The descriptors — one per name in MCP_TOOL_NAMES, in the same order
// ---------------------------------------------------------------------------

const MCP_TOOL_DESCRIPTORS: readonly McpToolDescriptorSource[] = [
  {
    name: 'list_orgs',
    title: 'List organizations',
    description:
      "List the Li2 organizations the connected user belongs to, with each one's id, name, and whether its plan includes MCP access. Call this first in a conversation: every other Li2 tool requires an org_id and this is the only way to learn valid ones. Organizations without MCP access are still listed, but their tools will refuse the call.",
    inputSchema: listOrgsInput,
    requiredScope: 'read',
    // Seam exception 2 of 3 (plan §4.1). It cannot go through the back hop: `withAgentAuth` requires
    // an org, and this tool exists precisely to find out which orgs there are. Phase 4 serves it
    // from the membership repository; on extraction it becomes one HTTP endpoint.
    transport: { kind: 'mcp-local' },
  },
  {
    name: 'get_org_overview',
    title: 'Organization overview',
    description:
      'Get one Li2 organization at a glance: its display name, the subscription plan it is on, and how many touch points (short links, QR codes, NFC tags) it holds. Use it to orient yourself before running analytics. It covers no time range and returns no traffic numbers — for those use get_analytics_summary.',
    inputSchema: orgIdOnlySchema(),
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/org-overview',
      argsIn: 'query',
    },
  },
  {
    name: 'get_analytics_summary',
    title: 'Analytics summary',
    description:
      "Get headline traffic totals for one Li2 organization over a recent window: link clicks, QR scans, NFC taps, total visits, and unique visits — each with the percent change against the immediately preceding window of the same length — plus how many touch points saw any activity. This is the tool for 'how are we doing' questions. It returns one number per metric for the whole window; for the day-by-day shape use get_clicks_timeseries, and for a per-link breakdown use get_top_links.",
    inputSchema: analyticsSummaryInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/analytics-summary',
      argsIn: 'query',
    },
  },
  {
    name: 'get_clicks_timeseries',
    title: 'Clicks over time',
    description:
      'Get one Li2 organization\'s interactions split into time buckets over a recent window, so you can describe trends, spikes, and quiet stretches. Buckets are daily for windows of 31 days or fewer and weekly beyond that; the response says which in its "granularity" field, so read that before calling a number a daily count. Also returns the busiest bucket and how many buckets had any activity at all.',
    inputSchema: clicksTimeseriesInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/clicks-timeseries',
      argsIn: 'query',
    },
  },
  {
    name: 'get_top_links',
    title: 'Top links',
    description:
      "Rank one Li2 organization's touch points by total interactions over a recent window and return the best performers, each with its id, name, slug, and its split of link clicks versus QR scans. Use it to answer which links are working. Pass a returned id straight to get_link_details to read that link's full configuration.",
    inputSchema: topLinksInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/top-links',
      argsIn: 'query',
    },
  },
  {
    name: 'get_link_details',
    title: 'Link details',
    description:
      "Read the full configuration of one existing touch point: its destination URL, name, slug, UTM parameters, whether it is password protected, when it expires, and a link to its page in the Li2 app. Identify it by id (preferred — take it from get_top_links) or by slug; you must supply at least one of the two or the call is rejected. Passwords are never returned, only whether one is set. This returns a link's settings, not its traffic — for traffic use get_top_links.",
    inputSchema: linkDetailsInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/link-details',
      argsIn: 'query',
    },
  },
  {
    name: 'create_short_link',
    title: 'Create short links',
    description: `Create one or more short links in a Li2 organization. Set mode to "single" for one link — the only mode that accepts a custom slug, a name, UTM parameters, a password, or an expiry date. Set mode to "bulk" to turn 2 to ${BULK_MAX} destination URLs into links in one atomic call, with generated slugs and no other settings. If you set any UTM field you must also set utm_source, or the call is rejected. Returns the id, short URL, slug, and name of every link created. This only creates links; it cannot edit or delete an existing one. Because a repeated call creates a second set of links, pass an \`idempotency_key\` of your own whenever you may have to retry: if a call times out or the connection drops, repeat it with the SAME key and you get back the links that were already created, marked \`idempotent_replay\`, instead of duplicates. A different key, or no key, always creates new links.`,
    inputSchema: createShortLinkInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/create-short-link',
      argsIn: 'json-body',
    },
  },
  {
    name: 'find_li2_docs',
    title: 'Search Li2 docs',
    description:
      'Search the public Li2 product documentation and return matching pages as title, path, url, and description. Use it for how-to and concept questions about the Li2 product itself — setting up deep links, what a touch point is, how QR tracking works — then call get_doc_page with the "path" of the page you need to actually read it. Matching is keyword-based over page titles and descriptions, not semantic, so plain keywords beat long sentences. It returns none of the organization\'s own data: for metrics use get_analytics_summary or get_top_links, and for one link\'s settings use get_link_details.',
    inputSchema: findLi2DocsInput,
    requiredScope: 'read',
    // Seam exception 3 of 3 (plan §4.2, §3), first half. It reads the PUBLIC docs.li2.ai manifest
    // directly: no identity, no org, no entitlement, so routing it through an authenticated back hop
    // would buy a hop and a token for zero security. Phase 4 implements the fetch; nothing here does.
    transport: { kind: 'mcp-local' },
  },
  {
    name: 'get_doc_page',
    title: 'Read a docs page',
    description:
      'Read one Li2 documentation page in full. Call find_li2_docs first and pass the "path" it returned for the page you want, exactly as given — this tool takes a documentation path, never a URL, and a path it did not hand you is rejected. The page is returned whole, as plain markdown; it is never shortened, so what you get is the complete page. This is how you answer a how-to question with what the documentation actually says instead of handing the user a link. It returns none of the organization\'s own data: for metrics use get_analytics_summary or get_top_links, and for one link\'s settings use get_link_details.',
    inputSchema: getDocPageInput,
    requiredScope: 'read',
    // Same exception, second half — NOT a fourth one (plan §4.3). Same file, same public origin, same
    // "no identity, no org, no entitlement". It exists because Claude Desktop refuses to fetch a URL
    // that came from a connector (Phase 6 finding F4), so links alone answer nothing.
    transport: { kind: 'mcp-local' },
  },
  {
    name: 'publish_artifact',
    title: 'Publish artifact',
    description: `Publish one HTML page as a Li2 artifact and get a short link and a QR code for it, in a single call. By default the page is public: anyone with the link can open it, with no sign-in and no password — tell the user this before you call. To lock it in the same call, pass \`access\` with a \`mode\` of "password" (and the password), "private" or "google"; if that lock cannot be applied the page is still published and LEFT PUBLIC, and the response carries a \`warning\` field saying so, which you must pass on to the user. Send the complete HTML document as text in \`html\` (UTF-8, at most 10 MB after encoding; no base64, no PDF or other formats — for those the user uploads in the Li2 app). \`name\` is the label shown in the Li2 dashboard. Optionally pass a custom \`slug\` for the short URL and a \`domain_id\` the organization owns. Returns \`artifact_id\`, \`short_url\`, \`serve_url\`, \`qr_url\` (a direct link to the QR image) and \`size_bytes\`. An organization can have at most ${ARTIFACT_QUOTA_FREE_LIVE} published artifacts and ${Math.round(ARTIFACT_QUOTA_FREE_BYTES / 1024 / 1024)} MB in total; when either limit is hit nothing is created and the message says what to delete. Every file is scanned for malware before it is accepted; if the scan rejects it, nothing is created and the user has to send a different file. To change the page later without changing its link or QR, call \`update_artifact\` with the returned \`artifact_id\` — do not publish again. Because publishing twice creates two artifacts and uses two of those slots, pass an \`idempotency_key\` of your own whenever you may have to retry: if a call times out or the connection drops, repeat it with the SAME key and you get back the artifact that was already created, marked \`idempotent_replay\`, rather than a duplicate. A different key, or no key, always publishes a new page.`,
    inputSchema: publishArtifactInput,
    requiredScope: 'write',
    // Back-hop, NOT a fourth `mcp-local` exception (plan §3): the route runs `withAgentAuth`, the
    // plan gate and `ensurePolicy` exactly as `create_short_link` does.
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/publish-artifact',
      argsIn: 'json-body',
    },
  },
  {
    name: 'update_artifact',
    title: 'Update artifact',
    description:
      'Replace the HTML of an artifact that was published earlier, keeping its short link, QR code, name and visit history exactly as they are — this is what lets a QR that is already printed show new content. Send the complete new HTML document as text in `html` (UTF-8, at most 10 MB after encoding). The new file is scanned for malware before it is accepted; if the scan rejects it, the artifact keeps serving its current content unchanged. The previous version is deleted and cannot be restored — say so to the user in the same message as the result. Returns the same fields as `publish_artifact` plus `previous_size_bytes`; `short_url` and `qr_url` are identical to before. An artifact that was taken down in the Li2 dashboard cannot be updated; publish a new one instead.',
    inputSchema: updateArtifactInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/update-artifact',
      argsIn: 'json-body',
    },
  },
  {
    name: 'get_artifact',
    title: 'Get artifact',
    description:
      'Read one artifact back: its name, status, who can open it (`access_mode`), its short URL, public address and QR image URL, its size, when it last changed, and how many non-bot visits it has had. Identify it by `artifact_id` (preferred) or by `slug` — the ending of its short URL — and pass EXACTLY ONE of the two; sending both, or neither, is rejected. `short_url` and `qr_url` are `null` for an artifact that was uploaded but never published, which is not an error. Call this before `update_artifact` or `delete_artifact` when you are not certain the id you hold is still the right one; an artifact that was taken down is reported as not found.',
    inputSchema: getArtifactInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/get-artifact',
      argsIn: 'query',
    },
  },
  {
    name: 'list_artifacts',
    title: 'List artifacts',
    description:
      "List the organization's artifacts, newest first, each with the same fields get_artifact returns except the visit counts. Artifacts that have been taken down are not listed. The response carries `next_cursor`: pass it back as `cursor` to read the following page, and stop when it is `null` — that is the only reliable sign there is nothing more. Use this to find an artifact whose id you do not have, or to report what the organization has published; for one artifact's visit count use get_artifact.",
    inputSchema: listArtifactsInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/list-artifacts',
      argsIn: 'query',
    },
  },
  {
    name: 'delete_artifact',
    title: 'Delete artifact',
    description:
      "Take one artifact down: the stored file is deleted and the page stops serving its content. THIS CANNOT BE UNDONE and there is no copy to restore from — say so to the user and get their agreement BEFORE you call, in the same conversation, not afterwards. The short link and every QR code already printed KEEP WORKING: they resolve to a page that says the content has been taken down (HTTP 410), so nothing has to be reprinted and scans are still counted. The artifact also stops counting against the organization's quota. Calling it twice is safe — the second call succeeds and answers `already_removed: true`. To change a page instead of removing it, use `update_artifact`, which keeps the same link and QR.",
    inputSchema: deleteArtifactInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/delete-artifact',
      argsIn: 'json-body',
    },
  },
  {
    name: 'set_artifact_access',
    title: 'Set artifact access',
    description:
      'Change who may open an artifact that is already published, without changing its content, its short link or its QR code. Pass `mode`: "public" (anyone with the link), "password" (anyone who types the password you also pass), "private" (only signed-in members of this Li2 organization) or "google" (anyone with a Google account, whose email is recorded for the owner — this mode is switched off on some Li2 servers and is then refused, so fall back to "password"). A password must be 8 to 128 characters; Li2 stores only a one-way hash and NEVER returns it, so tell the user the password in your reply — if it is lost the only fix is setting a new one. Setting any mode REPLACES the one before it: switching to "password" overwrites any earlier password, and switching to "public" removes the protection entirely, so confirm with the user before you open a page up. Returns the artifact block plus `password_set_at` (null unless the mode is "password"). If another change to the same artifact lands at the same moment the call is refused as a conflict: call get_artifact and try again.',
    inputSchema: setArtifactAccessInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/set-artifact-access',
      argsIn: 'json-body',
    },
  },
  {
    name: 'set_artifact_slug',
    title: 'Set artifact slug',
    description:
      'Give a published artifact a new ending for its short URL — for example to turn a generated code into "bang-gia-t10". THE OLD LINK KEEPS WORKING: Li2 remembers every slug an artifact has ever had, so flyers and QR codes already printed with the previous link still open the page, and their scans are still counted. Nothing has to be reprinted. A NEW QR image is rendered for the new link, keeping the colours and logo the owner chose; `qr_url` may be the same URL as before because the image is written in place, so use `updated_at` to tell a cached image from a fresh one. The slug must be 6 to 64 characters of lowercase letters, digits and single hyphens, must not start with "f-", and must be free across all of Li2 — one already taken is refused and nothing changes. Each touch point can hold only so many slugs on the organization\'s plan; when that is used up the call is refused and the current link keeps working. An artifact that was never published has no link to rename and is refused. Calling it again with the slug the artifact already has succeeds and changes nothing. Returns the artifact block with the new `short_url` and `serve_url`.',
    inputSchema: setArtifactSlugInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/set-artifact-slug',
      argsIn: 'json-body',
    },
  },
  {
    name: 'list_short_links',
    title: 'List short links',
    description:
      "List the organization's short links, newest first, each with its id, name, slug, short URL, destination URL, QR image URL, whether it is switched on, whether a password is set, when it expires and its tags. ONLY LINKS THAT POINT AT AN EXTERNAL URL ARE LISTED: pages Li2 hosts itself are artifacts and have their own tool, list_artifacts. Narrow the list with `search` (matched against name, slug and code), `collection_id` or `tag_ids`. The response carries `next_cursor`: pass it back as `cursor` to read the following page, and stop when it is `null` — that is the only reliable sign there is nothing more. Use this to find a link whose id you do not have; for how much traffic a link gets use get_top_links.",
    inputSchema: listShortLinksInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/list-short-links',
      argsIn: 'query',
    },
  },
  {
    name: 'get_short_link',
    title: 'Get short link',
    description:
      "Read one short link back: its name, slug, short URL, destination URL, QR image URL, whether it is switched on, whether a password is set, when it expires, when it was created and last changed, and its tags. Identify it by `id` (preferred) or by `slug` — the ending of the short URL, its generated code, or its name — and pass EXACTLY ONE of the two; sending both, or neither, is rejected. An ending the link used to have still resolves, because Li2 keeps every one alive. Passwords are never returned, only whether one is set. `enabled: false` means the link is switched off and every scan sees a not-found page even though the link still exists. This tool does not act on artifacts — pages Li2 hosts itself — and an artifact's id is refused with a pointer to get_artifact.",
    inputSchema: getShortLinkInput,
    requiredScope: 'read',
    transport: {
      kind: 'back-hop',
      method: 'GET',
      path: '/api/agent/tools/get-short-link',
      argsIn: 'query',
    },
  },
  {
    name: 'update_short_link',
    title: 'Update short link',
    description:
      "Change an existing short link: where it sends people (`destination_url`), its internal name, its campaign `utm` parameters, its password or expiry (`access_control`), or whether it is switched on (`enabled`). Pass `id` plus AT LEAST ONE field to change; a call with nothing to change is rejected. EVERY CHANGE TAKES EFFECT IMMEDIATELY FOR EVERY QR CODE AND LINK ALREADY PRINTED OR SHARED. There is no draft, no review step and NO UNDO: the previous destination is not kept anywhere, so if the user may want it back, read it with get_short_link and repeat it in your reply before you call. Changing the destination does not change the link, the slug or the QR image — the same code now points somewhere else. To take a link out of service, set `enabled: false` instead of deleting it: every scan then sees a not-found page, nothing is lost, and `enabled: true` restores the destination at once. Inside `access_control`, pass `null` to REMOVE a password or an expiry and omit the key to leave it alone. UTM parameters are merged with the ones already set and are only appended to the destination once a source exists, so a patch that would leave the link with no `utm.source` is rejected. Returns the updated link plus `changed`, the list of fields this call actually moved — an empty `changed` means every value you sent was already in place, so report that rather than claiming a change. This tool does not act on artifacts — pages Li2 hosts itself — and an artifact's id is refused with a pointer to the artifact tools.",
    inputSchema: updateShortLinkInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/update-short-link',
      argsIn: 'json-body',
    },
  },
  {
    name: 'set_short_link_slug',
    title: 'Set short link slug',
    description:
      'Give an existing short link a new ending — for example to turn a generated code into "bang-gia-t10". THE OLD LINK KEEPS WORKING: Li2 remembers every ending a link has ever had, so flyers and QR codes already printed with the previous one still redirect, and their scans are still counted. Nothing has to be reprinted. What changes is the address the dashboard shows and the one new QR images encode. If the link has a QR code, a new image is rendered for the new ending, keeping the colours and logo the owner chose; `qr_url` may be the same URL as before because the image is written in place, so use `updated_at` to tell a cached image from a fresh one. The slug must be 6 to 64 characters of lowercase letters, digits and single hyphens, must not start with "f-", and must be free across all of Li2 — one already taken is refused and the current ending keeps working. Each link can hold only so many endings on the organization\'s plan, because every past one is kept alive; when that is used up the call is refused and nothing changes. Asking for the ending the link already has succeeds and changes nothing. This tool does not act on artifacts — pages Li2 hosts itself — and an artifact\'s id is refused with a pointer to set_artifact_slug.',
    inputSchema: setShortLinkSlugInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/set-short-link-slug',
      argsIn: 'json-body',
    },
  },
  {
    name: 'delete_short_link',
    title: 'Delete short link',
    description:
      "PERMANENTLY DELETE one short link. This is a hard delete and CANNOT BE UNDONE: the link is removed from Li2 outright, there is no copy to restore, and the ending is given up — every QR code and flyer already printed with it leads to a not-found page from now on, forever. Its past clicks and scans stay in the organization's analytics totals but stop being attributable to any link, so that traffic can no longer be reported per link. Prefer update_short_link with `enabled: false` unless the user has explicitly asked for permanent deletion: that switches the link off, every scan sees a not-found page, nothing is lost, and switching it back on restores the destination immediately. Say what deletion costs and get the user's agreement BEFORE you call, in the same conversation, not afterwards. Identify the link by `id` only — read it with get_short_link or list_short_links first, so you are certain which one you are destroying. Calling it twice is safe: the second call succeeds and answers `already_removed: true`. This tool does not act on artifacts — pages Li2 hosts itself — and an artifact's id is refused with a pointer to delete_artifact.",
    inputSchema: deleteShortLinkInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/delete-short-link',
      argsIn: 'json-body',
    },
  },
  {
    name: 'publish_draft_artifact',
    title: 'Publish uploaded file',
    description: `Publish a file the user already uploaded in this conversation, turning it into a live Li2 page with its own short link and QR code. Use this — and NOT \`publish_artifact\` — whenever the user attached a file: \`publish_artifact\` only accepts an HTML document written as text, so it cannot publish a PDF, an image or any other upload. The \`artifact_id\` is the one named in the conversation when the file arrived. By default the page is PUBLIC: anyone with the link can open it, with no sign-in and no password — say so before you call, or pass \`access\` to lock it. Passing \`access\` here is safe in a way it is not on \`publish_artifact\`: the lock is written BEFORE the page becomes reachable, so there is no moment when it is briefly open, and the answer carries no warning to check. Optionally pass a custom \`slug\` and a \`domain_id\` the organization owns. Returns \`artifact_id\`, \`short_url\`, \`serve_url\`, \`qr_url\` and \`size_bytes\`. Calling it twice on the same artifact fails — the file is already published; to change the page later use \`update_artifact\`, and to change who may open it use \`set_artifact_access\`.`,
    inputSchema: publishDraftArtifactInput,
    requiredScope: 'write',
    transport: {
      kind: 'back-hop',
      method: 'POST',
      path: '/api/agent/tools/publish-draft-artifact',
      argsIn: 'json-body',
    },
  },
]

/**
 * ★ The advertised set. `annotations` is attached HERE, from the registry, for every tool at once —
 * so a tool cannot ship with hand-written hints that disagree with what it actually does, and a new
 * tool with no registry row does not compile (`tool-registry.ts`).
 */
export const MCP_TOOLS: readonly McpToolDescriptor[] = MCP_TOOL_DESCRIPTORS.map((descriptor) => ({
  ...descriptor,
  annotations: annotationsFor(descriptor.name),
  outputSchema: toOutputJsonSchema(MCP_TOOL_OUTPUT_ZOD[descriptor.name]),
}))

const TOOLS_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]))

export function getMcpTool(name: string): McpToolDescriptor | undefined {
  return TOOLS_BY_NAME.get(name as McpToolName)
}
