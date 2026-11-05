/**
 * ============================================================================
 * Which tools get their 4xx BODY read, and what a short-link refusal says (SL-0 §1).
 * ============================================================================
 *
 * `artifact-refusals.ts` owns the artifact sentences and the reasoning behind reading a body at all
 * (read `i18nMessage.key` and numeric `params`, never `body.message`). This file is the layer above
 * it: the LIST of tools whose body is read, and the same treatment for the short-link tools.
 *
 * ⚠️ WHY A SECOND FILE RATHER THAN MORE ROWS IN THE FIRST. `artifact-refusals.ts` is imported by the
 * artifact routes' own tests and by `call-tool.ts` under the names `isArtifactTool` /
 * `artifactRefusalFor`; those names still mean exactly what they say and keep their behaviour. A
 * short-link mapper added inside it would make `isArtifactTool` a lie about the list it gates.
 * `call-tool.ts` now asks `isBodyReadingTool` instead, and `toolRefusalFor` tries the artifact table
 * first and the short-link table second — neither can answer for a tool on the other's list.
 *
 * ⛔ WHY SHORT LINK NEEDS THIS AT ALL (checklist S1). Before SL-0 `call-tool.ts` did not read the
 * body for `create_short_link`, so every refusal it could produce collapsed into the status bucket:
 * a taken slug and a plan limit and a blacklisted destination are all "400, re-read the schema" or
 * all "403, quota" — and in each case the fix the model is pushed towards is the wrong one. The
 * numbers are not the problem here (unlike the artifact quota); the CAUSE is.
 *
 * ★ TWO KEYS DIFFER FROM WHAT THE SPEC ASSUMED, and the code is what decides:
 *   · the URL blacklist raises `common:messages.error.blacklisted`, NOT `field_invalid`
 *     (`shared/lib/server-utils.ts` `validateUrls`). `field_invalid` is mapped too, but only as the
 *     generic "a field value was rejected" — nothing in the short-link path raises it today.
 *   · a role refusal arrives under TWO keys: `permission_error` from `getPermissionScopeOrThrow`
 *     and `forbidden` from `ensureCan{View,Edit,Delete}TouchPoint` (`touch-point.service.ts`, which
 *     constructs a bare `ForbiddenError`). Mapping only the first would leave the per-member
 *     collection gate — the one an agent is most likely to trip — in the "quota" bucket.
 */
import { ARTIFACT_TOOL_NAMES, artifactRefusalFor, isArtifactTool } from './artifact-refusals'
import { McpToolError } from './errors'

/**
 * The short-link tools. `create_short_link` is on it from SL-0 even though it predates the wave:
 * its refusals were the measured gap (S1) this file closes.
 */
export const SHORT_LINK_TOOL_NAMES = [
  'create_short_link',
  // SL-1 reads.
  'list_short_links',
  'get_short_link',
  // SL-2 writes. ⚠️ A WRITE TOOL LEFT OFF THIS LIST STILL WORKS — it just loses every sentence
  // below and falls back to `backHopError`'s status bucket, where a taken slug, a plan limit and a
  // blacklisted destination are all "400, re-read the schema". That is the silent failure this list
  // exists to prevent, so a new short-link tool belongs here before its route does.
  'update_short_link',
  'set_short_link_slug',
  // SL-3's delete, and its own `create_short_link` refusals (the idempotency_key answers below).
  'delete_short_link',
] as const
export type ShortLinkToolName = (typeof SHORT_LINK_TOOL_NAMES)[number]

export function isShortLinkTool(name: string): name is ShortLinkToolName {
  return (SHORT_LINK_TOOL_NAMES as readonly string[]).includes(name)
}

/**
 * Every tool whose 4xx body `call-tool.ts` parses. One list, so "is the body read for this tool"
 * stays a single question with a single answer.
 */
export const BODY_READING_TOOL_NAMES: readonly string[] = [
  ...ARTIFACT_TOOL_NAMES,
  ...SHORT_LINK_TOOL_NAMES,
]

export function isBodyReadingTool(name: string): boolean {
  return isArtifactTool(name) || isShortLinkTool(name)
}

