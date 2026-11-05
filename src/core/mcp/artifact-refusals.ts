/**
 * ============================================================================
 * Refusal messages for `publish_artifact` / `update_artifact` (spec artifact-wave3-mcp-publish R8).
 * ============================================================================
 *
 * The ONE controlled widening of `errors.ts`' "never forward upstream bodies" rule, and it is a
 * widening of what we READ, not of what we SEND. For these two tools the status bucket alone lies:
 * a 403 for "30 MB quota" would read as "your role does not allow it", a 400 for "HTML over 10 MB"
 * as "re-read the schema, utm_source…". The approved sentences need the NUMBERS from the server's
 * state — used, needed, free, size — and `i18nMessage.params` is the only channel that carries them
 * without carrying text.
 *
 * ⛔ WHAT IS READ: `body.i18nMessage.key` (a closed set of keys we own) and numeric / `field` entries
 *    of `body.i18nMessage.params`. Nothing else — `body.message` is never read, never interpolated,
 *    never logged from here. Every sentence below is OUR wording; the numbers are formatted by
 *    `fmtMb`. A key or status we do not recognise returns `null` and `backHopError` runs the old
 *    bucket exactly as before.
 *
 * Only called for the artifact tools (`isArtifactTool`); `call-tool.ts` does not even read the 4xx
 * body for the other nine, so their behaviour is unchanged by construction.
 *
 * Wave 4 WP1 added three tools to that list and two rows to the table below (the role refusal, and a
 * tool-aware "not found"), plus one thing that is NOT a refusal: `isAlreadyRemovedDelete`, because a
 * second `delete_artifact` has to come back a SUCCESS.
 *
 * Wave 4 WP2 added `set_artifact_access` and `set_artifact_slug`, six rows, and the one pattern worth
 * naming: THREE KEYS NOW MEAN DIFFERENT THINGS TO DIFFERENT TOOLS. `artifact:update.status_refuses`
 * is "Li2 is holding this" for `update_artifact` and most often "it is still a draft" for
 * `set_artifact_slug`; `common:messages.error.permission_error` is `DELETE_TOUCH_POINT` for
 * `delete_artifact` and `add_touch_point` for the two setters. The switch therefore branches on the
 * TOOL inside a case, and a sentence is never shared just because a key is.
 *
 * Clamav spec WP2 added the two scan refusals, and they are the clearest case in the file for why a
 * boolean result would have been wrong: `scan_infected` (400) and `scan_unavailable` (503) come from
 * the same gate and need opposite advice — "do not retry, the file is the problem" versus "retry the
 * same file, the file was never judged". They are also the first rows that belong to BOTH write
 * tools, because the gate lives in `create()` and `replaceContent()` rather than in one entry point.
 *
 * Clamav spec WP3 added one row, `artifact:errors.status_refuses_publish`, and it is the inverse of
 * that pattern: a NEW key rather than a fourth meaning for `artifact:update.status_refuses`. The two
 * sentences point at different actions — "the content is unchanged" versus "nothing was published" —
 * and sharing the key would have made that distinction unrecoverable at this layer.
 */
import {
  ARTIFACT_MAX_BYTES,
  ARTIFACT_PASSWORD_MAX_LENGTH,
  ARTIFACT_PASSWORD_MIN_LENGTH,
  ARTIFACT_QUOTA_FREE_BYTES,
  ARTIFACT_QUOTA_FREE_LIVE,
} from '@/core/types/artifact.type'
import { McpToolError } from './errors'

export const ARTIFACT_TOOL_NAMES = [
  'publish_artifact',
  'update_artifact',
  // Wave 4 WP1. The two READ tools are in this list for one reason only: `call-tool.ts` reads the
  // 4xx body for a name in this list, and `delete_artifact`'s "already removed" answer plus the 403
  // role refusal both need the body's `i18nMessage.key`. For `get_artifact` / `list_artifacts` the
  // mapper currently returns `null` on every key, so their behaviour is the plain status bucket —
  // listing them keeps "the body is read for artifact tools" one rule instead of two.
  'get_artifact',
  'list_artifacts',
  'delete_artifact',
  // Wave 4 WP2. Both NEED the body read: every one of their refusals is a 400/403/409 whose status
  // bucket points at the wrong fix — "re-read the schema" for a password that is six characters
  // long, "quota" for a role that may not edit touch points, "try a different slug" for a draft
  // that was never published.
  'set_artifact_access',
  'set_artifact_slug',
] as const
export type ArtifactToolName = (typeof ARTIFACT_TOOL_NAMES)[number]

