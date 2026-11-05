/**
 * ============================================================================
 * ONE ROW PER TOOL — what a tool DOES, declared away from what it SAYS (WP1 §1).
 * ============================================================================
 *
 * `tools.ts` owns the wording a model reads. This file owns the three facts about a tool that other
 * code has to branch on, and it exists because each of those facts was previously duplicated:
 *
 *   1. `mutation` — the only input to `annotations`. Before this file there were no annotations at
 *      all (checklist A8), so every client had to guess from the description whether a tool writes.
 *   2. `needsOrg` — the list of org-scoped tools was a HAND-COPIED constant inside
 *      `tools.test.ts`, which means the test could not fail for the one bug it was written to catch:
 *      a new org-scoped tool whose author also forgot the test's list.
 *   3. `idempotent` — the hint a client needs before it retries a timed-out call.
 *
 * ⚠️ A NEW TOOL WITHOUT A ROW HERE DOES NOT COMPILE. `MCP_TOOL_REGISTRY` is typed
 * `Record<McpToolName, …>`, so adding a name to `MCP_TOOL_NAMES` and stopping there is a type error,
 * not a silent "no annotations" tool. The reverse direction (a row for a tool that no longer exists)
 * is caught by the registry test, which compares the two lists both ways.
 *
 * ⛔ IMPORT DIRECTION. This file imports ONLY THE TYPE `McpToolName` from `tools.ts`, and `tools.ts`
 * imports values from here. The type import is erased at build time, so there is no runtime cycle —
 * importing anything else from `tools.ts` here would create one.
 *
 * ON TRUST: the MCP spec (2025-06-18) says a client "MUST consider tool annotations to be untrusted
 * unless from trusted servers". These are therefore HINTS, not enforcement. Nothing in this app
 * reads them to decide anything; the real gates are `requiredScope`, `withAgentAuth` and
 * `ensurePolicy` on the back hop. What annotations buy is the client-side confirmation prompt that
 * the MCP spec deliberately places in the CLIENT (checklist §D: a `confirm: true` ARGUMENT is not a
 * safety rail, because the model fills it in itself).
 */
import type { McpToolName } from './tools'

/**
 * What a call does to the organization's data.
 *
 * `add` and `replace`/`remove` are split rather than lumped into one boolean because they map to two
 * DIFFERENT annotations: anything that is not `none` sets `readOnlyHint: false`, but only `replace`
 * and `remove` set `destructiveHint: true`. Creating a new short link cannot cost you something you
 * already had; replacing an artifact's HTML deletes the version that was there (no undo), and
 * deleting one is a tombstone that cannot be reversed.
 */
export type McpToolMutation = 'none' | 'add' | 'replace' | 'remove'

export interface McpToolRegistryEntry {
  mutation: McpToolMutation
  /** Does the tool take the MCP-only `org_id` argument and go through `authorizeOrg`? */
  needsOrg: boolean
  /**
   * Would calling it twice with the same arguments leave the same state as calling it once?
   *
   * Reads are trivially yes. `publish_artifact` is NO — two calls make two artifacts and burn two
   * live slots (measured, checklist A13); WP3's `idempotency_key` is what will change that.
   * `delete_artifact` is YES, and that is the whole point of WP1's idempotent second delete.
   */
  idempotent: boolean
}

/** The four hints `tools/list` publishes per tool (MCP `ToolAnnotations`). */
export interface McpToolAnnotations {
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint: boolean
  /**
   * ALWAYS false, for every tool, and not a per-tool decision.
   *
   * `openWorldHint` means "this tool touches an open, unbounded world" (a web search, an arbitrary
   * URL fetch). Every tool here reads or writes Li2's own closed domain — including the two docs
   * tools, which read our own published manifest and nothing a caller names (`tools.ts`: there is no
   * `url` argument on `get_doc_page` and there must never be one).
   */
  openWorldHint: false
}

