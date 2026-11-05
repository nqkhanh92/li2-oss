import 'server-only'

import { v4 as uuidv4 } from 'uuid'
import {
  artifactRepo,
  ArtifactRepository,
  type ListByOrgArgs,
} from '@/core/repositories/artifact.repository'
import {
  artifactViewRepo,
  ArtifactViewRepository,
} from '@/core/repositories/artifact-view.repository'
import { generateServeToken } from '@/core/helpers/serve-token'
import { artifactPublicUrl, publicSlugOfTouchPoint } from '@/core/helpers/artifact-public-url'
import { organizationService } from '@/core/services/organization.service'
import { hashPassword } from '@/core/helpers/password-hash'
import { hasArtifactGoogleClient } from '@/core/helpers/artifact-google'
import { touchPointService } from '@/core/services/touch-point.service'
import {
  ARTIFACT_ACCESS_MODES,
  ARTIFACT_MAX_BYTES,
  ARTIFACT_PASSWORD_MAX_LENGTH,
  ARTIFACT_PASSWORD_MIN_LENGTH,
  ARTIFACT_QUOTA_FREE_BYTES,
  ARTIFACT_QUOTA_FREE_LIVE,
  ARTIFACT_SNIFF_BYTES,
  artifactFormatForFileName,
  ArtifactDTO,
  ArtifactAccessMode,
  ArtifactFormatSpec,
  ArtifactQuotaDTO,
  ArtifactKind,
  ArtifactStatus,
  ReplaceArtifactResult,
  isArtifactAccessMode,
  isArtifactKind,
  isArtifactStatus,
} from '@/core/types/artifact.type'
import { Tables } from '@/shared/types/database.types'
import * as artifactStorage from '@/infrastructure/storage/artifact-storage'
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
} from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { scanBuffer } from '@/infrastructure/scan/clamav-client'
import { ClamavConfigError } from '@/infrastructure/scan/config'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import {
  MAX_TOUCHPOINTS_NAME_LENGTH,
  touchPointFormCreateWithAdvanceSchema,
} from '@/shared/schemas/touch-points'
import { TouchPointContentType, TouchPointVariants } from '@/features/touch-points/types'
import { slugSchema } from '@/shared/schemas/slug'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

