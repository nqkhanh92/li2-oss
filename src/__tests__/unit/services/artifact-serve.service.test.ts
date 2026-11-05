import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/core/repositories/artifact.repository', () => ({
  artifactRepo: {},
  ArtifactRepository: class {},
}))
vi.mock('@/infrastructure/storage/artifact-storage', () => ({ get: vi.fn(), put: vi.fn() }))
const logWarn = vi.fn()
const logError = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: () => ({
      warn: (...args: any[]) => logWarn(...args),
      error: (...args: any[]) => logError(...args),
      info: vi.fn(),
    }),
  },
}))

import { ArtifactServeService } from '@/core/services/artifact-serve.service'
import { ARTIFACT_CONTENT_TYPE } from '@/core/types/artifact.type'

const liveRow = {
  id: 'art-1',
  status: 'live',
  storage_path: 'org-1/art-1.html',
  content_type: ARTIFACT_CONTENT_TYPE,
  kind: 'html',
  serve_token: 'abcdef0123456789',
  name: 'Landing page',
  size_bytes: 14,
  organization_id: 'org-1',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_hash: null,
  access_version: 1,
}

const makeDeps = () => ({
  repo: { findByServeToken: vi.fn() },
  storage: {
    get: vi.fn(async () => '<h1>stored</h1>'),
    getBytes: vi.fn(async () => Buffer.from('bytes')),
    getRangeStream: vi.fn(async () => ({
      status: 200,
      body: null,
      contentLength: '5',
      contentRange: null,
      acceptRanges: 'bytes',
    })),
    createSignedUrlFor: vi.fn(async () => 'https://s/signed?token=t'),
  },
})

let deps: ReturnType<typeof makeDeps>
let service: ArtifactServeService

beforeEach(() => {
  vi.clearAllMocks()
  deps = makeDeps()
  service = new ArtifactServeService(deps as any)
})

describe('ArtifactServeService.getLiveContentByToken', () => {
  it('returns the stored body for a live artifact', async () => {
    deps.repo.findByServeToken.mockResolvedValue(liveRow)
    const result = await service.getLiveContentByToken('abcdef0123456789')
    expect(deps.storage.get).toHaveBeenCalledWith('org-1/art-1.html')
    expect(result).toEqual({ body: '<h1>stored</h1>', contentType: ARTIFACT_CONTENT_TYPE })
  })

  it('rejects a malformed token without ever hitting the database', async () => {
    for (const token of ['nope', '../../etc/passwd', 'ABCDEF0123456789', 'abcdef01234567890']) {
      expect(await service.getLiveContentByToken(token)).toBeNull()
    }
    expect(deps.repo.findByServeToken).not.toHaveBeenCalled()
  })

  it('returns null for an unknown token and for a draft — same answer, nothing leaked', async () => {
    deps.repo.findByServeToken.mockResolvedValueOnce(null)
    expect(await service.getLiveContentByToken('abcdef0123456789')).toBeNull()

    deps.repo.findByServeToken.mockResolvedValueOnce({ ...liveRow, status: 'draft' })
    expect(await service.getLiveContentByToken('abcdef0123456789')).toBeNull()
    expect(deps.storage.get).not.toHaveBeenCalled()
  })

  it('returns null rather than throwing when the stored object has gone missing', async () => {
    deps.repo.findByServeToken.mockResolvedValue(liveRow)
    deps.storage.get.mockRejectedValueOnce(new Error('object not found'))
    expect(await service.getLiveContentByToken('abcdef0123456789')).toBeNull()
  })
})

/**
 * A6b, and the assertion that matters most in the whole A6 decision.
 *
 * `site` is in the CHECK constraint and has NO serve mode (`markdown` gained one 2026-10-24).
 * Widening the DTO means a
 * value outside `ARTIFACT_UPLOAD_KINDS` can legitimately reach a DTO — so the public route has to
 * refuse it here, at the guard, rather than index `ARTIFACT_KIND_SPECS[kind]`, read `.serveMode` off
 * `undefined` and turn an anonymous stranger's request into a 500. That is the exact shape of the
 * incident in `arch-rootcause-report.md` §2.1.
 *
 * And it must be a 404, never a fallback serve mode: falling back to `inline-binary` would serve a
 * row whose bytes are HTML as `text/html` WITHOUT `sandbox`, on the serving origin. A fallback here
 * is an XSS hole written in one line.
 */
