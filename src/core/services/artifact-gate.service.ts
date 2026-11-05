import 'server-only'

import { NextRequest } from 'next/server'
import type Redis from 'ioredis'
import { ArtifactServeTarget } from '@/core/services/artifact-serve.service'
import { artifactViewRepo, ArtifactViewRepository } from '@/core/repositories/artifact-view.repository'
import {
  ARTIFACT_VIEWER_COOKIE,
  verifyViewerSession,
  viewerSecret,
} from '@/core/helpers/artifact-viewer-session'
import { ARTIFACT_GATE_LOCK_SECONDS, ARTIFACT_GATE_MAX_TRIES } from '@/core/types/artifact.type'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'
import { hasArtifactGoogleClient } from '@/core/helpers/artifact-google'
import { getSession, Session } from '@/shared/lib/auth/session'
import { getUserOrgPermissions } from '@/shared/lib/permission/permissions'

const log = logger.child({ module: 'artifact-gate-service' })

/**
 * Cổng của `/a/<token>` (spec R3, R6, R7). TÁCH khỏi `artifact-serve.service.ts` và nhận `request`:
 * resolve token là việc của hàng, quyết định "người này được xem không" là việc của request (cookie,
 * session) — hai hàm, hai đầu vào. Cùng ràng buộc import với serve service: KHÔNG `artifact.service`,
 * KHÔNG `touch-point.service` (→ `canvas`), ghim bằng `artifact-serve-import-graph.test.ts`.
 *
 * `permissions.ts` kéo supabase server client + redis; `auth/session.ts` kéo jose + cert Casdoor.
 * Đó là những gì chế độ `private` cần và không hơn.
 */
export type GateVerdict =
  | { kind: 'allow' }
  | { kind: 'password-required'; hint: 'none' | 'changed' }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'private-login' }
  | { kind: 'private-denied'; email: string | null }
  | { kind: 'google-required'; hint: 'none' | 'cancelled' | 'failed' }
  /**
   * Không trong union của spec, thêm vì spec R5 đòi: secret thiếu → 503 cho mọi chế độ không-public,
   * không fallback. Cũng dùng khi một hàng ở chế độ `google` mà env Google chưa đặt (§9: gated).
   */
  | { kind: 'unavailable' }

/**
 * Redis không trả lời (lỗi hoặc quá hạn 250 ms). Route POST mật khẩu đổi nó thành 503 — fail CLOSED,
 * vì bộ đếm này là thứ DUY NHẤT chặn brute force (`rate-limit.ts:41-43`: không fail open ở lớp quyết
 * định quyền). GET thì không có gì để kiểm, nên vẫn hiện form.
 */
export class ArtifactGateUnavailableError extends Error {
  constructor(cause: unknown) {
    super('artifact gate counter unavailable', { cause })
    this.name = 'ArtifactGateUnavailableError'
  }
}

/** Như `rate-limit.ts`: ioredis không có abort; cái thua chỉ bị bỏ chờ, lệnh vẫn về (hoặc không). */
const REDIS_DEADLINE_MS = 250

type Deps = {
  redis: Pick<Redis, 'get' | 'ttl' | 'del' | 'multi' | 'expire'>
  getSession: (request: NextRequest) => Promise<Session | null>
  getUserOrgPermissions: (orgId: string) => Promise<unknown | undefined>
  verifyViewerSession: typeof verifyViewerSession
  hasViewerSecret: () => boolean
  hasGoogleClient: () => boolean
  viewRepo: Pick<ArtifactViewRepository, 'recordGoogleViewer'>
}

export type GateLock = { locked: boolean; count: number; retryAfterSeconds: number }

export class ArtifactGateService {
  constructor(private deps: Deps) {}

  /**
   * Thứ tự: public → allow; cookie phiên hợp lệ → allow; rồi theo chế độ. Cookie đi trước chế độ vì
   * cả ba chế độ có cổng đều phát cùng một cookie sau khi qua — và chính claim `m` trong cookie là
   * thứ nói "phiên này thuộc chế độ nào", không phải route.
   */
  async evaluateGate(request: NextRequest, target: ArtifactServeTarget): Promise<GateVerdict> {
    const { mode, accessVersion, organizationId } = target.access
    if (mode === 'public') return { kind: 'allow' }

    if ((mode === 'password' || mode === 'google') && !this.deps.hasViewerSecret()) {
      log.error({ artifactId: target.id, mode }, 'ARTIFACT_VIEWER_SECRET missing — refusing to serve')
      return { kind: 'unavailable' }
    }

    const session = await this.deps.verifyViewerSession(
      request.cookies.get(ARTIFACT_VIEWER_COOKIE)?.value,
      { token: target.serveToken, mode, accessVersion }
    )
    if (session.ok) return { kind: 'allow' }

    switch (mode) {
      case 'password': {
        const lock = await this.readLockForGet(target.serveToken)
        if (lock.locked) return { kind: 'locked', retryAfterSeconds: lock.retryAfterSeconds }
        // `version` lệch với mode KHỚP → mật khẩu (hay chế độ) vừa đổi. Lệch `m` → im lặng (R5).
        return { kind: 'password-required', hint: session.reason === 'version' ? 'changed' : 'none' }
      }

      case 'private': {
        const casdoor = await this.deps.getSession(request)
        if (!casdoor) return { kind: 'private-login' }
        const permissions = await this.deps.getUserOrgPermissions(organizationId)
        if (permissions) return { kind: 'allow' }
        return { kind: 'private-denied', email: casdoor.email ?? null }
      }

      case 'google': {
        if (!this.deps.hasGoogleClient()) {
          log.error({ artifactId: target.id }, 'Artifact is google-gated but ARTIFACT_GOOGLE_CLIENT_* is unset')
          return { kind: 'unavailable' }
        }
        const g = request.nextUrl.searchParams.get('g')
        return { kind: 'google-required', hint: g === 'cancelled' || g === 'failed' ? g : 'none' }
      }
    }
  }