export type UploadedArtifactFile = {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type CreateArtifactInput = {
  file: UploadedArtifactFile
  name?: string
}

/**
 * `access_mode`/`password` ở đây là B1 — chọn chế độ LÚC xuất bản, cùng một request. Validation
 * giống hệt `setAccess`; bỏ trống = không đụng chế độ (giữ default public).
 */
export type PublishArtifactInput = {
  slug?: string
  domain_id?: string
  access_mode?: string
  password?: string
}

export type SetArtifactAccessInput = {
  access_mode: string
  password?: string
}

/** Only the file. No `name`, no `access_mode`: replacing content and editing fields are two jobs. */
export type ReplaceArtifactInput = {
  file: UploadedArtifactFile
}

/**
 * Đường MCP (`publish_artifact`): một lời gọi tạo nháp rồi xuất bản ngay. `name` BẮT BUỘC — không có
 * tên file thật để suy ra (route gói HTML thành `index.html`). Không có `access_mode`: v1 MCP luôn
 * `public`, là DEFAULT của cột.
 */
export type CreateAndPublishInput = {
  name: string
  file: UploadedArtifactFile
  slug?: string
  domain_id?: string
}

export type { ReplaceArtifactResult } from '@/core/types/artifact.type'

/**
 * `slug` is optional on purpose: `publish()` builds this object from the touch point it just minted
 * and has no slug column there, while the repository's embedded select always has one. Only
 * `changeSlug` reads it, and only on a row that came from the repository.
 */
type EmbeddedTouchPoint = Pick<Tables<'touch_points'>, 'short_url' | 'path_qr_code'> & {
  slug?: string | null
  qr_customize_options?: Tables<'touch_points'>['qr_customize_options']
}

/**
 * A row as the repository selects it: the artifact plus the embedded touch point. PostgREST returns
 * an embedded one-to-one as an object, but the generated types (and some client versions) model it
 * as an array — `toDTO` handles both rather than betting on one.
 */
type EmbeddedOrg = { org_slug: string | null }
type ArtifactRow = Tables<'artifacts'> & {
  touch_points?: EmbeddedTouchPoint | EmbeddedTouchPoint[] | null
  organizations?: EmbeddedOrg | EmbeddedOrg[] | null
}

type Deps = {
  repo: Pick<
    ArtifactRepository,
    | 'createIfWithinQuota'
    | 'publishIfWithinQuota'
    | 'replaceIfWithinQuota'
    | 'findByIdForOrg'
    /** WP1 `get_artifact { slug }`. Keyed by `org_slug`, which is why `findOrgSlug` runs first. */
    | 'findByOrgSlugAndSlug'
    | 'listByOrg'
    | 'countLiveByOrg'
    | 'sumSizeBytesByOrg'
    | 'markRemovedForOrg'
    | 'updateAccessForOrg'
    | 'deleteDraftById'
    | 'countVisitsByTouchPoints'
    | 'touchUpdatedAtForOrg'
  >
  hashPassword: typeof hashPassword
  /** [P2] Công tắc env của chế độ Google — inject để test bật/tắt được mà không đụng process.env. */
  hasGoogleClient: () => boolean
  /** [P2] `viewer_count` cho trang chi tiết. */
  viewRepo: Pick<ArtifactViewRepository, 'countViewersByArtifact'>
  storage: Pick<typeof artifactStorage, 'put' | 'remove'>
  createTouchPoint: typeof touchPointService.createTouchPoint
  deleteTouchPoint: typeof touchPointService.deleteTpById
  /** `org_slug` cho địa chỉ công khai lúc publish. Tuỳ chọn: thiếu thì DTO rơi về `/a/<token>`. */
  findOrgSlug?: (orgId: string) => Promise<string | null>
  /**
   * B2 wave 4 — đổi slug và sinh lại QR. Inject như `createTouchPoint` để test mock được: hàm thật
   * đọc plan, ghi bảng `slugs`, ghi audit log và gọi ra ngoài để render ảnh QR.
   */
  updateTouchPoint: typeof touchPointService.updateAndReturn
  ensurePolicy: typeof ensurePolicy
  /**
   * The gate for DELETE. Separate from `ensurePolicy` because it resolves a DIFFERENT key
   * (`DELETE_TOUCH_POINT`, §3 G2) and is resolved up front, so a refusal cannot land halfway through
   * a destructive sequence.
   */
  ensureDeletePolicy: (orgId: string) => Promise<unknown>
}

const log = logger.child({ module: 'artifact-service' })

const stripExtension = (filename: string) => filename.replace(/\.[^.]+$/, '')

/**
 * Checks a column that TypeScript believes is a plain `string` against the vocabulary it is supposed
 * to hold, and SAYS SOMETHING when it is not.
 *
 * `database.types.ts` types `artifacts.kind` and `artifacts.status` as `string` — the generator has
 * no way to read a CHECK constraint — and regenerating that file is currently unsafe (it points at a
 * project without this table, so it deletes the types; see log.md). So the row arrives untyped and
 * `toDTO` used to write `row.kind as ArtifactKind`, which asserted the thing nobody had checked. A
 * value outside the vocabulary then travelled all the way to a `switch` in the UI and produced a
 * blank panel with nothing anywhere saying why.
 *
 * The guard is what changes: the anomaly is now detected and logged at the boundary where the row
 * enters the typed world. The VALUE, however, is passed on unchanged, and that is deliberate:
 *
 * - Every candidate substitute is a lie with consequences. `status: 'blocked'` puts a "re-upload"
 *   button on a row we do not understand; `'draft'` puts a Publish button on it; `'live'` claims a
 *   link works. All three invite an action on a row whose state is unknown.
 * - The frontend ALREADY degrades gracefully for a status outside the union —
 *   `features/artifacts/utils/artifact-status.ts:35-40` (`UNKNOWN_STATUS_VIEW`) returns a neutral
 *   badge and NO action, and `:49-50` is the type guard that routes an unknown status to it. Coercing here would make that dead code
 *   and replace a correct outcome with a wrong one.
 *
 * Hence one narrow cast, inside a branch that has just logged. That is a different thing from the
 * unconditional cast it replaces: this one is loud.
 */
function vocabularyOrLoggedAsIs<T extends string>(
  raw: string,
  guard: (value: unknown) => value is T,
  field: 'kind' | 'status' | 'access_mode',
  artifactId: string
): T {
  if (guard(raw)) return raw

  /**
   * `warn`, not `error`: this is a row we cannot fully describe, not a failure of this request. A
   * listing of 50 drifted rows would otherwise raise 50 errors on every page view. Deliberately NOT
   * deduplicated — drift is rare, and a dedupe cache is a thing someone has to remember to clear.
   */
  log.warn(
    { artifactId, field, value: raw },
    'Artifact column holds a value outside its vocabulary'
  )
  return raw as T
}

/**
 * Does the head of the file agree with what its extension claims?
 *
 * This REJECTS, it does not classify. `.mp4` and `.mov` share the same `ftyp` signature and a
 * `.docx` renamed to `.pptx` has the same zip header as a real one — telling those apart needs the
 * container's own index, which a prefix cannot see. The extension decides the format; this only
 * refuses a file whose bytes plainly contradict it.
 *
 * Formats with no signature (html, htm) pass: HTML is text and has none. That is exactly why html
 * is the one kind still served under `sandbox`.
 *
 * Hand-rolled rather than `file-type`, which is already a dependency: on a truncated or malformed
 * file `fileTypeFromBuffer` THROWS `EndOfStreamError` instead of returning undefined (measured —
 * `docs/artifact-multiformat-findings.md` §4.3), turning a bad upload into a 500. A hex prefix
 * comparison cannot throw.
 */
function matchesMagic(head: Buffer, format: ArtifactFormatSpec): boolean {
  if (format.magic.length === 0) return true

  // OR giữa các biến thể, AND trong một biến thể — xem chú thích ở `ArtifactFormatSpec.magic`.
  // Một mảng phẳng không diễn đạt được cả hai: webp cần CẢ `RIFF` lẫn `WEBP` (thiếu vế sau thì
  // file wav đổi đuôi lọt), còn gif cần `GIF89a` HOẶC `GIF87a` (đòi cả hai thì không ảnh nào qua).
  return format.magic.some((variant) =>
    variant.every(({ offset, hex }) => {
      const end = offset + hex.length / 2
      if (head.length < end) return false
      return head.subarray(offset, end).toString('hex') === hex.toLowerCase()
    })
  )
}

export class ArtifactService {
  constructor(private deps: Deps) {}

  /**
   * `serve_url` is composed server-side so the client never has to guess the base URL, and
   * `storage_path` is dropped: it is an internal bucket key, and handing it out would invite the
   * frontend to build storage URLs for content that is private by design.
   */
  toDTO(row: ArtifactRow, viewerCount: number | null = null, visits = 0): ArtifactDTO {
    const touchPoint = Array.isArray(row.touch_points) ? row.touch_points[0] : row.touch_points

    return {
      id: row.id,
      organization_id: row.organization_id,
      user_id: row.user_id,
      name: row.name,
      kind: vocabularyOrLoggedAsIs<ArtifactKind>(row.kind, isArtifactKind, 'kind', row.id),
      status: vocabularyOrLoggedAsIs<ArtifactStatus>(
        row.status,
        isArtifactStatus,
        'status',
        row.id
      ),
      serve_token: row.serve_token,
      content_type: row.content_type,
      size_bytes: Number(row.size_bytes ?? 0),
      created_at: row.created_at,
      // The column arrived with 20261005000001; a row read before that migration ran has no value
      // here, and "never updated" is honestly described by its creation time.
      updated_at: row.updated_at ?? row.created_at,
      touch_point_id: row.touch_point_id ?? null,
      /**
       * Hàng đọc TRƯỚC migration 20261006000001 không có cột này — và "chưa đặt" chính là `public`,
       * đúng với DEFAULT của cột. KHÔNG spread hàng vào DTO: `password_hash` và `access_version` không
       * bao giờ được ra ngoài, ghim bằng test (`JSON.stringify(dto)` không chứa `hash`).
       */
      access_mode: vocabularyOrLoggedAsIs<ArtifactAccessMode>(
        row.access_mode ?? 'public',
        isArtifactAccessMode,
        'access_mode',
        row.id
      ),
      password_set_at: row.password_set_at ?? null,
      viewer_count: viewerCount,
      visits,
      /**
       * Live + có host riêng → địa chỉ công khai `<host>/<org_slug>/<slug>` (quyết định 17/10: link
       * chia sẻ không được là `app…/a/<token>`). Thiếu bất kỳ mảnh nào → `/a/<token>` như cũ.
       */
      serve_url:
        (row.status === 'live'
          ? artifactPublicUrl(embeddedOrgSlug(row), publicSlugOf(touchPoint))
          : null) ?? buildServeUrl(row.serve_token),
      preview_url: buildServeUrl(row.serve_token),
      download_url: buildDownloadUrl(row.serve_token),
      short_url: touchPoint?.short_url ?? null,
      path_qr_code: touchPoint?.path_qr_code ?? null,
    }
  }

  /**
   * LAYER 3, shared by `create()` and `replaceContent()` — the malware scan
   * (`docs/artifact-scan-clamav-spec.md` §1 option B, WP2).
   *
   * FAIL-CLOSED, AND THE TWO FAILURES ARE DIFFERENT ERRORS. A signature match is 400: it is about
   * the user's file, and the fix is a different file. Anything else — clamd unreachable, timed out,
   * a reply we cannot read, a misconfigured env — is 503: it is about OUR system, the user's file was
   * never judged, and the fix is to try again later. Collapsing the two would tell someone their
   * perfectly good PDF contains malware because a container was restarting.
   *
   * Why fail closed at all, when Safe Browsing next door fails OPEN: what is being checked here is
   * content li2 itself will serve from li2's own domain. The cost of refusing is one upload the user
   * retries; the cost of accepting unchecked bytes is a public URL on our domain serving content
   * nobody looked at. `safe-browsing.ts` checks a destination URL we do not host, so the trade runs
   * the other way.
   *
   * The signature name is NOT in the thrown message. `BaseError.toResponse()` sends `message` to the
   * client, and the name of the rule a file tripped tells an attacker exactly what to change
   * (spec WP2 §5). It goes to the log instead — twice over, because the two logs know different
   * things: the client logs `{ orgId, sizeBytes, signature, durationMs }`, and the line below adds
   * who uploaded it and under what filename, which is what makes a false-positive report traceable.
   */
  private async scanOrRefuse(
    buffer: Buffer,
    context: { orgId: string; userId: string; filename: string; artifactId?: string }
  ): Promise<void> {
    let result
    try {
      result = await scanBuffer(buffer, { orgId: context.orgId, artifactId: context.artifactId })
    } catch (error) {
      /**
       * `CLAMAV_ENABLED=true` with a variable that does not parse. Refusing is the only safe answer —
       * the gate was asked for and cannot be provided — but it is an operator mistake, not a 500 in
       * this code path, so it gets the same 503 and the same "try again later" sentence as an
       * unreachable clamd, plus a log line naming the variable.
       */
      if (error instanceof ClamavConfigError) {
        log.error(
          { orgId: context.orgId, err: error.message },
          'ClamAV is misconfigured — refusing the upload'
        )
        throw scanUnavailable()
      }
      throw error
    }

    if (result.ok) return

    if (result.reason === 'infected') {
      log.warn(
        {
          orgId: context.orgId,
          userId: context.userId,
          artifactId: context.artifactId,
          filename: context.filename,
          sizeBytes: buffer.byteLength,
          signature: result.signature,
        },
        'Artifact upload refused: malware signature matched'
      )
      throw fileFailedScan(result.signature)
    }

    /**
     * A password-protected file. Still a 400 and still a refusal, but a DIFFERENT error: the user did
     * nothing wrong, their file simply cannot be opened for the scan, and the fix is a copy without a
     * password. `info` rather than `warn` — see the client's own branch for why.
     */
    if (result.reason === 'encrypted') {
      log.info(
        {
          orgId: context.orgId,
          userId: context.userId,
          artifactId: context.artifactId,
          filename: context.filename,
          sizeBytes: buffer.byteLength,
          signature: result.signature,
        },
        'Artifact upload refused: file is password-protected, so it could not be scanned'
      )
      throw filePasswordProtected()
    }

    throw scanUnavailable()
  }

  /**
   * The id is minted here rather than by the database so the bytes can land in storage BEFORE the
   * row exists: an orphaned object is sweepable, whereas a row pointing at a missing object would
   * 404 a link that already looks live.
   */
  async create(orgId: string, userId: string, input: CreateArtifactInput): Promise<ArtifactDTO> {
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)

    const filename = input.file?.name ?? ''

    /**
     * LAYER 1 — the extension picks the format. `File.type` from the browser is never consulted: it
     * is empty often enough for .pptx and .mov, and it is whatever the client says it is.
     */
    const format = artifactFormatForFileName(filename)
    if (!format)
      throw new BadRequestError(`Unsupported file type: ${filename}`, {
        key: 'common:messages.error.unsupported_field_type',
        params: { field: '$t(label.file)' },
      })

    if (input.file.size <= 0)
      throw new BadRequestError('Artifact file is empty', {
        key: 'common:messages.error.invalid_file_type',
        params: { type: format.extension.replace('.', '').toUpperCase() },
      })

    if (input.file.size > ARTIFACT_MAX_BYTES)
      throw new BadRequestError('File size exceeds limit', {
        key: 'common:messages.error.field_exceed_limit',
        params: fileTooLargeParams(input.file.size),
      })

    const providedName = input.name?.trim()

    /**
     * A name derived from the filename is TRUNCATED; a name the user typed is REJECTED.
     *
     * Both limits come from the touch-point schema, which publishing goes through. Rejecting a
     * derived name would fail uploads for a reason the user did not choose and cannot see — camera
     * and Canva exports routinely exceed 64 characters — and since there is no rename endpoint, the
     * artifact would be stuck `draft` forever. A name the user typed is different: they are looking
     * at the field and can shorten it, so telling them is better than silently rewriting it.
     */
    const name = (providedName || stripExtension(filename)).slice(
      0,
      providedName ? undefined : MAX_TOUCHPOINTS_NAME_LENGTH
    )

    if (!name)
      throw new BadRequestError('Artifact name is required', {
        key: 'common:messages.error.field_required',
        params: { field: '$t(label.name)' },
      })

    if (name.length > MAX_TOUCHPOINTS_NAME_LENGTH)
      throw new BadRequestError('Artifact name is too long', {
        key: 'common:messages.error.field_exceed_number_limit',
        params: { field: '$t(label.name)', limit: MAX_TOUCHPOINTS_NAME_LENGTH },
      })

    const buffer = Buffer.from(await input.file.arrayBuffer())

    /**
     * LAYER 2 — do the bytes agree with the extension? Catches a file renamed to sneak past layer 1.
     * Runs after the size check so a 200MB upload is refused before its bytes are read.
     */
    if (!matchesMagic(buffer.subarray(0, ARTIFACT_SNIFF_BYTES), format))
      throw new BadRequestError(`File contents do not match ${format.extension}`, {
        key: 'common:messages.error.invalid_file_type',
        params: { type: format.extension.replace('.', '').toUpperCase() },
      })

    /**
     * LAYER 3 — malware scan. THE ORDER IS THE DESIGN: this is the most expensive call in the
     * function, so it runs after every cheap local check that can refuse the file on its own
     * (extension, emptiness, size, name, magic bytes) and before every side effect (`storage.put`
     * below, then the row). The quota read that follows is about the ORG, not the file, and either
     * order is correct for it. A `.exe` renamed `.pdf` is
     * refused by layer 2 without costing clamd a round trip, and a file clamd refuses never reaches
     * the bucket, never gets a row, never gets a serve token — so there is no object to sweep and no
     * tombstone to explain. That property is the whole reason the spec chose a synchronous gate here
     * over a `scanning` status flipped by a worker (§1).
     */
    await this.scanOrRefuse(buffer, { orgId, userId, filename })

    /**
     * QUOTA, byte axis — checked HERE: after the file's own size is known, BEFORE a single byte
     * reaches the bucket. Writing first and refusing after would leave an object in storage with no
     * row pointing at it, and the org's usage would creep up on every refused upload.
     *
     * This axis is checked before the live-count axis (which lives in `publish()`) on purpose. With
     * 30MB and 10MB per file the two run out at the same moment, and a user told "you have used all
     * 3 slots" will delete one artifact, try again, and fail again for the other reason — two
     * failures for one cause. Storage is the axis that bites earlier, so it is the one that speaks
     * first.
     */
    const usedBytes = await this.deps.repo.sumSizeBytesByOrg(orgId)
    if (usedBytes + buffer.byteLength > ARTIFACT_QUOTA_FREE_BYTES)
      throw storageQuotaExceeded({ usedBytes, needBytes: buffer.byteLength })

    /**
     * The live-count axis is deliberately NOT checked here — only in `publish()`.
     *
     * Refusing an upload because the org already has 3 live artifacts would break the one workflow
     * that makes a replacement safe: upload the new version, look at it, and only then take the old
     * one down. Forcing the delete first means the link is dead while the operator checks whether the
     * replacement is even correct.
     *
     * The cost, accepted knowingly: an org at its slot limit can accumulate drafts that count against
     * the byte quota. That is bounded by the byte quota itself (which IS checked above) and is
     * recoverable, because DELETE exists.
     */
    const id = uuidv4()
    // The extension comes from the FORMAT, not the kind: .ppt and .pptx are both `slides` and must
    // not collide into one spelling in the bucket, where a human reads these paths.
    const storagePath = `${orgId}/${id}${format.extension}`

    await this.deps.storage.put(storagePath, buffer, format.storageMime)

    const created = await this.deps.repo.createIfWithinQuota(
      {
        id,
        organization_id: orgId,
        user_id: userId,
        name,
        kind: format.kind,
        serve_token: generateServeToken(),
        storage_path: storagePath,
        // What the FILE is, never what a response will be sent as. Conflating the two is the
        // `; charset=utf-8` bug: the column answers "what is this", the route answers "what do I send".
        content_type: format.contentType,
        size_bytes: buffer.byteLength,
      },
      ARTIFACT_QUOTA_FREE_BYTES
    )

    /**
     * The pre-check above passed and this still refused: a concurrent upload took the last of the
     * room while this one was being written. The object is already in the bucket and no row points
     * at it, so it goes back out — an object nothing references is storage no quota counts and
     * nobody can find.
     */
    if (!created) {
      await this.removeUploadedObject(storagePath)
      // Đọc lại: con số trong câu lỗi phải là trạng thái lúc bị từ chối, không phải lúc pre-check.
      throw storageQuotaExceeded({
        usedBytes: await this.deps.repo.sumSizeBytesByOrg(orgId),
        needBytes: buffer.byteLength,
      })
    }

    return this.toDTO(created)
  }

  /**
   * Đường MCP `publish_artifact` (spec R4): tạo nháp rồi xuất bản trong MỘT lời gọi, và thứ tự là thiết kế.
   *
   *  1. policy — cùng cổng với `create()`/`publish()`.
   *  2. PRE-CHECK slot live TRƯỚC mọi side effect. Lệch có chủ ý khỏi `create()` (nó cố ý KHÔNG kiểm
   *     trục live để giữ luồng "tải bản mới, xem, rồi gỡ bản cũ"). Luồng đó không tồn tại trên đường
   *     MCP: agent không có UI để publish sau, nên một nháp bị kẹt là nháp chết.
   *  3. `create()` — 10 MB, quota byte, magic, **quét virus**, upload, hàng.
   *
   *     ⛔ KHÔNG thêm lớp quét ở đây. `create()` đã quét (LAYER 3), và nó quét TRƯỚC `storage.put`,
   *     nên một file nhiễm trên đường MCP cũng không bao giờ có object, không bao giờ có hàng, không
   *     bao giờ có touch point — `publish()` ở bước 4 không bao giờ chạy. Thêm lớp thứ hai ở đây chỉ
   *     nhân đôi thời gian quét của mọi lời gọi `publish_artifact` để kiểm lại đúng những byte vừa
   *     kiểm (spec WP2 §3).
   *
   *  4. `publish()` — slug/domain/blacklist/plan/slot. Ném → `discardDraft` xoá CỨNG nháp vừa tạo rồi
   *     ném lại lỗi gốc, để câu "Nothing was created" mà tool nói với agent là sự thật, không phải lời hứa.
   *
   * Không nhận `access_mode`: v1 MCP luôn công khai (DEFAULT của cột), description của tool nói rõ.
   */
  async createAndPublish(
    orgId: string,
    userId: string,
    input: CreateAndPublishInput
  ): Promise<ArtifactDTO> {
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)

    const liveCount = await this.deps.repo.countLiveByOrg(orgId)
    if (liveCount >= ARTIFACT_QUOTA_FREE_LIVE) throw liveQuotaExceeded()

    const draft = await this.create(orgId, userId, { file: input.file, name: input.name })

    try {
      return await this.publish(orgId, userId, draft.id, {
        slug: input.slug,
        domain_id: input.domain_id,
      })
    } catch (error) {
      await this.discardDraft(orgId, draft.id)
      throw error
    }
  }

  /**
   * Bước bù của `createAndPublish`: xoá CỨNG một nháp chưa ai thấy — object trước, hàng sau.
   *
   * Không `markRemovedForOrg`: bia mộ là cho nội dung ĐÃ TỪNG phục vụ (`artifact.type.ts`), và một bia
   * mộ ở đây sẽ khiến `/a/<token>` trả 410 cho một token chưa từng công khai. Không `deleteForOrg`: nó
   * đòi `DELETE_TOUCH_POINT`, vai "được đăng, không được xoá" sẽ kẹt nháp vì lỗi của ta.
   *
   * Thất bại ở đây được nuốt và log đủ để tìm: caller đang ném lỗi gốc của publish, và thay nó bằng
   * lỗi dọn dẹp là nói sai với agent về điều đã xảy ra. Nháp còn lại hiện trong dashboard như mọi
   * nháp, xoá tay được — degraded, không dead.
   */
  private async discardDraft(orgId: string, artifactId: string) {
    let storagePath: string | null = null
    try {
      const row = await this.deps.repo.findByIdForOrg(orgId, artifactId)
      if (!row || row.status !== 'draft' || row.touch_point_id) return
      storagePath = row.storage_path

      await this.deps.storage.remove(row.storage_path)
      await this.deps.repo.deleteDraftById(orgId, artifactId)
    } catch (error) {
      log.error(
        { err: error, artifactId, storagePath },
        'Publish failed after the draft was created and the draft could not be discarded'
      )
    }
  }

  /**
   * Publishing mints a REAL touch point (URL + QR) pointing at the artifact's serve URL, so an
   * artifact rides the existing short-link, QR and analytics pipeline instead of a parallel one.
   * The payload goes through the same Zod schema the touch-point route uses — calling the service
   * directly must not become a way to skip its validation.
   */
  async publish(
    orgId: string,
    userId: string,
    artifactId: string,
    input: PublishArtifactInput = {}
  ): Promise<ArtifactDTO> {
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)

    const artifact = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    if (!artifact) throw artifactNotFound()

    if (artifact.status === 'live')
      throw new ConflictError('Artifact already published', {
        key: 'artifact:detail.already_published',
      })

    /**
     * STATUS, the CHEAP refusal — before a touch point is minted and before the access mode is
     * written. Until WP3 this check did not exist at any layer: the guard above rejects exactly one
     * status, and `artifact_publish_if_within_quota` did not read the old status at all, so a
     * `quarantined`, `blocked`, `expired` or `removed` row was published straight to `live` (see
     * `supabase/migrations/20261021000001_artifacts__publish_status_guard.sql` for what each of
     * those would have meant). The guarantee is the SQL guard, same as both quota axes; this is here
     * so the common case refuses without a round trip to li2-be and without a compensating delete.
     */
    if (!isPublishableStatus(artifact.status)) throw statusRefusesPublish(artifact.status)

    /**
     * B1 — chế độ xem chọn lúc xuất bản, ghi TRƯỚC pre-check quota, trên hàng còn `draft`. Nếu publish
     * sau đó thất bại (quota, slug trùng) hàng vẫn `draft` và ĐÃ mang chế độ — đúng với câu M2.2
     * "Chế độ này áp dụng ngay khi bạn xuất bản", và lần publish sau không cần gửi lại.
     */
    if (input.access_mode !== undefined) {
      const parsed = parseAccessInput(
        { access_mode: input.access_mode, password: input.password },
        this.deps.hasGoogleClient
      )
      await this.applyAccess(orgId, artifact, parsed)
    }

    /**
     * QUOTA, live-count axis — the CHEAP refusal, before a touch point is minted.
     *
     * After the already-published guard, so re-publishing an artifact that is already `live` reports
     * that, not a quota it is not actually consuming a new slot of. `>=` because this publish is
     * about to add one.
     *
     * This check cannot be trusted as the guarantee: the write that claims the slot is several calls
     * away, and `createTouchPoint` between them is a round trip to li2-be. Two publishes overlapping
     * by that call both read the same count and both pass. It stays because it refuses WITHOUT side
     * effects in the common case; the guarantee is `publishIfWithinQuota` below.
     *
     * A different message from the storage axis, naming a different number, because the two ask for
     * opposite actions: delete an artifact, or upload something smaller.
     */
    const liveCount = await this.deps.repo.countLiveByOrg(orgId)
    if (liveCount >= ARTIFACT_QUOTA_FREE_LIVE) throw liveQuotaExceeded()

    const serveUrl = buildServeUrl(artifact.serve_token)

    /**
     * `.parse` ném ZodError, và ZodError không phải BaseError nên `with-auth` bọc nó thành
     * AppError 500 — người dùng nhận "lỗi hệ thống" cho một slug sai định dạng, và log đầy
     * error giả. Đổi sang 400 tại đây thay vì sửa `with-auth`: chỗ đó chạy cho MỌI route,
     * đổi ở đó là thay đổi hành vi toàn hệ thống chứ không phải sửa artifact.
     */
    const parsed = touchPointFormCreateWithAdvanceSchema.safeParse({
      name: artifact.name,
      content_type: TouchPointContentType.ARTIFACT,
      content_value: serveUrl,
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.domain_id ? { domain_id: input.domain_id } : {}),
      // `TouchPointVariants` has no URL member (QR/NFC/WIFI only) and the schema keys this record
      // with `z.nativeEnum`, so a `URL` key would fail validation. The short link itself is not a
      // variant — it always exists.
      variants_content: {
        [TouchPointVariants.QR]: { enabled: true },
      },
    })

    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join('.') || 'slug'
      throw new BadRequestError(`Invalid touch point payload: ${parsed.error.issues[0]?.message}`, {
        key: 'common:messages.error.field_invalid',
        params: { field },
      })
    }
    const payload = parsed.data

    // If this throws (plan limit, blacklisted url, slug taken) the artifact stays `draft` and the
    // error propagates — nothing to roll back, and a retry is a plain second publish.
    const touchPoint = await this.deps.createTouchPoint(orgId, payload, userId)

    /**
     * THE GUARANTEE. Counts and writes inside one Postgres function holding a per-org advisory lock,
     * so two publishes cannot both see the same count — see the migration for why a conditional
     * UPDATE would not have been enough.
     */
    const updated = await this.deps.repo.publishIfWithinQuota(
      orgId,
      artifact.id,
      touchPoint.id,
      ARTIFACT_QUOTA_FREE_LIVE
    )

    /**
     * The pre-check passed and this still refused: a concurrent publish claimed the last slot while
     * this one was minting its link. The touch point exists and points at a draft, so it is deleted
     * again — leaving it would put a short link and a QR into the org's list that answer 404, and
     * that nothing ties back to the artifact, so DELETE could never reach it either.
     */
    if (!updated) {
      await this.discardMintedTouchPoint(orgId, touchPoint.id, userId)

      /**
       * TWO reasons now refuse the same way — the function returns no row for a lost slot race AND
       * for a status it will not publish (WP3). It does not say which, so the row is re-read to tell
       * them apart, exactly as `replaceContent` does below. Saying "quota" for a row that was
       * quarantined mid-publish sends the user to delete other content for a problem deleting
       * nothing can fix.
       *
       * The pre-check above read the status BEFORE `createTouchPoint`, so a status reaching here is
       * one that changed during that round trip. Order matters: status first, quota last — the
       * re-read is the authority on status, while the quota verdict is the function's and is only
       * inferred here.
       */
      const now = await this.deps.repo.findByIdForOrg(orgId, artifactId)
      if (!now) throw artifactNotFound()
      // A concurrent publish of THIS artifact won: it is live, and this call's touch point has just
      // been deleted. "Already published" is what happened; `live` is not in the publishable set so
      // it would otherwise fall into the generic status refusal and read as a hold.
      if (now.status === 'live')
        throw new ConflictError('Artifact already published', {
          key: 'artifact:detail.already_published',
        })
      if (!isPublishableStatus(now.status)) throw statusRefusesPublish(now.status)
      throw liveQuotaExceeded()
    }

    /**
     * `publishIfWithinQuota` trả hàng không có join; ghép touch point vừa tạo (kể cả `slug`, để
     * `serve_url` ra địa chỉ công khai ngay trong dialog Published) và `org_slug` đọc một lần.
     */
    const orgSlug = (await this.deps.findOrgSlug?.(orgId)) ?? null
    return this.toDTO({
      ...updated,
      touch_points: {
        short_url: touchPoint.short_url,
        path_qr_code: touchPoint.path_qr_code,
        slug: (touchPoint as { slug?: string | null }).slug ?? null,
      },
      organizations: { org_slug: orgSlug },
    })
  }

  /**
   * `POST …/{artifact_id}/slug` (spec wave 4 B2): đổi ĐƯỜNG DẪN của một artifact đã live.
   *
   * KHÔNG phải PATCH, dù chỉ một field đổi tên: quy ước của repo này là PATCH dành cho sửa field
   * trong DB, còn thao tác có side effect NGOÀI DB là POST — và đây có hai: một hàng mới trong bảng
   * `slugs` và một ảnh QR được render lại rồi upload. Cùng họ với `publish` và `replace`.
   *
   * ĐIỀU QUAN TRỌNG NHẤT, và nó ngược với trực giác: slug CŨ không chết. li2-be phân giải short link
   * qua bảng `slugs`, và `updateTpSlug` chỉ INSERT hàng mới chứ không xoá hàng cũ — đó là "Lịch sử
   * đuôi link" mà short link đã có từ trước. Nên tờ rơi và QR đã in vẫn mở ra nội dung; chỉ ảnh QR
   * mới là sinh theo đường dẫn mới. Copy ở FE phải nói đúng điều đó (quyết định Q1 của chủ sản phẩm).
   *
   * Nháp KHÔNG đi đường này (409): slug đầu tiên được đặt lúc `publish`, nơi chưa có `slugs` nào để
   * giữ lịch sử và chưa có ảnh QR nào để sinh lại.
   *
   * Việc ghi được uỷ nguyên cho `updateAndReturn`, không viết lại: hàm đó đã mang kiểm plan
   * `MAX_SLUGS_PER_TP`, map lỗi `23505` thành 400 `slug_is_taken`, cập nhật `short_url`, ghi audit
   * log, và nhánh QR. Rủi ro R3 đã ghi nhận: nếu nó ném SAU khi `slugs` đã insert thì `short_url`
   * mới mà ảnh QR còn cũ, và lần gọi lại với cùng slug rơi vào nhánh no-op nên không sửa được —
   * degraded, không dead, vì cả hai đường dẫn đều phân giải.
   */
  async changeSlug(
    orgId: string,
    userId: string,
    artifactId: string,
    slug: string
  ): Promise<ArtifactDTO> {
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)

    const current = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    // 404 cho hàng của org khác VÀ cho bia mộ, như `getForOrg`: một artifact đã gỡ thì vô hình với
    // mọi thao tác quản lý.
    if (!current || current.status === 'removed') throw artifactNotFound()
    if (current.status !== 'live' || !current.touch_point_id)
      throw statusRefusesReplace(current.status)

    /**
     * `slugSchema` THẬT, không một bản chép: 6–64 ký tự, `a-z0-9` nối bằng một gạch, cấm tiền tố
     * `f-`. Schema nhận `''` và biến nó thành `undefined`, nên một chuỗi rỗng (hoặc toàn dấu cách)
     * phải bị chặn ở đây — nó không phải "không đổi gì", nó là một slug không hợp lệ.
     */
    const parsed = slugSchema.safeParse(slug)
    if (!parsed.success || !parsed.data)
      throw new BadRequestError(`Invalid slug: ${slug}`, {
        key: 'common:messages.error.field_invalid',
        params: { field: 'slug' },
      })
    const nextSlug = parsed.data

    /**
     * Bấm lưu mà không sửa gì thì không ghi gì. `updateTpSlug` tự no-op khi slug trùng, nhưng nhánh
     * QR của `updateAndReturn` thì KHÔNG — nó sẽ render và upload lại một ảnh y như cũ, và
     * `updated_at` sẽ nhích làm mọi cache ảnh QR vô hiệu mà không có gì mới để xem.
     */
    const touchPoint = embeddedTouchPoint(current)
    if (touchPoint?.slug === nextSlug)
      return this.toDTO(current, null, await this.visitsFor(current))

    /**
     * `qr_customize_options` được gửi NGUYÊN lại, không bỏ trống: nhánh QR của `updateAndReturn`
     * render ảnh TỪ những options nó nhận, nên gọi mà không gửi gì nghĩa là "render lại bằng mặc
     * định" — màu, logo và kiểu dot người dùng đã đặt bị xoá sạch, im lặng, chỉ vì đổi đường dẫn.
     * Trường `data` bên trong là URL cũ, nhưng `parseQrCustomizeOptions` luôn ghi đè nó bằng đường
     * dẫn mới — đúng và chỉ đúng thứ ta muốn đổi.
     */
    const updatedTouchPoint = (await this.deps.updateTouchPoint(
      orgId,
      current.touch_point_id,
      {
        slug: nextSlug,
        variants_content: { [TouchPointVariants.QR]: { enabled: true } },
        qr_customize_options: (touchPoint?.qr_customize_options ?? {}) as Record<string, unknown>,
      },
      userId
    )) as EmbeddedTouchPoint | null

    /**
     * SAU khi ghi, không trước: một lỗi `slug_is_taken` không được để lại một `updated_at` mới trên
     * một artifact chẳng có gì đổi. Ảnh QR mới có thể ghi vào CÙNG `path_qr_code`, nên FE cache-bust
     * bằng `updated_at` và cột đó phải nhích — không trigger nào làm hộ.
     */
    await this.deps.repo.touchUpdatedAtForOrg(orgId, artifactId)

    /**
     * Đọc lại để DTO mang `updated_at` và `path_qr_code` đúng như trong DB. Hàng biến mất giữa hai
     * lần đọc (xoá song song) thì dựng DTO từ hàng cũ + touch point vừa ghi: trả 404 cho một phép
     * ghi ĐÃ thành công là nói sai với caller.
     */
    const refreshed = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    const row: ArtifactRow = refreshed ?? { ...current, touch_points: updatedTouchPoint }

    return this.toDTO(row, null, await this.visitsFor(row))
  }

  /** Lượt quét của MỘT hàng — nháp không có touch point thì 0 và không gọi DB. */
  private async visitsFor(row: ArtifactRow): Promise<number> {
    const tpId = row.touch_point_id
    if (!tpId) return 0
    const visits = await this.countVisitsSafely([tpId])
    return visits.get(tpId) ?? 0
  }

  /**
   * `PATCH …/{artifact_id}` (spec R2a): ai xem được `/a/<token>`.
   *
   * Thứ tự: quyền → đọc hàng → kiểm status → băm (nếu password) → MỘT UPDATE. Cùng policy với
   * `publish` (`add_touch_point`): ai được xuất bản thì được đổi quyền xem — không tạo key quyền mới.
   *
   * Mỗi lần gọi TĂNG `access_version`, kể cả PATCH `public` trên hàng đã public: so sánh để bỏ qua
   * là thêm một nhánh, và hệ quả duy nhất là người xem có phiên phải qua một cổng không tồn tại.
   * `password` không bao giờ vào log — `log.info` chỉ ghi id và mode.
   */
  async setAccess(
    orgId: string,
    userId: string,
    artifactId: string,
    input: SetArtifactAccessInput
  ): Promise<ArtifactDTO> {
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)
    void userId // dành cho audit entry của artifact, như replaceContent/deleteForOrg

    const parsed = parseAccessInput(input, this.deps.hasGoogleClient)

    const current = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    if (!current || current.status === 'removed') throw artifactNotFound()
    // Đổi quyền xem cho nội dung đang bị hệ thống giữ (blocked/expired/…) là vô nghĩa: 409, như replace.
    if (!isReplaceableStatus(current.status)) throw statusRefusesReplace(current.status)

    const updated = await this.applyAccess(orgId, current, parsed)
    return this.toDTO(updated)
  }

  /**
   * Phần ghi chung của `setAccess` và `publish`. `password_hash`/`password_set_at` là null ở mọi chế độ
   * khác `password` — CHECK `artifacts_password_hash_check` ép điều đó ở DB, đây là chỗ nói trước.
   */
  private async applyAccess(orgId: string, current: ArtifactRow, access: ParsedAccess) {
    const passwordHash = access.password ? await this.deps.hashPassword(access.password) : null
    const updated = await this.deps.repo.updateAccessForOrg(
      orgId,
      current.id,
      Number(current.access_version ?? 1),
      {
        access_mode: access.mode,
        password_hash: passwordHash,
        password_set_at: passwordHash ? new Date().toISOString() : null,
      }
    )

    /**
     * Không hàng nào khớp `(id, org, access_version)`: hoặc hàng vừa biến mất, hoặc một PATCH khác vừa
     * tăng version trước ta. Đọc lại để nói đúng điều nào — và với trường hợp thứ hai, 409 để client
     * thử lại với version mới, thay vì ghi đè im lặng.
     */
    if (!updated) {
      const now = await this.deps.repo.findByIdForOrg(orgId, current.id)
      if (!now || now.status === 'removed') throw artifactNotFound()
      throw new ConflictError('Artifact access changed concurrently', {
        key: 'artifact:access.conflict',
      })
    }

    log.info({ artifactId: current.id, mode: access.mode }, 'Artifact access mode updated')
    return updated
  }

  /**
   * Swaps the CONTENT behind an artifact and leaves everything printed on paper alone.
   *
   * `serve_token` belongs to the row, not to the file: `/a/<token>` resolves the row on every request
   * and reads `storage_path`, `kind` and `content_type` from it. So pointing the row at a new object
   * is the whole feature — the short link, the touch point, the QR code and every visit already
   * counted stay exactly as they were. This is NOT versioning: the old object is deleted in step 9
   * and cannot be brought back, which the dialog says before the user commits.
   *
   * THE ORDER IS THE DESIGN (spec R2), chosen by which failure is worse:
   *
   *  1. permission, 2. read the row, 3–4. validate the file, 5. quota pre-check as a DELTA
   *  6. upload the NEW object under a NEW path            ← nothing the public can see has changed
   *  7. atomic UPDATE in SQL (status + delta quota + lock) ← the point of commitment
   *  8. re-read the row with its touch point              ← for the DTO
   *  9. delete the OLD object, best effort                ← the only step allowed to fail quietly
   *
   * Why a refusal at step 7 deletes the NEW object and leaves the row: the row still points at the
   * old object, which is still there, so "the link still opens the old file" is a fact the UI can
   * state, not a reassurance. Why a failure at step 9 does NOT fail the request: the row already
   * points at the new object and scanners already see it; returning an error now would tell the user
   * the swap did not happen when it did. What that leaves is an orphan object — same family as
   * `removeUploadedObject`, logged with enough to find it, no sweep job yet.
   *
   * The quota is a DELTA on both sides (pre-check here, guarantee in SQL): the old object is leaving
   * the bucket, so charging the full new size would refuse a 3MB → 7MB swap for 7MB instead of 4MB.
   *
   * The path carries a fresh uuid because `storage.put` is `upsert: false` and the original path is
   * `${orgId}/${id}${ext}` — a same-kind replacement would collide with itself. The `${orgId}/${id}-`
   * prefix is kept so a human (and acceptance test A4) can list every object this artifact ever
   * owned with one LIKE.
   */
  async replaceContent(
    orgId: string,
    userId: string,
    artifactId: string,
    input: ReplaceArtifactInput
  ): Promise<ReplaceArtifactResult> {
    // Same gate as create() and publish(): whoever may upload and publish may replace. A key of its
    // own would invent a role that can publish but not fix a typo, which nobody has asked for.
    await this.deps.ensurePolicy(orgId, nonScopePolicies.add_touch_point)
    void userId // kept for the artifact audit entry this feature still owes, like deleteForOrg

    const current = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    // 404 for another org's row AND for a tombstone, like getForOrg/deleteForOrg: a removed artifact
    // is invisible to every management action. Both land the dialog on the same "taken down" screen
    // (it maps on the HTTP status). The KEY differs so the MCP mapper can say "taken down" instead of
    // "no such id" — the only caller that reads it.
    if (!current) throw artifactNotFound()
    if (current.status === 'removed') throw artifactRemoved()
    if (!isReplaceableStatus(current.status)) throw statusRefusesReplace(current.status)

    const filename = input.file?.name ?? ''
    const format = artifactFormatForFileName(filename)
    if (!format)
      throw new BadRequestError(`Unsupported file type: ${filename}`, {
        key: 'common:messages.error.unsupported_field_type',
        params: { field: '$t(label.file)' },
      })

    if (input.file.size <= 0)
      throw new BadRequestError('Artifact file is empty', {
        key: 'common:messages.error.invalid_file_type',
        params: { type: format.extension.replace('.', '').toUpperCase() },
      })

    // 413, where create() still answers 400 for the same thing. The request is well formed and
    // simply too big, and the route's layer-0 check already speaks 413 for the declared length —
    // two codes for one limit on one endpoint would be the worse inconsistency. create() is left
    // as is this wave (spec §4); the i18n key is shared so the user reads one sentence either way.
    if (input.file.size > ARTIFACT_MAX_BYTES)
      throw new PayloadTooLargeError('File size exceeds limit', {
        key: 'common:messages.error.field_exceed_limit',
        params: fileTooLargeParams(input.file.size),
      })

    const buffer = Buffer.from(await input.file.arrayBuffer())

    if (!matchesMagic(buffer.subarray(0, ARTIFACT_SNIFF_BYTES), format))
      throw new BadRequestError(`File contents do not match ${format.extension}`, {
        key: 'common:messages.error.invalid_file_type',
        params: { type: format.extension.replace('.', '').toUpperCase() },
      })

    /**
     * LAYER 3 — malware scan, same gate as `create()` and for a sharper reason: these bytes are
     * going UNDER a link and a QR code that already exist and are already printed. A refusal here
     * leaves the live content exactly as it is — `storage.put` has not run, the RPC has not run, so
     * `storage.remove` is never reached and the previous object is untouched. The user keeps a
     * working page and gets told their new file was not accepted.
     *
     * `artifactId` is passed, unlike in `create()`, because here there IS a row to name in the log.
     */
    await this.scanOrRefuse(buffer, { orgId, userId, filename, artifactId: current.id })

    // PRE-CHECK, as a delta. Cheap path: refuses before a byte reaches the bucket. The guarantee is
    // the SQL function below, which cannot be raced.
    const usedBytes = await this.deps.repo.sumSizeBytesByOrg(orgId)
    const currentBytes = Number(current.size_bytes ?? 0)
    if (usedBytes - currentBytes + buffer.byteLength > ARTIFACT_QUOTA_FREE_BYTES)
      throw storageQuotaExceeded(replaceQuotaNumbers(usedBytes, currentBytes, buffer.byteLength))

    const storagePath = `${orgId}/${current.id}-${uuidv4()}${format.extension}`
    await this.deps.storage.put(storagePath, buffer, format.storageMime)

    /**
     * THE GUARANTEE. Status, delta quota and the UPDATE under one per-org advisory lock. It returns
     * the row AS IT WAS — the `storage_path` read under the lock is the object to delete, which is
     * what keeps two concurrent replaces from both deleting the same original and orphaning one of
     * the two new objects (see the migration).
     */
    const previous = await this.deps.repo.replaceIfWithinQuota(
      orgId,
      current.id,
      {
        kind: format.kind,
        storage_path: storagePath,
        content_type: format.contentType,
        size_bytes: buffer.byteLength,
      },
      ARTIFACT_QUOTA_FREE_BYTES
    )

    if (!previous) {
      // The new object has no row pointing at it; the old one is untouched. Take the new one back
      // out, then re-read to say WHY — the function refuses the same way for all three reasons.
      await this.removeUploadedObject(storagePath)
      const now = await this.deps.repo.findByIdForOrg(orgId, artifactId)
      if (!now) throw artifactNotFound()
      if (now.status === 'removed') throw artifactRemoved()
      if (!isReplaceableStatus(now.status)) throw statusRefusesReplace(now.status)
      throw storageQuotaExceeded(
        replaceQuotaNumbers(
          await this.deps.repo.sumSizeBytesByOrg(orgId),
          Number(now.size_bytes ?? 0),
          buffer.byteLength
        )
      )
    }

    // Re-read rather than overlay the embedded touch point onto `previous`: the RPC returns a bare
    // row, and one more read is cheaper than a second place for `short_url` to come from.
    const fresh = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    if (!fresh) throw artifactNotFound()

    await this.removeReplacedObject(artifactId, previous.storage_path)

    return { ...this.toDTO(fresh), previous_size_bytes: Number(previous.size_bytes ?? 0) }
  }

  /**
   * Removes the CONTENT and leaves the ADDRESS: the object goes, the row becomes a tombstone, the
   * touch point is not touched at all.
   *
   * WHY THIS IS NOT WHAT IT USED TO BE. The previous version deleted all three, and the comment here
   * justified deleting the touch point by claiming the short link and every printed QR would then
   * "answer 404 at li2-be", which was "the only honest thing it can do". **Both halves were wrong
   * about the real system.** Measured on LiHi 2026-10-01, after a real delete: the short link answered
   * **200** with li2-be's generic English error page — the SAME page a slug that never existed gets.
   * A scanner could not tell "taken down" from "typo", and because the touch point was gone li2-be
   * stopped there, so they never reached `/a/<token>` and never saw anything we wrote.
   *
   * The model now: a short link and the content behind it are two objects with their own lifetimes.
   * Removing the content does not delete the address. The link still redirects, the scan is still
   * counted, and `/a/<token>` answers 410 with a page that explains itself.
   *
   * THE ORDER IS STILL THE DESIGN, and it is still chosen by which failure is worse.
   *
   * 1. **Permission first**, resolved before anything is read or destroyed — see below.
   * 2. **Object second.** Quota is `sum(size_bytes)` over rows, so an object left in the bucket with
   *    no row pointing at it is storage that nothing counts and nobody can find — an invisible leak.
   *    So if storage refuses, this STOPS, the row stays `live`, and a retry still has everything it
   *    needs. NOT wrapped in try/catch, and the reason is stronger now than before: a row left `live`
   *    whose object is gone would have `/a/<token>` serve nothing; a row marked `removed` whose object
   *    SURVIVED would be content the owner believes is gone, still sitting in a bucket.
   * 3. **Tombstone last.** The row stops being servable the moment its status changes, so there is no
   *    separate revocation step that could be forgotten.
   *
   * The touch point is deliberately left alone. That also drops the only call in this flow ever
   * expected to write an audit-log entry; measured 2026-09-30, that entry was never actually being
   * written on LiHi (`logs.org_audit_logs` had 0 rows after 12+ deletes), so nothing is lost today —
   * but an artifact needs an audit entry of its own rather than riding a touch point's, and that is
   * tracked as separate work.
   *
   * `userId` is now unused and KEPT in the signature on purpose: it is what an audit entry of our own
   * will need, and dropping it from the route, the API handler and back again is churn in the way of
   * that work. Removing the parameter is the thing to do only if that work is abandoned.
   */
  async deleteForOrg(orgId: string, userId: string, artifactId: string): Promise<void> {
    /**
     * `DELETE_TOUCH_POINT`, and NOT a new permission key of its own (§3 G2). An artifact publishes
     * itself as a touch point, so whoever may take a touch point down may take an artifact down —
     * inventing a second key would mean a role that can delete the link but not the thing behind it.
     *
     * Resolved FIRST, before anything is read or destroyed: a permission refusal discovered halfway
     * through would leave a row pointing at an object that no longer exists.
     */
    await this.deps.ensureDeletePolicy(orgId)

    const artifact = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    // 404, not 403: whether an artifact exists in someone else's org is not this caller's business.
    if (!artifact) throw artifactNotFound()

    /**
     * Already a tombstone. Still a 404 — `artifactRemoved()` is a `NotFoundError` too, so the STATUS
     * the UI sees is byte-for-byte what a second DELETE answered before (wave 4 WP1 kept it that way
     * on purpose, and the UI route maps the key back; see `[artifact_id]/route.ts`). What changes is
     * only the i18n KEY, and only so that MCP's `delete_artifact` can tell "already gone" from "no
     * such id" and answer the first one as a SUCCESS with `already_removed: true`. Without two keys
     * the two are indistinguishable (checklist C4) and a retrying agent reports a failure for a
     * delete that is complete.
     *
     * Still before `storage.remove`, and that part is not cosmetic: a double click or a retrying job
     * would otherwise call `storage.remove` on a path with no object left, and
     * `artifact-storage.remove` THROWS on a storage error — turning an action that already succeeded
     * into a 500.
     */
    if (artifact.status === 'removed') throw artifactRemoved()

    /**
     * Nháp CHƯA TỪNG xuất bản thì xoá CỨNG, không dựng bia mộ.
     *
     * Nguyên tắc này đã được viết ra ở `discardDraft` ngay trong file này — "bia mộ là cho nội
     * dung ĐÃ TỪNG phục vụ, và một bia mộ ở đây sẽ khiến `/a/<token>` trả 410 cho một token chưa
     * từng công khai" — nhưng chỉ áp ở đó, không áp ở đây. Agent `test-artifact` đo trên LiHi:
     * xoá hai nháp chưa publish (`hvd1504t8hzk82tr`, `hbpi29mfzjr9f1b9`) rồi gọi `/a/<token>` thì
     * cả hai trả **410**, cho những token chưa bao giờ ai thấy.
     *
     * Bia mộ tồn tại để trả lời người quét một mã QR ĐÃ IN. Nháp chưa publish không có QR, không
     * có link, không có ai để trả lời — nên 404 mới là câu đúng, và một hàng ở lại chỉ là rác.
     *
     * `deleteDraftById` mang guard `status='draft' AND touch_point_id IS NULL` ngay trong câu
     * DELETE, nên kể cả khi điều kiện ở đây lệch thì nó vẫn không xoá nhầm một hàng đã publish.
     */
    if (artifact.status === 'draft' && !artifact.touch_point_id) {
      await this.deps.storage.remove(artifact.storage_path)
      await this.deps.repo.deleteDraftById(orgId, artifactId)
      return
    }

    await this.deps.storage.remove(artifact.storage_path)

    await this.deps.repo.markRemovedForOrg(orgId, artifactId)
  }

  async getForOrg(orgId: string, artifactId: string): Promise<ArtifactDTO> {
    const artifact = await this.deps.repo.findByIdForOrg(orgId, artifactId)
    // 404, not 403: whether an artifact exists in someone else's org is not this caller's business.
    if (!artifact) throw artifactNotFound()
    /**
     * A tombstone is invisible to the management UI, here as well as in `listByOrg`. Returning it
     * would mean an old detail URL (or browser history) opens a page for content that no longer
     * exists — with a Delete button on it and a preview iframe pointing at a missing file.
     */
    if (artifact.status === 'removed') throw artifactNotFound()

    /**
     * [P2] `{n} người đã mở` chỉ có nghĩa ở chế độ Google và chỉ ở trang chi tiết — `listForOrg` trả
     * `null` để một trang danh sách không tốn một COUNT cho mỗi thẻ. Đếm hỏng → `null`, không 500: con
     * số là thông tin phụ của trang, không phải điều kiện để trang mở.
     */
    const viewerCount =
      artifact.access_mode === 'google' ? await this.countViewersSafely(artifact.id) : null
    const visits = await this.countVisitsSafely(
      artifact.touch_point_id ? [artifact.touch_point_id] : []
    )
    return this.toDTO(artifact, viewerCount, visits.get(artifact.touch_point_id ?? '') ?? 0)
  }

  /**
   * `get_artifact { slug }` — the same DTO `getForOrg` returns, found by the slug a QR or a short
   * link carries instead of by id (WP1 §2). An agent that published a page last week has the slug in
   * its transcript far more often than the uuid.
   *
   * THE TWO-STEP IS NOT AVOIDABLE. `repo.findByOrgSlugAndSlug` keys on `org_slug` — the public
   * address segment — not on `organization_id`, because it is the resolver the public serve route
   * uses. So the org's slug is read first. An org with no `org_slug` cannot have a public artifact
   * address at all, so it answers 404 rather than falling through to a query that cannot match.
   *
   * ⚠️ THE ORG RE-CHECK ON THE WAY BACK IS LOAD-BEARING, not belt-and-braces. The repository
   * resolves through the GLOBALLY unique `slugs` table and filters by the org it looked up — but
   * that org came from a slug we resolved, and this method's contract is "an artifact of `orgId`".
   * Asserting `organization_id === orgId` on the row is what makes a future change to either lookup
   * unable to turn this into a cross-tenant read.
   *
   * `removed` is a 404 here exactly as in `getForOrg`: a tombstone exists for whoever scans a
   * printed QR, not as something a tool can read back.
   */
  async getBySlugForOrg(orgId: string, slug: string): Promise<ArtifactDTO> {
    const orgSlug = (await this.deps.findOrgSlug?.(orgId)) ?? null
    if (!orgSlug) throw artifactNotFound()

    const artifact = await this.deps.repo.findByOrgSlugAndSlug(orgSlug, slug)
    if (!artifact) throw artifactNotFound()
    if (artifact.organization_id !== orgId) throw artifactNotFound()
    if (artifact.status === 'removed') throw artifactNotFound()

    const viewerCount =
      artifact.access_mode === 'google' ? await this.countViewersSafely(artifact.id) : null
    const visits = await this.countVisitsSafely(
      artifact.touch_point_id ? [artifact.touch_point_id] : []
    )
    return this.toDTO(artifact, viewerCount, visits.get(artifact.touch_point_id ?? '') ?? 0)
  }

  private async countViewersSafely(artifactId: string): Promise<number | null> {
    try {
      return await this.deps.viewRepo.countViewersByArtifact(artifactId)
    } catch (error) {
      log.error({ err: error, artifactId }, 'Could not count artifact viewers')
      return null
    }
  }

  /**
   * Lượt quét cho một tập touch point, và KHÔNG BAO GIỜ làm vỡ caller.
   *
   * Cùng tinh thần `countViewersSafely`: RPC chưa được áp lên môi trường này, hoặc `visits` tạm thời
   * không đọc được, không được biến một trang danh sách thành 500 — thanh lượt quét hiện 0 và log
   * ERROR mang theo đủ id để tìm. Trả Map rỗng để caller không cần nhánh riêng.
   */
  private async countVisitsSafely(tpIds: string[]): Promise<Map<string, number>> {
    if (tpIds.length === 0) return new Map()
    try {
      return await this.deps.repo.countVisitsByTouchPoints(tpIds)
    } catch (error) {
      log.error({ err: error, tpIds }, 'Could not count artifact visits')
      return new Map()
    }
  }

  /**
   * MỘT lần RPC cho cả trang (wave 4 S1) — không phải một lần cho mỗi thẻ. Nháp không có
   * `touch_point_id` nên bị lọc khỏi mảng, và một trang toàn nháp không gọi DB lần nào.
   */
  async listForOrg(orgId: string, args: ListByOrgArgs) {
    const { data, count } = await this.deps.repo.listByOrg(orgId, args)

    const tpIds = data.map((row) => row.touch_point_id).filter((id): id is string => Boolean(id))
    const visits = await this.countVisitsSafely(tpIds)

    return {
      data: data.map((row) => this.toDTO(row, null, visits.get(row.touch_point_id ?? '') ?? 0)),
      rowCount: count,
    }
  }

  /**
   * Chế độ xem org được chọn hôm nay — `ARTIFACT_ACCESS_MODES` trừ `google` khi env chưa đặt (§9).
   * Dashboard hỏi hàm này qua `GET …/access-modes` thay vì đọc một env public: một công tắc, không hai.
   */
  availableAccessModes(): ArtifactAccessMode[] {
    return ARTIFACT_ACCESS_MODES.filter((mode) => mode !== 'google' || this.deps.hasGoogleClient())
  }

  /**
   * Both quota axes, read with the SAME two queries the pre-checks in `create()` and `publish()`
   * use — so the number the dialog shows as "còn trống" is the number the next upload will be
   * refused against, not a parallel computation that can drift. No new column, no new SQL.
   *
   * The two ceilings travel with the usage on purpose: a client that imports the constants would
   * print the right number today and the wrong one the day the plan changes server-side.
   */
  async quotaForOrg(orgId: string): Promise<ArtifactQuotaDTO> {
    const [used_bytes, live_count] = await Promise.all([
      this.deps.repo.sumSizeBytesByOrg(orgId),
      this.deps.repo.countLiveByOrg(orgId),
    ])
    return {
      used_bytes,
      quota_bytes: ARTIFACT_QUOTA_FREE_BYTES,
      live_count,
      live_quota: ARTIFACT_QUOTA_FREE_LIVE,
    }
  }

  /**
   * Cleanup for an object whose row was refused by the atomic byte check.
   *
   * Best effort, and swallowed on purpose: the caller is already on its way to a 403, and replacing
   * a quota message with a storage error would tell the user the wrong thing about what happened.
   * What a failure leaves is an object no row references — the same shape the DELETE ordering
   * accepts, visible to the same fix (a sweep job this wave does not have).
   */
  private async removeUploadedObject(storagePath: string) {
    try {
      await this.deps.storage.remove(storagePath)
    } catch (error) {
      log.error(
        { err: error, storagePath },
        'Refused upload left an object in the bucket with no row pointing at it'
      )
    }
  }

  /**
   * Step 9 of `replaceContent`: the object the row no longer points at.
   *
   * Swallowed, and for a different reason than `removeUploadedObject`: here the request has
   * SUCCEEDED — the row points at the new object and scanners already see it. An error now would
   * tell the user the swap did not happen. The orphan is logged with the artifact id so a human can
   * find every object the artifact ever owned (`LIKE '<org>/<id>%'`) and remove the stale one.
   */
  private async removeReplacedObject(artifactId: string, storagePath: string) {
    try {
      await this.deps.storage.remove(storagePath)
    } catch (error) {
      log.error(
        { err: error, artifactId, storagePath },
        'Replaced content but could not delete the previous object — it is now an orphan'
      )
    }
  }

  /**
   * Cleanup for a touch point minted by a publish that then lost the race for the last slot.
   *
   * Swallowed for the same reason as above. This one CAN legitimately fail where the object removal
   * cannot: `deleteTpById` resolves `DELETE_TOUCH_POINT` for itself, and `publish()` only required
   * `add_touch_point`. A role that may publish but not delete gets an orphan touch point here — a
   * short link and QR in the org's list that answer 404, logged so it can be found.
   */
  private async discardMintedTouchPoint(orgId: string, touchPointId: string, userId: string) {
    try {
      await this.deps.deleteTouchPoint(orgId, touchPointId, userId)
    } catch (error) {
      log.error(
        { err: error, orgId, touchPointId },
        'Lost the live-slot race and could not remove the touch point it minted'
      )
    }
  }
}

