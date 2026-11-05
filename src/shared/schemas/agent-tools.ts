/**
 * AI Agent Platform — shared query-param schemas + response types for the analytics read tools
 * (task-1b.1 Phase A). Cross-repo contract: response TS types here must match the Pydantic models
 * in li2-ai, task-1b.1 Phase B.
 */
import { z } from 'zod'
import { ARTIFACT_ACCESS_MODES } from '@/core/types/artifact.type'
import { requiredUrlSchema } from '.'
import { slugSchema } from './slug'
import { MAX_TOUCHPOINTS_NAME_LENGTH } from './touch-points'

export const periodDaysQuerySchema = z.object({
  period_days: z.coerce.number().int().min(1).max(90).default(30),
})

export const topLinksQuerySchema = periodDaysQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export type PeriodDaysQuery = z.infer<typeof periodDaysQuerySchema>
export type TopLinksQuery = z.infer<typeof topLinksQuerySchema>

/**
 * ⭐ P0.4 — these four read-tool answers are Zod with the TYPE INFERRED, where they used to be plain
 * interfaces. The field names, their order and their nullability are unchanged, so li2-ai's Pydantic
 * mirror still validates every payload; what changed is that `core/mcp/tools.ts` can now generate an
 * `outputSchema` from the same declaration instead of a second, hand-written copy of it.
 */
export const metricWithTrendSchema = z.object({
  value: z.number(),
  change_pct: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
})
export type MetricWithTrend = z.infer<typeof metricWithTrendSchema>

export const analyticsSummarySchema = z.object({
  period_days: z.number(),
  link_clicks: metricWithTrendSchema,
  qr_scans: metricWithTrendSchema,
  nfc_taps: metricWithTrendSchema,
  total_visits: metricWithTrendSchema,
  unique_visits: metricWithTrendSchema,
  touchpoints_active: z.number(),
})
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>

export const timeseriesBucketSchema = z.object({
  start: z.string(),
  link_clicks: z.number(),
  qr_scans: z.number(),
  nfc_taps: z.number(),
  total_interactions: z.number(),
})
export type TimeseriesBucket = z.infer<typeof timeseriesBucketSchema>

export const clicksTimeseriesSchema = z.object({
  period_days: z.number(),
  granularity: z.enum(['daily', 'weekly']),
  buckets: z.array(timeseriesBucketSchema),
  summary: z.object({
    peak: z.object({ start: z.string(), interactions: z.number() }),
    trend_direction: z.string(),
    buckets_with_activity: z.number(),
  }),
})
export type ClicksTimeseries = z.infer<typeof clicksTimeseriesSchema>

export const topLinkEntrySchema = z.object({
  id: z.string(),
  rank: z.number(),
  name: z.string(),
  slug: z.string().nullable(),
  total_interactions: z.number(),
  link_clicks: z.number(),
  qr_scans: z.number(),
})
export type TopLinkEntry = z.infer<typeof topLinkEntrySchema>

export const topLinksSchema = z.object({
  period_days: z.number(),
  top: z.array(topLinkEntrySchema),
})
export type TopLinks = z.infer<typeof topLinksSchema>

/**
 * `get_org_overview`'s answer. Declared HERE and not in the route that builds it: `tools.ts` must
 * read it to publish an `outputSchema`, and a `core/mcp` file importing an app route would drag the
 * whole `withAgentAuth` + service graph into the MCP bundle. The route imports this instead.
 */
export const orgOverviewSchema = z.object({
  org_name: z.string(),
  plan: z.string(),
  touch_point_count: z.number(),
})
export type OrgOverview = z.infer<typeof orgOverviewSchema>

interface DailyRow {
  date: string
  link_clicks: number
  qr_scans: number
  nfc_taps: number
  total_interactions: number
}

/**
 * Buckets daily RPC rows into weekly sums when period_days > 31 — keeps get_clicks_timeseries'
 * response size-by-construction under MAX_TOOL_RESULT_CHARS (task-1b.1 decision 1-H). The
 * granularity field travels with the data so the model never mistakes a weekly sum for a daily one.
 */
export function bucketDaily(
  rows: DailyRow[],
  periodDays: number
): { granularity: 'daily' | 'weekly'; buckets: TimeseriesBucket[] } {
  if (periodDays <= 31) {
    return {
      granularity: 'daily',
      buckets: rows.map((r) => ({
        start: r.date,
        link_clicks: r.link_clicks,
        qr_scans: r.qr_scans,
        nfc_taps: r.nfc_taps,
        total_interactions: r.total_interactions,
      })),
    }
  }

  const buckets: TimeseriesBucket[] = []
  for (let i = 0; i < rows.length; i += 7) {
    const week = rows.slice(i, i + 7)
    buckets.push({
      start: week[0].date,
      link_clicks: week.reduce((s, r) => s + r.link_clicks, 0),
      qr_scans: week.reduce((s, r) => s + r.qr_scans, 0),
      nfc_taps: week.reduce((s, r) => s + r.nfc_taps, 0),
      total_interactions: week.reduce((s, r) => s + r.total_interactions, 0),
    })
  }
  return { granularity: 'weekly', buckets }
}

/**
 * `publish_artifact.idempotency_key` (WP3) — the caller's own name for ONE publish attempt, so that
 * a retry after a lost response returns the artifact that was already created instead of making a
 * second one. The enforcement is `core/helpers/artifact-idempotency.ts`; this is only the shape.
 *
 * The character class is narrow ON PURPOSE. The value becomes part of a Redis key name, and although
 * the key helper hashes it (`REDIS_KEYS.ARTIFACT.IDEMPOTENCY`) so nothing caller-chosen reaches
 * Redis raw, a key that may contain newlines, spaces or `{}` is also a key that shows up mangled in
 * a log line and in a support conversation. UUIDs, ULIDs, `publish:2026-10-19:bang-gia` and plain
 * hashes all fit; a sentence does not, which is the intended message.
 *
 * ⚠️ NOT `.trim()`, unlike the `name` field of the tools using it: trimming would make `"k"` and
 * `"k "` the SAME key, i.e. the server silently deciding two distinct caller-chosen identifiers are
 * one. The regex refuses whitespace outright instead, which tells the caller rather than guessing
 * for them.
 *
 * ★ SL-3 REUSES IT FOR `create_short_link`, UNCHANGED, which is why it now sits above both tools
 * rather than next to the artifact ones. One regex and one length cap for the whole agent surface:
 * a caller that names its keys for a publish must not discover that the same name is refused for a
 * short link. What differs between the two is the Redis NAMESPACE, not the shape — see
 * `AgentIdempotencyNamespace` in `core/helpers/artifact-idempotency.ts`. The name keeps the
 * `artifact` prefix because every importer already uses it and renaming an exported symbol buys
 * nothing a comment cannot say.
 *
 * 128 is the cap because the only thing length buys here is the caller's own naming scheme, and a
 * key longer than that is carrying data, not an identifier.
 */
