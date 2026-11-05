/**
 * ============================================================================
 * ONE projection of a URL touch point for every short-link tool (SL-0 §3).
 * ============================================================================
 *
 * The analogue of `artifact-agent-tools.ts`' `toArtifactToolResult`, and it exists for the same
 * reason: a model that learned the shape from `list_short_links` must read `get_short_link` —  and,
 * later, `update_short_link` — without relearning anything. Two hand-written projections drift, and
 * the field that drifts is always the one nobody tested.
 *
 * ⛔ THE ROW IS NEVER SPREAD. `touch_points` holds a password hash inside `access_control`, plus
 * `targeting`, `privacy_security`, `tracking`, `integration`, `user_id` and `organization_id`. A
 * `{...row}` projection leaks whatever a future migration adds to that table straight into a model's
 * context, with no test failing. So every field is written out, and `has_password` is a BOOLEAN
 * computed from `access_control` — the value itself never leaves the server.
 *
 * ★ `content_type` IS NOT PROJECTED, and that is not an omission. These tools only ever return rows
 * that are `URL`; an `ARTIFACT` row is refused upstream with its own refusal pointing at
 * `get_artifact` (`core/mcp/tool-refusals.ts`). A `content_type: "URL"` on every item would be a
 * field that is constant by construction, inviting a model to filter on something it cannot vary.
 */
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import type { ShortLink, UpdateShortLinkInput } from '@/shared/schemas/agent-tools'

/**
 * What the projection needs, and nothing more.
 *
 * Structural rather than `Pick<Tables<'touch_points'>, …>` so BOTH readers satisfy it: the
 * single-row `LinkDetailsRow` (no tag join — `tags` comes back `[]`) and the list row from
 * `findAllByOrganization`, which is a full `touch_points` row plus a `tp_tag_links` array. `visits`
 * is not here: the list query enriches rows with it, but `ShortLink` deliberately does not carry a
 * count — see `toShortLink`.
 */
export interface ShortLinkRow {
  id: string
  name: string
  slug?: string | null
  short_code?: string | null
  short_url: string
  content_value?: string | null
  path_qr_code?: string | null
  enabled: boolean
  created_at: string
  updated_at: string
  access_control?: unknown
  tp_tag_links?: unknown
}

/** Only the two fields of `access_control` this projection reads. Narrow on purpose. */
type AccessControlShape = { password?: string | null; expires_at?: string | null }

/**
 * Tag NAMES, not ids, and not the join rows.
 *
 * A model asked "which links are in the Tết campaign" needs the word; a `tag_id` is a uuid it can do
 * nothing with and would likely print at the user. The shape is whatever
 * `findAllByOrganization`'s `tp_tag_links ( tag_id, tags ( id, name, color ) )` returned, so every
 * level is checked rather than asserted — a single-row read has no `tp_tag_links` at all, and a tag
 * deleted mid-flight comes back with a null `tags`.
 */
function toTagNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  for (const link of raw) {
    const tags = (link as { tags?: unknown } | null)?.tags
    // PostgREST gives an object for a to-one embed, but an array when it cannot prove it is to-one.
    const candidates = Array.isArray(tags) ? tags : [tags]
    for (const tag of candidates) {
      const name = (tag as { name?: unknown } | null)?.name
      if (typeof name === 'string' && name !== '') names.push(name)
    }
  }
  return names
}

/**
 * ⚠️ NO `visits` FIELD, on either tool. The list query already enriches every row with a count, so
 * adding it would have been free — and wrong for the same reason `list_artifacts` leaves it out: a
 * number on every row is a number a model reports as fact, and this one counts rows in `visits`
 * with no time window and no agreement with what `get_analytics_summary` or `get_top_links` call a
 * visit. Two different totals for "clicks on this link" in one conversation is worse than one.
 * Traffic questions have tools of their own.
 */
export function toShortLink(row: ShortLinkRow): ShortLink {
  const accessControl = (row.access_control ?? null) as AccessControlShape | null

  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    short_code: row.short_code ?? null,
    short_url: row.short_url,
    destination_url: row.content_value ?? null,
    qr_url: row.path_qr_code ?? null,
    enabled: row.enabled,
    has_password: Boolean(accessControl?.password),
    expires_at: accessControl?.expires_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: toTagNames(row.tp_tag_links),
  }
}

/**
 * ============================================================================
 * `update_short_link`'s patch mapper (SL-2).
 * ============================================================================
 *
 * ⚠️ WHY A MAPPER AND NOT FOUR LINES IN THE ROUTE. Every one of the five fields the tool accepts is
 * renamed, nested or merged on the way to `touchPointService.updateAndReturn`, and three of the
 * translations are only correct because of something the service does downstream:
 *
 *   · `destination_url` → `content_value`, a plain rename on the wire.
 *   · `access_control` is MERGED by the service (`{...old, ...patch}` then `pickDefinedAndNotNull`),
 *     which is the only reason `null` can mean "remove": the null overwrites the old value and is
 *     then dropped from the stored object.
 *   · `utm` is NOT merged by the service — it assigns `utm_tags` wholesale — so the merge has to
 *     happen HERE or every patch would wipe the parameters it did not mention.
 *
 * The second job is `changed`, which cannot be computed anywhere else: the service tells nobody
 * which fields it kept (`getChangedFields` is internal), and after the write the old values are
 * gone. So the comparison happens against the row as it was read, before the call.
 */
