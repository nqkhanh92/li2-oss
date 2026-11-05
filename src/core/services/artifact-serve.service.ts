import 'server-only'

import { artifactRepo, ArtifactRepository } from '@/core/repositories/artifact.repository'
import { SERVE_TOKEN_PATTERN } from '@/core/helpers/serve-token'
import {
  artifactPublicPath,
  PUBLIC_SEGMENT_RE,
  publicSlugOfTouchPoint,
} from '@/core/helpers/artifact-public-url'
import {
  ARTIFACT_CONTENT_TYPE,
  ARTIFACT_OFFICE_SIGNED_URL_TTL_SECONDS,
  ArtifactAccessMode,
  ArtifactUploadKind,
  isArtifactAccessMode,
  isArtifactUploadKind,
} from '@/core/types/artifact.type'
import * as artifactStorage from '@/infrastructure/storage/artifact-storage'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'artifact-serve-service' })

/**
 * DELIBERATELY SEPARATE from `artifact.service.ts`, and it must stay that way.
 *
 * `/a/<token>` is the one public, unauthenticated route in the app, and all it does is read a row
 * and hand back bytes. Folding it into `ArtifactService` put `touchPointService` on its import
 * path, which pulls in `qr-code-styling` and the native `canvas` binary — so an anonymous visitor's
 * 404 depended on a native module loading, and every request to a missing artifact returned 500.
 *
 * Keeping the split at the file level makes the boundary visible in the tree: the public path
 * imports only the repository and storage, never the authenticated service layer.
 */
type Deps = {
  repo: Pick<ArtifactRepository, 'findByServeToken' | 'findByOrgSlugAndSlug'>
  storage: Pick<
    typeof artifactStorage,
    'get' | 'getBytes' | 'getRangeStream' | 'createSignedUrlFor'
  >
}

/**
 * Everything the public route needs about a live artifact, and nothing else. The row is not handed
 * out: `user_id` has no business on an unauthenticated path, and `password_hash` lives only inside
 * `access` where the gate reads it — it never reaches a page.
 */
export type ArtifactServeTarget = {
  id: string
  /** Carried along so callers build `/a/<token>/file` and `/download` from the row, not from the
   *  request path — the two must always name the same artifact. */
  serveToken: string
  kind: ArtifactUploadKind
  storagePath: string
  contentType: string
  name: string
  sizeBytes: number
  /** Những gì `evaluateGate` cần để quyết định có phục vụ hay không (spec R3). */
  access: ArtifactServeAccess
  /**
   * `/<org_slug>/<slug>` — đường công khai trên host artifact, hoặc `null` khi chưa có host riêng
   * hay hàng thiếu slug/org. Route `/a/<token>` dùng để chuyển người xem sang địa chỉ công khai.
   */
  publicPath: string | null
}

export type ArtifactServeAccess = {
  mode: ArtifactAccessMode
  passwordHash: string | null
  accessVersion: number
  /**
   * Cần cho chế độ `private`: `getUserOrgPermissions(organizationId)` trả `undefined` khi người đang
   * đăng nhập không thuộc org chủ artifact. Trước đây cột này cố ý không ra khỏi service — nay nó có
   * việc, nhưng vẫn chỉ ở trong `access`, không bao giờ in ra trang.
   */
  organizationId: string
  /** [P2] `first_touch_point_id` cho profile khách mới khi họ đăng nhập Google (spec R9). */
  touchPointId: string | null
}

/**
 * The three answers `/a/<token>` has to tell apart, and only three.
 *
 * `removed` is the ONLY outcome split out of `not-found`, and the split is a statement with a fact
 * behind it: the row is still there, this token DID serve content, the scanner mistyped nothing. Every
 * other non-live status (`draft`, `scanning`, `blocked`, `expired`, `quarantined`) stays folded into
 * `not-found` along with an invented token and a malformed one — telling those apart would tell a
 * stranger that this org has a draft at that path, which is none of their business.
 */
export type ArtifactServeLookup =
  | { outcome: 'not-found' }
  | { outcome: 'removed' }
  | { outcome: 'live'; target: ArtifactServeTarget }