/** The i18n keys the short-link path raises. Closed set: anything else → `null`. */
const KEY = {
  /** `slugService.createSlug` mapping Postgres 23505 — the `slugs.slug` unique index is GLOBAL. */
  slugTaken: 'common:messages.error.slug_is_taken',
  /** `ensureOrgPlan(MAX_SLUGS_PER_TP)` — the key is built from the plan limit's own name. */
  planMaxSlugs: 'common:messages.error.plan_errors.max_slugs_per_tp',
  /** `getBySlugForOrg`: the identifier matched the `name` of more than one link. */
  ambiguousName: 'common:messages.error.ambiguous_link_name',
  /** `updateAndReturn` / collection service: the link is frozen by a safety violation. */
  flaggedFrozen: 'common:safety.flagged_frozen_notice',
  /** `validateUrls`: the destination matched the admin regex list or the domain bloom filter. */
  blacklisted: 'common:messages.error.blacklisted',
  /** `getPermissionScopeOrThrow` → `PermissionError`: the ROLE lacks the touch-point permission. */
  permission: 'common:messages.error.permission_error',
  /** `ensureCanViewTouchPoint` & friends → a bare `ForbiddenError`: the per-COLLECTION gate. */
  forbidden: 'common:messages.error.forbidden',
  /** Generic rejected field value. Nothing in the short-link path raises it today — see the header. */
  fieldInvalid: 'common:messages.error.field_invalid',
  notFound: 'common:messages.error.not_found',
  /**
   * SL-1: the id resolved, but to an ARTIFACT's touch point. Its own key rather than a plain
   * `not_found`, because the two want opposite advice: "the id is wrong" versus "the id is right
   * and the tool is wrong".
   */
  isArtifact: 'agent:short_link.is_artifact',
  /**
   * SL-3 — the three answers `create_short_link.idempotency_key` adds, raised by
   * `core/helpers/artifact-idempotency.ts` under the `short_link` namespace. All `agent:*`: no UI
   * renders them, this table is the only reader.
   */
  idemInProgress: 'agent:short_link.idem_in_progress',
  idemUnavailable: 'agent:short_link.idem_unavailable',
  idemLinkGone: 'agent:short_link.idem_link_gone',
} as const

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

/**
 * The short-link sentences. `null` whenever the (tool, status, key) combination is not one of them —
 * the caller then falls back to `backHopError`'s status bucket, exactly as before SL-0.
 *
 * ⛔ NO UPSTREAM TEXT CROSSES. Only `i18nMessage.key` decides which of OUR sentences is returned.
 * `params` is not read at all here: unlike the artifact quota refusals, none of these sentences
 * needs a number from the server, and `params.url` on a blacklist refusal is the caller's own
 * destination echoed back — nothing a model learns from.
 */
/**
 * Tiền tố của MỌI lỗi "gói không có tính năng này".
 *
 * `ensureOrgPlan` ném `PlanError` với key `common:messages.error.plan_errors.<tên_tính_năng>`
 * (`plans.ts:159,173`) — tức **tên tính năng bị chặn nằm ngay trong key**.
 */
const PLAN_FEATURE_PREFIX = 'common:messages.error.plan_errors.'

/**
 * Những trường trong lược đồ tool tương ứng với một tính năng nâng cao, để câu từ chối chỉ đúng
 * cái ô phải bỏ đi.
 *
 * ⚠️ Chỉ liệt kê những tính năng mà một tool CÓ THỂ chạm tới. Thiếu một dòng ở đây không làm hỏng
 * gì — câu từ chối rơi về dạng chung hơn nhưng vẫn nêu đúng tên tính năng.
 */
const FEATURE_FIELD: Record<string, string> = {
  link_password: 'password',
  link_expiration: 'expires_at',
  link_targeting: 'targeting',
  link_cloaking: 'cloaking',
  not_found_url: 'not_found_url',
  custom_redirect_code: 'redirect_code',
}