describe('ArtifactServeService.getLiveTargetByToken', () => {
  it('trả target cho một kind phục vụ được', async () => {
    deps.repo.findByServeToken.mockResolvedValue(liveRow)

    const target = await service.getLiveTargetByToken('abcdef0123456789')

    expect(target).toMatchObject({ id: 'art-1', kind: 'html', storagePath: 'org-1/art-1.html' })
  })

  it.each(['site', 'hologram'])(
    "kind '%s' không có serve mode → null (route trả 404), và KHÔNG đọc byte nào",
    async (kind) => {
      deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, kind })

      expect(await service.getLiveTargetByToken('abcdef0123456789')).toBeNull()

      // The point: no storage call, no ARTIFACT_KIND_SPECS lookup, no 500.
      expect(deps.storage.get).not.toHaveBeenCalled()
      expect(deps.storage.getBytes).not.toHaveBeenCalled()
      expect(deps.storage.getRangeStream).not.toHaveBeenCalled()
      expect(deps.storage.createSignedUrlFor).not.toHaveBeenCalled()
    }
  )

  it('kind lạ được LOG — một hàng không phục vụ được mà im lặng là một hàng không ai đi sửa', async () => {
    deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, kind: 'site' })

    await service.getLiveTargetByToken('abcdef0123456789')

    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][0]).toMatchObject({ artifactId: 'art-1', kind: 'site' })
  })

  it('token sai cú pháp không bao giờ tới database', async () => {
    for (const token of ['nope', '../../etc/passwd', 'ABCDEF0123456789'])
      expect(await service.getLiveTargetByToken(token)).toBeNull()

    expect(deps.repo.findByServeToken).not.toHaveBeenCalled()
  })

  it('draft và token không tồn tại cho CÙNG một câu trả lời', async () => {
    deps.repo.findByServeToken.mockResolvedValueOnce(null)
    expect(await service.getLiveTargetByToken('abcdef0123456789')).toBeNull()

    deps.repo.findByServeToken.mockResolvedValueOnce({ ...liveRow, status: 'draft' })
    expect(await service.getLiveTargetByToken('abcdef0123456789')).toBeNull()
  })
})

/**
 * Ba câu trả lời của `/a/<token>`, và chỉ ba. `removed` là trường hợp DUY NHẤT được tách khỏi
 * `not-found`, vì nó là phát ngôn có thật: hàng còn đó, token này TỪNG phục vụ nội dung, người quét
 * không gõ sai gì.
 */