/**
 * Giá trị `access_mode` ngoài từ vựng → `private`, KHÔNG phải `public`, và một dòng ERROR. Đây là
 * quyết định quyền trên đường public: một hàng ta không hiểu phải ĐÓNG, không mở (spec R3). Khác với
 * `toDTO` ở dashboard — nơi giá trị lạ đi qua nguyên vẹn để UI hiện badge trung tính — vì ở đây không
 * có "trung tính": hoặc phục vụ bytes, hoặc không.
 */
function accessModeOrPrivate(raw: unknown, artifactId: string): ArtifactAccessMode {
  if (isArtifactAccessMode(raw)) return raw
  log.error(
    { artifactId, accessMode: raw },
    'Artifact access_mode outside vocabulary — treated as private'
  )
  return 'private'
}

export class ArtifactServeService {
  constructor(private deps: Deps) {}

  /**
   * Everything the public route needs, in one call: token shape, existence, liveness and the bytes.
   * Returns null for all four failure modes, so the route cannot accidentally let a visitor tell a
   * malformed token apart from a withheld one.
   *
   * KHÔNG phải đường cổng. Route gọi hàm này SAU khi `evaluateGate` đã cho phép; đặt kiểm quyền vào
   * đây sẽ là lần kiểm thứ hai với một `request` mà hàm này không có (spec R3, answers Q8).
   */
  async getLiveContentByToken(
    token: string
  ): Promise<{ body: string; contentType: string } | null> {
    if (!SERVE_TOKEN_PATTERN.test(token)) return null

    const artifact = await this.deps.repo.findByServeToken(token)
    if (!artifact || artifact.status !== 'live') return null

    try {
      const body = await this.deps.storage.get(artifact.storage_path)
      return { body, contentType: artifact.content_type || ARTIFACT_CONTENT_TYPE }
    } catch (error) {
      log.error(
        { err: error, artifactId: artifact.id, storagePath: artifact.storage_path },
        'Failed to read artifact content'
      )
      return null
    }
  }

  /**
   * What `/a/<token>` dispatches on — the full answer, including the one failure the page is allowed
   * to name.
   *
   * THE ORDER OF THE CHECKS IS THE DESIGN:
   *
   * 1. Token shape — refused WITHOUT touching the database, as it always was.
   * 2. No row — `not-found`.
   * 3. `removed` — checked BEFORE the kind guard below. A tombstone has a perfectly valid `kind`, but
   *    checking status first makes 410 independent of every serve-mode concern, including a future
   *    where the `kind` vocabulary grows again.
   * 4. Any other non-live status — `not-found`, folded in with invented and malformed tokens.
   * 5. `isArtifactUploadKind` is the runtime guard for A6: `database.types.ts` types `kind` as a bare
   *    `string` (it is generated, and regenerating it is currently unsafe — see log.md), so a row can
   *    legally hold `markdown` or `site`, which the CHECK allows and no serve mode covers. Casting
   *    would put an unhandled value into a `switch`; this turns it into a 404 and a log line.
   */
  async resolveTargetByToken(token: string): Promise<ArtifactServeLookup> {
    if (!SERVE_TOKEN_PATTERN.test(token)) return { outcome: 'not-found' }
    const artifact = await this.deps.repo.findByServeToken(token)
    return this.lookupFromRow(artifact)
  }

  /**
   * Địa chỉ công khai `<org_slug>/<slug>` → cùng ba kết cục với `/a/<token>`. Slug cũ (đã đổi) vẫn
   * phân giải vì repo tra bảng `slugs`.
   */
  async resolveTargetByPublicPath(orgSlug: string, slug: string): Promise<ArtifactServeLookup> {
    if (!PUBLIC_SEGMENT_RE.test(orgSlug) || !PUBLIC_SEGMENT_RE.test(slug))
      return { outcome: 'not-found' }
    const artifact = await this.deps.repo.findByOrgSlugAndSlug(orgSlug, slug)
    return this.lookupFromRow(artifact)
  }