/**
 * ONLY the configured base url. Deriving it from the request's Host would let a client choose the
 * string we persist as `content_value` and print into a QR code — a header the caller controls must
 * never end up baked into a durable link.
 */
function buildServeUrl(serveToken: string) {
  const base = (process.env.NEXT_PUBLIC_APP_BASE_URL ?? '').replace(/\/+$/, '')
  if (!base)
    throw new AppError('NEXT_PUBLIC_APP_BASE_URL is not configured', {
      key: 'common:messages.error.some_error',
    })
  return `${base}/a/${serveToken}`
}

/**
 * Composed here, not in the frontend. The byte route's spelling is a server-side detail — a client
 * that concatenates `/download` itself becomes a second place to change the day it moves.
 */
function buildDownloadUrl(serveToken: string) {
  return `${buildServeUrl(serveToken)}/download`
}

/**
 * One error per axis, one constructor each — and each is now raised from TWO places: the pre-check
 * that refuses before any side effect, and the atomic write that refuses when a concurrent request
 * got past it. Two copies of the same params would be two chances for the number in the message to
 * stop matching the number being enforced.
 */
/**
 * Số trong `params` là kênh DUY NHẤT mang trạng thái sang MCP mà không forward `message` (spec R8a):
 * `artifact-refusals.ts` đọc `used_bytes`/`need_bytes`/`free_bytes` để viết câu bằng chữ của nó. Thêm
 * trường, không đổi key — i18next bỏ qua interpolation không dùng nên UI không đổi.
 *
 * `needBytes` là số byte lời gọi này cần THÊM: toàn bộ file ở `create()`, delta ở `replaceContent()`.
 * `free_bytes` tương ứng là chỗ còn trống trước lời gọi (cộng cả object sắp bị thay ở replace), kẹp 0.
 */