export const artifactIdempotencyKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, {
    message: 'idempotency_key may contain only letters, digits and . _ : -',
  })

/**
 * ============================================================================
 * create_short_link — the first WRITE tool (Phase 3a, task-3a.0).
 * ============================================================================
 *
 * Shared Zod contract for POST /api/agent/tools/create-short-link, consumed by the route here AND
 * (field-by-field) by the Pydantic model in li2-ai (registry.py). ⭐ Keep in sync with li2-ai.
 *
 * TWO MODES (L10 — the two write states the route can legitimately receive):
 *   - single (state 1): one link, optional custom slug/name → touchPointService.createTouchPoint
 *   - bulk   (state 3): N links, URL-only, no slug/name      → bulkCreateFromDestinations
 * State 2 (many links + custom param) is refused by the li2-ai guardrail BEFORE the back hop, so the
 * route ideally never sees it. The discriminated union is a structural backstop anyway: `bulk` accepts
 * only `destinations`, `single` accepts only `destination_url`. `.strict()` makes a wrong-shape body a
 * 400 rather than silently swallowing a stray field (e.g. a slug smuggled onto a batch).
 *
 * `mode` is set by li2-ai (it knows the state after its guardrail); the route trusts the discriminator.
 */

/**
 * ⭐ BULK_MAX = 20 — a DELIBERATE damage-cap, NOT cosmetic (L12, accepted-risk).
 * bulkCreateBasicTp (touch-point.service.ts:1064) only checks `add_touch_point` + MAX_TPS_PER_MONTH;
 * it is MISSING MAX_TPS_PER_ORG + ALLOWED_TP_TYPES, and the month gate only asks "already over?" not
 * "does adding N push over?". So one bulk call can overshoot the cap by up to BULK_MAX-1. Kei accepts
 * this hole for 3a (we do not patch the li2-app service here); BULK_MAX bounds the overshoot and keeps
 * the approval card small. DO NOT raise BULK_MAX without re-reading L12.
 */
export const BULK_MAX = 20

// single (state 1) — the only path that accepts slug/name. `requiredUrlSchema` (not bare urlSchema)
// so an empty/invalid destination is rejected, not silently accepted; it also auto-prepends https://.
// Not exported: only the discriminated union below is the public entry point.
const createShortLinkSingleSchema = z
  .object({
    mode: z.literal('single'),
    destination_url: requiredUrlSchema, // reuse: prepend https:// + reject empty/invalid + blacklist
    slug: slugSchema.optional(), // omitted → createTouchPoint generates a short_code
    name: z.string().trim().max(64).optional(), // ≤64 (arch §10)

    // --- 3b slice-1 advanced fields (single mode only — B6). This tool schema is the ONLY li2-app
    // validation on the agent path (createTouchPoint does NOT re-parse — drift-trap #2), so it MIRRORS
    // li2-app's existing field rules. Mirror source cited per field. ---
    password: z
      .string()
      .max(256) // mirror linkPasswordSchema (advanced.schema.ts:7-13)
      .refine((v) => !/\s/.test(v), { message: 'password must not contain whitespace' })
      .optional(),
    expires_at: z.string().datetime({ offset: true }).optional(), // strict ISO 8601 structural
    // backstop (linkExpiresAtSchema only parses-to-Date). NO future-check here — that is a
    // li2-ai-only guardrail rule (BR-note); see O2 note in task-3b.0.md for the asymmetry.
    utm_source: z.string().trim().max(60).optional(), // mirror utmSchema utm_source (index.ts:95)
    utm_medium: z.string().trim().max(60).optional(), // index.ts:96
    utm_campaign: z.string().trim().max(60).optional(), // index.ts:97
    utm_term: z.string().trim().max(255).optional(), // index.ts:98
    utm_content: z.string().trim().max(255).optional(), // index.ts:99

    /**
     * SL-3 — the caller's own name for ONE create attempt. Shape: `artifactIdempotencyKeySchema`
     * above, reused verbatim. Enforcement: `core/helpers/artifact-idempotency.ts` under the
     * `short_link` namespace, driven by the route.
     *
     * ⚠️ IT IS ON BOTH MODES, and bulk is the mode that needs it MOST. A timed-out `single` retry
     * costs one duplicate link; a timed-out `bulk` retry costs up to BULK_MAX of them, all pointing
     * at the same destinations, and `bulkCreateFromDestinations` is atomic so there is no partial
     * state the caller could notice. The Redis value therefore holds the created ids JOINED BY A
     * COMMA rather than one id — see the route.
     */
    idempotency_key: artifactIdempotencyKeySchema.optional(),
  })
  .strict() // ends here — NO object-level .superRefine on this schema (ZOD-TRAP #3: it would break
// z.discriminatedUnion, which requires every member to stay a ZodObject).

// bulk (state 3) — URL-only, ≥2 (one link uses `single`), ≤ BULK_MAX. No slug/name by construction.
const createShortLinkBulkSchema = z
  .object({
    mode: z.literal('bulk'),
    destinations: z.array(requiredUrlSchema).min(2).max(BULK_MAX),
    // SL-3 — same field, same shape, for the reason given on the single branch.
    idempotency_key: artifactIdempotencyKeySchema.optional(),
  })
  .strict()

// utm_source is conditionally required — this lives on the OUTER union (not a discriminatedUnion
// member) so it stays a safe wrap: `.superRefine`/`.refine` on a union MEMBER would turn it into a
// ZodEffects (no `.shape`), and discriminatedUnion reads `.shape[discriminator]` eagerly at
// `.create()` time — that throws at module import, not just on bad input (ZOD-TRAP #3).
export const createShortLinkInputSchema = z
  .discriminatedUnion('mode', [createShortLinkSingleSchema, createShortLinkBulkSchema])
  .superRefine((data, ctx) => {
    if (data.mode !== 'single') return // bulk has no utm_* (B6)
    const anyUtm = [
      data.utm_source,
      data.utm_medium,
      data.utm_campaign,
      data.utm_term,
      data.utm_content,
    ].some((v) => v != null && v !== '')
    if (anyUtm && !data.utm_source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['utm_source'],
        message: 'utm_source is required when any UTM field is set',
      })
    }
  })