  private lookupFromRow(
    artifact: Awaited<ReturnType<ArtifactRepository['findByServeToken']>>
  ): ArtifactServeLookup {
    if (!artifact) return { outcome: 'not-found' }

    if (artifact.status === 'removed') return { outcome: 'removed' }
    if (artifact.status !== 'live') return { outcome: 'not-found' }

    if (!isArtifactUploadKind(artifact.kind)) {
      log.error(
        { artifactId: artifact.id, kind: artifact.kind },
        'Artifact has a kind with no serve mode'
      )
      return { outcome: 'not-found' }
    }

    return {
      outcome: 'live',
      target: {
        id: artifact.id,
        serveToken: artifact.serve_token,
        publicPath: artifactPublicPath(embeddedOrgSlugOf(artifact), embeddedSlugOf(artifact)),
        kind: artifact.kind,
        storagePath: artifact.storage_path,
        contentType: artifact.content_type || ARTIFACT_CONTENT_TYPE,
        name: artifact.name,
        sizeBytes: Number(artifact.size_bytes ?? 0),
        access: {
          mode: accessModeOrPrivate(artifact.access_mode, artifact.id),
          passwordHash: artifact.password_hash ?? null,
          accessVersion: Number(artifact.access_version ?? 1),
          organizationId: artifact.organization_id,
          touchPointId: artifact.touch_point_id ?? null,
        },
      },
    }
  }

  /**
   * The narrow view of the above: a target, or `null` for everything else — INCLUDING a tombstone.
   *
   * Kept rather than deleted because `/a/<token>/file` and `/a/<token>/download` call it and MUST keep
   * answering 404 for a removed artifact: the object is gone from the bucket, so there is not a byte
   * to hand back. A 410 there would promise a body the route cannot produce.
   */
  async getLiveTargetByToken(token: string): Promise<ArtifactServeTarget | null> {
    const lookup = await this.resolveTargetByToken(token)
    return lookup.outcome === 'live' ? lookup.target : null
  }

  /** Raw bytes for `inline-binary`, `/file` without a Range, and `/download`. */
  async getBytes(target: ArtifactServeTarget): Promise<Buffer | null> {
    try {
      return await this.deps.storage.getBytes(target.storagePath)
    } catch (error) {
      log.error(
        { err: error, artifactId: target.id, storagePath: target.storagePath },
        'Failed to read artifact bytes'
      )
      return null
    }
  }

  /**
   * The bytes as a stream, with the client's `Range` header forwarded UNCHANGED.
   *
   * The header is not parsed here and the range is not recomputed: storage already answers it
   * correctly (measured on LiHi), and a second implementation of the same arithmetic is a second
   * chance to get it wrong. What comes back is storage's status and its own Content-Range.
   *
   * A 416 is NOT an error and is not logged as one — a seek past the end of a file is a normal thing
   * for a video player to ask.
   */
  async streamBytes(target: ArtifactServeTarget, rangeHeader: string | null) {
    try {
      return await this.deps.storage.getRangeStream(target.storagePath, rangeHeader)
    } catch (error) {
      log.error(
        { err: error, artifactId: target.id, storagePath: target.storagePath, rangeHeader },
        'Failed to stream artifact bytes'
      )
      return null
    }
  }

  /**
   * A short-lived URL for Office Online. Minted on every render and never persisted: a signed URL
   * written to a row is a permanent URL with extra steps.
   */
  async createOfficeViewerUrl(target: ArtifactServeTarget): Promise<string | null> {
    try {
      return await this.deps.storage.createSignedUrlFor(
        target.storagePath,
        ARTIFACT_OFFICE_SIGNED_URL_TTL_SECONDS
      )
    } catch (error) {
      log.error(
        { err: error, artifactId: target.id, storagePath: target.storagePath },
        'Failed to sign artifact URL for the Office viewer'
      )
      return null
    }
  }
}

export const artifactServeService = new ArtifactServeService({
  repo: artifactRepo,
  storage: artifactStorage,
})

type EmbeddedTp = { slug?: string | null; short_url?: string | null }
type WithEmbeds = {
  touch_points?: EmbeddedTp | EmbeddedTp[] | null
  organizations?: { org_slug: string | null } | { org_slug: string | null }[] | null
}
function embeddedSlugOf(row: WithEmbeds): string | null {
  const tp = Array.isArray(row.touch_points) ? row.touch_points[0] : row.touch_points
  return publicSlugOfTouchPoint(tp)
}
function embeddedOrgSlugOf(row: WithEmbeds): string | null {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
  return org?.org_slug ?? null
}