function storageQuotaExceeded({ usedBytes, needBytes }: { usedBytes: number; needBytes: number }) {
  return new ForbiddenError('Artifact storage quota exceeded', {
    key: 'common:messages.error.field_exceed_limit',
    params: {
      field: '$t(label.storage)',
      limit: ARTIFACT_QUOTA_FREE_BYTES / 1024 / 1024,
      used_bytes: usedBytes,
      need_bytes: needBytes,
      free_bytes: Math.max(0, ARTIFACT_QUOTA_FREE_BYTES - usedBytes),
    },
  })
}

/** Replace trả quota theo DELTA: object cũ rời bucket, nên "đã dùng" không tính nó và "cần" là phần chênh. */
function replaceQuotaNumbers(usedBytes: number, currentBytes: number, nextBytes: number) {
  return { usedBytes: usedBytes - currentBytes, needBytes: nextBytes - currentBytes }
}

function fileTooLargeParams(sizeBytes: number) {
  return {
    field: '$t(label.file)',
    limit: ARTIFACT_MAX_BYTES / 1024 / 1024,
    size_bytes: sizeBytes,
  }
}

/**
 * 400 — clamd matched a signature in the uploaded bytes (spec WP2 §4).
 *
 * `signature` IS TAKEN AND DELIBERATELY NOT USED IN THE MESSAGE. `BaseError.toResponse()` puts
 * `message` in the response body, and the name of the rule a file tripped is a map for whoever
 * wanted it through: change the one thing the rule looks for and try again. The parameter is here so
 * the call site cannot forget it exists, and the value is logged by `scanOrRefuse` and by the client
 * — which is where a false-positive report has to be traceable from.
 *
 * 400 rather than 422: the request was well formed and the server understood it; what is wrong is
 * the content of a part, which is exactly how the other two file layers (unsupported type, bad magic
 * bytes) already answer on this endpoint.
 */