export type CreateShortLinkInput = z.infer<typeof createShortLinkInputSchema>

// Result shape returned to li2-ai (Pydantic re-validates — cross-repo, like the read tools). ALWAYS a
// list: single → 1 element, bulk → N. One shape for both so the li2-ai template does not branch on parse.
// `slug` is nullable: a single link with no custom slug stores slug=null in the DB.
export const createdLinkSchema = z.object({
  id: z.string(),
  short_url: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
})
export type CreatedLink = z.infer<typeof createdLinkSchema>

/**
 * What a REPLAYED `create_short_link` answers (SL-3): the links the key already created, read back
 * fresh, plus the one flag that says nothing was created by THIS call.
 *
 * ⚠️ THE OLD CONTRACT IS UNTOUCHED. `created` is the same list in the same shape li2-ai's Pydantic
 * model validates, so a caller that ignores the flag still reads a correct answer — it just reads
 * the links from the first attempt. The flag is PRESENT ONLY ON A REPLAY, for the same two reasons
 * `PublishedArtifactReplay` documents: the fresh-create response is a closed list of fields, and a
 * model reading a flag it must compare against `false` misreads it more often than one reading a
 * field that is simply there or not. The HTTP status says it a second way — 201 for a create that
 * created, 200 for a replay that did not.
 */
export const createdLinksReplaySchema = z.object({
  created: z.array(createdLinkSchema),
  idempotent_replay: z.literal(true),
})
export type CreatedLinksReplay = z.infer<typeof createdLinksReplaySchema>

/**
 * ⭐ P0.4 — the ONE `outputSchema` `create_short_link` advertises. `idempotent_replay` is optional
 * for the same reason it is on `publish_artifact`: the flag is present only on a replay, and a
 * schema that demanded it would reject every fresh create.
 */
export const createShortLinkOutputSchema = z.object({
  created: z.array(createdLinkSchema),
  idempotent_replay: z.literal(true).optional(),
})

/**
 * ============================================================================
 * link_details — read tool: fetch ONE existing link's config by id or slug.
 * ============================================================================
 *
 * Use case: "tạo link mới giống link 6LBCU" — the agent needs to read back an existing link's
 * destination/UTM/password-presence/expiry to show or duplicate it.
 *
 * `id` is the touchpoint id threaded straight from get_top_links' `TopLinkEntry.id` — the preferred
 * path, since it is an exact primary-key lookup with no guessing. `slug` is the pre-existing
 * fallback (the tolerant slug -> short_code -> name resolver) for callers that only have a name or
 * short_code on hand. At least one of the two is required (`.refine` below).
 *
 * Cross-repo contract (must match the Pydantic model in li2-ai). ⭐ Keep in sync with li2-ai.
 *   LinkDetails = { slug, name, destination_url, utm_source, utm_medium, utm_campaign, utm_term,
 *                    utm_content, has_password, expires_at, detail_url }
 * `has_password` is a boolean projection ONLY — the real password value must never appear here
 * (mirrors the password-mask rule used everywhere else in this codebase). `id` is NOT part of the
 * response shape — it is a lookup key only. `detail_url` is an absolute (or root-relative, if
 * NEXT_PUBLIC_APP_BASE_URL is unset) link to the touch-point's detail page in the app, so the AI
 * chat can deep-link the user there — producer side of a cross-repo contract, li2-ai adds this
 * field as OPTIONAL.
 */
export const linkDetailsQuerySchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
  })
  .refine((v) => Boolean(v.id) || Boolean(v.slug), {
    message: 'id or slug is required',
  })
export type LinkDetailsQuery = z.infer<typeof linkDetailsQuerySchema>

export const linkDetailsSchema = z.object({
  slug: z.string(),
  name: z.string(),
  destination_url: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  utm_term: z.string().nullable(),
  utm_content: z.string().nullable(),
  has_password: z.boolean(),
  expires_at: z.string().nullable(),
  detail_url: z.string(),
  /**
   * ⭐ SL-0 §4 — FOUR ADDITIONS, ALL OPTIONAL, NO RENAMES. The producer always sends them; they are
   * optional in the TYPE because li2-ai's Pydantic mirror has not been told about them yet, and an
   * older mirror must keep validating this payload. The same rule the `detail_url` comment states.
   *
   * Why these four: an agent holding a `LinkDetails` could not act on it. It had no `id` to pass to
   * any other tool (`slug` is a lookup key, and an ambiguous one), no address to show the user, no
   * QR image to hand over, and no way to tell a live link from a disabled one — a link that answers
   * a "taken down" page reads as perfectly healthy without `enabled`.
   */
  id: z.string().optional(),
  short_url: z.string().optional(),
  qr_url: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
})
export type LinkDetails = z.infer<typeof linkDetailsSchema>

/**
 * ============================================================================
 * `ShortLink` — ONE projection of a URL touch point for every short-link tool (SL-0 §3).
 * ============================================================================
 *
 * ⭐ A NEW TYPE, NOT A CHANGE TO `LinkDetails`. `LinkDetails` is a cross-repo contract with li2-ai's
 * Pydantic model and may only grow optional fields (above); the short-link tools are MCP-only and
 * free to state the shape they actually want. Reshaping the old one would have broken the chat panel
 * to save a type declaration.
 *
 * ⛔ NEVER SPREAD THE ROW. `touch_points` carries `access_control` with a password hash in it, plus
 * `targeting`, `privacy_security`, `tracking`, `integration` and `user_id`. A projection that starts
 * from `...row` leaks whichever of those a future migration adds, silently, into a model's context.
 * Every field below is listed by hand for that reason.
 *
 * `has_password` is a BOOLEAN PROJECTION ONLY, the same rule `LinkDetails` follows: the password
 * value never leaves the server.
 */
export const shortLinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The current custom ending, or `null` for a link that only ever had a generated code. */
  slug: z.string().nullable(),
  /** The generated code. Either this or `slug` is what `short_url` ends with. */
  short_code: z.string().nullable(),
  /** The full address to give a person — what a printed QR encodes. */
  short_url: z.string(),
  /** `content_value`, renamed on the wire: "where this link sends people" needs no glossary. */
  destination_url: z.string().nullable(),
  /** `path_qr_code` verbatim — a public storage URL of the QR image. `null` if none was rendered. */
  qr_url: z.string().nullable(),
  /**
   * `false` means the link answers a "not found" page to every scan WITHOUT being deleted, and
   * flipping it back restores the destination immediately (measured, checklist R5). It is the only
   * reversible way to take a link out of service, which is why every write tool's description points
   * at it before it points at deletion.
   */
  enabled: z.boolean(),
  has_password: z.boolean(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  /** Tag names, for grouping in a report. `[]` when the row was read without its tag join. */
  tags: z.array(z.string()),
})
export type ShortLink = z.infer<typeof shortLinkSchema>