  /**
   * Trạng thái khoá của một token. NÉM `ArtifactGateUnavailableError` khi Redis không trả lời — người
   * gọi quyết định fail closed (POST) hay hiện form (GET, qua `readLockForGet`).
   */
  async readLock(token: string): Promise<GateLock> {
    const key = REDIS_KEYS.ARTIFACT.GATE_FAIL(token)
    const results = await this.redisCall(() => this.deps.redis.multi().get(key).ttl(key).exec())
    const count = Number(results?.[0]?.[1] ?? 0)
    const ttl = Number(results?.[1]?.[1] ?? -1)
    return toLock(count, ttl)
  }

  /**
   * Một lần sai: INCR, và nếu là lần đầu (hoặc khoá không có TTL vì EXPIRE trước đó rơi) thì EXPIRE
   * 600 s. Cửa sổ CỐ ĐỊNH tính từ lần sai đầu — lần sai thứ ba không kéo dài cửa sổ.
   */
  async recordFailure(token: string): Promise<GateLock> {
    const key = REDIS_KEYS.ARTIFACT.GATE_FAIL(token)
    const results = await this.redisCall(() => this.deps.redis.multi().incr(key).ttl(key).exec())
    const count = Number(results?.[0]?.[1] ?? 0)
    let ttl = Number(results?.[1]?.[1] ?? -1)
    if (count === 1 || ttl < 0) {
      await this.redisCall(() => this.deps.redis.expire(key, ARTIFACT_GATE_LOCK_SECONDS))
      ttl = ARTIFACT_GATE_LOCK_SECONDS
    }
    return toLock(count, ttl)
  }

  /** Mật khẩu đúng → xoá bộ đếm. Best effort: thất bại chỉ có nghĩa cửa sổ cũ sống nốt 10 phút. */
  async clearFailures(token: string): Promise<void> {
    try {
      await this.redisCall(() => this.deps.redis.del(REDIS_KEYS.ARTIFACT.GATE_FAIL(token)))
    } catch (error) {
      log.error({ err: error, token }, 'Could not clear the artifact gate counter after a correct password')
    }
  }

  /**
   * [P2] Ghi email người xem Google vào `customer_profiles` + `artifact_views` (spec R9 bước 1–3).
   * Thất bại → log ERROR và TRẢ VỀ: người quét không chịu lỗi của DB; route vẫn đặt cookie và phục vụ.
   * Email không vào log — chỉ artifactId.
   */
  async recordGoogleViewer(target: ArtifactServeTarget, email: string): Promise<void> {
    try {
      await this.deps.viewRepo.recordGoogleViewer({
        artifactId: target.id,
        organizationId: target.access.organizationId,
        touchPointId: target.access.touchPointId,
        email,
      })
    } catch (error) {
      log.error({ err: error, artifactId: target.id }, 'Could not record the Google viewer — serving anyway')
    }
  }

  private async readLockForGet(token: string): Promise<GateLock> {
    try {
      return await this.readLock(token)
    } catch (error) {
      log.error({ err: error, token }, 'Artifact gate counter unreadable on GET — showing the form')
      return { locked: false, count: 0, retryAfterSeconds: 0 }
    }
  }

  private async redisCall<T>(run: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ArtifactGateUnavailableError(new Error('redis deadline exceeded'))),
        REDIS_DEADLINE_MS
      )
    })
    try {
      return await Promise.race([run(), deadline])
    } catch (error) {
      if (error instanceof ArtifactGateUnavailableError) throw error
      throw new ArtifactGateUnavailableError(error)
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}

function toLock(count: number, ttl: number): GateLock {
  const locked = Number.isFinite(count) && count >= ARTIFACT_GATE_MAX_TRIES
  // TTL -1/-2 (không TTL / không khoá) → coi là trọn cửa sổ: tối đa không hơn 600 s, không bao giờ 0.
  const retryAfterSeconds = locked ? (ttl > 0 ? ttl : ARTIFACT_GATE_LOCK_SECONDS) : 0
  return { locked, count: Number.isFinite(count) ? count : 0, retryAfterSeconds }
}

export const artifactGateService = new ArtifactGateService({
  redis,
  getSession,
  getUserOrgPermissions,
  verifyViewerSession,
  hasViewerSecret: () => viewerSecret() !== null,
  hasGoogleClient: hasArtifactGoogleClient,
  viewRepo: artifactViewRepo,
})

export { hasArtifactGoogleClient }