function fileFailedScan(_signature: string) {
  return new BadRequestError('Artifact file failed the malware scan', {
    key: 'artifact:errors.scan_infected',
  })
}

/**
 * 400 — the file is protected by a password, so clamd could not open it to scan it
 * (`AlertEncryptedArchive` / `AlertEncryptedDoc`, both on in `deploy/clamav/clamd.conf`).
 *
 * A THIRD ERROR, NOT A VARIANT OF `fileFailedScan`. clamd reports both as a signature match, but
 * "your file contains malware" is an accusation and this is not one: encrypting a PDF is a normal,
 * legitimate thing to do, and the only thing wrong is that we cannot see inside. Telling that user
 * their document has a virus is the worst sentence this feature can produce — it is wrong, it is
 * alarming, and it points at no fix. So the message names the password and names the way out.
 *
 * No signature parameter, unlike `fileFailedScan`: there is nothing to keep out of the message here,
 * and the name is already logged by `scanOrRefuse` and by the client.
 */
function filePasswordProtected() {
  return new BadRequestError('Artifact file is password-protected and could not be scanned', {
    key: 'artifact:errors.scan_encrypted',
  })
}

/**
 * 503 — the scan did not produce a verdict: clamd unreachable, timed out, an unreadable reply, or a
 * misconfigured env while the gate is on. FAIL-CLOSED (spec §2.5), which is what makes this error
 * exist at all instead of the upload simply proceeding.
 *
 * MUST STAY DISTINCT FROM `fileFailedScan`. The user has to be able to tell "your file has malware
 * in it" from "our scanner is down": the first means pick a different file and the second means wait
 * and retry the same one, and a single message would send half of everyone down the wrong path. Same
 * reason the MCP mapper gives them two different sentences.
 *
 * `ServiceUnavailableError`, not `AppError`: a container that is restarting or reloading its
 * signature database is a dependency outage, not a bug to page on, and 503 is the status that tells
 * a caller retrying can work.
 */