export const MCP_TOOL_REGISTRY: Record<McpToolName, McpToolRegistryEntry> = {
  // ── Reads, org-scoped ──────────────────────────────────────────────────────────────────────────
  get_org_overview: { mutation: 'none', needsOrg: true, idempotent: true },
  get_analytics_summary: { mutation: 'none', needsOrg: true, idempotent: true },
  get_clicks_timeseries: { mutation: 'none', needsOrg: true, idempotent: true },
  get_top_links: { mutation: 'none', needsOrg: true, idempotent: true },
  get_link_details: { mutation: 'none', needsOrg: true, idempotent: true },

  // ── Writes ─────────────────────────────────────────────────────────────────────────────────────
  /**
   * ⚠️ STILL `false` AFTER SL-3 ADDED `idempotency_key`, exactly as `publish_artifact` is — see the
   * long note on its row below. The key is OPTIONAL, and the question `idempotentHint` answers is
   * about the TOOL: "calling it twice with the same arguments" still creates a second link (or, in
   * bulk mode, a second copy of every link) whenever those arguments carry no key. The conditional
   * guarantee is stated in the tool's DESCRIPTION, where it can be conditional; a boolean cannot.
   */
  create_short_link: { mutation: 'add', needsOrg: true, idempotent: false },

  // ── Reads outside the org axis (the three sanctioned seam exceptions) ──────────────────────────
  list_orgs: { mutation: 'none', needsOrg: false, idempotent: true },
  find_li2_docs: { mutation: 'none', needsOrg: false, idempotent: true },
  get_doc_page: { mutation: 'none', needsOrg: false, idempotent: true },

  // ── Artifacts, wave 3 ──────────────────────────────────────────────────────────────────────────
  /**
   * ⚠️ STILL `false` AFTER WP3 SHIPPED `idempotency_key`, AND THAT IS THE CORRECT ANSWER.
   *
   * `idempotentHint` describes the TOOL, not one call: a client reads it to decide whether repeating
   * a request is safe in general. The key is OPTIONAL, so "calling it twice with the same arguments"
   * — the question the hint answers — still makes two artifacts and burns two live slots whenever
   * those arguments carry no key. Flipping this to `true` would promise safety for the majority of
   * calls that do not have one. What makes a retry safe is in the tool's DESCRIPTION, where it can be
   * stated conditionally; a boolean cannot.
   */
  publish_artifact: { mutation: 'add', needsOrg: true, idempotent: false },
  /**
   * `replace`, so `destructiveHint` is TRUE. The tool's own description already says "the previous
   * version is deleted and cannot be restored"; this is that same sentence in the field a client can
   * act on, which is what turns it into a confirmation prompt instead of prose a model may skip.
   */
  update_artifact: { mutation: 'replace', needsOrg: true, idempotent: false },
  /**
   * `add` như `publish_artifact`: nó biến một bản nháp đã có thành trang sống, không lấy đi gì.
   *
   * `idempotent: false` — gọi lần hai trên cùng `artifact_id` trả 409 ("already published") chứ
   * không lặng lẽ thành công. Đánh dấu `true` sẽ mời client thử lại một lời gọi chắc chắn hỏng.
   */
  publish_draft_artifact: { mutation: 'add', needsOrg: true, idempotent: false },

  // ── Artifacts, wave 4 WP1 ─────────────────────────────────────────────────────────────────────
  get_artifact: { mutation: 'none', needsOrg: true, idempotent: true },
  list_artifacts: { mutation: 'none', needsOrg: true, idempotent: true },
  /**
   * `remove` → `destructiveHint: true`, and `idempotent: true` at the same time, which is not a
   * contradiction: the SECOND call changes nothing (it answers `already_removed: true`), while the
   * FIRST one destroys the stored file for good. The two hints answer two different client
   * questions — "ask the human first?" and "safe to retry after a timeout?".
   */
  delete_artifact: { mutation: 'remove', needsOrg: true, idempotent: true },

  // ── Artifacts, wave 4 WP2 ─────────────────────────────────────────────────────────────────────
  /**
   * `replace` → `destructiveHint: true`, and it is not an overstatement: switching a page to
   * `password` OVERWRITES the hash of whatever password was set before, and switching away from
   * `password` erases it. Nobody can read a scrypt hash back out, so the previous password is gone
   * in the same irrecoverable sense the previous HTML is gone after `update_artifact`. Setting
   * `public` on a page that was locked is the one that deserves a human in the loop most of all.
   *
   * `idempotent: true` — the same (mode, password) twice leaves the same state. `access_version`
   * increments on the second call (`setAccess` does not compare before writing, on purpose), but
   * that counter is the optimistic lock, not state a caller can observe through any tool.
   */
  set_artifact_access: { mutation: 'replace', needsOrg: true, idempotent: true },
  /**
   * `replace` because the short link the QR encodes stops being the artifact's primary address, and
   * a new QR image is rendered over the old one at the same storage path.
   *
   * `idempotent: true`, and this one is MEASURED in the service rather than assumed: `changeSlug`
   * compares the touch point's current slug against the requested one and RETURNS THE DTO
   * UNCHANGED when they match (`artifact.service.ts`, the "bấm lưu mà không sửa gì" branch) — it
   * does not reach `updateTpSlug`, so there is no `slugs` insert to collide with and no
   * `slug_is_taken` from the row's own slug. A client retrying a timed-out call gets a success, not
   * a refusal naming its own slug.
   */
  set_artifact_slug: { mutation: 'replace', needsOrg: true, idempotent: true },

  // ── Short links, SL-1 ─────────────────────────────────────────────────────────────────────────
  /**
   * Two plain reads. `readOnlyHint: true` follows from `mutation: 'none'`, which is the whole point
   * of declaring it here: `list_short_links` is one `applyCollectionPermissions` flag away from
   * reading more than the caller may see, and a row in this file is what a reviewer checks against
   * the route.
   */
  list_short_links: { mutation: 'none', needsOrg: true, idempotent: true },
  get_short_link: { mutation: 'none', needsOrg: true, idempotent: true },

  // ── Short links, SL-2 ─────────────────────────────────────────────────────────────────────────
  /**
   * `replace` → `destructiveHint: true`, and for this tool the hint is the point. The link it edits
   * is already printed on things: changing `destination_url` sends every QR code already in the
   * world somewhere else, from the moment the call returns, and the previous destination is kept
   * NOWHERE — there is no version history on a touch point to restore it from. That is the same
   * irrecoverable sense `update_artifact` is destructive in, and it deserves the client-side
   * confirmation prompt the hint triggers.
   *
   * `idempotent: true`. Sending the same patch twice leaves the same state, because the service
   * drops fields whose value already matches (`getChangedFields`) and returns the row untouched when
   * nothing is left — the second call simply answers `changed: []`. A client retrying a timed-out
   * call cannot double-apply anything here: every field is an absolute value, never a delta.
   */
  update_short_link: { mutation: 'replace', needsOrg: true, idempotent: true },
  /**
   * `replace` for the same reason `set_artifact_slug` is: the address the dashboard shows stops
   * being the one it was, and a new QR image is rendered OVER the old one at the same storage path.
   * It is the gentler of the two destructive short-link writes — the previous ending keeps
   * redirecting, because `updateTpSlug` only ever INSERTS into `slugs` (checklist S4) — but the
   * image at `qr_url` is replaced in place and the old one is not kept.
   *
   * `idempotent: true`, and MEASURED in the service rather than hoped for: `updateTpSlug` compares
   * the touch point's current slug with the requested one and RETURNS EARLY when they match, before
   * the `slugs` insert. So a retry after a lost response cannot collide with the row it created
   * itself, and cannot burn a second slug against the plan's `MAX_SLUGS_PER_TP`.
   */
  set_short_link_slug: { mutation: 'replace', needsOrg: true, idempotent: true },

  // ── Short links, SL-3 ─────────────────────────────────────────────────────────────────────────
  /**
   * `remove` → `destructiveHint: true`, and here it is the strongest claim in the file: this is a
   * HARD DELETE (`deleteTpById` issues a real `DELETE`, checklist S5), the `slugs` rows go with it by
   * cascade (checklist R2), and every printed QR for that ending answers a not-found page from then
   * on. `delete_artifact` is gentler — it leaves a tombstone that explains itself at the same URL.
   * Nothing here leaves anything behind, which is why the description points at
   * `update_short_link {enabled: false}` first.
   *
   * `idempotent: true`, for the same reason as `delete_artifact` and with the same non-contradiction:
   * the FIRST call destroys the link for good, while a SECOND one changes nothing and answers
   * `already_removed: true`. The two hints answer two different client questions — "ask the human
   * first?" and "safe to retry after a timeout?".
   */
  delete_short_link: { mutation: 'remove', needsOrg: true, idempotent: true },
}