export function isArtifactTool(name: string): name is ArtifactToolName {
  return (ARTIFACT_TOOL_NAMES as readonly string[]).includes(name)
}

/** `12.4 MB` — one decimal, binary megabytes, the unit the dashboard and the spec both use. */
export function fmtMb(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const FILE_LIMIT_MB = ARTIFACT_MAX_BYTES / 1048576
const QUOTA_MB = ARTIFACT_QUOTA_FREE_BYTES / 1048576

/** The i18n keys the service raises for these tools. Closed set: anything else → `null`. */
const KEY = {
  quotaLive: 'artifact:errors.quota_live',
  exceedLimit: 'common:messages.error.field_exceed_limit',
  htmlEmpty: 'agent:artifact.html_empty',
  notFound: 'common:messages.error.not_found',
  removed: 'artifact:errors.removed',
  statusRefuses: 'artifact:update.status_refuses',
  /**
   * Publish refused by the row's OWN status — the WP3 guard in
   * `20261021000001_artifacts__publish_status_guard.sql` plus its pre-check in `publish()`.
   * Deliberately NOT `statusRefuses`: that key's sentence is about replacing bytes under live
   * content, and a refused publish has no live content to talk about.
   */
  statusRefusesPublish: 'artifact:errors.status_refuses_publish',
  /**
   * Clamav WP2 — the upload was scanned and clamd matched a signature (400). Raised by
   * `scanOrRefuse` inside `create()` and `replaceContent()`, so BOTH write tools can reach it.
   */
  scanInfected: 'artifact:errors.scan_infected',
  /**
   * The file is password-protected, so clamd matched `Heuristics.Encrypted.*` and never saw inside
   * (400). A THIRD key, not a second meaning for `scanInfected`: the advice is the exact opposite of
   * "do not retry" — there IS a file that works, the same document saved without a password.
   */
  scanEncrypted: 'artifact:errors.scan_encrypted',
  /**
   * Clamav WP2 — the scan did not produce a verdict (503, fail-closed). A DIFFERENT KEY from
   * `scanInfected` on purpose: the two need opposite advice, and one key could not carry both.
   */
  scanUnavailable: 'artifact:errors.scan_unavailable',
  /** `PermissionError`'s key — the role inside the org, not the OAuth scope. */
  permission: 'common:messages.error.permission_error',
  // Wave 4 WP3 — the three answers `idempotency_key` adds. All `agent:*`: no UI renders them.
  idemInProgress: 'agent:artifact.idem_in_progress',
  idemUnavailable: 'agent:artifact.idem_unavailable',
  idemArtifactGone: 'agent:artifact.idem_artifact_gone',
  // Wave 4 WP2 — `setAccess` and `changeSlug`.
  /** `parseAccessInput`: mode is `password` and none was sent. */
  fieldRequired: 'common:messages.error.field_required',
  /** `parseAccessInput`: a password outside 8–128 code points, or a mode gated off by env. */
  fieldInvalid: 'common:messages.error.field_invalid',
  /** `applyAccess`: the `access_version` optimistic lock lost a race. */
  accessConflict: 'artifact:access.conflict',
  /** `slugService.createSlug` mapping Postgres 23505 — the `slugs.slug` unique index is GLOBAL. */
  slugTaken: 'common:messages.error.slug_is_taken',
  /** `ensureOrgPlan(MAX_SLUGS_PER_TP)` — the key is built from the plan limit's own name. */
  planMaxSlugs: 'common:messages.error.plan_errors.max_slugs_per_tp',
} as const

const FIELD_FILE = '$t(label.file)'
const FIELD_STORAGE = '$t(label.storage)'
const FIELD_PASSWORD = '$t(label.password)'
const FIELD_ACCESS_MODE = 'access_mode'

/** The 8–128 rule, from the same constants the service counts against. */
const PASSWORD_RANGE = `${ARTIFACT_PASSWORD_MIN_LENGTH} to ${ARTIFACT_PASSWORD_MAX_LENGTH}`

type Params = Record<string, unknown>

function readI18n(body: unknown): { key: string; params: Params } | null {
  if (typeof body !== 'object' || body === null) return null
  const message = (body as { i18nMessage?: unknown }).i18nMessage
  if (typeof message !== 'object' || message === null) return null
  const key = (message as { key?: unknown }).key
  if (typeof key !== 'string') return null
  const rawParams = (message as { params?: unknown }).params
  const params = typeof rawParams === 'object' && rawParams !== null ? (rawParams as Params) : {}
  return { key, params }
}

function numberParam(params: Params, name: string): number | null {
  const value = params[name]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringParam(params: Params, name: string): string {
  const value = params[name]
  return typeof value === 'string' ? value : ''
}

/**
 * The ten sentences (R8c). Returns `null` whenever the (tool, status, key, params) combination is not
 * one of them — the caller falls back to the status bucket.
 */
/**
 * Is this 4xx the "it was already a tombstone" answer to a `delete_artifact`?
 *
 * ⚠️ NOT A REFUSAL, which is why it is a separate function returning a boolean rather than a row in
 * `artifactRefusalFor`: the caller turns a `true` into a SUCCESSFUL tool result carrying
 * `already_removed: true` (WP1 §4). A retrying agent must not be told a completed delete failed.
 *
 * The key is what makes it decidable at all. Before wave 4 `deleteForOrg` threw the SAME
 * `common:messages.error.not_found` for "no such id" and "already a tombstone" (checklist C4), and
 * treating a bare 404 as "already removed" here would report success for an id that never existed —
 * including a typo, and including an id belonging to another org.
 */
export function isAlreadyRemovedDelete(toolName: string, status: number, body: unknown): boolean {
  if (toolName !== 'delete_artifact' || status !== 404) return false
  return readI18n(body)?.key === KEY.removed
}

export function artifactRefusalFor(
  toolName: string,
  status: number,
  body: unknown
): McpToolError | null {
  if (!isArtifactTool(toolName)) return null
  const i18n = readI18n(body)
  if (!i18n) return null
  const { key, params } = i18n
  const isPublish = toolName === 'publish_artifact'
  /** Clamav WP2: the scan refusals are the first rows that belong to BOTH write tools. */
  const isUpdate = toolName === 'update_artifact'
  const isDelete = toolName === 'delete_artifact'
  const isSetAccess = toolName === 'set_artifact_access'
  const isSetSlug = toolName === 'set_artifact_slug'

  switch (key) {
    // 1 — live slots, publish only (update never consumes a slot)
    case KEY.quotaLive: {
      if (status !== 403 || !isPublish) return null
      const limit = numberParam(params, 'limit') ?? ARTIFACT_QUOTA_FREE_LIVE
      return new McpToolError(
        'forbidden',
        `This organization already has ${limit} published artifacts, which is the maximum on its ` +
          'plan. Delete one in the li2 dashboard, then call this tool again. Nothing was created — ' +
          'there is no draft to clean up.'
      )
    }

    // 2 — file over 10 MB (400 from create, 413 from replace or layer 0) · 3/4 — the 30 MB quota
    case KEY.exceedLimit: {
      const field = stringParam(params, 'field')

      if (field === FIELD_FILE && (status === 400 || status === 413)) {
        const size = numberParam(params, 'size_bytes')
        if (size !== null)
          return new McpToolError(
            'rejected',
            `The HTML is ${fmtMb(size)} after decoding; the limit is ${FILE_LIMIT_MB} MB per file. ` +
              'Nothing was uploaded.'
          )
        const declared = numberParam(params, 'declared_bytes')
        if (declared !== null)
          return new McpToolError(
            'rejected',
            `The request body is ${fmtMb(declared)}; the limit is ${FILE_LIMIT_MB} MB of HTML per ` +
              'file. Nothing was uploaded.'
          )
        return null
      }

      if (field === FIELD_STORAGE && status === 403) {
        const used = numberParam(params, 'used_bytes')
        const need = numberParam(params, 'need_bytes')
        const free = numberParam(params, 'free_bytes')
        if (need === null) return null
        if (isPublish) {
          if (used === null) return null
          return new McpToolError(
            'forbidden',
            `This organization has used ${fmtMb(used)} of ${QUOTA_MB} MB. This file needs ` +
              `${fmtMb(need)}. Delete an artifact in the li2 dashboard to free space.`
          )
        }
        if (free === null) return null
        return new McpToolError(
          'forbidden',
          `Replacing this file needs ${fmtMb(need)} more than the file it replaces, and only ` +
            `${fmtMb(free)} is free. The current content is unchanged.`
        )
      }

      return null
    }

    /**
     * 5 — blank page. Only the two tools that TAKE an `html` field: `ensureHtmlNotBlank` runs in the
     * publish and update routes and nowhere else, so answering "the html field is empty" to a
     * `set_artifact_slug` would be a sentence about an argument that tool does not have. (WP2
     * narrowed this from "any artifact tool"; before WP2 there was no artifact tool without `html`
     * that could reach a 400 with this key, so the narrowing changes no existing behaviour.)
     */
    case KEY.htmlEmpty:
      return status === 400 && (isPublish || toolName === 'update_artifact')
        ? new McpToolError('rejected', 'The html field is empty.')
        : null

    /**
     * 7 — unknown id. Deliberately NOT "belongs to another org": that is an existence oracle.
     *
     * `publish_artifact` is excluded because it takes no id, so a 404 from it is not this. The other
     * three all take one and all mean the same thing by a `not_found`; `get_artifact` names `slug`
     * too because it is the one tool that can be given one, and `delete_artifact` says nothing was
     * deleted so a model does not report a removal that never happened.
     */
    case KEY.notFound: {
      if (status !== 404 || isPublish) return null
      if (toolName === 'get_artifact')
        return new McpToolError(
          'not_found',
          'No artifact in this organization matches that artifact_id or slug. An artifact that was ' +
            'taken down is also reported this way. Call list_artifacts to see what exists.'
        )
      if (isDelete)
        return new McpToolError(
          'not_found',
          'No artifact with that id in this organization. Nothing was deleted.'
        )
      return new McpToolError('not_found', 'No artifact with that id in this organization.')
    }

    /**
     * 8 — tombstone. Update only: for `delete_artifact` this same (404, key) pair is NOT a refusal
     * at all — `isAlreadyRemovedDelete` catches it upstream and it becomes a successful result with
     * `already_removed: true`. The explicit `!isDelete` is what keeps a future reordering from
     * turning a completed delete into "cannot be updated".
     */
    case KEY.removed: {
      if (status !== 404 || isPublish || isDelete) return null
      // WP2: the two `set_` tools reach the same tombstone and the word "updated" would be wrong for
      // them — nothing about a removed artifact can be set, so the advice is the same but the verb
      // has to match what the caller asked for.
      if (isSetAccess || isSetSlug)
        return new McpToolError(
          'not_found',
          'That artifact has been taken down, so nothing about it can be changed. Publish a new one.'
        )
      return new McpToolError(
        'not_found',
        'That artifact has been taken down and cannot be updated. Publish a new one.'
      )
    }

    /**
     * 11 (wave 4 WP1) — the ROLE inside the org, not the OAuth scope.
     *
     * The grant's `write` scope is binary and says nothing about `DELETE_TOUCH_POINT`, which is the
     * permission `deleteForOrg` resolves first. So a token that is allowed to publish can still be
     * refused here, and the plain 403 bucket would say "quota" — the wrong fix for the user to try.
     * Delete only: `publish_artifact`'s 403s are the two quota cases above, which have their own
     * keys and their own numbers.
     */
    case KEY.permission: {
      if (status !== 403) return null
      if (isDelete)
        return new McpToolError(
          'forbidden',
          'Your role in this organization does not include permission to delete touch points, so ' +
            'this artifact was not deleted. Ask an owner or admin of the organization to remove ' +
            'it, or to change your role.'
        )
      /**
       * 15 (wave 4 WP2) — the same hole on the two `set_` tools, and a DIFFERENT permission:
       * `setAccess` and `changeSlug` both resolve `add_touch_point`, not `DELETE_TOUCH_POINT`. The
       * sentence names what did not happen, because a model that reads a bare 403 as "quota" would
       * tell the user to delete something.
       */
      if (isSetAccess)
        return new McpToolError(
          'forbidden',
          'Your role in this organization does not include permission to change a touch point, so ' +
            'who can open this artifact was NOT changed. Ask an owner or admin of the organization ' +
            'to change it, or to change your role.'
        )
      if (isSetSlug)
        return new McpToolError(
          'forbidden',
          'Your role in this organization does not include permission to change a touch point, so ' +
            'the link was NOT renamed and the current one keeps working. Ask an owner or admin of ' +
            'the organization to rename it, or to change your role.'
        )
      return null
    }

    /**
     * 16 (WP2) — `set_artifact_access` with mode `password` and no password at all.
     *
     * The bare 400 bucket says "re-read the schema", and the schema is INNOCENT here: the 8–128 rule
     * deliberately lives in the service (see `artifactAccessInputSchema`), so a model obeying the
     * JSON Schema to the letter can still land here. The sentence has to carry the rule itself.
     */
    case KEY.fieldRequired:
      return status === 400 && isSetAccess && stringParam(params, 'field') === FIELD_PASSWORD
        ? new McpToolError(
            'rejected',
            `Access mode "password" needs a password of ${PASSWORD_RANGE} characters, and none was ` +
              'sent. Nothing changed — who can open the artifact is still what it was. Ask the user ' +
              'for a password, or choose "private" instead.'
          )
        : null

    /**
     * 17/18 (WP2) — the two things `parseAccessInput` can reject by FIELD, on one key.
     *
     * `field` is what separates them, and both are reachable from a model that read the schema: the
     * password length is not in the schema at all, and `google` is in the enum but gated on a server
     * env var, so on an instance without that OAuth client a legal-looking value is a 400.
     */
    case KEY.fieldInvalid: {
      if (status !== 400 || !isSetAccess) return null
      const field = stringParam(params, 'field')
      if (field === FIELD_PASSWORD)
        return new McpToolError(
          'rejected',
          `That password is not between ${PASSWORD_RANGE} characters, so nothing changed. Send one ` +
            'in that range and tell the user what it is.'
        )
      if (field === FIELD_ACCESS_MODE)
        return new McpToolError(
          'rejected',
          'That access mode is turned off on this Li2 server, so nothing changed. Google sign-in ' +
            'for artifacts has to be configured by whoever runs this server; use "password" or ' +
            '"private" instead.'
        )
      return null
    }

    /**
     * 19 (WP2) — the `access_version` optimistic lock lost a race.
     *
     * The state the caller based the call on is stale, so the fix is to re-read and decide again —
     * NOT to retry blindly, which is what a plain "conflict" invites and which would overwrite
     * whatever the other change just set.
     *
     * `set_artifact_access` only. `publish_artifact` can hit the same service error on its `access`
     * block, but the route catches it and answers 201 with a `warning` — it never becomes a 4xx, so
     * accepting it here for publish would be a branch no call can reach.
     */
    case KEY.accessConflict:
      return status === 409 && isSetAccess
        ? new McpToolError(
            'conflict',
            'Who can open this artifact was changed by someone else while this call was in flight, ' +
              'so nothing was written. Call get_artifact to see the current access mode, then ' +
              'decide again and retry.'
          )
        : null

    /**
     * 20 (WP2) — the slug is already in use. 400, not 409: it is Postgres 23505 mapped by
     * `slugService.createSlug`, and the unique index on `slugs.slug` is GLOBAL, so the slug may well
     * be held by another organization. The sentence must not imply the caller can go and free it,
     * and must not hint at whose it is.
     */
    case KEY.slugTaken:
      return (status === 400 || status === 409) && isSetSlug
        ? new McpToolError(
            'rejected',
            'That slug is already in use somewhere in Li2, so the link was not renamed and the ' +
              'current one keeps working. Suggest a different ending to the user.'
          )
        : null

    /** 21 (WP2) — the plan's cap on how many slugs one touch point may accumulate. */
    case KEY.planMaxSlugs:
      return status === 403 && isSetSlug
        ? new McpToolError(
            'forbidden',
            "This artifact's link has already been renamed as many times as the organization's " +
              'plan allows, so it was not renamed again and the current link keeps working. Every ' +
              'past slug is kept alive, which is why they count. Upgrading the plan is the only way ' +
              'to raise it.'
          )
        : null

    /**
     * 12 (wave 4 WP3) — another call is holding this `idempotency_key`.
     *
     * Publish only, and the 409 bucket would be actively misleading here: it says "a slug already in
     * use is the usual cause. Try a different value", which would have the model change the SLUG —
     * the one thing that is not the problem — or mint a new key, which is exactly how the duplicate
     * publish the key exists to prevent happens. So the sentence has to name the wait.
     */
    case KEY.idemInProgress:
      return status === 409 && isPublish
        ? new McpToolError(
            'conflict',
            'A publish with this idempotency_key is still in progress, retry in a few seconds with ' +
              'the SAME key and the same arguments. Do not change the key and do not publish again ' +
              'under a new one — that would create a second artifact.'
          )
        : null

    /**
     * 13 — the idempotency store is unreachable (503). Publish only.
     *
     * The alternative to this refusal is publishing WITHOUT the guarantee the caller asked for, and
     * that is the one thing we must not do silently: the caller sent a key because it intends to
     * retry, so an unguarded publish plus a retry is two artifacts. `upstreamUnavailable()` would
     * say "try again in a moment", which is right, but it would not tell the caller the key was the
     * reason — and a client that drops the key to "work around" the error gets the duplicate.
     */
    case KEY.idemUnavailable:
      return status === 503 && isPublish
        ? new McpToolError(
            'upstream_unavailable',
            'Li2 cannot check idempotency_key right now, so this publish was NOT attempted — ' +
              'nothing was created. Retry in a moment with the same key. Do not retry without the ' +
              'key to get around this: that is what would create a duplicate artifact.'
          )
        : null

    /**
     * 14 — the key is valid and names an artifact that has since been deleted (404). Publish only.
     *
     * Separate from case 7 because `publish_artifact` is EXCLUDED there: it takes no id, so a plain
     * not-found from it cannot be "check the id you sent". This is the only 404 it has.
     */
    case KEY.idemArtifactGone:
      return status === 404 && isPublish
        ? new McpToolError(
            'not_found',
            'This idempotency_key refers to an artifact that has since been taken down, so there is ' +
              'nothing to return and nothing was published. If the page is still wanted, publish it ' +
              'with a new idempotency_key.'
          )
        : null

    // 10 — a status the system is holding
    case KEY.statusRefuses: {
      if (status !== 409 || isPublish) return null

      /**
       * ⚠️ WP2: `set_artifact_slug` SHARES THIS KEY WITH A COMPLETELY DIFFERENT CAUSE, and the
       * wave-3 sentence would be a lie for it. `changeSlug` throws `statusRefusesReplace` when the
       * artifact is not `live` OR has no touch point — and by far the most likely reason is a DRAFT,
       * which is not "held by Li2" at all. Telling a model to check a blocked artifact in the
       * dashboard when the real answer is "publish it first" costs the user the whole task.
       */
      if (isSetSlug)
        return new McpToolError(
          'conflict',
          'That artifact is not published, so it has no short link or QR code to rename. Publish ' +
            'it first. The same answer comes back for an artifact Li2 is holding (blocked, ' +
            'quarantined, expired or still scanning) — check it in the li2 dashboard if you ' +
            'believe it was published.'
        )

      if (isSetAccess)
        return new McpToolError(
          'conflict',
          'That artifact is being held by Li2 (blocked, quarantined, expired or still scanning), ' +
            'so who can open it cannot be changed right now. Check it in the li2 dashboard. ' +
            'Nothing was changed.'
        )

      return new McpToolError(
        'conflict',
        'That artifact is being held by Li2 (blocked, quarantined, expired or still scanning) ' +
          'and cannot be updated right now. Check it in the li2 dashboard. The current content ' +
          'is unchanged.'
      )
    }

    /**
     * 25 — publish refused by the artifact's own status (clamav spec WP3). PUBLISH ONLY: the key is
     * raised in exactly one place, `publish()`, and no other tool can reach it.
     *
     * The sentence says "not published" and stops there — it does NOT promise the draft was cleaned
     * up. `discardDraft` only deletes a row that is still `draft` with no touch point, so a row this
     * refusal names (quarantined, blocked, expired, removed) is left exactly where it is, on
     * purpose. Telling a model nothing remains would send it to publish the same bytes again, which
     * a hold will refuse the same way.
     */
    case KEY.statusRefusesPublish:
      return status === 409 && isPublish
        ? new McpToolError(
            'conflict',
            'Li2 is holding that artifact (blocked, quarantined, expired, or taken down), so it ' +
              'was NOT published and nothing is serving at a public address. Do not retry — the ' +
              'hold refuses the same way every time. Check the artifact in the li2 dashboard; if ' +
              'it was quarantined, the content itself is what has to change.'
          )
        : null

    /**
     * 26 (clamav WP2) — clamd matched a malware signature in the uploaded bytes. Both write tools:
     * `publish_artifact` scans inside `create()`, `update_artifact` inside `replaceContent()`.
     *
     * THE SIGNATURE NAME IS NOT IN THIS SENTENCE AND MUST NOT BE. The service never puts it in the
     * body, so there is nothing to read here even if someone wanted it — naming the rule a file
     * tripped is an instruction for getting the next attempt through.
     *
     * The sentence tells the model NOT to retry and not to rewrite the file, because both are what a
     * helpful model does by default and both are wrong: the bytes are the problem, and retrying the
     * same bytes gets the same answer while "cleaning up the HTML" turns a refusal nobody can see
     * into content nobody checked. It also has to say the HUMAN is the next step — a false positive
     * is the most likely cause for legitimate customer content (spec §6) and only support can lift it.
     */
    case KEY.scanInfected:
      return status === 400 && (isPublish || isUpdate)
        ? new McpToolError(
            'rejected',
            'Li2 scanned that file for malware and refused it, so nothing was uploaded and nothing ' +
              'is serving. Do NOT retry with the same file and do not try to rewrite it to get ' +
              'past the scan. Tell the user the file was rejected by the safety scan and that they ' +
              'should contact Li2 support if they believe it is a mistake.'
          )
        : null

    /**
     * 28 — the file is protected by a password, so the scan could not open it. Both write tools, the
     * same two entry points as case 26.
     *
     * SEPARATE FROM CASE 26 BECAUSE THE ANSWER IS THE OPPOSITE ONE. Case 26 tells a model to stop
     * and fetch a human; here there is a concrete fix the model can ask for, and sending it down the
     * "contact support" path would waste a round trip and tell the user their legitimate document
     * looks like malware. The sentence also has to forbid the two shortcuts a helpful model reaches
     * for: guessing the password, and stripping it itself — we are not asking it to decrypt anything,
     * we are asking for a copy that was never encrypted.
     */
    case KEY.scanEncrypted:
      return status === 400 && (isPublish || isUpdate)
        ? new McpToolError(
            'rejected',
            'That file is protected by a password, so Li2 could not open it to run its safety ' +
              'check and refused it — nothing was uploaded. This does NOT mean the file is unsafe. ' +
              'Ask the user for a copy of the same document saved WITHOUT a password and send that ' +
              'instead. Do not retry the same file and do not try to remove the password yourself.'
          )
        : null

    /**
     * 27 (clamav WP2) — the scan could not run: clamd unreachable, timed out, or misconfigured.
     * Li2 fails CLOSED here, so the upload was refused even though nothing is wrong with the file.
     *
     * Kept apart from case 26 for the reason the service keeps two errors apart: "your file contains
     * malware" and "our scanner is down" lead to opposite next actions, and a model told the wrong
     * one either badgers a user about a clean file or retries a file that will never be accepted.
     * The one thing this sentence must do that `upstreamUnavailable()` would not is say the file was
     * NOT judged — otherwise a retry that then succeeds reads as "the scan is flaky", and the user
     * is left unsure whether their document was ever checked.
     */
    case KEY.scanUnavailable:
      return status === 503 && (isPublish || isUpdate)
        ? new McpToolError(
            'upstream_unavailable',
            'Li2 could not run its malware scan just now, so this file was NOT accepted — nothing ' +
              'was uploaded and nothing was created. This says nothing about the file itself; it ' +
              'was never checked. Retry the same file in a few minutes, and tell the user it is a ' +
              'temporary problem on the Li2 side.'
          )
        : null

    default:
      return null
  }
}