function scanUnavailable() {
  return new ServiceUnavailableError('Could not scan the artifact file for malware', {
    key: 'artifact:errors.scan_unavailable',
  })
}

function liveQuotaExceeded() {
  return new ForbiddenError('Live artifact quota exceeded', {
    // A key of its own, not the shared `field_exceed_number_limit`: the `tags` caller passes a
    // LABEL as `limit` (`touch-points/route.ts:141-148`), so `limit` in that template does not
    // always mean a number and no rewrite of it can be right for both. The dedicated key also gets
    // to say what to DO about it, which a "field exceeds limit" template never can.
    key: 'artifact:errors.quota_live',
    params: { limit: ARTIFACT_QUOTA_FREE_LIVE },
  })
}

function artifactNotFound() {
  return new NotFoundError('Artifact not found', {
    key: 'common:messages.error.not_found',
    params: { field: '$t(label.artifact)' },
  })
}

/**
 * Cùng 404 với `artifactNotFound()` — FE replace dialog map theo STATUS, không theo key — nhưng key
 * riêng để MCP phân biệt "đã gỡ" với "không có id này".
 *
 * Wave 4 WP1: `deleteForOrg` nay cũng ném key này cho nhánh bia mộ, để `delete_artifact` trả
 * `already_removed: true` (thành công) thay vì một lỗi 404 mà agent sẽ báo là thất bại. Route UI
 * `DELETE …/artifacts/[artifact_id]` map ngược key về `not_found` nên toast của người dùng không
 * đổi. `getForOrg` vẫn giữ `not_found`: không ai đọc key của nó, và một bia mộ với UI là "không có".
 */