/**
 * `list_short_links` — `next_cursor` is `null` on the last page, which is how a loop terminates.
 * Same contract as `list_artifacts`, deliberately: one pagination shape for the whole surface.
 */
export const shortLinkListResultSchema = z.object({
  items: z.array(shortLinkSchema),
  next_cursor: z.string().nullable(),
})
export type ShortLinkListResult = z.infer<typeof shortLinkListResultSchema>

/**
 * ============================================================================
 * list_short_links / get_short_link — SL-1. MCP-only, no Pydantic mirror in li2-ai.
 * ============================================================================
 */

/**
 * ⚠️ `limit` caps at 50 for the same reason `list_artifacts` does — every item here travels through
 * a model's context window rather than a table, and the UI route's 100 would spend it on one call.
 *
 * `search` is passed to the same `name`/`slug`/`short_code` ILIKE the dashboard's search box uses,
 * so the two agree about what "finding a link" means. `collection_id` and `tag_ids` exist because an
 * organization with hundreds of links organizes them, and a model that cannot filter resorts to
 * paging through everything.
 */
export const listShortLinksInputSchema = z
  .object({
    cursor: z.string().min(1).max(256).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().min(1).max(255).optional(),
    collection_id: z.string().uuid().optional(),
    /**
     * ⭐ ACCEPTS BOTH AN ARRAY AND A COMMA-SEPARATED STRING, and the string form is the one that
     * actually arrives. `call-tool.ts` builds a GET query with `search.set(key, String(value))`, so
     * an array of two uuids reaches this route as `tag_ids=a,b` — a plain `z.array()` would 400
     * every real MCP call while passing every unit test written against an array.
     *
     * The array form is kept because a `tag_ids[]=a&tag_ids[]=b` query (what `qs` produces, and what
     * li2-ai would send) is equally legal, and because the next caller should not have to discover
     * this the way it was discovered here.
     */
    tag_ids: z
      .preprocess(
        (value) =>
          typeof value === 'string'
            ? value
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part !== '')
            : value,
        z.array(z.string().uuid()).min(1).max(20)
      )
      .optional(),
  })
  .strict()
export type ListShortLinksInput = z.infer<typeof listShortLinksInputSchema>

/**
 * `id` XOR `slug`, and like `get_artifact` the rule is a `.refine` — it does NOT survive JSON Schema
 * generation, so the tool's prose restates it and the route re-runs `safeParse`.
 *
 * ⚠️ `slug` is a LOOSE string, deliberately not the shared `slugSchema`: what is looked up is
 * whatever already resolves — a generated `short_code` shorter than 6 characters, a link's name, or
 * an ENDING THE LINK NO LONGER USES but that is printed on somebody's flyer. Validating a lookup
 * against the rules for CREATING a slug would refuse identifiers that genuinely work.
 *
 * `id` is a uuid here while `get_link_details.id` is a loose string. Both are `touch_points.id`;
 * this is the stricter of the two because a malformed uuid is a caller bug worth naming, and the old
 * tool's contract cannot be tightened without risking a caller that passes something else.
 */
export const getShortLinkInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine((input) => Boolean(input.id) !== Boolean(input.slug), {
    message: 'Provide exactly one of id or slug',
  })
export type GetShortLinkInput = z.infer<typeof getShortLinkInputSchema>

/**
 * ============================================================================
 * update_short_link / set_short_link_slug — SL-2. MCP-only, no Pydantic mirror in li2-ai.
 * ============================================================================
 *
 * ⚠️ THIS SCHEMA IS THE ONLY VALIDATION ON THE PATH. `touchPointService.updateAndReturn` takes
 * `z.infer<typeof touchPointUpdateSchema>` as a TYPE and never re-parses it (the same drift trap
 * `create_short_link` documents above), and the route has to hand it a partial object cast to that
 * type because `touchPointUpdateSchema.name` is REQUIRED (`min(4)`) while every field here is
 * optional (checklist B11). So every rule the dashboard enforces has to be mirrored below, with the
 * mirror source named per field — a value that slips through here reaches the column unvalidated.
 */

/**
 * The five UTM parameters, WITHOUT the `utm_` prefix and without `enabled` / `overrideable`.
 *
 * The prefix is dropped because the field already sits under `utm`, and `utm.utm_source` reads like
 * a mistake. `enabled` is NOT on the tool surface: the service stores `utm_tags` WHOLESALE (it does
 * `updateFields.utm_tags = data.utm_tags`, with no merge — `touch-point.service.ts`, "Update utm
 * tags"), so the ROUTE merges with the stored block and decides `enabled` from whether a source
 * exists. A model given an `enabled` flag would have to understand that UTM parameters without a
 * source are inert, which is a fact about li2-be rather than about the user's request.
 *
 * Lengths mirror `utmSchema` (`schemas/touch-points/index.ts`): 60 for source/medium/campaign, 255
 * for term/content. `utm_id` is deliberately absent — it is a GTM/GA container id with its own
 * regex and nothing to do with campaign tagging.
 */
const shortLinkUtmPatchSchema = z
  .object({
    source: z.string().trim().max(60).optional(),
    medium: z.string().trim().max(60).optional(),
    campaign: z.string().trim().max(60).optional(),
    term: z.string().trim().max(255).optional(),
    content: z.string().trim().max(255).optional(),
  })
  .strict()

/**
 * `password` and `expires_at` live HERE rather than at the top level, because that is where they
 * live in the data: both are keys of the `access_control` jsonb, not columns (checklist S3, which
 * corrected the spec on exactly this point). A flat `password` argument would have read as a column
 * and sent the next reader looking for one.
 *
 * ⭐ `null` MEANS REMOVE, and it works because of HOW the service merges: it computes
 * `{...oldAccessControl, ...data.access_control}` and then runs `pickDefinedAndNotNull`, so an
 * explicit `null` overwrites the old value and is then DROPPED from the stored object. Omitting the
 * key leaves whatever was there. That is the entire difference between `{password: null}` and `{}`.
 *
 * `password` is `min(1)`: `linkPasswordSchema` accepts `''` and would store an empty string, which
 * `has_password` then reports as `false` — a link in a state no tool can describe. Removal already
 * has a spelling, and it is `null`.
 *
 * `expires_at` is a strict ISO 8601 string WITH an offset, the same structural backstop
 * `create_short_link` uses: `linkExpiresAtSchema` only parses-to-Date and would accept anything
 * `new Date()` accepts. No future-check — a date in the past is a legitimate way to retire a link
 * immediately, and the equivalent rule for `create_short_link` lives in li2-ai, not here.
 */