/**
 * ★ SỬA MỘT LỖI ĐÃ LÀM MẤT THỜI GIAN NGƯỜI DÙNG, 2026-10-29.
 *
 * Chủ sản phẩm nhắn "Create a link to example.com with a password". Gói của org không có
 * `link_password`, nên back hop trả 403 — đúng. Nhưng không case nào khớp `plan_errors.*`, nên lỗi
 * rơi xuống `backHopError(403)` và model nói:
 *
 *     "vai trò của bạn trong tổ chức này (hoặc gói đang dùng) không cho phép TẠO LINK.
 *      Bạn cần nhờ quản trị viên nâng quyền cho tài khoản…"
 *
 * Cả hai vế đều sai hướng: họ tạo link được bình thường, và nâng quyền tài khoản không giải quyết
 * gì. Thứ bị chặn là **ô mật khẩu**; bỏ nó ra là xong ngay. Người dùng đi hỏi quản trị viên nhầm
 * thứ, và quản trị viên cũng sẽ không hiểu phải làm gì.
 *
 * `switch (i18n.key)` không bắt được họ key này vì nó khớp CHÍNH XÁC, còn đây là một tiền tố. Nên
 * nhánh này đứng trước `switch`, và nó bao luôn mọi tính năng nâng cao hiện tại lẫn tương lai —
 * không cần ai nhớ thêm case khi bán thêm tính năng mới.
 */
function planFeatureRefusal(status: number, key: string): McpToolError | null {
  if (status !== 403 || !key.startsWith(PLAN_FEATURE_PREFIX)) return null

  const feature = key.slice(PLAN_FEATURE_PREFIX.length)
  const field = FEATURE_FIELD[feature]

  const whatToDrop = field
    ? `Drop the \`${field}\` argument and the same call will succeed`
    : 'Repeat the call without that option and it will succeed'

  return new McpToolError(
    'org_not_entitled',
    `The organization's plan does not include "${feature}". This is NOT about the user's role and NOT about ` +
      `the action itself — everything else in this call is allowed. ${whatToDrop}. ` +
      `Tell the user exactly which option was dropped and why, and that upgrading the plan is what ` +
      `enables it — asking an administrator for more permissions will not.`
  )
}