function artifactRemoved() {
  return new NotFoundError('Artifact has been taken down', {
    key: 'artifact:errors.removed',
  })
}

/**
 * Only `live` and `draft` may have their content replaced. `removed` is handled before this (404);
 * the other four — `blocked`, `quarantined`, `expired`, `scanning` — are rows the SYSTEM is holding,
 * each with its own action in the UI (re-upload, appeal, republish). Swapping bytes under one of
 * them would be a way around that hold, so it is a 409: "the state refuses", not "this does not
 * exist". The same set is enforced inside the SQL function for the race the pre-check cannot see.
 */
const isReplaceableStatus = (status: string) => status === 'live' || status === 'draft'

/**
 * Only `draft` and `scanning` may be published. `live` is answered before this with "already
 * published"; the other four — `blocked`, `quarantined`, `expired`, `removed` — are rows the SYSTEM
 * is holding or has taken down, and publishing one is exactly the way around that hold.
 *
 * `scanning` is in the set and has no producer today (the scan gate chosen in
 * `docs/artifact-scan-clamav-spec.md` §1 is synchronous, inside `create()`), but it is the status an
 * asynchronous publish would have to flip to `live`.
 *
 * THE SAME SET IS ENFORCED INSIDE `artifact_publish_if_within_quota`
 * (`20261021000001_artifacts__publish_status_guard.sql`) and that is the guarantee, not this: a
 * status can change during `createTouchPoint`, which this pre-check runs before.
 */