const shortLinkAccessControlPatchSchema = z
  .object({
    password: z
      .string()
      .min(1)
      .max(256) // mirror linkPasswordSchema (touch-points/advanced.schema.ts)
      .refine((value) => !/\s/.test(value), { message: 'password must not contain whitespace' })
      .nullable()
      .optional(),
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()

/** Does this patch ask for anything at all? `utm: {}` and `access_control: {}` ask for nothing. */
function patchTouchesSomething(input: {
  destination_url?: unknown
  name?: unknown
  enabled?: unknown
  utm?: object
  access_control?: object
}): boolean {
  if (input.destination_url !== undefined) return true
  if (input.name !== undefined) return true
  if (input.enabled !== undefined) return true
  if (input.utm && Object.keys(input.utm).length > 0) return true
  if (input.access_control && Object.keys(input.access_control).length > 0) return true
  return false
}

/**
 * ⚠️ THE "AT LEAST ONE FIELD" RULE IS A `.refine`, so it does NOT survive JSON Schema generation —
 * the tool's prose states it and the route re-runs `safeParse`, exactly as `get_short_link`'s XOR
 * rule does. An empty patch is a 400 rather than a silent success, because a model that believed it
 * had changed something would tell the user so.
 *
 * `name` is `min(4)`, mirroring `touchPointUpdateSchema.name` (`z.string().min(4).max(64)`) — the
 * rule the dashboard applies. `destination_url` is `requiredUrlSchema`, the same one
 * `create_short_link` uses, so it prepends `https://` and rejects an empty or malformed address
 * before the service's blacklist check is ever reached.
 */
export const updateShortLinkInputSchema = z
  .object({
    id: z.string().uuid(),
    destination_url: requiredUrlSchema.optional(),
    name: z.string().trim().min(4).max(64).optional(),
    utm: shortLinkUtmPatchSchema.optional(),
    access_control: shortLinkAccessControlPatchSchema.optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(patchTouchesSomething, {
    message: 'Provide at least one field to change besides org_id and id',
  })
export type UpdateShortLinkInput = z.infer<typeof updateShortLinkInputSchema>

/**
 * `update_short_link`'s answer: the link as it now is, plus WHICH fields the call actually moved.
 *
 * `changed` exists because this is the one write on the surface that can be a no-op without
 * failing — asking for the destination the link already has succeeds and changes nothing, and the
 * service silently drops unchanged fields (`getChangedFields`). A model handed only the link block
 * cannot tell "done" from "already was", and will report the former. An empty array is therefore a
 * meaningful answer rather than an error.
 *
 * The names in it are the TOOL's field names (`destination_url`, `password`, `expires_at`, `utm`),
 * never the column names: a model that read `content_value` here would learn a word no argument
 * accepts.
 */
export const updateShortLinkResultSchema = shortLinkSchema.extend({
  changed: z.array(z.string()),
})
export type UpdateShortLinkResult = z.infer<typeof updateShortLinkResultSchema>

/**
 * ⚠️ `slug` IS the shared `slugSchema`, the same choice `set_artifact_slug` makes and for the same
 * reason: this tool INSERTS a row into `slugs`, so it must obey exactly the rules the dashboard
 * obeys (6–64 characters, `a-z0-9` joined by single hyphens, no `f-` prefix). `get_short_link.slug`
 * is a loose string because it only LOOKS UP what already resolves.
 *
 * The `.refine` is what makes `''` a 400: `slugSchema` maps an empty string to `undefined`, which
 * for a tool whose only job is to set a slug is a missing argument rather than "leave it alone".
 */
export const setShortLinkSlugInputSchema = z
  .object({
    id: z.string().uuid(),
    slug: slugSchema,
  })
  .strict()
  .refine((input) => typeof input.slug === 'string', { message: 'slug is required' })
export type SetShortLinkSlugInput = z.infer<typeof setShortLinkSlugInputSchema>

/**
 * `delete_short_link` — SL-3. ID ONLY, and that is a safety decision rather than an omission.
 *
 * `get_short_link` accepts a tolerant `slug` that resolves a short code, a NAME, or an ending the
 * link no longer uses. Every one of those is a guess a model can get wrong, and the cost of being
 * wrong here is a hard delete nobody can undo (`deleteTpById` issues a real `DELETE`, checklist S5).
 * A uuid is something the model must have READ from `list_short_links` or `get_short_link` first, so
 * the lookup step is where a wrong identifier surfaces — as a 404-shaped read, not as a deletion of
 * the wrong link.
 *
 * ⛔ AND NO `confirm` FLAG. A model fills in its own arguments, so a boolean it sets itself is not a
 * confirmation of anything (checklist §D). The human in the loop is the MCP client's, driven by
 * `destructiveHint` in `core/mcp/tool-registry.ts`.
 */
export const deleteShortLinkInputSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict()
export type DeleteShortLinkInput = z.infer<typeof deleteShortLinkInputSchema>

/**
 * `delete_short_link`'s answer. Deliberately NOT a `ShortLink`: after the delete the row is gone, so
 * there is nothing left to project — and a `short_url` in the response would invite a model to print
 * a link that now resolves nowhere.
 */
export const deleteShortLinkResultSchema = z.object({
  id: z.string(),
  /** Always `'deleted'`. */
  status: z.string(),
  /**
   * `true` when the id matched no link in this organization — most often because an earlier call
   * already deleted it. The call still SUCCEEDS, so a client retrying a timed-out delete is not
   * handed an error for work that is already done.
   *
   * ⚠️ It is NOT an existence oracle for another org's link: the lookup is org-scoped, so a foreign
   * id reports exactly the same thing a never-existing one does, and nothing is deleted either way.
   */
  already_removed: z.boolean(),
})
export type DeleteShortLinkResult = z.infer<typeof deleteShortLinkResultSchema>

/**
 * ============================================================================
 * publish_artifact / update_artifact — MCP-ONLY write tools (wave 3, spec artifact-wave3-mcp-publish).
 * ============================================================================
 *
 * ⚠️ NO Pydantic mirror in li2-ai: these two tools do not go through the chat panel, only through the
 * MCP server (`core/mcp/tools.ts` → back-hop → `/api/agent/tools/{publish,update}-artifact`). They
 * still live in this file because `tools.ts` generates its JSON Schema from here. Do not go syncing
 * li2-ai for them.
 *
 * Decisions baked into the shape (spec R2):
 * - `name` is REQUIRED. The MCP path has no real filename to derive one from (the route wraps the
 *   HTML as `index.html`), so a defaulted name would be "index" on every card in the dashboard.
 * - The byte limit is NOT in Zod. `.max()` counts characters; `size_bytes`, the quota and the bucket
 *   count UTF-8 bytes. The service checks `Buffer.byteLength` via `UploadedArtifactFile.size`.
 *   `html.min(1)` is here so the JSON Schema carries `minLength`; the route still refuses a
 *   whitespace-only page separately (`agent:artifact.html_empty`).
 * - `domain_id` is a `uuid()` — tighter than the UI schema. The service looks the domain up by id;
 *   a non-uuid reaching Postgres is a 22P02 → 500 → the agent reads "problem on the Li2 side".
 *   Ownership of the domain is still the service's check, by `orgId`.
 * - `.strict()`: `org_id` is stripped by the MCP layer before the hop; a leftover is a 400 here, which
 *   is the only thing that makes the strip testable.
 * - `idempotency_key` is OPTIONAL and that is the whole reason `publish_artifact` stays
 *   `idempotent: false` in `core/mcp/tool-registry.ts` (WP3): the tool is idempotent only for a
 *   caller that chooses to send one, and the annotation describes the tool, not one call. The field
 *   must exist in THIS schema and not just in the MCP layer, because `.strict()` would otherwise
 *   turn every keyed call into a 400 after `call-tool.ts` forwards it (checklist §D).
 *   ⭐ Still no li2-ai mirror: like the rest of this block, these two tools never reach the chat
 *   panel, so there is no Pydantic model to add the field to.
 */
/**
 * Who may open the page — shared by `publish_artifact.access` and `set_artifact_access` (WP2 §1/§3).
 *
 * `mode` is a REAL enum, not a loose string: `ARTIFACT_ACCESS_MODES` is the vocabulary of the
 * `artifacts_access_mode_check` constraint, so generating it into the JSON Schema is what lets a
 * model pick a legal value on the first try instead of learning the list from a 400.
 *
 * ⚠️ THE 8–128 PASSWORD RULE IS DELIBERATELY NOT IN ZOD, for the same reason the 10 MB HTML cap is
 * not, plus a second one that matters more. First: `.min()`/`.max()` count UTF-16 code units while
 * the service's `parseAccessInput` counts CODE POINTS, so a password of 70 emoji would be legal to
 * the service and rejected here. Second, and the deciding one: the service raises a KEYED error
 * (`common:messages.error.field_invalid` on `$t(label.password)`) that `artifact-refusals.ts` turns
 * into a sentence STATING the 8–128 range, while a Zod failure is a bare 400 whose only advice is
 * "re-read the schema". One authority — the one that can explain itself. The rule is in the field
 * description so a model does not need the error at all.
 *
 * ⛔ A PASSWORD NEVER COMES BACK OUT. No result type in this file has a `password` field, and
 * `ArtifactDTO` carries only `password_set_at` (the column holds a scrypt hash). `/api/mcp` commits
 * to not logging tool arguments, which is also why `set_artifact_access` is a POST and not a GET: a
 * query string ends up in `log.warn({ route: request.url })` inside `withAgentAuth`, a JSON body
 * does not.
 */
export const artifactAccessInputSchema = z
  .object({
    mode: z.enum(ARTIFACT_ACCESS_MODES),
    password: z.string().optional(),
  })
  .strict()
export type ArtifactAccessInput = z.infer<typeof artifactAccessInputSchema>

export const publishArtifactInputSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_TOUCHPOINTS_NAME_LENGTH),
    html: z.string().min(1),
    slug: slugSchema.optional(),
    domain_id: z.string().uuid().optional(),
    idempotency_key: artifactIdempotencyKeySchema.optional(), // WP3 — see above the schema
    /**
     * WP2 §3. Omitted → the column default (`public`) stands, which is exactly what every wave-3
     * caller got; adding this field changes nothing for a client that does not send it.
     *
     * ⚠️ Applied by a SECOND service call AFTER the artifact is already published, because
     * `createAndPublish` takes no access input (`CreateAndPublishInput`). The consequence is in the
     * contract rather than hidden: if that second call fails the page stays PUBLIC and the response
     * carries `warning`. There is no rollback — deleting an artifact the user can already see,
     * because the lock on it failed, is a worse answer than telling them it is open.
     */
    access: artifactAccessInputSchema.optional(),
  })
  .strict()
export type PublishArtifactInput = z.infer<typeof publishArtifactInputSchema>

/**
 * `publish_draft_artifact` — công bố một BẢN NHÁP đã có sẵn trên server.
 *
 * ★ VÌ SAO CẦN MỘT TOOL RIÊNG, thay vì dùng `publish_artifact`. Mô tả của `publish_artifact` nói
 * rõ nó chỉ nhận HTML dạng chữ: *"no base64, no PDF or other formats — for those the user uploads
 * in the Li2 app."* Nên khi người dùng kéo một file PDF vào khung chat, **không có tool nào đỡ** —
 * đó là lỗ hổng phát hiện ngày 2026-10-29 lúc lập kế hoạch pha B.
 *
 * Luồng: route `/api/agent/turn` nhận `multipart/form-data`, gọi thẳng `artifactService.create`
 * để sinh một hàng `draft` (file đã lên server nhưng **chưa ai xem được**), rồi kể cho model biết
 * `artifact_id`. Model chọn cấu hình và gọi tool này.
 *
 * ⭐ `access` áp ngay TRONG lần công bố, không phải một lời gọi thứ hai sau đó — `artifactService.publish`
 * ghi chế độ xem **trước** khi tạo touch point. Đó là khác biệt thật so với `publish_artifact`,
 * vốn phải cảnh báo "still published and LEFT PUBLIC" khi lần gọi thứ hai hỏng. Ở đây không có
 * cửa sổ nào để lỡ công khai, nên kết quả cũng không cần trường `warning`.
 */
export const publishDraftArtifactInputSchema = z
  .object({
    artifact_id: z.string().uuid(),
    slug: slugSchema.optional(),
    domain_id: z.string().uuid().optional(),
    access: artifactAccessInputSchema.optional(),
  })
  .strict()
export type PublishDraftArtifactInput = z.infer<typeof publishDraftArtifactInputSchema>

export const updateArtifactInputSchema = z
  .object({
    artifact_id: z.string().uuid(),
    html: z.string().min(1),
  })
  .strict()
export type UpdateArtifactInput = z.infer<typeof updateArtifactInputSchema>

/**
 * ============================================================================
 * get_artifact / list_artifacts / delete_artifact — wave 4 WP1.
 * ============================================================================
 * Same "no Pydantic mirror in li2-ai" note as the two above: MCP-only tools, here because
 * `core/mcp/tools.ts` generates their JSON Schema from this file.
 */

/**
 * `artifact_id` XOR `slug`, and the rule is a `.refine` — so it does NOT survive JSON Schema
 * generation and is restated in the tool's prose, exactly like `get_link_details`' id-or-slug rule.
 * Both are optional structurally; the route re-runs `safeParse` and a model that sends neither (or
 * both) gets a clean 400.
 *
 * ⚠️ `slug` is a LOOSE string, deliberately NOT the shared `slugSchema`. That schema describes a slug
 * a user may CREATE (6-64 chars, no `f-` prefix); what is looked up here is whatever is already in
 * the `slugs` table, which includes auto-generated short codes shorter than 6 characters and any
 * older slug the artifact used to answer on. Validating a lookup against the creation rules would
 * refuse ids that genuinely resolve.
 */
export const getArtifactInputSchema = z
  .object({
    artifact_id: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine((input) => Boolean(input.artifact_id) !== Boolean(input.slug), {
    message: 'Provide exactly one of artifact_id or slug',
  })
export type GetArtifactInput = z.infer<typeof getArtifactInputSchema>

/**
 * `cursor` is opaque TO THE CALLER and is base64url of `{"page":n}` underneath (see
 * `core/helpers/artifact-cursor.ts`). The repository paginates by OFFSET and nothing else
 * (`artifact.repository.ts` `listByOrg`), so a real keyset cursor would be a lie about the guarantee
 * it gives; what the opacity buys is the freedom to switch to one later without changing the tool's
 * contract.
 *
 * `limit` caps at 50 — half the UI route's 100, because every item here travels through a model's
 * context window rather than a table.
 */
export const listArtifactsInputSchema = z
  .object({
    cursor: z.string().min(1).max(256).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
export type ListArtifactsInput = z.infer<typeof listArtifactsInputSchema>

export const deleteArtifactInputSchema = z
  .object({
    artifact_id: z.string().uuid(),
  })
  .strict()
export type DeleteArtifactInput = z.infer<typeof deleteArtifactInputSchema>

/**
 * ============================================================================
 * set_artifact_access / set_artifact_slug — wave 4 WP2.
 * ============================================================================
 * Same "no Pydantic mirror in li2-ai" note as every artifact tool above.
 */

/** Flat, not `{ artifact_id, access: {…} }`: a tool whose whole job is the access block does not
 *  need to nest it, and a model sends one level less. `publish_artifact` nests because access is one
 *  optional concern among five. */
export const setArtifactAccessInputSchema = z
  .object({
    artifact_id: z.string().uuid(),
    mode: z.enum(ARTIFACT_ACCESS_MODES),
    password: z.string().optional(),
  })
  .strict()
export type SetArtifactAccessInput = z.infer<typeof setArtifactAccessInputSchema>

/**
 * ⚠️ `slug` IS the shared `slugSchema` here — the opposite choice from `get_artifact.slug`, and both
 * are right. `get_artifact` LOOKS UP whatever is already in the `slugs` table (including generated
 * short codes under 6 characters); this tool CREATES a new row there, so it must obey exactly the
 * rules the dashboard obeys, or an agent could mint a slug a human could not.
 *
 * The schema's `''` branch (`slugSchema` maps an empty string to `undefined`) is why the `.refine`
 * exists: for this tool an empty slug is not "leave it alone", it is a missing argument. The route
 * narrows the type on the same condition.
 */
export const setArtifactSlugInputSchema = z
  .object({
    artifact_id: z.string().uuid(),
    slug: slugSchema,
  })
  .strict()
  .refine((input) => typeof input.slug === 'string', { message: 'slug is required' })
export type SetArtifactSlugInput = z.infer<typeof setArtifactSlugInputSchema>

/**
 * ONE block for every artifact tool that returns an artifact (spec "Quy ước chung"), so a model that
 * learned the shape from `publish_artifact` reads `get_artifact` without relearning anything.
 *
 * Two fields are new in wave 4 and both are here because an agent could not otherwise answer a
 * question it is routinely asked: `access_mode` ("is this page public?") and `updated_at` ("when did
 * this last change?").
 *
 * ⚠️ `short_url` IS NULLABLE, and that is a widening of the wave-3 contract rather than an
 * oversight. `publish_artifact` always has one — `publish()` overlays the touch point it just
 * minted — but `get_artifact` and `list_artifacts` can legitimately return a DRAFT, which has no
 * touch point and therefore no short link at all. The old helper threw a 500 on a null here; a 500
 * for an artifact the user can see in their own dashboard is the wrong answer.
 */
/**
 * ⭐ P0.4 — ZOD, NOT AN INTERFACE, AND THE TYPE IS INFERRED FROM IT. `core/mcp/tools.ts` publishes
 * an `outputSchema` per tool and generates it from here, exactly as it already generates every
 * `inputSchema`. A hand-written JSON Schema beside a hand-written interface would be a second
 * definition of the same block, and the first field added to one and not the other ships a schema
 * that a strict MCP client rejects for a payload the server considers correct.
 */
export const artifactToolResultSchema = z.object({
  artifact_id: z.string(),
  /** `'live'` after a publish; `'draft'`, `'removed'`, `'blocked'`… on a read. Never guessed. */
  status: z.string(),
  name: z.string(),
  /** `public` | `password` | `private` | `google`. Who can open the page. */
  access_mode: z.string(),
  /** `null` for a draft that has no touch point yet — NOT an error (see above). */
  short_url: z.string().nullable(),
  serve_url: z.string(),
  /** `ArtifactDTO.path_qr_code` verbatim — a public storage URL of the QR image (SVG today). */
  qr_url: z.string().nullable(),
  size_bytes: z.number(),
  updated_at: z.string(),
})
export type ArtifactToolResult = z.infer<typeof artifactToolResultSchema>

/** Không có `warning`: xem lý do ở lược đồ đầu vào — chế độ xem được áp trước khi trang sống. */
export const publishDraftArtifactOutputSchema = artifactToolResultSchema


/**
 * The wave-3 name for the same block, kept so the two publish/update routes and their tests read as
 * they did. Identical shape on purpose: the "one block" rule above is what makes it identical.
 */
export type PublishedArtifact = ArtifactToolResult
export const updatedArtifactSchema = artifactToolResultSchema.extend({
  previous_size_bytes: z.number(),
})
export type UpdatedArtifact = z.infer<typeof updatedArtifactSchema>

/**
 * What a REPLAYED `publish_artifact` answers (WP3): the artifact the key already published, plus the
 * one flag that says so.
 *
 * ⚠️ The flag is PRESENT ONLY ON A REPLAY — a first publish does not carry `idempotent_replay: false`.
 * Two reasons, and neither is laziness: the fresh-publish response is a CLOSED list of fields that
 * both the route test and the tool description enumerate, and a model reading a flag it has to
 * compare against `false` is more likely to misread it than one reading a field that is simply there
 * or not. The HTTP status says the same thing a second way: 201 for a publish that created, 200 for
 * a replay that did not.
 */
export const publishedArtifactReplaySchema = artifactToolResultSchema.extend({
  idempotent_replay: z.literal(true),
})
export type PublishedArtifactReplay = z.infer<typeof publishedArtifactReplaySchema>

/** `get_artifact` — the shared block plus the two numbers only a single-artifact read pays for. */
export const artifactDetailResultSchema = artifactToolResultSchema.extend({
  /** Non-bot visits counted against the artifact's touch point. `0` for a draft. */
  visits: z.number(),
  /** Only meaningful (and only non-null) in `google` access mode. */
  viewer_count: z.number().nullable(),
})
export type ArtifactDetailResult = z.infer<typeof artifactDetailResultSchema>

/** `list_artifacts` — `next_cursor` is `null` on the last page, which is how a loop terminates. */
export const artifactListResultSchema = z.object({
  items: z.array(artifactToolResultSchema),
  next_cursor: z.string().nullable(),
})
export type ArtifactListResult = z.infer<typeof artifactListResultSchema>

/**
 * `delete_artifact`. Deliberately NOT the shared block: after a delete the row is a tombstone that
 * `getForOrg` refuses, so there is no DTO left to project — and a URL in the response would invite a
 * model to print a link to a page that now answers 410.
 */
export const deleteArtifactResultSchema = z.object({
  artifact_id: z.string(),
  /** Always `'removed'`. */
  status: z.string(),
  /** `true` when the artifact was ALREADY a tombstone — the call still succeeded. */
  already_removed: z.boolean(),
})
export type DeleteArtifactResult = z.infer<typeof deleteArtifactResultSchema>

/**
 * `set_artifact_access` (WP2 §1) — the shared block plus the one field that is the point of the call.
 *
 * ⛔ `password_set_at` IS THE ONLY THING THE PASSWORD LEAVES BEHIND, and that is the whole contract:
 * a timestamp lets an agent answer "is a password set, and since when" without the server ever being
 * able to tell anyone what it is (the column is a scrypt hash — `core/helpers/password-hash.ts`).
 * §10 of the design doc dropped the "return the password once" idea for exactly this reason: the
 * agent SENT the password, so echoing it buys nothing and puts it in a second transcript.
 */
export const setArtifactAccessResultSchema = artifactToolResultSchema.extend({
  /** When the CURRENT password was set. `null` in every mode other than `password`. */
  password_set_at: z.string().nullable(),
})
export type SetArtifactAccessResult = z.infer<typeof setArtifactAccessResultSchema>

/**
 * `publish_artifact` when `access` was requested (WP2 §3).
 *
 * ⚠️ `warning` IS PRESENT ONLY WHEN THE ACCESS CHANGE FAILED, and when it is present the page is
 * PUBLIC. The publish itself succeeded (201, quota spent, link and QR live); what failed is the
 * second call that would have locked it. The alternative — rolling the publish back — would delete
 * an artifact the user may already have been shown, so the contract tells the truth instead and the
 * tool's description tells the model to say it out loud and call `set_artifact_access` to retry.
 */
export const publishedArtifactWithAccessSchema = artifactToolResultSchema.extend({
  warning: z.string().optional(),
})
export type PublishedArtifactWithAccess = z.infer<typeof publishedArtifactWithAccessSchema>

/**
 * ⭐ P0.4 — the ONE `outputSchema` `publish_artifact` advertises, covering all three answers the
 * route can give: a plain publish, a publish whose access change failed (`warning`), and a replay
 * (`idempotent_replay`). Both extras are OPTIONAL here and that is not a weakening of the contract
 * documented above — the contract is about what the server SENDS, and the schema is about what a
 * client must accept. A client that rejected the `warning` field would reject the one answer the
 * user most needs to hear.
 */
export const publishArtifactOutputSchema = artifactToolResultSchema.extend({
  warning: z.string().optional(),
  idempotent_replay: z.literal(true).optional(),
})

/**
 * ============================================================================
 * ⭐ P0.4 — the three MCP-LOCAL answers (`list_orgs`, `find_li2_docs`, `get_doc_page`).
 * ============================================================================
 *
 * They live HERE, beside the back-hop shapes, for one mechanical reason: `core/mcp/tools.ts` is the
 * file that publishes `outputSchema`, and the modules that BUILD these answers (`list-orgs.ts`,
 * `find-docs.ts`) reach a repository and the public docs origin. Declaring the shapes in those files
 * would make the descriptor file import them, and a `tools.ts` that pulls `organization.repository`
 * drags the Supabase server client into every bundle — and into the descriptor unit test — that only
 * wanted the tool list. The two modules infer their return types from these schemas instead.
 */
export const mcpOrgEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  has_mcp_access: z.boolean(),
})

export const listOrgsResultSchema = z.object({
  organizations: z.array(mcpOrgEntrySchema),
  /** Present only when the list is empty — the model needs to know this is not a Li2 outage. */
  note: z.string().optional(),
})

export const docEntrySchema = z.object({
  title: z.string(),
  /** The manifest URL's pathname — the join key `get_doc_page` takes back verbatim. */
  path: z.string(),
  url: z.string(),
  description: z.string(),
})

export const findDocsResultSchema = z.object({
  query: z.string(),
  results: z.array(docEntrySchema),
  /** Present only when nothing matched — an empty array alone reads as "Li2 has no docs on this". */
  note: z.string().optional(),
})

export const docPageResultSchema = z.object({
  path: z.string(),
  title: z.string(),
  url: z.string(),
  /** MDX-stripped, and WHOLE. There is no partial success here. */
  content: z.string(),
})