/** The stored values the patch has to be compared and merged against. A subset of `LinkDetailsRow`. */
export interface ShortLinkUpdateSourceRow {
  name: string
  content_value?: string | null
  enabled: boolean
  utm_tags?: unknown
  access_control?: unknown
}

type UtmShape = {
  enabled?: boolean
  overrideable?: boolean
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

/**
 * What `updateAndReturn` is handed. Deliberately NOT `z.infer<typeof touchPointUpdateSchema>`: that
 * type makes `name` required (checklist B11), so the route casts at the call site and this stays an
 * honest description of what is actually sent.
 */
export interface TouchPointUpdatePatch {
  name?: string
  content_value?: string
  enabled?: boolean
  utm_tags?: UtmShape
  access_control?: { password?: string | null; expires_at?: Date | null }
}

export interface ShortLinkUpdatePlan {
  patch: TouchPointUpdatePatch
  /** Tool field names, never column names — see `UpdateShortLinkResult`. */
  changed: string[]
}

/** Two timestamps that name the same instant, written differently, are not a change. */
function sameInstant(a: string | null, b: string | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const left = Date.parse(a)
  const right = Date.parse(b)
  return Number.isFinite(left) && Number.isFinite(right) && left === right
}

/**
 * ⚠️ UTM PARAMETERS WITH NO SOURCE ARE INERT, and silently so: li2-be appends nothing without one,
 * and `utmSchema`'s own `superRefine` says the same for the dashboard. A patch that leaves the link
 * in that state would be reported to the user as a tracking change that then never shows up in any
 * report, so it is refused here instead — under `field_invalid`, the key whose refusal sentence
 * names the UTM source as one of the values to check.
 *
 * `enabled: true` whenever UTM is patched at all, mirroring `create_short_link`: the service keys
 * both the plan gate and li2-be's behaviour off that flag, so a merge that left it `false` would
 * store parameters nothing reads.
 */
function mergeUtm(old: UtmShape, patch: NonNullable<UpdateShortLinkInput['utm']>): UtmShape {
  const merged: UtmShape = {
    ...old,
    ...(patch.source !== undefined && { utm_source: patch.source }),
    ...(patch.medium !== undefined && { utm_medium: patch.medium }),
    ...(patch.campaign !== undefined && { utm_campaign: patch.campaign }),
    ...(patch.term !== undefined && { utm_term: patch.term }),
    ...(patch.content !== undefined && { utm_content: patch.content }),
    overrideable: old.overrideable ?? false,
    enabled: true,
  }

  if (!merged.utm_source)
    throw new BadRequestError('UTM parameters need a source to take effect', {
      key: 'common:messages.error.field_invalid',
      params: { field: 'utm.source' },
    })

  return merged
}

export function planShortLinkUpdate(
  input: UpdateShortLinkInput,
  row: ShortLinkUpdateSourceRow
): ShortLinkUpdatePlan {
  const patch: TouchPointUpdatePatch = {}
  const changed: string[] = []

  if (input.destination_url !== undefined) {
    patch.content_value = input.destination_url
    if (input.destination_url !== (row.content_value ?? null)) changed.push('destination_url')
  }

  if (input.name !== undefined) {
    patch.name = input.name
    if (input.name !== row.name) changed.push('name')
  }

  if (input.enabled !== undefined) {
    patch.enabled = input.enabled
    if (input.enabled !== row.enabled) changed.push('enabled')
  }

  if (input.utm && Object.keys(input.utm).length > 0) {
    const oldUtm = ((row.utm_tags ?? {}) as UtmShape) || {}
    const merged = mergeUtm(oldUtm, input.utm)
    patch.utm_tags = merged
    // The service compares the whole block too (`equal(data.utm_tags, touchPoint.utm_tags)`), so
    // comparing it here is the same question asked with the same values.
    if (
      JSON.stringify(merged) !==
      JSON.stringify({ ...oldUtm, overrideable: oldUtm.overrideable ?? false, enabled: true })
    )
      changed.push('utm')
  }

  const accessPatch = input.access_control
  if (accessPatch && Object.keys(accessPatch).length > 0) {
    const oldAccess = (row.access_control ?? {}) as {
      password?: string | null
      expires_at?: string | null
    }
    patch.access_control = {}

    if (accessPatch.password !== undefined) {
      patch.access_control.password = accessPatch.password
      /**
       * A password SET is always reported as changed, even if it happens to equal the stored one.
       * `has_password` is all any tool can read back, so "no change" would be a claim about a value
       * this code is not entitled to compare. Removal is comparable, and `null` on a link that has
       * no password changes nothing.
       */
      if (accessPatch.password !== null || Boolean(oldAccess.password)) changed.push('password')
    }

    if (accessPatch.expires_at !== undefined) {
      // A `Date`, not the caller's string, mirroring `create_short_link`: the service normalises a
      // Date with `toISOString()`, so one spelling of an instant reaches the column no matter which
      // offset the caller wrote it in. `null` stays null — that is the removal signal.
      patch.access_control.expires_at =
        accessPatch.expires_at === null ? null : new Date(accessPatch.expires_at)
      if (!sameInstant(accessPatch.expires_at, oldAccess.expires_at ?? null))
        changed.push('expires_at')
    }
  }

  return { patch, changed }
}