const isPublishableStatus = (status: string) => status === 'draft' || status === 'scanning'

/**
 * PostgREST trả embedded one-to-one là object, còn type sinh ra (và một số phiên bản client) mô tả
 * nó là array — cùng lý do `toDTO` xử lý cả hai, tách ra đây để `changeSlug` dùng lại.
 */
const embeddedOrgSlug = (row: ArtifactRow): string | null => {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
  return org?.org_slug ?? null
}

const publicSlugOf = publicSlugOfTouchPoint

const embeddedTouchPoint = (row: ArtifactRow): EmbeddedTouchPoint | null | undefined =>
  Array.isArray(row.touch_points) ? row.touch_points[0] : row.touch_points

function statusRefusesReplace(status: string) {
  return new ConflictError(`Artifact status '${status}' does not allow replacing content`, {
    key: 'artifact:update.status_refuses',
  })
}

/**
 * A KEY OF ITS OWN, not `artifact:update.status_refuses`, and that is the point of it. Three tools
 * already share that key with three different meanings (`artifact-refusals.ts` head), and the
 * sentence it renders — "cannot be replaced right now" — is about swapping bytes under live content.
 * A publish that is refused has not replaced anything and has no live content yet; the action the
 * user needs is different, so the sentence has to be too.
 */
function statusRefusesPublish(status: string) {
  return new ConflictError(`Artifact status '${status}' does not allow publishing`, {
    key: 'artifact:errors.status_refuses_publish',
  })
}

type ParsedAccess = { mode: ArtifactAccessMode; password: string | null }

/**
 * Validation của R2a, dùng chung PATCH và publish. Đếm CODE POINT sau `trim()` (`[...s].length`), không
 * `.length` UTF-16 — một mật khẩu 8 emoji là 8 ký tự với người gõ nó. Mật khẩu chỉ có nghĩa ở chế độ
 * `password`; gửi kèm ở chế độ khác thì bị bỏ qua, không lỗi.
 */
function parseAccessInput(
  input: SetArtifactAccessInput,
  hasGoogleClient: () => boolean
): ParsedAccess {
  const mode = input.access_mode
  if (!isArtifactAccessMode(mode))
    throw new BadRequestError(`Invalid access_mode: ${String(mode)}`, {
      key: 'common:messages.error.field_invalid',
      params: { field: 'access_mode' },
    })

  // [P2] gated bằng env: thiếu OAuth client thì chế độ này không tồn tại — 400, không phải 500 sau đó.
  if (mode === 'google' && !hasGoogleClient())
    throw new BadRequestError('Google sign-in is not configured for artifacts', {
      key: 'common:messages.error.field_invalid',
      params: { field: 'access_mode' },
    })

  if (mode !== 'password') return { mode, password: null }

  const password = typeof input.password === 'string' ? input.password.trim() : ''
  if (!password)
    throw new BadRequestError('Password is required for access_mode=password', {
      key: 'common:messages.error.field_required',
      params: { field: '$t(label.password)' },
    })

  const length = [...password].length
  if (length < ARTIFACT_PASSWORD_MIN_LENGTH || length > ARTIFACT_PASSWORD_MAX_LENGTH)
    throw new BadRequestError('Password length out of range', {
      key: 'common:messages.error.field_invalid',
      params: { field: '$t(label.password)' },
    })

  return { mode, password }
}

export const artifactService = new ArtifactService({
  repo: artifactRepo,
  storage: artifactStorage,
  hashPassword,
  hasGoogleClient: hasArtifactGoogleClient,
  viewRepo: artifactViewRepo,
  createTouchPoint: touchPointService.createTouchPoint.bind(touchPointService),
  deleteTouchPoint: touchPointService.deleteTpById.bind(touchPointService),
  updateTouchPoint: touchPointService.updateAndReturn.bind(touchPointService),
  findOrgSlug: async (orgId) => (await organizationService.getOrgById(orgId))?.org_slug ?? null,
  ensurePolicy,
  ensureDeletePolicy: (orgId) =>
    getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT),
})