describe('ArtifactServeService.resolveTargetByToken', () => {
  const TOKEN = 'abcdef0123456789'

  /**
   * Publish qua MCP không truyền slug → `touch_points.slug` NULL, li2-be cấp slug vào `short_url`
   * (LiHi 20/10: `6LAA1`). `publicPath` phải vẫn ra `/<org>/<slug>` để `/a/<token>` 302 được.
   */
  it('publicPath lấy slug từ short_url khi cột slug NULL', async () => {
    deps.repo.findByServeToken.mockResolvedValue({
      ...liveRow,
      touch_points: { slug: null, short_url: 'https://lihi.test/6LAA1' },
      organizations: { org_slug: 'khanhqns-organization' },
    })
    const result = await service.resolveTargetByToken(TOKEN)
    expect(result.outcome).toBe('live')
    if (result.outcome === 'live') {
      expect(result.target.publicPath).toBe('/khanhqns-organization/6LAA1')
    }
  })

  it('hàng live + kind phục vụ được → outcome live kèm target đúng từng field', async () => {
    deps.repo.findByServeToken.mockResolvedValue(liveRow)

    expect(await service.resolveTargetByToken(TOKEN)).toEqual({
      outcome: 'live',
      target: {
        id: 'art-1',
        serveToken: 'abcdef0123456789',
        publicPath: null,
        kind: 'html',
        storagePath: 'org-1/art-1.html',
        contentType: ARTIFACT_CONTENT_TYPE,
        name: 'Landing page',
        sizeBytes: 14,
        access: {
          mode: 'public',
          passwordHash: null,
          accessVersion: 1,
          organizationId: 'org-1',
          touchPointId: 'tp-1',
        },
      },
    })
  })

  /**
   * R3 — target mang đủ cho cổng: hash (chỉ ở đây, không ra trang), version, org. Thứ tự 5 bước
   * KHÔNG đổi: `access` chỉ được đọc sau khi hàng đã qua status + kind.
   */
  it('hàng password mang hash + version + org trong `access`', async () => {
    deps.repo.findByServeToken.mockResolvedValue({
      ...liveRow,
      access_mode: 'password',
      password_hash: 'scrypt$14$8$5$c$k',
      access_version: 3,
    })

    const lookup = await service.resolveTargetByToken(TOKEN)
    expect(lookup.outcome).toBe('live')
    if (lookup.outcome !== 'live') return
    expect(lookup.target.access).toEqual({
      mode: 'password',
      passwordHash: 'scrypt$14$8$5$c$k',
      accessVersion: 3,
      organizationId: 'org-1',
      touchPointId: 'tp-1',
    })
  })

  /**
   * ⭐ Giá trị `access_mode` lạ → `private`, KHÔNG `public`. Đây là quyết định QUYỀN trên đường public:
   * hàng ta không hiểu phải đóng. Cùng một dòng ERROR như kind lạ, để hàng đó tìm được.
   */
  it.each(['invite-only', '', null, undefined])(
    '⭐ access_mode %s → coi là private và log ERROR, không mở',
    async (accessMode) => {
      deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, access_mode: accessMode })

      const lookup = await service.resolveTargetByToken(TOKEN)
      expect(lookup.outcome).toBe('live')
      if (lookup.outcome !== 'live') return
      expect(lookup.target.access.mode).toBe('private')
      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({ artifactId: 'art-1' }),
        expect.stringContaining('private')
      )
    }
  )

  it('removed thắng cổng: hàng removed ở chế độ password vẫn là outcome removed, không đọc access', async () => {
    deps.repo.findByServeToken.mockResolvedValue({
      ...liveRow,
      status: 'removed',
      access_mode: 'password',
      password_hash: 'x',
    })

    expect(await service.resolveTargetByToken(TOKEN)).toEqual({ outcome: 'removed' })
  })

  it('hàng removed → outcome removed', async () => {
    deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, status: 'removed' })

    expect(await service.resolveTargetByToken(TOKEN)).toEqual({ outcome: 'removed' })
  })

  it('token bịa → not-found', async () => {
    deps.repo.findByServeToken.mockResolvedValue(null)

    expect(await service.resolveTargetByToken(TOKEN)).toEqual({ outcome: 'not-found' })
  })

  it('token sai cú pháp → not-found, và KHÔNG tra database lần nào', async () => {
    for (const token of ['nope', '../../etc/passwd', 'ABCDEF0123456789', 'abcdef01234567890'])
      expect(await service.resolveTargetByToken(token)).toEqual({ outcome: 'not-found' })

    expect(deps.repo.findByServeToken).not.toHaveBeenCalled()
  })

  /**
   * ⭐ Phép chốt rằng CHỈ `removed` được tách ra. Tách thêm một trạng thái nào nữa là nói cho người lạ
   * biết org này có một bản nháp ở đường dẫn đó — điều họ không có việc gì phải biết.
   */
  it.each(['draft', 'scanning', 'blocked', 'expired', 'quarantined'])(
    "⭐ status '%s' → not-found, KHÔNG phải removed",
    async (status) => {
      deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, status })

      expect(await service.resolveTargetByToken(TOKEN)).toEqual({ outcome: 'not-found' })
    }
  )

  /**
   * ⭐ Chốt thứ tự kiểm: status TRƯỚC kind. Bia mộ có `kind` hợp lệ, nhưng thứ tự này làm 410 độc lập
   * với mọi logic serve-mode, kể cả khi vocabulary `kind` nở ra sau này.
   */
  it('⭐ hàng removed có kind lạ → vẫn removed, không rơi về not-found', async () => {
    deps.repo.findByServeToken.mockResolvedValue({
      ...liveRow,
      status: 'removed',
      kind: 'site',
    })

    expect(await service.resolveTargetByToken(TOKEN)).toEqual({ outcome: 'removed' })
  })
})

/**
 * Sau khi gỡ, hàng CÒN LẠI (bia mộ) — tiền đề cũ ("xoá cứng, hàng mất, 404 tự khắc") đã bị đợt này
 * lật. Nên thu hồi quyền phục vụ không còn do việc mất hàng, mà do `status`: `getLiveTargetByToken`
 * và `getLiveContentByToken` phải trả `null` cho bia mộ, nếu không `/a/<token>` còn phục vụ nội dung
 * chủ sở hữu tin là đã gỡ.
 *
 * Và `null` ở `getLiveTargetByToken` là thứ giữ cho hai route byte (`/file`, `/download`) trả 404:
 * object đã ra khỏi kho, không có byte nào để trả.
 */
describe('sau khi artifact bị gỡ', () => {
  const TOKEN = 'abcdef0123456789'

  it('bia mộ: hàng còn đó nhưng không còn gì để phục vụ', async () => {
    deps.repo.findByServeToken.mockResolvedValue({ ...liveRow, status: 'removed' })

    expect(await service.getLiveTargetByToken(TOKEN)).toBeNull()
    expect(await service.getLiveContentByToken(TOKEN)).toBeNull()
    expect(deps.storage.get).not.toHaveBeenCalled()
    expect(deps.storage.getBytes).not.toHaveBeenCalled()
  })

  it('token chưa bao giờ tồn tại: cùng một câu trả lời null', async () => {
    deps.repo.findByServeToken.mockResolvedValue(null)

    expect(await service.getLiveTargetByToken(TOKEN)).toBeNull()
    expect(await service.getLiveContentByToken(TOKEN)).toBeNull()
  })
})