export function shortLinkRefusalFor(
  toolName: string,
  status: number,
  body: unknown
): McpToolError | null {
  if (!isShortLinkTool(toolName)) return null
  const i18n = readI18n(body)
  if (!i18n) return null

  const isCreate = toolName === 'create_short_link'
  const isGet = toolName === 'get_short_link'
  const isRead = toolName === 'list_short_links' || isGet
  /** SL-2: the only tool that renames an EXISTING link, so "no link was created" is false for it. */
  const isSetSlug = toolName === 'set_short_link_slug'
  /** SL-3: a hard delete, so every sentence for it has to say what was or was not destroyed. */
  const isDelete = toolName === 'delete_short_link'

  switch (i18n.key) {
    /**
     * The slug is global across all of Li2, so it may well be held by another organization. The
     * sentence must not imply the caller can go and free it, and must not hint at whose it is.
     */
    case KEY.slugTaken: {
      if (status !== 400 && status !== 409) return null
      /**
       * SL-2: the same collision, a different outcome. `create_short_link` made nothing;
       * `set_short_link_slug` left a link that already exists exactly as it was, and saying "no link
       * was created" there would have a model telling the user the link is gone.
       */
      if (isSetSlug)
        return new McpToolError(
          'rejected',
          'That slug is already in use somewhere in Li2, so the link was not renamed and its ' +
            'current address keeps working. Suggest a different ending to the user.'
        )
      return new McpToolError(
        'rejected',
        'That slug is already in use somewhere in Li2, so no link was created. Suggest a ' +
          'different ending to the user, or omit the slug and let Li2 generate one.'
      )
    }

    case KEY.planMaxSlugs:
      return status === 403
        ? new McpToolError(
            'forbidden',
            "This link has already been renamed as many times as the organization's plan allows, " +
              'so it was not renamed again and the current link keeps working. Every past slug is ' +
              'kept alive, which is why they count. Upgrading the plan is the only way to raise it.'
          )
        : null

    /**
     * `get_short_link` resolves a `slug` tolerantly — slug, then short code, then NAME — and two
     * links may share a name. The 400 bucket would say "re-read the schema", but the arguments were
     * well formed; what is missing is a unique identifier.
     */
    case KEY.ambiguousName:
      return status === 400
        ? new McpToolError(
            'rejected',
            'More than one link in this organization has that name, so it is not clear which one ' +
              'was meant. Call list_short_links and retry with the id, or with the ending of the ' +
              'short URL.'
          )
        : null

    /**
     * Li2 froze the link itself after a safety signal. Not a role problem and not a quota problem —
     * the 403 bucket names both and neither is actionable here. Only an org admin can lift it.
     */
    case KEY.flaggedFrozen:
      return status === 403
        ? new McpToolError(
            'forbidden',
            'Li2 has frozen this link because its destination was flagged for a safety violation, ' +
              'so nothing was changed and the link stays frozen. Only an owner or admin of the ' +
              'organization can restore it from the Li2 dashboard.'
          )
        : null

    /**
     * The destination, not the request. A model handed this as a bare 400 tends to retry with the
     * same URL spelled differently, which is the one thing that cannot work.
     */
    case KEY.blacklisted:
      return status === 400
        ? new McpToolError(
            'rejected',
            "That destination URL is on this Li2 server's blocked list, so nothing was created or " +
              'changed. Retrying with the same address will not work — ask the user for a ' +
              'different destination, or have an admin review the block list.'
          )
        : null

    /**
     * The ROLE or the COLLECTION, not the OAuth scope — two keys, one meaning (see the header).
     * Branching on read versus write matters: telling a model "nothing was changed" after a refused
     * LIST would be a sentence about an action it did not attempt.
     */
    case KEY.permission:
    case KEY.forbidden: {
      if (status !== 403) return null
      if (isRead)
        return new McpToolError(
          'forbidden',
          'Your role in this organization does not let you see this link — in Li2 a link can also ' +
            'be restricted to the members of its collection. Ask an owner or admin of the ' +
            'organization for access, or to change your role.'
        )
      /**
       * ⚠️ SL-3 — ITS OWN SENTENCE, because "nothing was created or changed" would be read as "the
       * link is still there and still working", and after a 403 from `ensureCanDeleteTouchPoint`
       * that is exactly what a model must NOT conclude without saying why. The route reads the row
       * before it gates, so a missing link is already an `already_removed` success and never
       * arrives here — this 403 really is about the caller's role.
       */
      if (isDelete)
        return new McpToolError(
          'forbidden',
          'Your role in this organization does not include permission to delete touch points, so ' +
            'the link was NOT deleted and still works. Ask an owner or admin of the organization ' +
            'to delete it, or to change your role. If the user only wants it to stop resolving, ' +
            'update_short_link with enabled set to false may be allowed for your role.'
        )
      return new McpToolError(
        'forbidden',
        'Your role in this organization does not include permission to change touch points, so ' +
          'nothing was created or changed. Ask an owner or admin of the organization to do it, or ' +
          'to change your role.'
      )
    }

    /**
     * SL-2 gave this key its first real caller on the short-link path: `update_short_link` raises it
     * when a UTM patch would leave the link with parameters but no `utm.source`, which li2-be
     * ignores entirely. Hence "the UTM source" in the sentence — the one case a model can fix by
     * itself, as opposed to the others where it has to go back to the user.
     */
    case KEY.fieldInvalid:
      return status === 400
        ? new McpToolError(
            'rejected',
            'Li2 rejected one of the values sent for this link, so nothing was created or changed. ' +
              'Check the destination URL, the slug, the expiry date and the UTM source against ' +
              'the tool schema, and ask the user for a corrected value rather than guessing one.'
          )
        : null

    /**
     * Deliberately NOT "it belongs to another org": that is an existence oracle. `create_short_link`
     * is excluded because it looks nothing up — a 404 from it is not this.
     */
    case KEY.notFound: {
      if (status !== 404 || isCreate) return null
      if (isGet)
        return new McpToolError(
          'not_found',
          'No short link in this organization matches that id or slug. A link that was deleted is ' +
            'also reported this way, and a deleted link cannot be restored. Call ' +
            'list_short_links to see what exists.'
        )
      if (isRead)
        return new McpToolError('not_found', 'No short link with that id in this organization.')
      /**
       * SL-2: a write that found nothing changed nothing, and that is the half a bare "not found"
       * leaves out. A model that is unsure whether its patch half-landed tends to send it again.
       */
      return new McpToolError(
        'not_found',
        'No short link in this organization has that id, so nothing was changed. A link that was ' +
          'deleted is also reported this way. Call list_short_links to see what exists.'
      )
    }

    /**
     * The id is a real touch point in this org — it just belongs to a hosted ARTIFACT rather than to
     * a short link to somebody else's URL. Naming the right tool is the whole value of the sentence;
     * a plain 404 would send the model looking for an id that it already has correctly.
     */
    case KEY.isArtifact: {
      if (status !== 404) return null
      /**
       * ⚠️ SL-3 POINTS AT `delete_artifact`, not at `get_artifact`, and the difference is not
       * cosmetic: a model told to "read it with get_artifact" after a refused delete has been
       * answered with a tool that cannot do what it was asked to do, and its next move is usually to
       * try this same tool again. The two deletes are also not equivalent — `delete_artifact` leaves
       * the short link and the printed QR working, pointing at a page that explains itself — so the
       * sentence says that too, before the user agrees to anything.
       */
      if (isDelete)
        return new McpToolError(
          'not_found',
          'That id belongs to an artifact — a page Li2 hosts itself — not to a short link pointing ' +
            'at an external URL, and NOTHING WAS DELETED. Use delete_artifact for it: that takes ' +
            'the page down while the short link and every printed QR keep working and explain that ' +
            'the content was removed. The short-link tools do not act on artifacts, so that an ' +
            "artifact's link and QR codes cannot be destroyed by accident."
        )
      return new McpToolError(
        'not_found',
        'That id belongs to an artifact — a page Li2 hosts itself — not to a short link ' +
          'pointing at an external URL. Use get_artifact to read it, and list_artifacts to ' +
          'find others. The short-link tools do not act on artifacts, so that their links and ' +
          'printed QR codes cannot be changed by accident.'
      )
    }

    /**
     * SL-3 — another call is holding this `idempotency_key`. Create only.
     *
     * The 409 bucket's own sentence blames a taken slug, which would have the model change the slug
     * (not the problem) or mint a new key — and a new key is precisely how the duplicate the key
     * exists to prevent gets created. So the sentence has to name the wait and forbid the workaround.
     */
    case KEY.idemInProgress:
      return status === 409 && isCreate
        ? new McpToolError(
            'conflict',
            'A create with this idempotency_key is still in progress, so nothing was created by ' +
              'this call. Retry in a few seconds with the SAME key and the same arguments. Do not ' +
              'change the key and do not create again under a new one — that would make a second ' +
              'set of links.'
          )
        : null

    /**
     * The idempotency store is unreachable (503). Create only, and the call was NOT attempted: the
     * alternative was creating without the guarantee the caller asked for, and a caller that sent a
     * key is a caller that intends to retry — so an unguarded create plus a retry is two links.
     */
    case KEY.idemUnavailable:
      return status === 503 && isCreate
        ? new McpToolError(
            'upstream_unavailable',
            'Li2 cannot check idempotency_key right now, so this call was NOT attempted — nothing ' +
              'was created. Retry in a moment with the same key. Do not retry without the key to ' +
              'get around this: that is what would create duplicate links.'
          )
        : null

    /**
     * The key is valid and names links that have since been deleted (404). Create only — and
     * separate from `not_found`, which excludes `create_short_link` precisely because an ordinary
     * create looks nothing up, so its only possible 404 is this one.
     */
    case KEY.idemLinkGone:
      return status === 404 && isCreate
        ? new McpToolError(
            'not_found',
            'This idempotency_key refers to links that have since been deleted, so there is ' +
              'nothing to return and nothing was created. A deleted short link cannot be restored. ' +
              'If the link is still wanted, create it again with a NEW idempotency_key.'
          )
        : null

    default:
      return null
  }
}

/**
 * The one entry point `call-tool.ts` uses. Artifact table first, short-link table second; each
 * returns `null` for a tool on the other's list, so the order is documentation rather than
 * precedence.
 */
export function toolRefusalFor(
  toolName: string,
  status: number,
  body: unknown
): McpToolError | null {
  /**
   * ⭐ ĐỨNG TRƯỚC hai bộ dịch riêng, và KHÔNG phụ thuộc tool.
   *
   * "Gói không có tính năng này" là một lỗi của tổ chức, không của tool — `publish_artifact` đặt
   * mật khẩu và `create_short_link` đặt mật khẩu trượt cùng một cổng. Đặt phép kiểm này bên trong
   * `shortLinkRefusalFor` (chỗ tôi viết lần đầu) thì mọi tool artifact vẫn rơi về câu chung, tức
   * sửa được một nửa và nửa còn lại im lặng giữ nguyên lỗi.
   */
  const planFeature = planFeatureRefusal(status, readI18n(body)?.key ?? '')
  if (planFeature) return planFeature

  return artifactRefusalFor(toolName, status, body) ?? shortLinkRefusalFor(toolName, status, body)
}