const REGISTRY_ENTRIES = Object.entries(MCP_TOOL_REGISTRY) as [McpToolName, McpToolRegistryEntry][]

/**
 * The tools that take `org_id` (plan §4.1), DERIVED — never typed out a second time.
 *
 * Order follows the registry's declaration order, which is `MCP_TOOL_NAMES`' order; nothing depends
 * on it, but a stable list makes a failing assertion readable.
 */
export const ORG_SCOPED_TOOLS: readonly McpToolName[] = REGISTRY_ENTRIES.filter(
  ([, entry]) => entry.needsOrg
).map(([name]) => name)

/** The complement, for the same reason. */
export const ORG_FREE_TOOLS: readonly McpToolName[] = REGISTRY_ENTRIES.filter(
  ([, entry]) => !entry.needsOrg
).map(([name]) => name)

/** Every tool that changes something — the set `readOnlyHint: false` describes. */
export const MUTATING_TOOLS: readonly McpToolName[] = REGISTRY_ENTRIES.filter(
  ([, entry]) => entry.mutation !== 'none'
).map(([name]) => name)

export function annotationsFor(name: McpToolName): McpToolAnnotations {
  const entry = MCP_TOOL_REGISTRY[name]
  // Not reachable through `MCP_TOOL_NAMES` (the Record type forbids a gap), but a descriptor built
  // from a string cast would otherwise publish `readOnlyHint: undefined` — a write tool advertised
  // as neither read-only nor destructive is the worst possible answer.
  if (!entry) throw new Error(`[mcp/tool-registry] no registry row for tool "${name}"`)

  return {
    readOnlyHint: entry.mutation === 'none',
    destructiveHint: entry.mutation === 'replace' || entry.mutation === 'remove',
    idempotentHint: entry.idempotent,
    openWorldHint: false,
  }
}
