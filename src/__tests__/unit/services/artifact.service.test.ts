import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://app.li2.ai'

// The module builds a singleton at import time, which would pull the whole touch-point / repository
// / supabase chain in. The class under test takes its dependencies by constructor, so those modules
// are stubbed and only the pure logic runs. The Zod schema is deliberately NOT mocked — publish is
// supposed to go through the real validation.
vi.mock('@/core/repositories/artifact.repository', () => ({
  artifactRepo: {},
  ArtifactRepository: class {},
}))
vi.mock('@/core/services/touch-point.service', () => ({
  touchPointService: { createTouchPoint: vi.fn(), deleteTpById: vi.fn(), updateAndReturn: vi.fn() },
}))
vi.mock('@/infrastructure/storage/artifact-storage', () => ({ put: vi.fn(), get: vi.fn() }))
vi.mock('@/shared/lib/permission/permissions', () => ({
  ensurePolicy: vi.fn(),
  getPermissionScopeOrThrow: vi.fn(),
}))
vi.mock('@/shared/lib/permission/policy', () => ({
  nonScopePolicies: { add_touch_point: 'add_touch_point' },
}))
// Spied, not silenced: "a strange value in the DB gets logged" is an assertion below, and a logger
// that swallows the call would make that assertion unfalsifiable.
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

import { ArtifactService } from '@/core/services/artifact.service'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ARTIFACT_ACCESS_MODES,
  ARTIFACT_CONTENT_TYPE,
  ARTIFACT_FORMATS,
  ARTIFACT_KINDS,
  ARTIFACT_MAX_BYTES,
  ARTIFACT_QUOTA_FREE_BYTES,
  ARTIFACT_QUOTA_FREE_LIVE,
  ARTIFACT_SNIFF_BYTES,
  ARTIFACT_STATUSES,
  ARTIFACT_STORAGE_MIME,
  ARTIFACT_STORAGE_MIMES,
  ARTIFACT_UPLOAD_KINDS,
} from '@/core/types/artifact.type'
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
} from '@/infrastructure/response/errors/domain.errors'
import { MAX_TOUCHPOINTS_NAME_LENGTH } from '@/shared/schemas/touch-points'

const ORG = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

const fakeFile = (
  overrides: Partial<{ name: string; size: number; body: string; bytes: Buffer }> = {}
) => {
  const { name = 'page.html', size = 32, body = '<h1>hi</h1>', bytes } = overrides
  const buf = bytes ?? Buffer.from(body, 'utf8')
  return {
    name,
    size,
    arrayBuffer: async () =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  }
}

/** A head that satisfies a format's signature, padded past ARTIFACT_SNIFF_BYTES. */
const bytesFor = (extension: string) => {
  const format = ARTIFACT_FORMATS.find((f) => f.extension === extension)!
  const head = Buffer.alloc(64, 0x00)
  // Biến thể ĐẦU TIÊN là đủ để qua cổng — `matchesMagic` là OR giữa các biến thể.
  for (const { offset, hex } of format.magic[0] ?? []) Buffer.from(hex, 'hex').copy(head, offset)
  return head
}

const draftRow = {
  id: ARTIFACT_ID,
  organization_id: ORG,
  user_id: USER,
  name: 'My page',
  kind: 'html',
  status: 'draft',
  serve_token: 'abcdef0123456789',
  storage_path: `${ORG}/${ARTIFACT_ID}.html`,
  content_type: ARTIFACT_CONTENT_TYPE,
  size_bytes: 11,
  // Widened from the literal `null` the object would otherwise infer: the atomic publish mock sets
  // a real id here, and `null` as a literal type would reject it.
  touch_point_id: null as string | null,
  created_at: '2026-09-28T00:00:00.000Z',
  updated_at: '2026-09-28T00:00:00.000Z',
  access_mode: 'public',
  password_hash: null as string | null,
  access_version: 1,
  password_set_at: null as string | null,
  touch_points: null,
}

const makeDeps = () => ({
  repo: {
    // The atomic writes. Both return a row by default, so every test that predates the race fix
    // keeps exercising the path it always did. `| null` is in the type because refusing is the
    // whole point of these two — a mock that could not say "no" could not test the refusal.
    createIfWithinQuota: vi.fn(async (row: any): Promise<typeof draftRow | null> => ({
      ...draftRow,
      ...row,
    })),
    publishIfWithinQuota: vi.fn(
      async (_orgId: string, id: string, tpId: string): Promise<typeof draftRow | null> => ({
        ...draftRow,
        id,
        status: 'live',
        touch_point_id: tpId,
      })
    ),
    // Returns the row AS IT WAS before the update — that is the contract (spec R3), so the default
    // mock echoes `draftRow`, i.e. the storage_path the service is expected to delete afterwards.
    replaceIfWithinQuota: vi.fn(
      async (
        _orgId: string,
        _id: string,
        _next: { kind: string; storage_path: string; content_type: string; size_bytes: number },
        _quota: number
      ): Promise<Record<string, unknown> | null> => ({ ...draftRow })
    ),
    findByIdForOrg: vi.fn(),
    // Wave 4 WP1 `get_artifact { slug }`. Keyed by `org_slug`, not `organization_id` — it is the same
    // resolver the public serve route uses, which is why the service reads the org's slug first.
    findByOrgSlugAndSlug: vi.fn(),
    listByOrg: vi.fn(),
    countLiveByOrg: vi.fn(async (_orgId: string) => 0),
    sumSizeBytesByOrg: vi.fn(async (_orgId: string) => 0),
    markRemovedForOrg: vi.fn(async (_orgId: string, _id: string) => 1),
    deleteDraftById: vi.fn(async (_orgId: string, _id: string) => 1),
    // Wave 4 B1: một lần RPC cho cả trang. Mặc định Map rỗng → mọi DTO `visits = 0`, nên mọi test
    // viết trước wave 4 vẫn đi đúng đường nó luôn đi.
    countVisitsByTouchPoints: vi.fn(async (_tpIds: string[]) => new Map<string, number>()),
    touchUpdatedAtForOrg: vi.fn(async (_orgId: string, _id: string) => 1),
    // R2a: echoes the next access columns onto draftRow with the version bumped — the contract.
    updateAccessForOrg: vi.fn(
      async (
        _orgId: string,
        id: string,
        expectedVersion: number,
        next: { access_mode: string; password_hash: string | null; password_set_at: string | null }
      ): Promise<Record<string, unknown> | null> => ({
        ...draftRow,
        id,
        ...next,
        access_version: expectedVersion + 1,
      })
    ),
  },
  // Deterministic and instant: the real scrypt has its own test; here only "was it called with the
  // password, and did its output land in the row" matters.
  hashPassword: vi.fn(async (plain: string) => `scrypt$14$8$5$salt$hash-of-${plain}`),
  hasGoogleClient: vi.fn(() => false),
  viewRepo: { countViewersByArtifact: vi.fn(async (_id: string) => 4) },
  storage: { put: vi.fn(async () => ({ path: 'p' })), remove: vi.fn(async () => undefined) },
  createTouchPoint: vi.fn(async () => ({
    id: 'tp-1',
    short_url: 'https://s.li2.ai/abc',
    path_qr_code: 'org/qr.png',
  })),
  deleteTouchPoint: vi.fn(async () => 1),
  /**
   * Wave 4 B2: `touchPointService.updateAndReturn` — đổi slug và sinh lại QR trong một lần gọi.
   * Mặc định echo slug mới vào `short_url` giống hàm thật (`updateTpSlug` dựng lại URL từ hostname).
   */
  updateTouchPoint: vi.fn(
    async (_orgId: string, tpId: string, data: any, _userId: string): Promise<any> => ({
      id: tpId,
      slug: data.slug,
      short_url: `https://s.li2.ai/${data.slug}`,
      path_qr_code: 'org/qr-new.png',
    })
  ),
  ensurePolicy: vi.fn(async () => undefined),
  ensureDeletePolicy: vi.fn(async () => 'ALL'),
  /**
   * Wave 4 WP1: the real one reads `organizations.org_slug`. DEFAULTS TO NULL so every test written
   * before this dep existed keeps the `/a/<token>` serve_url it has always asserted — `toDTO` only
   * builds the public address when a slug is there. Tests that need one set it themselves.
   */
  findOrgSlug: vi.fn(async (_orgId: string): Promise<string | null> => null),
})

let deps: ReturnType<typeof makeDeps>
let service: ArtifactService

beforeEach(() => {
  deps = makeDeps()
  service = new ArtifactService(deps as any)
})

afterAll(() => {
  delete process.env.NEXT_PUBLIC_APP_BASE_URL
})

describe('ArtifactService.create', () => {
  it('uploads to org/<id>.html before inserting, and stores a draft', async () => {
    const dto = await service.create(ORG, USER, { file: fakeFile() })

    expect(deps.ensurePolicy).toHaveBeenCalledWith(ORG, 'add_touch_point')
    expect(deps.storage.put).toHaveBeenCalledOnce()

    const [path, buffer, contentType] = deps.storage.put.mock.calls[0] as any[]
    const insert = deps.repo.createIfWithinQuota.mock.calls[0][0] as any

    expect(path).toBe(`${ORG}/${insert.id}.html`)
    // Bare media type, no charset parameter: Supabase Storage matches `allowed_mime_types`
    // against the whole string, so `text/html; charset=utf-8` is rejected by a bucket that
    // allows `text/html`. This assertion used to pin the wrong value and the upload 500'd
    // on every real environment while this suite stayed green.
    expect(contentType).toBe('text/html')
    expect(contentType).not.toContain(';')
    // What we SERVE keeps the charset — the two are different concerns.
    expect(insert.content_type).toBe('text/html; charset=utf-8')
    // `status` is deliberately NOT in the row any more: the database function sets 'draft' itself.
    // A caller that could pass it could insert straight to `live` and skip the publish quota.
    expect('status' in insert).toBe(false)
    expect(insert.kind).toBe('html')
    expect(insert.organization_id).toBe(ORG)
    expect(insert.user_id).toBe(USER)
    // the real uploaded byte count, not the client-reported file.size
    expect(insert.size_bytes).toBe(buffer.byteLength)
    expect(insert.size_bytes).not.toBe(32)
    expect(dto.status).toBe('draft')
  })

  it('defaults the name to the filename without its extension, and trims a given name', async () => {
    await service.create(ORG, USER, { file: fakeFile({ name: 'Landing Page.html' }) })
    expect((deps.repo.createIfWithinQuota.mock.calls[0][0] as any).name).toBe('Landing Page')

    await service.create(ORG, USER, { file: fakeFile(), name: '  Custom  ' })
    expect((deps.repo.createIfWithinQuota.mock.calls[1][0] as any).name).toBe('Custom')
  })

  it('gives every artifact a distinct serve token', async () => {
    await service.create(ORG, USER, { file: fakeFile() })
    await service.create(ORG, USER, { file: fakeFile() })
    const [first, second] = deps.repo.createIfWithinQuota.mock.calls.map(
      (c: any) => c[0].serve_token
    )
    expect(first).not.toBe(second)
  })

  it('accepts .htm as well as .html, case-insensitively', async () => {
    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'a.HTM' }) })
    ).resolves.toBeTruthy()
  })

  it('rejects an extension no format claims, before touching storage', async () => {
    // `.pdf` is deliberately NOT in this list any more — it is a supported format now. A file
    // named `.pdf` is rejected for a different reason (its bytes), covered further down.
    for (const name of ['evil.svg', 'archive.html.exe', 'noext', 'deck.key', 'clip.avi']) {
      await expect(service.create(ORG, USER, { file: fakeFile({ name }) })).rejects.toBeInstanceOf(
        BadRequestError
      )
    }
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('rejects an empty file and a file over 5MB', async () => {
    await expect(service.create(ORG, USER, { file: fakeFile({ size: 0 }) })).rejects.toBeInstanceOf(
      BadRequestError
    )
    await expect(
      service.create(ORG, USER, { file: fakeFile({ size: ARTIFACT_MAX_BYTES + 1 }) })
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  })

  it('does not insert a row when the upload fails', async () => {
    deps.storage.put.mockRejectedValueOnce(new Error('storage down'))
    await expect(service.create(ORG, USER, { file: fakeFile() })).rejects.toThrow('storage down')
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  })

  it('checks permission before doing anything else', async () => {
    deps.ensurePolicy.mockRejectedValueOnce(new Error('forbidden'))
    await expect(service.create(ORG, USER, { file: fakeFile() })).rejects.toThrow('forbidden')
    expect(deps.storage.put).not.toHaveBeenCalled()
  })
})

/**
 * Hai lỗi biên khiến artifact kẹt `draft` mà không có đường thoát: tên dài hơn giới hạn của
 * touch point, và slug tự sinh không qua được `slugSchema`. Cả hai trước đây chỉ nổ ở bước
 * publish — tức upload đã thành công, và vì không có endpoint đổi tên, artifact kẹt vĩnh viễn.
 */
describe('biên của create/publish — không để artifact kẹt draft', () => {
  it('tên dài hơn giới hạn touch point bị chặn ngay lúc upload, không đợi tới publish', async () => {
    await expect(
      service.create(ORG, USER, {
        file: fakeFile(),
        name: 'B'.repeat(MAX_TOUCHPOINTS_NAME_LENGTH + 1),
      })
    ).rejects.toMatchObject({ status: 400 })
    // Quan trọng: chặn TRƯỚC khi ghi storage, nếu không là rác mồ côi trong bucket.
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('tên dài đúng bằng giới hạn thì đi qua', async () => {
    await expect(
      service.create(ORG, USER, { file: fakeFile(), name: 'B'.repeat(MAX_TOUCHPOINTS_NAME_LENGTH) })
    ).resolves.toBeTruthy()
  })

  it('slug sai định dạng trả 400 có nghĩa, không phải 500', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    // 'menu' là slug mà slugifyFileName('menu.html') sinh ra — 4 ký tự, dưới slugMinLength.
    await expect(service.publish(ORG, USER, 'artifact-1', { slug: 'menu' })).rejects.toMatchObject({
      status: 400,
    })
  })
})

/**
 * §4.1 — validation is TWO layers, and they answer different questions. The extension answers
 * "what format is this"; the signature answers "are the bytes really that". Either one alone lets
 * something through: extension alone accepts a .exe renamed to .mp4, signature alone cannot tell
 * .mp4 from .mov (same `ftyp`) or a real .pptx from a renamed .docx (same zip header).
 */
describe('ArtifactService.create — multi-format', () => {
  it.each(
    ARTIFACT_FORMATS.map((f) => [f.extension, f.kind, f.storageMime, f.contentType] as const)
  )('%s → kind %s, storage MIME %s', async (extension, kind, storageMime, contentType) => {
    await service.create(ORG, USER, {
      file: fakeFile({ name: `deck${extension}`, bytes: bytesFor(extension) }),
    })

    const [path, , putMime] = deps.storage.put.mock.calls[0] as any[]
    const insert = deps.repo.createIfWithinQuota.mock.calls[0][0] as any

    expect(insert.kind).toBe(kind)
    expect(putMime).toBe(storageMime)
    expect(insert.content_type).toBe(contentType)
    // The extension comes from the format, not the kind.
    expect(path).toBe(`${ORG}/${insert.id}${extension}`)
  })

  it('.ppt và .pptx cùng kind nhưng KHÁC đuôi và khác MIME', async () => {
    await service.create(ORG, USER, {
      file: fakeFile({ name: 'a.pptx', bytes: bytesFor('.pptx') }),
    })
    await service.create(ORG, USER, { file: fakeFile({ name: 'a.ppt', bytes: bytesFor('.ppt') }) })

    const [pptx, ppt] = deps.repo.createIfWithinQuota.mock.calls.map((c: any) => c[0])
    expect(pptx.kind).toBe('slides')
    expect(ppt.kind).toBe('slides')
    expect(pptx.storage_path).not.toBe(ppt.storage_path)
    expect(pptx.content_type).not.toBe(ppt.content_type)
  })

  it('không chấp nhận đuôi hoa/thường lẫn lộn thì mới lạ — .PDF vẫn là pdf', async () => {
    await service.create(ORG, USER, { file: fakeFile({ name: 'B.PDF', bytes: bytesFor('.pdf') }) })
    expect((deps.repo.createIfWithinQuota.mock.calls[0][0] as any).kind).toBe('pdf')
  })

  it('từ chối file đổi đuôi: byte không khớp chữ ký, storage không bị chạm', async () => {
    // An HTML document renamed to .pdf: layer 1 passes, layer 2 must not.
    await expect(
      service.create(ORG, USER, {
        file: fakeFile({ name: 'fake.pdf', body: '<h1>not a pdf</h1>' }),
      })
    ).rejects.toBeInstanceOf(BadRequestError)

    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'fake.mp4', body: 'MZ not a video' }) })
    ).rejects.toBeInstanceOf(BadRequestError)

    expect(deps.storage.put).not.toHaveBeenCalled()
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  })

  /**
   * Chữ ký NHIỀU mảnh phải khớp HẾT, không phải khớp một là đủ. Webp là format duy nhất khai hai
   * mảnh (`RIFF` byte 0, `WEBP` byte 8); `matchesMagic` từng dùng `.some()` nên mọi file RIFF —
   * wav, avi — đổi đuôi `.webp` đều lọt qua lớp 2 và được lưu với MIME `image/webp`. Agent
   * `eng-artifact` tìm ra, đo lại rồi mới sửa.
   */
  it('WAV đổi đuôi .webp bị chặn — chữ ký hai mảnh phải khớp CẢ HAI', async () => {
    // Header WAV thật: 'RIFF' ở byte 0, nhưng 'WAVE' ở byte 8 chứ không phải 'WEBP'.
    const wav = Buffer.alloc(32, 0)
    wav.write('RIFF', 0, 'ascii')
    wav.write('WAVE', 8, 'ascii')

    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'anh.webp', bytes: wav }) })
    ).rejects.toBeInstanceOf(BadRequestError)

    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('webp thật vẫn qua — hàng rào không được ăn file lành', async () => {
    const webp = Buffer.alloc(32, 0)
    webp.write('RIFF', 0, 'ascii')
    webp.write('WEBP', 8, 'ascii')

    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'anh.webp', bytes: webp }) })
    ).resolves.toBeTruthy()
  })

  /**
   * GIF có HAI chuẩn còn sống: `GIF89a` (1989) và `GIF87a` (1987). Chỉ khai bản 89a thì ảnh GIF
   * đời cũ hoàn toàn hợp lệ bị từ chối. Agent `arch-artifact` tìm ra; cùng lúc với bản sửa webp
   * nên hai nhu cầu lộ ra là ngược nhau — webp cần AND, gif cần OR — và đó là lý do `magic`
   * đổi sang mô hình biến thể.
   */
  it.each([
    ['GIF89a', '474946383961'],
    ['GIF87a', '474946383761'],
  ])('ảnh %s đều qua được cổng .gif', async (_label, hex) => {
    const gif = Buffer.alloc(32, 0)
    Buffer.from(hex, 'hex').copy(gif, 0)

    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'anh.gif', bytes: gif }) })
    ).resolves.toBeTruthy()
  })

  it('file không phải GIF vẫn bị cổng .gif chặn', async () => {
    const notGif = Buffer.alloc(32, 0)
    Buffer.from('GIF99z', 'ascii').copy(notGif, 0)

    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'anh.gif', bytes: notGif }) })
    ).rejects.toBeInstanceOf(BadRequestError)
  })

  it('file ngắn hơn chữ ký bị từ chối, không ném lỗi ngoài BadRequestError', async () => {
    await expect(
      service.create(ORG, USER, {
        file: fakeFile({ name: 'tiny.pdf', bytes: Buffer.from([0x25]) }),
      })
    ).rejects.toBeInstanceOf(BadRequestError)
  })

  /**
   * html has no signature, so layer 2 cannot apply to it — that asymmetry is deliberate and is the
   * reason html is the one kind still served under `sandbox`.
   */
  it('html đi qua lớp 2 vì không có chữ ký nào để đối chiếu', async () => {
    await expect(
      service.create(ORG, USER, { file: fakeFile({ name: 'x.html', body: 'plain text' }) })
    ).resolves.toBeTruthy()
  })

  it('nhận file tới đúng 10MB, từ chối 1 byte quá', async () => {
    await expect(
      service.create(ORG, USER, { file: fakeFile({ size: ARTIFACT_MAX_BYTES }) })
    ).resolves.toBeTruthy()
    await expect(
      service.create(ORG, USER, { file: fakeFile({ size: ARTIFACT_MAX_BYTES + 1 }) })
    ).rejects.toBeInstanceOf(BadRequestError)
  })
})

/**
 * §3 F4 — the same limit, two different answers, because the user's ability to act differs.
 */
describe('ArtifactService.create — tên quá dài', () => {
  const longStem = 'a'.repeat(MAX_TOUCHPOINTS_NAME_LENGTH + 30)

  it('tên SUY RA từ tên file thì bị CẮT, không từ chối', async () => {
    await service.create(ORG, USER, {
      file: fakeFile({ name: `${longStem}.mp4`, bytes: bytesFor('.mp4') }),
    })

    const insert = deps.repo.createIfWithinQuota.mock.calls[0][0] as any
    expect(insert.name).toHaveLength(MAX_TOUCHPOINTS_NAME_LENGTH)
    expect(longStem.startsWith(insert.name)).toBe(true)
  })

  it('tên NGƯỜI DÙNG TỰ GÕ quá dài thì bị TỪ CHỐI — họ nhìn thấy ô nhập và sửa được', async () => {
    await expect(
      service.create(ORG, USER, { file: fakeFile(), name: longStem })
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  })

  it('tên tự gõ đúng bằng giới hạn thì qua', async () => {
    const exact = 'b'.repeat(MAX_TOUCHPOINTS_NAME_LENGTH)
    await service.create(ORG, USER, { file: fakeFile(), name: exact })
    expect((deps.repo.createIfWithinQuota.mock.calls[0][0] as any).name).toBe(exact)
  })
})

describe('ArtifactService.publish', () => {
  it('creates a touch point with content_type ARTIFACT pointing at the serve url', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)

    const dto = await service.publish(ORG, USER, ARTIFACT_ID)

    expect(deps.createTouchPoint).toHaveBeenCalledOnce()
    const [orgArg, payload, userArg] = deps.createTouchPoint.mock.calls[0] as any[]
    expect(orgArg).toBe(ORG)
    expect(userArg).toBe(USER)
    expect(payload.content_type).toBe('ARTIFACT')
    expect(payload.content_value).toBe('https://app.li2.ai/a/abcdef0123456789')
    expect(payload.content_value).toBe(dto.serve_url)
    expect(payload.variants_content.QR.enabled).toBe(true)

    expect(deps.repo.publishIfWithinQuota).toHaveBeenCalledWith(
      ORG,
      ARTIFACT_ID,
      'tp-1',
      ARTIFACT_QUOTA_FREE_LIVE
    )
    expect(dto.status).toBe('live')
    expect(dto.short_url).toBe('https://s.li2.ai/abc')
    expect(dto.path_qr_code).toBe('org/qr.png')
  })

  it('passes an optional slug and domain_id through to the touch point', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    const domainId = '44444444-4444-4444-8444-444444444444'

    await service.publish(ORG, USER, ARTIFACT_ID, { slug: 'my-slug', domain_id: domainId })

    const payload = (deps.createTouchPoint.mock.calls[0] as any[])[1]
    expect(payload.slug).toBe('my-slug')
    expect(payload.domain_id).toBe(domainId)
  })

  it('404s an artifact belonging to another org — never 403', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(null)
    await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(NotFoundError)
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
  })

  it('refuses a second publish with 409 — one artifact must not fan out across links', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'live' })
    await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(ConflictError)
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
  })

  it('refuses to bake a client-controlled host into content_value', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    const saved = process.env.NEXT_PUBLIC_APP_BASE_URL
    delete process.env.NEXT_PUBLIC_APP_BASE_URL
    await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(AppError)
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
    process.env.NEXT_PUBLIC_APP_BASE_URL = saved
  })

  it('leaves the artifact in draft when touch-point creation fails', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    deps.createTouchPoint.mockRejectedValueOnce(new Error('plan limit reached'))
    await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toThrow('plan limit reached')
    expect(deps.repo.publishIfWithinQuota).not.toHaveBeenCalled()
  })

  it('checks permission before reading the artifact', async () => {
    deps.ensurePolicy.mockRejectedValueOnce(new Error('forbidden'))
    await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toThrow('forbidden')
    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
  })
})

/**
 * R2a — PATCH quyền xem. Thứ tự: quyền → đọc hàng → status → băm → MỘT UPDATE tăng access_version.
 */
describe('ArtifactService.setAccess', () => {
  const liveRow = { ...draftRow, status: 'live', access_version: 1 }
  beforeEach(() => deps.repo.findByIdForOrg.mockResolvedValue(liveRow))

  it('⭐ A4: password → băm, UPDATE với hash + password_set_at + version cũ, DTO không rò hash', async () => {
    const dto = await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: 'Abcdefgh1',
    })

    expect(deps.hashPassword).toHaveBeenCalledWith('Abcdefgh1')
    expect(deps.repo.updateAccessForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID, 1, {
      access_mode: 'password',
      password_hash: 'scrypt$14$8$5$salt$hash-of-Abcdefgh1',
      password_set_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
    expect(dto.access_mode).toBe('password')
    expect(dto.password_set_at).not.toBeNull()
    expect(JSON.stringify(dto)).not.toContain('hash')
    expect(JSON.stringify(dto)).not.toContain('access_version')
  })

  it('public/private → hash null, password_set_at null, không băm gì', async () => {
    for (const mode of ['public', 'private']) {
      deps.hashPassword.mockClear()
      await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: mode })
      expect(deps.hashPassword).not.toHaveBeenCalled()
      expect(deps.repo.updateAccessForOrg).toHaveBeenLastCalledWith(ORG, ARTIFACT_ID, 1, {
        access_mode: mode,
        password_hash: null,
        password_set_at: null,
      })
    }
  })

  it('password gửi kèm ở chế độ public bị bỏ qua, không lỗi', async () => {
    await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'public',
      password: 'Abcdefgh1',
    })
    expect(deps.hashPassword).not.toHaveBeenCalled()
  })

  /**
   * Wave 4 §3.4 — mục ⋮ "Công khai" của THẺ trong danh sách gửi đúng `{access_mode:'public'}` qua
   * đường PATCH này, không có endpoint riêng. Hai hàng phải đi được: một hàng `private` đang `live`
   * (ca thường) và một hàng `draft` chưa xuất bản (thẻ nháp cũng có mục đó) — `draft` nằm trong
   * `isReplaceableStatus` nên không được 409.
   */
  describe('đường "Công khai" nhanh từ danh sách (wave 4)', () => {
    it('⭐ hàng private đang live → public, version nhích lên, không băm gì', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({
        ...liveRow,
        access_mode: 'private',
        access_version: 5,
      })

      const dto = await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })

      expect(deps.repo.updateAccessForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID, 5, {
        access_mode: 'public',
        password_hash: null,
        password_set_at: null,
      })
      const written = await deps.repo.updateAccessForOrg.mock.results[0].value
      expect(written.access_version).toBe(6)
      expect(dto.access_mode).toBe('public')
      expect(deps.hashPassword).not.toHaveBeenCalled()
    })

    it('⭐ hàng draft (chưa xuất bản) cũng được, KHÔNG 409', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({
        ...draftRow,
        access_mode: 'private',
        access_version: 2,
      })

      const dto = await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })

      expect(dto.access_mode).toBe('public')
      expect(deps.repo.updateAccessForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID, 2, {
        access_mode: 'public',
        password_hash: null,
        password_set_at: null,
      })
      const written = await deps.repo.updateAccessForOrg.mock.results[0].value
      expect(written.access_version).toBe(3)
    })
  })

  it('idempotence: PATCH public trên hàng đã public VẪN tăng version (cookie cũ chết)', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...liveRow,
      access_mode: 'public',
      access_version: 7,
    })
    await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    expect(deps.repo.updateAccessForOrg).toHaveBeenCalledWith(
      ORG,
      ARTIFACT_ID,
      7,
      expect.anything()
    )
  })

  it('⭐ A3: access_mode ngoài 4 giá trị → 400 field_invalid, không đọc hàng', async () => {
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'x' })
    ).rejects.toBeInstanceOf(BadRequestError)
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: '' })
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
  })

  it('⭐ A3: password thiếu → 400 field_required với $t(label.password)', async () => {
    const error = await service
      .setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'password' })
      .catch((e) => e)
    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.i18nMessage ?? error).toMatchObject(
      expect.objectContaining({ key: 'common:messages.error.field_required' })
    )
    expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
  })

  it('⭐ A3: password < 8 hoặc > 128 code point (sau trim) → 400', async () => {
    for (const bad of ['abc', '  abcdefg  ', 'a'.repeat(129), '😀'.repeat(7)]) {
      await expect(
        service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'password', password: bad })
      ).rejects.toBeInstanceOf(BadRequestError)
    }
    expect(deps.hashPassword).not.toHaveBeenCalled()
  })

  it('đếm code point: 8 emoji là 8 ký tự → qua; 128 code point → qua; trim trước khi đếm', async () => {
    await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: '😀'.repeat(8),
    })
    await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: 'a'.repeat(128),
    })
    await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: '  Abcdefgh1  ',
    })
    expect(deps.hashPassword).toHaveBeenLastCalledWith('Abcdefgh1')
  })

  it('⭐ §9: google khi env chưa đặt → 400; có env → qua', async () => {
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'google' })
    ).rejects.toBeInstanceOf(BadRequestError)
    deps.hasGoogleClient.mockReturnValue(true)
    const dto = await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'google' })
    expect(dto.access_mode).toBe('google')
  })

  it('404 cho org khác và cho bia mộ — không 403', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(null)
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    ).rejects.toBeInstanceOf(NotFoundError)
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it.each(['blocked', 'expired', 'quarantined', 'scanning'])('status %s → 409', async (status) => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status })
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    ).rejects.toBeInstanceOf(ConflictError)
    expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
  })

  it('draft được đổi (áp dụng ngay khi xuất bản)', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, access_version: 1 })
    const dto = await service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'private' })
    expect(dto.access_mode).toBe('private')
  })

  it('quyền kiểm TRƯỚC khi đọc hàng; cùng policy với publish', async () => {
    deps.ensurePolicy.mockRejectedValue(new ForbiddenError('no'))
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
    expect(deps.ensurePolicy).toHaveBeenCalledWith(ORG, 'add_touch_point')
  })

  it('UPDATE không khớp version (PATCH song song) → 409 access.conflict; hàng biến mất → 404', async () => {
    deps.repo.updateAccessForOrg.mockResolvedValue(null)
    const error = await service
      .setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
      .catch((e) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect(JSON.stringify(error.i18nMessage ?? error)).toContain('artifact:access.conflict')

    deps.repo.findByIdForOrg.mockResolvedValueOnce(liveRow).mockResolvedValueOnce(null)
    await expect(
      service.setAccess(ORG, USER, ARTIFACT_ID, { access_mode: 'public' })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('⭐ mật khẩu không bao giờ vào log', async () => {
    const logInfo = vi.fn()
    await service.setAccess(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: 'SieuBiMat123',
    })
    const everything = JSON.stringify([logWarn.mock.calls, logError.mock.calls, logInfo.mock.calls])
    expect(everything).not.toContain('SieuBiMat123')
  })
})

/** [P2] R2c — `viewer_count` chỉ ở getForOrg và chỉ cho google. */
describe('getForOrg.viewer_count', () => {
  it('google → đếm artifact_views; chế độ khác → null, không đếm', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'live',
      access_mode: 'google',
    })
    expect((await service.getForOrg(ORG, ARTIFACT_ID)).viewer_count).toBe(4)
    expect(deps.viewRepo.countViewersByArtifact).toHaveBeenCalledWith(ARTIFACT_ID)

    deps.viewRepo.countViewersByArtifact.mockClear()
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'live',
      access_mode: 'password',
    })
    expect((await service.getForOrg(ORG, ARTIFACT_ID)).viewer_count).toBeNull()
    expect(deps.viewRepo.countViewersByArtifact).not.toHaveBeenCalled()
  })

  it('đếm hỏng → null + log ERROR, trang vẫn mở', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'live',
      access_mode: 'google',
    })
    deps.viewRepo.countViewersByArtifact.mockRejectedValue(new Error('db'))
    expect((await service.getForOrg(ORG, ARTIFACT_ID)).viewer_count).toBeNull()
    expect(logError).toHaveBeenCalled()
  })

  it('listForOrg luôn trả viewer_count null', async () => {
    deps.repo.listByOrg.mockResolvedValue({
      data: [{ ...draftRow, access_mode: 'google' }],
      count: 1,
    })
    const { data } = await service.listForOrg(ORG, { page: 1, limit: 20 })
    expect(data[0].viewer_count).toBeNull()
    expect(deps.viewRepo.countViewersByArtifact).not.toHaveBeenCalled()
  })
})

describe('availableAccessModes — công tắc Google theo env', () => {
  it('không env → 3 chế độ pha 1; có env → đủ 4, đúng thứ tự ARTIFACT_ACCESS_MODES', () => {
    expect(service.availableAccessModes()).toEqual(['public', 'private', 'password'])
    deps.hasGoogleClient.mockReturnValue(true)
    expect(service.availableAccessModes()).toEqual([...ARTIFACT_ACCESS_MODES])
  })
})

describe('publish với access_mode (B1) và replace không đụng access_version', () => {
  it('⭐ publish {access_mode: password, password} → applyAccess TRƯỚC pre-check quota', async () => {
    const order: string[] = []
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, access_version: 1 })
    deps.repo.updateAccessForOrg.mockImplementation(async (...args: any[]) => {
      order.push('access')
      return { ...draftRow, access_mode: args[3].access_mode, access_version: 2 }
    })
    deps.repo.countLiveByOrg.mockImplementation(async () => (order.push('quota'), 0))

    await service.publish(ORG, USER, ARTIFACT_ID, {
      access_mode: 'password',
      password: 'Abcdefgh1',
    })

    expect(order).toEqual(['access', 'quota'])
    expect(deps.repo.updateAccessForOrg).toHaveBeenCalledWith(
      ORG,
      ARTIFACT_ID,
      1,
      expect.objectContaining({ access_mode: 'password' })
    )
  })

  it('publish quota đầy SAU khi đã ghi chế độ → hàng draft vẫn mang chế độ (không rollback)', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, access_version: 1 })
    deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)
    await expect(
      service.publish(ORG, USER, ARTIFACT_ID, { access_mode: 'private' })
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(deps.repo.updateAccessForOrg).toHaveBeenCalledTimes(1)
  })

  it('publish không access_mode → không đụng cột quyền', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    await service.publish(ORG, USER, ARTIFACT_ID, { slug: 'abc-def' })
    expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
  })

  it('publish access_mode sai → 400 TRƯỚC khi mint touch point', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)
    await expect(
      service.publish(ORG, USER, ARTIFACT_ID, { access_mode: 'password', password: 'abc' })
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
  })

  it('⭐ A18: replaceContent KHÔNG gọi updateAccessForOrg — thay file không bắt nhập lại', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'live',
      access_mode: 'password',
      access_version: 3,
    })
    await service.replaceContent(ORG, USER, ARTIFACT_ID, {
      file: fakeFile({ name: 'v2.html', size: 11 }),
    })
    expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
    expect(deps.repo.replaceIfWithinQuota).toHaveBeenCalled()
  })
})

describe('ArtifactService.toDTO', () => {
  /**
   * R2c — the one leak that would turn "password-protected" into "password published". The DTO is
   * built field by field, never by spreading the row; this is what notices if someone "tidies" it.
   */
  it('⭐ không bao giờ lộ password_hash hay access_version — kể cả khi hàng có', () => {
    const dto = service.toDTO({
      ...draftRow,
      access_mode: 'password',
      password_hash: 'scrypt$14$8$5$c2FsdA$a2V5',
      access_version: 4,
      password_set_at: '2026-10-06T00:00:00.000Z',
    } as any)
    const json = JSON.stringify(dto)

    expect(json).not.toContain('hash')
    expect(json).not.toContain('access_version')
    expect(json).not.toContain('scrypt')
    expect(dto.access_mode).toBe('password')
    expect(dto.password_set_at).toBe('2026-10-06T00:00:00.000Z')
  })

  it('hàng đọc trước migration (không có access_mode) → public, password_set_at null', () => {
    logWarn.mockClear()
    const { access_mode: _m, password_set_at: _p, ...legacy } = draftRow as any
    const dto = service.toDTO(legacy)

    expect(dto.access_mode).toBe('public')
    expect(dto.password_set_at).toBeNull()
    expect(dto.viewer_count).toBeNull()
    expect(logWarn).not.toHaveBeenCalled()
  })

  it('access_mode ngoài từ vựng đi qua nguyên vẹn và được log WARN như kind/status', () => {
    const dto = service.toDTO({ ...draftRow, access_mode: 'invite-only' } as any)

    expect(dto.access_mode).toBe('invite-only')
    expect(logWarn).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'access_mode', value: 'invite-only' }),
      expect.any(String)
    )
  })

  it('never leaks storage_path', () => {
    const dto = service.toDTO(draftRow) as Record<string, unknown>
    expect(dto).not.toHaveProperty('storage_path')
    expect(Object.values(dto)).not.toContain(draftRow.storage_path)
  })

  it('returns null short_url / path_qr_code when there is no touch point', () => {
    const dto = service.toDTO(draftRow)
    expect(dto.touch_point_id).toBeNull()
    expect(dto.short_url).toBeNull()
    expect(dto.path_qr_code).toBeNull()
  })

  it('reads the embedded touch point whether supabase returns it as object or array', () => {
    const tp = { short_url: 'https://s.li2.ai/x', path_qr_code: 'q.png' }
    expect(service.toDTO({ ...draftRow, touch_points: tp }).short_url).toBe('https://s.li2.ai/x')
    expect(service.toDTO({ ...draftRow, touch_points: [tp] }).short_url).toBe('https://s.li2.ai/x')
  })

  it('composes serve_url server-side so the client never guesses the base', () => {
    expect(service.toDTO(draftRow).serve_url).toBe('https://app.li2.ai/a/abcdef0123456789')
  })

  /**
   * Publish qua MCP không truyền slug → li2-be cấp slug ngẫu nhiên, ghi `short_url` + bảng `slugs`
   * nhưng `touch_points.slug` NULL (đo trên LiHi 20/10: `6LAA1`). `serve_url` phải vẫn là địa chỉ
   * công khai, lấy slug từ đoạn cuối `short_url`, chứ không rơi về `app…/a/<token>`.
   */
  describe('serve_url khi touch_points.slug NULL (publish không truyền slug)', () => {
    const liveNoSlug = {
      ...draftRow,
      status: 'live' as const,
      touch_point_id: 'tp-9',
      organizations: { org_slug: 'khanhqns-organization' },
    }

    beforeEach(() => vi.stubEnv('ARTIFACT_LINK_URL', 'https://artifact.lihi.test'))
    afterEach(() => vi.unstubAllEnvs())

    it('lấy slug từ đoạn cuối short_url', () => {
      const tp = { short_url: 'https://lihi.test/6LAA1', path_qr_code: null, slug: null }
      expect(service.toDTO({ ...liveNoSlug, touch_points: tp }).serve_url).toBe(
        'https://artifact.lihi.test/khanhqns-organization/6LAA1'
      )
    })

    it('ưu tiên cột slug khi có', () => {
      const tp = { short_url: 'https://lihi.test/6LAA1', path_qr_code: null, slug: 'bang-gia' }
      expect(service.toDTO({ ...liveNoSlug, touch_points: tp }).serve_url).toBe(
        'https://artifact.lihi.test/khanhqns-organization/bang-gia'
      )
    })

    it('short_url có dấu / cuối vẫn đúng; không short_url → /a/<token>', () => {
      const tp = { short_url: 'https://lihi.test/6LAA1/', path_qr_code: null, slug: null }
      expect(service.toDTO({ ...liveNoSlug, touch_points: tp }).serve_url).toBe(
        'https://artifact.lihi.test/khanhqns-organization/6LAA1'
      )
      expect(service.toDTO({ ...liveNoSlug, touch_points: null }).serve_url).toBe(
        'https://app.li2.ai/a/abcdef0123456789'
      )
    })
  })

  /**
   * The frontend must never concatenate `/download` itself: the byte route's spelling is a
   * server-side detail, and a client that spells it becomes a second place to change the day it
   * moves.
   */
  it('composes download_url as serve_url + /download, and never leaves it empty', () => {
    const dto = service.toDTO(draftRow)
    expect(dto.download_url).toBe(`${dto.serve_url}/download`)
    expect(dto.download_url).toBe('https://app.li2.ai/a/abcdef0123456789/download')
  })

  /**
   * A6. `database.types.ts` types both columns as bare `string`, so a value outside the vocabulary is
   * a value TypeScript is happy with. The old code wrote `row.kind as ArtifactKind` and nothing
   * anywhere noticed. What changed is DETECTION, not substitution: the value still flows, because
   * every candidate substitute is a lie with consequences and the frontend already degrades to a
   * neutral badge with no action for a status it does not know.
   */
  describe('kind / status ngoài từ vựng', () => {
    it('không crash, và giá trị đi qua nguyên vẹn', () => {
      const dto = service.toDTO({ ...draftRow, kind: 'hologram', status: 'levitating' } as any)

      expect(dto.kind).toBe('hologram')
      expect(dto.status).toBe('levitating')
    })

    it('log một dòng WARN cho MỖI cột lệch, kèm id và giá trị để tìm được hàng', () => {
      logWarn.mockClear()
      logError.mockClear()

      service.toDTO({ ...draftRow, kind: 'hologram', status: 'levitating' } as any)

      expect(logWarn).toHaveBeenCalledTimes(2)
      const payloads = logWarn.mock.calls.map(([payload]: any[]) => payload)
      expect(payloads.map((p) => p.field).sort()).toEqual(['kind', 'status'])
      expect(payloads.map((p) => p.value).sort()).toEqual(['hologram', 'levitating'])
      for (const payload of payloads) expect(payload.artifactId).toBe(ARTIFACT_ID)

      /**
       * `warn`, not `error`. A listing of 50 drifted rows would otherwise raise 50 errors on every
       * page view — this is a row we cannot fully describe, not a failed request.
       */
      expect(logError).not.toHaveBeenCalled()
    })

    it('KHÔNG log gì khi cả hai giá trị hợp lệ — nếu không thì dòng log thành vô nghĩa', () => {
      logWarn.mockClear()

      for (const kind of ARTIFACT_KINDS)
        for (const status of ARTIFACT_STATUSES) service.toDTO({ ...draftRow, kind, status } as any)

      expect(logWarn).not.toHaveBeenCalled()
    })
  })
})

describe('ArtifactService.listForOrg', () => {
  it('maps rows to DTOs and reports rowCount', async () => {
    deps.repo.listByOrg.mockResolvedValue({ data: [draftRow, draftRow], count: 7 })
    const result = await service.listForOrg(ORG, { page: 2, limit: 20 })
    expect(deps.repo.listByOrg).toHaveBeenCalledWith(ORG, { page: 2, limit: 20 })
    expect(result.rowCount).toBe(7)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).not.toHaveProperty('storage_path')
  })
})

/**
 * B1 wave 4 — `visits` (số lượt quét không-bot) trong DTO, lấy bằng MỘT lần RPC
 * `artifact_visit_counts` cho cả trang. Không hàng `visits` nào được kéo về Node: đó chính là "the
 * visits mistake" mà `artifact.repository.ts` đã ghi tên.
 *
 * Con số này là thông tin phụ của trang, không phải điều kiện để trang mở — nên RPC hỏng thì
 * `visits = 0` + log ERROR, không 500, cùng tinh thần `countViewersSafely`.
 */
/**
 * B2 wave 4 — đổi đường dẫn của một artifact ĐÃ LIVE: `POST …/artifacts/{id}/slug`.
 *
 * Việc ghi được uỷ cho `touchPointService.updateAndReturn` (inject qua `Deps.updateTouchPoint`) vì
 * chính hàm đó đã mang bốn thứ không được viết lại ở đây: kiểm plan `MAX_SLUGS_PER_TP`, insert vào
 * bảng `slugs` (nên slug CŨ vẫn sống — đó là "Lịch sử đuôi link" của short link, và là lý do QR đã
 * in vẫn chạy), cập nhật `touch_points.slug/short_url`, và sinh lại ảnh QR theo đường dẫn mới.
 *
 * Mọi test ở đây mock lớp đó, nên chúng chứng minh service GỌI GÌ và xử lý câu trả lời thế nào —
 * không chứng minh bảng `slugs` nhận thêm hàng. Việc đó đo trên LiHi (A8).
 */
describe('ArtifactService.changeSlug', () => {
  const TP_ID = 'tp-1'
  const liveRow = {
    ...draftRow,
    status: 'live',
    touch_point_id: TP_ID,
    touch_points: {
      slug: 'menu-quan-com',
      short_url: 'https://s.li2.ai/menu-quan-com',
      path_qr_code: 'org/qr.png',
    },
  }

  /** Hàng đọc LẠI ở bước 7, sau khi touch point đã mang slug mới. */
  const refreshedRow = {
    ...liveRow,
    updated_at: '2026-10-11T10:00:00.000Z',
    touch_points: {
      slug: 'thuc-don-moi',
      short_url: 'https://s.li2.ai/thuc-don-moi',
      path_qr_code: 'org/qr-new.png',
    },
  }

  beforeEach(() => {
    deps.repo.findByIdForOrg.mockResolvedValueOnce(liveRow).mockResolvedValue(refreshedRow)
  })

  it('⭐ (a) slug hợp lệ → updateTouchPoint đúng payload, touchUpdatedAtForOrg, DTO mang short_url mới', async () => {
    const dto = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi')

    expect(deps.ensurePolicy).toHaveBeenCalledWith(ORG, 'add_touch_point')
    expect(deps.updateTouchPoint).toHaveBeenCalledTimes(1)
    expect(deps.updateTouchPoint).toHaveBeenCalledWith(
      ORG,
      TP_ID,
      {
        slug: 'thuc-don-moi',
        variants_content: { QR: { enabled: true } },
        qr_customize_options: {},
      },
      USER
    )
    expect(deps.repo.touchUpdatedAtForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    expect(dto.short_url).toBe('https://s.li2.ai/thuc-don-moi')
    expect(dto.path_qr_code).toBe('org/qr-new.png')
    // Cache-bust ảnh QR của FE dựa vào đây: ảnh mới có thể ghi vào CÙNG path.
    expect(dto.updated_at).toBe('2026-10-11T10:00:00.000Z')
  })

  it('(a2) slug được trim trước khi ghi — dấu cách hai đầu không thành một slug khác', async () => {
    await service.changeSlug(ORG, USER, ARTIFACT_ID, '  thuc-don-moi  ')

    expect(deps.updateTouchPoint).toHaveBeenCalledWith(
      ORG,
      TP_ID,
      expect.objectContaining({ slug: 'thuc-don-moi' }),
      USER
    )
  })

  /**
   * Nhánh QR của `updateAndReturn` đọc `data.qr_customize_options ?? {}` rồi render lại ảnh TỪ ĐÓ,
   * nên gọi nó mà không gửi gì đồng nghĩa với "render lại bằng mặc định" — màu, logo và kiểu dot mà
   * người dùng đã đặt trong giao diện short link bị xoá sạch, im lặng, chỉ vì họ đổi đường dẫn.
   *
   * Nên tuỳ biến hiện có được đọc từ touch point nhúng và gửi NGUYÊN lại. Chỉ `data` (chính URL) là
   * thứ `parseQrCustomizeOptions` luôn ghi đè bằng đường dẫn mới — đúng điều ta muốn đổi.
   */
  it('⭐ giữ nguyên tuỳ biến QR hiện có — đổi slug không được reset màu/logo về mặc định', async () => {
    const customized = {
      dotsOptions: { color: '#ff0000', type: 'rounded' },
      image: 'https://cdn/logo.png',
      data: 'https://s.li2.ai/menu-quan-com?t=1',
    }
    deps.repo.findByIdForOrg.mockReset()
    deps.repo.findByIdForOrg
      .mockResolvedValueOnce({
        ...liveRow,
        touch_points: { ...liveRow.touch_points, qr_customize_options: customized },
      })
      .mockResolvedValue(refreshedRow)

    await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi')

    expect(deps.updateTouchPoint).toHaveBeenCalledWith(
      ORG,
      TP_ID,
      {
        slug: 'thuc-don-moi',
        variants_content: { QR: { enabled: true } },
        qr_customize_options: customized,
      },
      USER
    )
  })

  it('⭐ (b) slug trùng: updateTouchPoint ném slug_is_taken → ném NGUYÊN lỗi, KHÔNG chạm updated_at', async () => {
    deps.updateTouchPoint.mockRejectedValue(
      new BadRequestError('Slug is taken', { key: 'common:messages.error.slug_is_taken' })
    )

    const error = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi').catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.i18nMessage).toMatchObject({ key: 'common:messages.error.slug_is_taken' })
    expect(deps.repo.touchUpdatedAtForOrg).not.toHaveBeenCalled()
  })

  /**
   * Giới hạn là `slugSchema` THẬT (6–64 ký tự, regex, cấm tiền tố `f-`), không một bản chép. Spec
   * ghi rõ prototype nói 3–48 là sai; con số đúng nằm ở `shared/schemas/slug.ts` và FE đọc lại từ đó.
   */
  it.each([
    ['ngắn hơn 6 ký tự', 'ab'],
    ['rỗng', ''],
    ['chỉ có dấu cách', '      '],
    ['tiền tố f- bị cấm', 'f-abcdef'],
    ['dài 65 ký tự', 'a'.repeat(65)],
    ['có chữ hoa', 'ThucDonMoi'],
    ['có dấu tiếng Việt', 'thuc-don-mới'],
    ['có dấu gạch đôi', 'thuc--don'],
  ])('⭐ (c) %s → 400 field_invalid, KHÔNG gọi updateTouchPoint', async (_label, slug) => {
    const error = await service.changeSlug(ORG, USER, ARTIFACT_ID, slug).catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.i18nMessage).toMatchObject({
      key: 'common:messages.error.field_invalid',
      params: { field: 'slug' },
    })
    expect(deps.updateTouchPoint).not.toHaveBeenCalled()
    expect(deps.repo.touchUpdatedAtForOrg).not.toHaveBeenCalled()
  })

  it('⭐ (d) hàng đã removed → 404 artifactNotFound, không ghi gì', async () => {
    deps.repo.findByIdForOrg.mockReset()
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })

    const error = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi').catch((e) => e)

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.i18nMessage).toMatchObject({ key: 'common:messages.error.not_found' })
    expect(deps.updateTouchPoint).not.toHaveBeenCalled()
  })

  /**
   * (e) Nháp đổi slug bằng `publish`, không bằng đây — ở đó slug mới là slug ĐẦU TIÊN, chưa có
   * `slugs` nào để giữ lịch sử và chưa có QR nào để sinh lại. 409 "trạng thái từ chối", không 404:
   * hàng có thật.
   */
  it.each([
    ['draft còn nguyên', { status: 'draft', touch_point_id: null }],
    ['draft đã có touch point (bất thường)', { status: 'draft', touch_point_id: TP_ID }],
    ['live nhưng touch_point_id null (bất thường)', { status: 'live', touch_point_id: null }],
    ['blocked', { status: 'blocked', touch_point_id: TP_ID }],
  ])('⭐ (e) %s → 409 status_refuses, không ghi gì', async (_label, over) => {
    deps.repo.findByIdForOrg.mockReset()
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, ...over })

    const error = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi').catch((e) => e)

    expect(error).toBeInstanceOf(ConflictError)
    expect(error.i18nMessage).toMatchObject({ key: 'artifact:update.status_refuses' })
    expect(deps.updateTouchPoint).not.toHaveBeenCalled()
    expect(deps.repo.touchUpdatedAtForOrg).not.toHaveBeenCalled()
  })

  /**
   * (f) Bấm lưu mà không sửa gì thì không được mint một hàng `slugs` và không được sinh lại ảnh QR
   * — `updateTpSlug` tự no-op khi slug trùng, nhưng nhánh QR của `updateAndReturn` thì KHÔNG, nên
   * phải chặn ở đây.
   */
  it('⭐ (f) slug bằng slug hiện tại → trả DTO hiện tại, KHÔNG ghi gì', async () => {
    const dto = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'menu-quan-com')

    expect(deps.updateTouchPoint).not.toHaveBeenCalled()
    expect(deps.repo.touchUpdatedAtForOrg).not.toHaveBeenCalled()
    expect(dto.short_url).toBe('https://s.li2.ai/menu-quan-com')
  })

  it('⭐ (g) id của org khác (repo trả null) → 404, không ghi gì', async () => {
    deps.repo.findByIdForOrg.mockReset()
    deps.repo.findByIdForOrg.mockResolvedValue(null)

    await expect(service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi')).rejects.toBeInstanceOf(
      NotFoundError
    )
    expect(deps.updateTouchPoint).not.toHaveBeenCalled()
  })

  it('(h) quyền bị từ chối → ném trước cả khi đọc hàng', async () => {
    deps.ensurePolicy.mockRejectedValue(new ForbiddenError('nope'))

    await expect(service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi')).rejects.toBeInstanceOf(
      ForbiddenError
    )
    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
  })

  it('(i) DTO sau khi đổi slug vẫn mang visits và vẫn không rò hash', async () => {
    deps.repo.countVisitsByTouchPoints.mockResolvedValue(new Map([[TP_ID, 9]]))

    const dto = await service.changeSlug(ORG, USER, ARTIFACT_ID, 'thuc-don-moi')

    expect(dto.visits).toBe(9)
    expect(JSON.stringify(dto)).not.toContain('hash')
  })
})

describe('visits trong DTO (wave 4 B1)', () => {
  const liveRow = {
    ...draftRow,
    status: 'live',
    touch_point_id: 'tp-1',
    touch_points: {
      slug: 'menu-quan-com',
      short_url: 'https://s.li2.ai/menu-quan-com',
      path_qr_code: 'org/qr.png',
    },
  }

  it('⭐ getForOrg: đúng một lần RPC với id của touch point, DTO mang con số đó', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    deps.repo.countVisitsByTouchPoints.mockResolvedValue(new Map([['tp-1', 7]]))

    const dto = await service.getForOrg(ORG, ARTIFACT_ID)

    expect(deps.repo.countVisitsByTouchPoints).toHaveBeenCalledTimes(1)
    expect(deps.repo.countVisitsByTouchPoints).toHaveBeenCalledWith(['tp-1'])
    expect(dto.visits).toBe(7)
  })

  it('nháp chưa có touch_point_id → visits 0 và KHÔNG gọi RPC', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(draftRow)

    const dto = await service.getForOrg(ORG, ARTIFACT_ID)

    expect(dto.visits).toBe(0)
    expect(deps.repo.countVisitsByTouchPoints).not.toHaveBeenCalled()
  })

  it('RPC ném → visits 0 + log ERROR, trang chi tiết vẫn mở', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    deps.repo.countVisitsByTouchPoints.mockRejectedValue(new Error('rpc missing'))

    const dto = await service.getForOrg(ORG, ARTIFACT_ID)

    expect(dto.visits).toBe(0)
    expect(logError).toHaveBeenCalled()
  })

  it('⭐ listForOrg: MỘT lần RPC với mảng id của trang (bỏ null), mỗi DTO nhận số của chính nó', async () => {
    deps.repo.listByOrg.mockResolvedValue({
      data: [
        { ...liveRow, id: 'a-1', touch_point_id: 'tp-1' },
        { ...liveRow, id: 'a-2', touch_point_id: 'tp-2' },
        { ...draftRow, id: 'a-3', touch_point_id: null },
      ],
      count: 3,
    })
    deps.repo.countVisitsByTouchPoints.mockResolvedValue(new Map([['tp-1', 12]]))

    const { data } = await service.listForOrg(ORG, { page: 1, limit: 20 })

    expect(deps.repo.countVisitsByTouchPoints).toHaveBeenCalledTimes(1)
    expect(deps.repo.countVisitsByTouchPoints).toHaveBeenCalledWith(['tp-1', 'tp-2'])
    expect(data.map((d) => d.visits)).toEqual([12, 0, 0])
  })

  it('listForOrg: RPC ném → mọi visits 0 + log ERROR, danh sách vẫn trả', async () => {
    deps.repo.listByOrg.mockResolvedValue({ data: [{ ...liveRow }], count: 1 })
    deps.repo.countVisitsByTouchPoints.mockRejectedValue(new Error('rpc missing'))

    const { data } = await service.listForOrg(ORG, { page: 1, limit: 20 })

    expect(data[0].visits).toBe(0)
    expect(logError).toHaveBeenCalled()
  })

  it('listForOrg: trang không có touch point nào → KHÔNG gọi RPC', async () => {
    deps.repo.listByOrg.mockResolvedValue({ data: [draftRow], count: 1 })

    await service.listForOrg(ORG, { page: 1, limit: 20 })

    expect(deps.repo.countVisitsByTouchPoints).not.toHaveBeenCalled()
  })

  it('toDTO: thiếu tham số visits → 0, và DTO có visits vẫn không rò hash', () => {
    const dto = service.toDTO({ ...liveRow, password_hash: 'scrypt$x', access_version: 3 } as any)

    expect(dto.visits).toBe(0)
    expect(JSON.stringify(dto)).not.toContain('hash')
    expect(JSON.stringify(dto)).toContain('"visits":0')
  })
})

/**
 * The upload MIME and the bucket whitelist live in two different languages and two different
 * files, so nothing but this test makes them agree. They disagreed once already and every real
 * upload returned 500 while the rest of this suite stayed green — storage is mocked here, so a
 * mock can never catch it.
 *
 * This reads the FINAL state of the schema, not one file. Migrations accumulate: the bucket is
 * created in 20260928000001 and widened in 20260930000001, and a test pinned to the first file
 * would keep asserting 5MB long after the second one raised it — passing while production
 * disagrees, which is the failure mode this whole test exists to prevent.
 *
 * "Final state" is modelled as the LAST occurrence of each value across the files in filename
 * order, which is the order Postgres applies them in.
 */
describe('artifact.type.ts vs the artifacts migrations', () => {
  const migrationDir = resolve(process.cwd(), 'supabase/migrations')
  const migrationFiles = readdirSync(migrationDir)
    .filter((f) => f.endsWith('.sql') && f.includes('artifacts__'))
    .sort()
  const migrations = migrationFiles
    .map((f) => readFileSync(resolve(migrationDir, f), 'utf8'))
    .join('\n')

  const lastMatch = (source: string, pattern: RegExp) => {
    const all = [...source.matchAll(pattern)]
    return all.length ? all[all.length - 1] : null
  }

  it('reads every artifacts migration, in the order Postgres will run them', () => {
    expect(migrationFiles).toEqual([
      '20260928000001_artifacts__create.sql',
      '20260930000001_artifacts__multiformat.sql',
      '20260930000002_artifacts__quota_index.sql',
      '20260930000003_artifacts__atomic_quota.sql',
      '20261001000001_artifacts__removed_status.sql',
      '20261005000001_artifacts__replace_content.sql',
      '20261006000001_artifacts__access_control.sql',
      '20261006000002_artifacts__views.sql',
      '20261012000001_artifacts__visit_counts_rpc.sql',
      // Clamav spec WP3: guard status trong `artifact_publish_if_within_quota`. Không thêm cột,
      // không đổi CHECK — mọi assert "trạng thái cuối" phía dưới không đổi giá trị nào.
      '20261021000001_artifacts__publish_status_guard.sql',
      // markdown / Word / Excel / ảnh: nới `allowed_mime_types` và `artifacts_kind_check`.
      // Hai nửa phải đi cùng nhau — thiếu nửa MIME thì upload trả 500, thiếu nửa CHECK thì
      // INSERT bị từ chối.
      '20261024000001_artifacts__md_office_image.sql',
    ])
  })

  /**
   * `countLiveByOrg` filters on (organization_id, status). The index created with the table is
   * (organization_id, created_at DESC) and cannot serve that, so without this index the quota count
   * degrades to a scan — silently, and only on an org with many artifacts.
   */
  it('có index phục vụ đúng phép lọc của countLiveByOrg', () => {
    const index = lastMatch(
      migrations,
      /CREATE INDEX[^;]*ON\s+"?public"?\."?artifacts"?[^;]*\(([^)]*)\)\s*;/g
    )
    expect(index, 'không migration nào tạo index trên artifacts').not.toBeNull()

    const columns = migrations
      .split(';')
      .filter((stmt) => /CREATE INDEX/i.test(stmt) && /artifacts/i.test(stmt))
      .map((stmt) => stmt.match(/\(([^)]*)\)\s*$/)?.[1] ?? '')
      .map((cols) =>
        cols
          .split(',')
          .map((c) =>
            c
              .trim()
              .replace(/"/g, '')
              .replace(/\s+(ASC|DESC)$/i, '')
          )
          .join(',')
      )

    expect(columns).toContain('organization_id,status')
  })

  /**
   * `toEqual`, not `toContain`: a MIME in the bucket that no format produces is a hole — it lets an
   * upload land that nothing downstream knows how to serve.
   */
  it('allowed_mime_types matches ARTIFACT_STORAGE_MIMES exactly', () => {
    const allowed = lastMatch(migrations, /allowed_mime_types\s*=?\s*ARRAY\[([^\]]+)\]/g)?.[1]
    expect(allowed, 'không đọc được allowed_mime_types').toBeDefined()
    const types = allowed!
      .split(',')
      .map((t) => t.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
    expect(types.sort()).toEqual([...ARTIFACT_STORAGE_MIMES].sort())
  })

  it('every storageMime is bare — Supabase matches the whole string', () => {
    for (const format of ARTIFACT_FORMATS) {
      expect(format.storageMime, `${format.extension} storageMime`).not.toContain(';')
      expect(
        format.contentType.startsWith(format.storageMime),
        `${format.extension}: contentType phải bắt đầu bằng storageMime`
      ).toBe(true)
    }
  })

  it('agrees with the bucket file_size_limit', () => {
    const limit = lastMatch(migrations, /file_size_limit\s*=?\s*,?\s*\n?\s*([0-9_]+)/g)?.[1]
    expect(limit, 'không đọc được file_size_limit').toBeDefined()
    expect(Number(limit!.replace(/_/g, ''))).toBe(ARTIFACT_MAX_BYTES)
  })

  /**
   * Same shape of bug as the MIME one, one table over: the CHECK constraint and the TS union are
   * two hand-written lists of the same vocabulary. If they drift, a row the database happily
   * accepts reaches `getArtifactStatusView`, which has no branch for it.
   */
  const checkValues = (constraint: string) => {
    const match = lastMatch(
      migrations,
      new RegExp(`CONSTRAINT\\s+"?${constraint}"?[\\s\\S]{0,120}?IN\\s*\\(([^)]+)\\)`, 'g')
    )
    expect(match?.[1], `không đọc được danh sách của ${constraint}`).toBeDefined()
    return match![1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
  }

  it('ARTIFACT_STATUSES khớp đúng CHECK artifacts_status_check', () => {
    expect([...ARTIFACT_STATUSES].sort()).toEqual(checkValues('artifacts_status_check').sort())
  })

  it('ARTIFACT_KINDS khớp đúng CHECK artifacts_kind_check', () => {
    expect([...ARTIFACT_KINDS].sort()).toEqual(checkValues('artifacts_kind_check').sort())
  })

  /** R2c: 'google' nằm trong CHECK từ pha 1 để pha 2 không cần migration thứ hai trên cột này. */
  it('ARTIFACT_ACCESS_MODES khớp đúng CHECK artifacts_access_mode_check', () => {
    expect([...ARTIFACT_ACCESS_MODES].sort()).toEqual(
      checkValues('artifacts_access_mode_check').sort()
    )
  })

  it('mật khẩu và chế độ đi cùng nhau: CHECK artifacts_password_hash_check có mặt', () => {
    expect(migrations).toMatch(
      /CONSTRAINT\s+"?artifacts_password_hash_check"?\s+CHECK\s*\(\(access_mode = 'password'\) = \(password_hash IS NOT NULL\)\)/
    )
  })

  /**
   * Every uploadable kind must be a member of the CHECK vocabulary, and every format must name an
   * uploadable kind. Without this, a kind could be uploadable in TypeScript and rejected by the
   * database — a 500 on the write, after the bytes are already in storage.
   */
  it('mọi ARTIFACT_UPLOAD_KINDS đều nằm trong CHECK, và mọi format trỏ tới một upload kind', () => {
    const checkKinds = checkValues('artifacts_kind_check')
    for (const kind of ARTIFACT_UPLOAD_KINDS) expect(checkKinds).toContain(kind)
    for (const format of ARTIFACT_FORMATS) expect([...ARTIFACT_UPLOAD_KINDS]).toContain(format.kind)
  })

  /**
   * The service sniffs the first SNIFF_BYTES bytes of an upload. A signature reaching past that
   * window would silently never match, and the file would be rejected as corrupt.
   */
  it('mọi chữ ký magic nằm trọn trong cửa sổ sniff', () => {
    for (const format of ARTIFACT_FORMATS)
      for (const variant of format.magic)
        for (const magic of variant)
          expect(
            magic.offset + magic.hex.length / 2,
            `${format.extension} magic vượt quá ${ARTIFACT_SNIFF_BYTES} byte`
          ).toBeLessThanOrEqual(ARTIFACT_SNIFF_BYTES)
  })
})

/**
 * The error a promise rejected with. Typed as the error rather than as a union with the resolved
 * value, so `error.i18nMessage` is a real assertion and not a cast.
 */
const rejectionOf = async (promise: Promise<unknown>): Promise<ForbiddenError> => {
  try {
    await promise
  } catch (error) {
    return error as ForbiddenError
  }
  throw new Error('expected the promise to reject')
}

/**
 * Quota, both axes. The numbers come from the constants, never typed in here: a test that hardcodes
 * `3` keeps passing after the product decision moves and stops testing the thing it names.
 */
describe('quota theo tổ chức', () => {
  const fileOfSize = (bytes: number) =>
    fakeFile({
      name: 'clip.mp4',
      bytes: (() => {
        const buf = bytesFor('.mp4')
        const padded = Buffer.alloc(bytes)
        buf.copy(padded, 0, 0, Math.min(buf.length, bytes))
        return padded
      })(),
    })

  describe('trục byte — ép ở create, TRƯỚC khi ghi storage', () => {
    it('vượt tổng dung lượng → 403, và KHÔNG byte nào vào bucket', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES - 10)

      await expect(service.create(ORG, USER, { file: fileOfSize(64) })).rejects.toBeInstanceOf(
        ForbiddenError
      )

      // The whole reason the check sits where it does: an object written and then refused would
      // leave storage holding bytes no row points at, and the org's usage creeping up per attempt.
      expect(deps.storage.put).not.toHaveBeenCalled()
      expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
    })

    it('lỗi nói đúng trục và đúng con số đang ép', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES)

      const error = await rejectionOf(service.create(ORG, USER, { file: fileOfSize(64) }))

      expect(error.i18nMessage?.key).toBe('common:messages.error.field_exceed_limit')
      // R8a (MCP): the numbers travel in params so the tool can say "used X of 30 MB, needs Y" without
      // ever forwarding `message`. Additive — i18next ignores params a template does not use.
      expect(error.i18nMessage?.params).toEqual({
        field: '$t(label.storage)',
        limit: ARTIFACT_QUOTA_FREE_BYTES / 1024 / 1024,
        used_bytes: ARTIFACT_QUOTA_FREE_BYTES,
        need_bytes: 64,
        free_bytes: 0,
      })
    })

    it('vừa đúng tới trần thì vẫn qua — so sánh là >, không phải >=', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES - 64)

      await expect(service.create(ORG, USER, { file: fileOfSize(64) })).resolves.toBeTruthy()
    })

    it('đếm theo byte THẬT của buffer, không theo file.size do client báo', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES - 64)

      // A client claiming 1 byte for a 65-byte file must not buy itself a slot over the limit.
      const file = { ...fileOfSize(65), size: 1 }
      await expect(service.create(ORG, USER, { file })).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  /**
   * The live-count axis is checked at publish and NOT at create, and that is a product decision with
   * a name: an operator replacing an artifact uploads the new version, looks at it, and only then
   * takes the old one down. Refusing the upload would force the delete first and leave the link dead
   * while they check whether the replacement is even right.
   */
  describe('trục số live — KHÔNG ép ở create, cố ý', () => {
    it('org đã đủ 3 live vẫn upload được — luồng "tải bản mới, xem, rồi gỡ bản cũ"', async () => {
      deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)

      await expect(service.create(ORG, USER, { file: fakeFile() })).resolves.toBeTruthy()
      expect(deps.storage.put).toHaveBeenCalledOnce()
    })

    it('create không hỏi số live chút nào — một truy vấn không cần là một truy vấn sẽ lệch', async () => {
      await service.create(ORG, USER, { file: fakeFile() })
      expect(deps.repo.countLiveByOrg).not.toHaveBeenCalled()
    })
  })

  describe('trục số live — ép ở publish', () => {
    beforeEach(() => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })
    })

    it('đã đủ số artifact live → 403, và KHÔNG touch point nào được tạo', async () => {
      deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)

      await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(ForbiddenError)

      expect(deps.createTouchPoint).not.toHaveBeenCalled()
      expect(deps.repo.publishIfWithinQuota).not.toHaveBeenCalled()
    })

    it('lỗi nói đúng trục và đúng con số — khác hẳn thông báo của trục byte', async () => {
      deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
      expect(error.i18nMessage?.params).toEqual({ limit: ARTIFACT_QUOTA_FREE_LIVE })
    })

    it('còn một slot cuối thì publish được', async () => {
      deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE - 1)

      await expect(service.publish(ORG, USER, ARTIFACT_ID)).resolves.toBeTruthy()
    })

    /**
     * Order matters here. Re-publishing something already `live` consumes no new slot, so it must
     * report "already published" and not a quota the caller is not asking for.
     */
    it('artifact đã live thì báo đã-publish, không báo hết quota', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'live' })
      deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)

      await expect(service.publish(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(ConflictError)
    })
  })

  /**
   * The race the pre-checks cannot close, and what the service does when it loses it.
   *
   * Both axes were read-then-write, and a concurrent request interleaving between the two sees the
   * pre-write state and passes as well. The database functions are what make the second one refuse;
   * these tests cover the service's half — the compensating action — which a mocked repository CAN
   * prove.
   *
   * What they CANNOT prove is that the functions serialise. That needs a real database and two
   * genuinely concurrent calls, and it is verified on LiHi. A green suite here would otherwise be
   * exactly the "green while broken" shape this feature keeps turning up.
   */
  describe('thua race ở lần ghi atomic', () => {
    it('create: hàm từ chối → object vừa ghi bị gỡ, lỗi là 403 trục byte', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(0) // pre-check passes
      deps.repo.createIfWithinQuota.mockResolvedValue(null) // the atomic write refuses

      const error = await rejectionOf(service.create(ORG, USER, { file: fakeFile() }))

      const [path] = deps.storage.put.mock.calls[0] as any[]
      expect(deps.storage.remove).toHaveBeenCalledWith(path)
      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.i18nMessage?.key).toBe('common:messages.error.field_exceed_limit')
    })

    it('create: gỡ object thất bại thì lỗi vẫn là 403, không phải lỗi storage', async () => {
      deps.repo.createIfWithinQuota.mockResolvedValue(null)
      deps.storage.remove.mockRejectedValue(new Error('storage down'))

      // The caller is owed "quota", not the story of the cleanup.
      const error = await rejectionOf(service.create(ORG, USER, { file: fakeFile() }))

      expect(error).toBeInstanceOf(ForbiddenError)
    })

    it('publish: hàm từ chối → touch point vừa mint bị gỡ, lỗi là 403 trục live', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })
      deps.repo.countLiveByOrg.mockResolvedValue(0) // pre-check passes
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(deps.deleteTouchPoint).toHaveBeenCalledWith(ORG, 'tp-1', USER)
      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
    })

    it('publish: gỡ touch point thất bại thì lỗi vẫn là 403 trục live', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)
      // Real: `deleteTpById` resolves DELETE_TOUCH_POINT itself, and publish only required ADD.
      deps.deleteTouchPoint.mockRejectedValue(new Error('forbidden'))

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
    })
  })

  /**
   * WP3 của `docs/artifact-scan-clamav-spec.md` §0.1: publish KHÔNG được chạm vào một hàng mà hệ
   * thống đang giữ.
   *
   * Trước WP3 không tầng nào kiểm việc này. `publish()` chặn đúng một status (`live` → "đã xuất
   * bản") và `artifact_publish_if_within_quota` không đọc status cũ, nên một hàng `quarantined`,
   * `blocked`, `expired` hay `removed` được lật thẳng sang `live`. Hôm nay chưa đường nào trong app
   * ghi `quarantined`/`blocked`, nhưng `removed` tồn tại thật từ wave 2 — và ngày bật ClamAV thì đây
   * là đường vòng qua chính cổng quét.
   *
   * Hai nửa, và test này chỉ chứng minh được một: pre-check ở đây (mock được) và WHERE trong SQL
   * (`20261021000001`, ghim bằng `quota-rpc-contract.test.ts`, nghiệm thu thật trên LiHi).
   */
  describe('WP3 — status từ chối publish', () => {
    const HELD = ['quarantined', 'blocked', 'expired', 'removed'] as const

    it.each(HELD)('%s → 409 status_refuses_publish TRƯỚC khi mint touch point', async (status) => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status })

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.i18nMessage?.key).toBe('artifact:errors.status_refuses_publish')
      // Refusal rẻ: không round trip tới li2-be, nên không có gì phải bù trừ.
      expect(deps.createTouchPoint).not.toHaveBeenCalled()
      expect(deps.repo.publishIfWithinQuota).not.toHaveBeenCalled()
      expect(deps.deleteTouchPoint).not.toHaveBeenCalled()
    })

    /**
     * `removed` cũng là 409 ở đây, KHÔNG phải 404 `artifact:errors.removed` như `replaceContent`
     * ném. Khác biệt cố ý: ở replace, 404 là cái FE map sang hộp thoại "nội dung đã được gỡ"; ở
     * publish thì hàng vẫn tồn tại trong danh sách của người dùng và câu đúng là "trạng thái này
     * không xuất bản được".
     */
    it('removed không bị nhầm thành 404', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'removed' })

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.i18nMessage?.key).not.toBe('artifact:errors.removed')
    })

    it('pre-check chạy TRƯỚC khi ghi access_mode — không ghi gì lên hàng đang bị giữ', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'quarantined' })

      await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID, { access_mode: 'private' }))

      expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
    })

    /** `scanning` NẰM TRONG tập publish được — đường lùi sang quét bất đồng bộ (spec §1 phương án A). */
    it('scanning vẫn publish được', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'scanning' })

      await expect(service.publish(ORG, USER, ARTIFACT_ID)).resolves.toBeTruthy()
      expect(deps.repo.publishIfWithinQuota).toHaveBeenCalledOnce()
    })

    it('draft publish được như cũ — guard không được chặn đường bình thường', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })

      await expect(service.publish(ORG, USER, ARTIFACT_ID)).resolves.toBeTruthy()
    })

    /**
     * RACE THẬT: pre-check thấy `draft`, rồi hàng bị giữ TRONG LÚC `createTouchPoint` đang bay (một
     * round trip tới li2-be). SQL từ chối, và nó từ chối giống hệt lúc hết slot — nên service phải
     * đọc lại hàng để nói đúng lý do, và phải gỡ touch point vừa mint ở CẢ HAI nhánh.
     */
    it.each(HELD)(
      'bị giữ giữa đường (%s) → gỡ touch point, 409 status, KHÔNG phải quota',
      async (status) => {
        deps.repo.findByIdForOrg
          .mockResolvedValueOnce({ ...draftRow })
          .mockResolvedValueOnce({ ...draftRow, status })
        deps.repo.publishIfWithinQuota.mockResolvedValue(null)

        const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

        expect(deps.deleteTouchPoint).toHaveBeenCalledWith(ORG, 'tp-1', USER)
        expect(error).toBeInstanceOf(ConflictError)
        expect(error.i18nMessage?.key).toBe('artifact:errors.status_refuses_publish')
        expect(error.i18nMessage?.key).not.toBe('artifact:errors.quota_live')
      }
    )

    /**
     * NGHỊCH ĐẢO, và là phần dễ mất nhất khi thêm nhánh mới: hàng vẫn `draft` thì lý do duy nhất còn
     * lại là hết slot, và lỗi phải y như trước WP3.
     */
    it('vẫn draft sau khi SQL từ chối → vẫn là quota_live như cũ', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
    })

    /** Một publish song song của CHÍNH artifact này thắng: câu đúng là "đã xuất bản", không phải hold. */
    it('đã thành live khi đọc lại → đã-publish, không phải status_refuses_publish', async () => {
      deps.repo.findByIdForOrg
        .mockResolvedValueOnce({ ...draftRow })
        .mockResolvedValueOnce({ ...draftRow, status: 'live' })
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.i18nMessage?.key).toBe('artifact:detail.already_published')
    })

    it('hàng biến mất khi đọc lại → 404, và touch point vẫn được gỡ', async () => {
      deps.repo.findByIdForOrg.mockResolvedValueOnce({ ...draftRow }).mockResolvedValueOnce(null)
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)

      const error = await rejectionOf(service.publish(ORG, USER, ARTIFACT_ID))

      expect(deps.deleteTouchPoint).toHaveBeenCalledWith(ORG, 'tp-1', USER)
      expect(error).toBeInstanceOf(NotFoundError)
    })
  })

  /**
   * 2026-10-19: chủ sản phẩm chốt 50 slot / 30MB. Bất biến cũ "BYTES / MAX_BYTES >= LIVE" không còn
   * đúng (30/10 = 3 < 50) và là CỐ Ý: slot dành cho nhiều artifact nhỏ, trần byte mới là thứ chặn
   * video. Ghim con số để ai đổi phải đọc comment ở `artifact.type.ts`, và ghim rằng một org toàn
   * file đúng trần byte vẫn phải có ít nhất 3 slot (byte không được hạ dưới 3 × MAX_BYTES).
   */
  it('quota: 50 live / 30MB, và byte đủ cho ít nhất 3 file đúng trần', () => {
    expect(ARTIFACT_QUOTA_FREE_LIVE).toBe(50)
    expect(ARTIFACT_QUOTA_FREE_BYTES).toBe(30 * 1024 * 1024)
    expect(ARTIFACT_QUOTA_FREE_BYTES / ARTIFACT_MAX_BYTES).toBeGreaterThanOrEqual(3)
  })
})

/**
 * DELETE — gỡ nội dung, giữ địa chỉ. File ra khỏi kho, hàng thành bia mộ, touch point KHÔNG bị đụng.
 *
 * Mọi khẳng định ở đây vẫn là về THỨ TỰ, vì thứ tự là thứ duy nhất quyết định một lần gỡ hỏng giữa
 * chừng để lại trạng thái nào.
 */
describe('ArtifactService.deleteForOrg', () => {
  const liveRow = {
    ...draftRow,
    status: 'live',
    touch_point_id: 'tp-1',
    storage_path: `${ORG}/${ARTIFACT_ID}.mp4`,
  }

  it('xoá object rồi đặt hàng thành removed — object TRƯỚC', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    const order: string[] = []
    deps.storage.remove.mockImplementation(async () => void order.push('storage'))
    deps.repo.markRemovedForOrg.mockImplementation(async () => {
      order.push('tombstone')
      return 1
    })

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(deps.storage.remove).toHaveBeenCalledWith(`${ORG}/${ARTIFACT_ID}.mp4`)
    expect(deps.repo.markRemovedForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    // The object must go first: an object with no row is storage nothing counts and nobody finds.
    expect(order).toEqual(['storage', 'tombstone'])
  })

  /**
   * Nháp CHƯA TỪNG publish thì xoá CỨNG — không bia mộ, vì không có mã QR nào đã in để trả lời.
   *
   * Agent `test-artifact` đo trên LiHi: xoá hai nháp chưa publish rồi gọi `/a/<token>` thì cả hai
   * trả **410** cho token chưa bao giờ ai thấy. Nguyên tắc đã được viết ở `discardDraft` nhưng
   * chỉ áp ở đó.
   */
  it('nháp chưa publish: xoá CỨNG, không dựng bia mộ', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'draft',
      touch_point_id: null,
    })

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(deps.repo.deleteDraftById).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
    expect(deps.storage.remove).toHaveBeenCalled()
  })

  it('nháp ĐÃ có touch point thì vẫn dựng bia mộ — nó đã từng có link', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...draftRow,
      status: 'draft',
      touch_point_id: 'tp-1',
    })

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(deps.repo.markRemovedForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
    expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
  })

  /**
   * ⭐ TRÁI TIM CỦA ĐỢT NÀY.
   *
   * Comment cũ ở service tin rằng xoá touch point làm short link và mọi QR đã in trả 404 ở li2-be.
   * Đo trên LiHi 2026-10-01: nó trả **200 kèm trang lỗi tiếng Anh chung** — giống hệt trang của một
   * slug chưa từng tồn tại. Người quét không phân biệt được "đã gỡ" với "gõ sai", và vì touch point
   * đã mất, li2-be dừng ngay ở đó nên họ **không bao giờ** tới `/a/<token>`.
   *
   * Giữ touch point là thứ làm 302 vẫn chạy, lượt quét vẫn đếm, và trang 410 có người đọc.
   */
  it('⭐ KHÔNG xoá touch point — short link và QR đã in sống tiếp', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(deps.deleteTouchPoint).not.toHaveBeenCalled()
  })

  /**
   * Repository không còn hàm hard-delete nào. Một hàm như vậy mà không ai gọi là cái bẫy: người sau
   * cần "xoá artifact" sẽ gọi nó và lặng lẽ phá mô hình này — mất hàng là mất luôn khả năng trả 410.
   */
  it('không có phép xoá cứng nào được gọi', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(deps.repo).not.toHaveProperty('deleteByIdForOrg')
  })

  /**
   * Lý do object đi trước, viết thành test: kho từ chối thì hàng CÒN NGUYÊN và còn `live`. Gọi lại là
   * xong, và không byte nào trở nên vô hình với `sum(size_bytes)`.
   *
   * Chiều ngược lại tệ hơn: một hàng `removed` mà object vẫn còn trong bucket là nội dung chủ sở hữu
   * tin là đã xoá, vẫn nằm đó.
   */
  it('storage.remove ném → hàng còn nguyên, lỗi nổi lên', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    deps.storage.remove.mockRejectedValue(new AppError('storage is down'))

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(AppError)

    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
    expect(deps.deleteTouchPoint).not.toHaveBeenCalled()
  })

  /**
   * Quota dung lượng được giải phóng bởi chính việc đổi status, vì `sumSizeBytesByOrg` loại `removed`.
   * `size_bytes` trên hàng GIỮ NGUYÊN — không có cột đếm nào phải trừ đi, và nếu sau này ai thêm một
   * cột như vậy thì test này là chỗ nói cho họ biết.
   */
  it('quota được giải phóng bởi chính việc đặt removed — sum đọc lại giảm đúng', async () => {
    const rows = [
      { size_bytes: 6_000_000, status: 'live' },
      { size_bytes: 4_000_000, status: 'live' },
    ]
    const sum = () =>
      rows.filter((r) => r.status !== 'removed').reduce((total, r) => total + r.size_bytes, 0)
    deps.repo.sumSizeBytesByOrg.mockImplementation(async () => sum())
    expect(await deps.repo.sumSizeBytesByOrg(ORG)).toBe(10_000_000)

    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, size_bytes: 6_000_000 })
    deps.repo.markRemovedForOrg.mockImplementation(async () => {
      rows[0].status = 'removed'
      return 1
    })

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(await deps.repo.sumSizeBytesByOrg(ORG)).toBe(4_000_000)
    // Hàng vẫn còn, và vẫn nhớ nó từng nặng bao nhiêu.
    expect(rows[0].size_bytes).toBe(6_000_000)
  })

  it('artifact của org khác → 404, và KHÔNG gỡ gì cả', async () => {
    // findByIdForOrg filters on organization_id, so another org's id simply is not found.
    deps.repo.findByIdForOrg.mockResolvedValue(null)

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(NotFoundError)

    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
  })

  /**
   * Lần gỡ thứ hai (bấm hai lần, hay một job retry). 404 — đúng hành vi đo được TRƯỚC đợt này
   * ("DELETE lần hai trả 404"), nên dưới mắt người dùng không có gì đổi.
   *
   * Và `storage.remove` KHÔNG được gọi: `artifact-storage.remove` ném khi kho báo lỗi, nên đập vào
   * một path không còn object biến một hành động đã hoàn thành thành lỗi 500.
   */
  it('gỡ lần hai một hàng đã removed → 404, và KHÔNG chạm storage', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).rejects.toBeInstanceOf(NotFoundError)

    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
  })

  it('một artifact draft chưa có touch point: vẫn gỡ được, không ném', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, touch_point_id: null })

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).resolves.toBeUndefined()

    expect(deps.storage.remove).toHaveBeenCalledOnce()
    // Trước 2026-10-24 dòng này assert `markRemovedForOrg` — nó khẳng định đúng cái hành vi sai:
    // một nháp chưa từng publish mà có bia mộ thì `/a/<token>` trả 410 cho token chưa ai thấy.
    expect(deps.repo.deleteDraftById).toHaveBeenCalledOnce()
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
    expect(deps.deleteTouchPoint).not.toHaveBeenCalled()
  })

  /**
   * G2: the key is `DELETE_TOUCH_POINT`, not a new one of its own. An artifact publishes itself as a
   * touch point, so whoever may take the link down may take the artifact down — a second key would
   * mean a role able to delete the link but not the thing behind it.
   *
   * Và nó được giải quyết TRƯỚC khi đọc hay phá bất cứ thứ gì: một lần từ chối phát hiện giữa đường
   * để lại một hàng trỏ vào object không còn tồn tại.
   */
  it('thiếu quyền → từ chối TRƯỚC khi đọc hàng và trước khi chạm storage', async () => {
    deps.ensureDeletePolicy.mockRejectedValue(new Error('forbidden'))

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).rejects.toThrow('forbidden')

    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
  })

  /**
   * G5. Ca mà cả THỨ TỰ này tồn tại để sửa được: một lần gọi đã xoá object rồi chết. Lần hai phải
   * chạy tới cuối — `remove` trên một object đã mất không phải lỗi với Supabase.
   */
  it('gỡ lần hai sau một lần hỏng giữa chừng: chạy tới cuối, đặt được removed', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    // Storage already has no such object; Supabase reports that as an empty delete list, not an error.
    deps.storage.remove.mockResolvedValue(undefined)

    await expect(service.deleteForOrg(ORG, USER, ARTIFACT_ID)).resolves.toBeUndefined()

    expect(deps.repo.markRemovedForOrg).toHaveBeenCalledWith(ORG, ARTIFACT_ID)
  })

  /**
   * G7, trục số live. Gỡ một artifact đang `live` nhả lại một slot publish, và nó nhả bằng việc status
   * thôi là `live` — `countLiveByOrg` lọc `status = 'live'` nên bia mộ tự khắc không được đếm.
   */
  it('gỡ một artifact đang live giải phóng một slot publish', async () => {
    // Đầy đúng trần: (LIVE - 1) hàng khác + hàng sắp gỡ. Không hard-code 3 vì trần đổi (3 → 50, 19/10).
    const live = [
      ...Array.from({ length: ARTIFACT_QUOTA_FREE_LIVE - 1 }, (_, i) => ({ id: `other-${i}` })),
      { id: ARTIFACT_ID },
    ]
    deps.repo.countLiveByOrg.mockImplementation(async () => live.length)
    expect(await deps.repo.countLiveByOrg(ORG)).toBe(ARTIFACT_QUOTA_FREE_LIVE)

    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    deps.repo.markRemovedForOrg.mockImplementation(async (_orgId: string, id: string) => {
      const at = live.findIndex((row) => row.id === id)
      if (at >= 0) live.splice(at, 1)
      return 1
    })

    await service.deleteForOrg(ORG, USER, ARTIFACT_ID)

    expect(await deps.repo.countLiveByOrg(ORG)).toBe(ARTIFACT_QUOTA_FREE_LIVE - 1)
  })
})

/**
 * Bia mộ tàng hình ở màn quản lý, ở `getForOrg` cũng như ở `listByOrg`. Nếu danh sách ẩn nó mà trang
 * chi tiết vẫn trả, một URL cũ trong lịch sử trình duyệt mở ra trang chi tiết của nội dung không còn
 * tồn tại — có cả nút Xoá và iframe xem trước trỏ vào file đã mất.
 */
describe('ArtifactService.getForOrg', () => {
  it('hàng removed → 404, như thể không có', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'removed' })

    await expect(service.getForOrg(ORG, ARTIFACT_ID)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('hàng live vẫn trả DTO như cũ', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow, status: 'live' })

    await expect(service.getForOrg(ORG, ARTIFACT_ID)).resolves.toMatchObject({ status: 'live' })
  })
})

/**
 * Hai phép lọc `removed` mà KHÔNG test hành vi nào với tới được: service mock repository ở mọi test,
 * nên không chỗ nào chạy câu truy vấn thật. Chúng lại đúng là hai nửa của yêu cầu "bia mộ không ăn
 * quota, không hiện trong danh sách" — thiếu một trong hai thì gỡ nội dung xong vẫn báo hết chỗ, hoặc
 * hàng đã gỡ vẫn nằm trong danh sách. Nên đọc source, như test `deleteByIdForOrg` bên dưới.
 */
describe('artifact.repository — bia mộ bị loại khỏi quota và danh sách', () => {
  const repositorySource = readFileSync(
    resolve(process.cwd(), 'src/core/repositories/artifact.repository.ts'),
    'utf8'
  )

  const methodBody = (name: string) => {
    const from = repositorySource.slice(repositorySource.indexOf(`async ${name}(`))
    return from.slice(0, from.indexOf('\n  }'))
  }

  it.each(['sumSizeBytesByOrg', 'listByOrg'])('%s lọc bỏ status removed', (name) => {
    expect(methodBody(name)).toContain("neq('status', 'removed')")
  })

  /**
   * `countLiveByOrg` thì KHÔNG được thêm `neq`: nó đã lọc `eq('status','live')`, và một bia mộ không
   * bao giờ là `live`. Thêm nữa là một điều kiện không nói gì mà người đọc sau phải đi tìm lý do.
   */
  it('countLiveByOrg không cần và không có phép lọc đó', () => {
    const body = methodBody('countLiveByOrg')
    expect(body).toContain("eq('status', 'live')")
    expect(body).not.toContain('removed')
  })

  /**
   * Nửa SQL của trục dung lượng phải khớp nửa TypeScript. Hai nửa cố ý viết giống nhau, và lệch nhau
   * hỏng theo kiểu tệ nhất: pre-check nói còn chỗ, hàm atomic từ chối SAU khi file đã vào bucket.
   */
  it('artifact_create_if_within_quota trong migration cũng loại removed khỏi sum', () => {
    const migrationDir = resolve(process.cwd(), 'supabase/migrations')
    const sql = readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql') && f.includes('artifacts__'))
      .sort()
      .map((f) => readFileSync(resolve(migrationDir, f), 'utf8'))
      .join('\n')

    // Thân hàm CUỐI cùng — `CREATE OR REPLACE` sau thắng, đúng thứ tự Postgres áp dụng.
    const bodies = [
      ...sql.matchAll(
        /CREATE OR REPLACE FUNCTION\s+"public"\."artifact_create_if_within_quota"[\s\S]*?\$\$([\s\S]*?)\$\$\s*;/g
      ),
    ]
    expect(bodies.length, 'không đọc được thân artifact_create_if_within_quota').toBeGreaterThan(0)

    const last = bodies[bodies.length - 1][1]
    expect(last).toContain(`"status" <> 'removed'`)
  })
})

/**
 * `markRemovedForOrg` mang một phép lọc `organization_id` mà không test hành vi nào với tới được:
 * service luôn tra hàng bằng `findByIdForOrg` trước, nên tới lúc update chạy thì org đã chắc khớp.
 * Phép lọc đó dành cho caller tương lai quên bước tra — phòng tuyến thứ hai, và một phòng tuyến
 * không ai kiểm là đồ trang trí.
 *
 * Nên test này đọc source. Một test yếu vì một lý do mạnh: gỡ nội dung của org khác là việc không
 * khôi phục được, và phương án còn lại là không có test nào cả.
 */
describe('artifact.repository — phạm vi của phép gỡ', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/core/repositories/artifact.repository.ts'),
    'utf8'
  )

  it('markRemovedForOrg lọc theo CẢ id và organization_id', () => {
    const body = source.slice(source.indexOf('async markRemovedForOrg'))
    const method = body.slice(0, body.indexOf('\n  }'))

    expect(method).toContain("update({ status: 'removed' }")
    expect(method).toContain("eq('id', id)")
    expect(method, 'một phép gỡ không lọc theo org là một phép gỡ xuyên tổ chức').toContain(
      "eq('organization_id', orgId)"
    )
  })

  /**
   * Phép xoá cứng DUY NHẤT là `deleteDraftById`, và chính câu lệnh của nó chỉ chạm hàng `draft` chưa có
   * touch point (spec mcp-publish R4). Một hard-delete tổng quát là cái bẫy: người sau cần "xoá
   * artifact" sẽ gọi nó, và mất hàng là mất khả năng trả 410 cho người quét QR. Hàng đã từng `live`
   * luôn có `touch_point_id`, nên bộ lọc trong SQL — không phải caller — là thứ giữ bia mộ an toàn.
   */
  it('xoá cứng chỉ có ở deleteDraftById, và nó lọc draft + touch_point_id IS NULL ngay trong câu lệnh', () => {
    expect(source).not.toContain('deleteByIdForOrg')
    expect(source.split('.delete(')).toHaveLength(2)

    const body = source.slice(source.indexOf('async deleteDraftById'))
    const method = body.slice(0, body.indexOf('\n  }'))
    expect(method).toContain('.delete(')
    expect(method).toContain("eq('id', id)")
    expect(method).toContain("eq('organization_id', orgId)")
    expect(method).toContain("eq('status', 'draft')")
    expect(method).toContain("is('touch_point_id', null)")
  })
})

/**
 * Thay nội dung mà giữ QR và short link (spec docs/artifact-wave3-replace-file.md R2).
 *
 * Mọi test ở đây mock repository, nên chúng chứng minh service LÀM GÌ với từng câu trả lời của DB —
 * không chứng minh hàm SQL đúng. Lock và delta phía SQL đo trên LiHi (A7, A9, A16).
 */
describe('ArtifactService.replaceContent', () => {
  const OLD_PATH = `${ORG}/${ARTIFACT_ID}.html`
  const liveRow = {
    ...draftRow,
    status: 'live',
    touch_point_id: 'tp-1',
    storage_path: OLD_PATH,
    size_bytes: 3 * 1024 * 1024,
    touch_points: { short_url: 'https://s.li2.ai/abc', path_qr_code: 'org/qr.png' },
  }
  const pdf = () => fakeFile({ name: 'v2.pdf', size: 64, bytes: bytesFor('.pdf') })
  // `put` is mocked without parameters, so its recorded calls are typed `[]`; name the real shape.
  const putCall = () => deps.storage.put.mock.calls[0] as unknown as [string, Buffer, string]

  beforeEach(() => {
    deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    deps.repo.replaceIfWithinQuota.mockResolvedValue({ ...liveRow })
  })

  it('thứ tự: put(object MỚI) → rpc → đọc lại hàng → remove(object CŨ)', async () => {
    const order: string[] = []
    deps.storage.put.mockImplementation(async () => {
      order.push('put')
      return { path: 'p' }
    })
    deps.repo.replaceIfWithinQuota.mockImplementation(async () => {
      order.push('rpc')
      return { ...liveRow }
    })
    deps.repo.findByIdForOrg.mockImplementation(async () => {
      order.push('find')
      return liveRow
    })
    deps.storage.remove.mockImplementation(async () => void order.push('remove'))

    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    expect(order).toEqual(['find', 'put', 'rpc', 'find', 'remove'])
    expect(deps.storage.remove).toHaveBeenCalledWith(OLD_PATH)
  })

  it('path mới có tiền tố <org>/<id>- và đuôi của FORMAT mới; không bao giờ trùng path cũ', async () => {
    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    const [path, , mime] = putCall()
    expect(path).toMatch(new RegExp(`^${ORG}/${ARTIFACT_ID}-[0-9a-f-]{36}\\.pdf$`))
    expect(path).not.toBe(OLD_PATH)
    expect(mime).toBe('application/pdf')
  })

  it('hàm SQL nhận đúng bốn cột đổi + quota, KHÔNG nhận name/serve_token/status (bất biến R9)', async () => {
    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    const [orgId, id, next, quota] = deps.repo.replaceIfWithinQuota.mock.calls[0]
    expect(orgId).toBe(ORG)
    expect(id).toBe(ARTIFACT_ID)
    expect(Object.keys(next).sort()).toEqual(['content_type', 'kind', 'size_bytes', 'storage_path'])
    expect(next.kind).toBe('pdf')
    expect(next.content_type).toBe('application/pdf')
    expect(next.size_bytes).toBe(64)
    expect(quota).toBe(ARTIFACT_QUOTA_FREE_BYTES)
  })

  it('trả DTO từ hàng ĐỌC LẠI (kèm short_url) + previous_size_bytes từ hàng SQL trả về', async () => {
    const after = { ...liveRow, kind: 'pdf', storage_path: 'new', size_bytes: 64 }
    deps.repo.findByIdForOrg.mockResolvedValueOnce(liveRow).mockResolvedValueOnce(after)

    const result = await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    expect(result.kind).toBe('pdf')
    expect(result.size_bytes).toBe(64)
    expect(result.previous_size_bytes).toBe(3 * 1024 * 1024)
    expect(result.short_url).toBe('https://s.li2.ai/abc')
    expect(result.serve_token).toBe(liveRow.serve_token)
    expect(result.id).toBe(ARTIFACT_ID)
    expect(result).not.toHaveProperty('storage_path')
  })

  /**
   * ⭐ Chống object mồ côi khi hai lần thay chạy song song. Service phải xoá path mà HÀM SQL trả
   * về (đọc dưới lock), không phải path nó đọc TRƯỚC đó: nếu R1 đã ghi P1 rồi, R2 nhận P1 từ hàm
   * và xoá P1 — xoá P0 lần hai thì P1 mồ côi mãi, không lỗi, không test đỏ, chỉ bucket phình.
   */
  it('⭐ xoá path do hàm SQL trả về dưới lock, KHÔNG phải path đọc trước lock', async () => {
    const racedPath = `${ORG}/${ARTIFACT_ID}-other.pdf`
    deps.repo.replaceIfWithinQuota.mockResolvedValue({ ...liveRow, storage_path: racedPath })

    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    expect(deps.storage.remove).toHaveBeenCalledTimes(1)
    expect(deps.storage.remove).toHaveBeenCalledWith(racedPath)
  })

  it('remove(object cũ) ném → vẫn trả 200 và log error kèm artifactId + storagePath', async () => {
    deps.storage.remove.mockRejectedValue(new Error('storage down'))

    const result = await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })

    expect(result.id).toBe(ARTIFACT_ID)
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ artifactId: ARTIFACT_ID, storagePath: OLD_PATH }),
      expect.any(String)
    )
  })

  describe('quota tính DELTA — used − old + new', () => {
    const OLD = 3 * 1024 * 1024
    const fileOf = (size: number) => {
      const bytes = Buffer.alloc(size, 0x00)
      Buffer.from('255044462d', 'hex').copy(bytes, 0)
      return fakeFile({ name: 'v2.pdf', size, bytes })
    }

    it('vừa đúng tới trần thì qua — so sánh là >, không phải >=', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES)
      // used − old + new == QUOTA  ⇔  new == old
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fileOf(OLD) })
      ).resolves.toBeDefined()
      expect(deps.storage.put).toHaveBeenCalledOnce()
    })

    it('vượt trần đúng 1 byte → 403 trục byte, KHÔNG byte nào vào bucket', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES)

      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, { file: fileOf(OLD + 1) })
        .catch((e) => e)

      expect(err).toBeInstanceOf(ForbiddenError)
      expect(err.i18nMessage.params.field).toBe('$t(label.storage)')
      expect(deps.storage.put).not.toHaveBeenCalled()
      expect(deps.repo.replaceIfWithinQuota).not.toHaveBeenCalled()
    })

    it('org đã đầy 30 MB vẫn thay được bằng file nhẹ hơn — cộng dồn thì không bao giờ cho', async () => {
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES)
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fileOf(1024) })
      ).resolves.toBeDefined()
    })
  })

  describe('hàm SQL từ chối (null) → gỡ object MỚI, giữ hàng, đọc lại để phân loại', () => {
    beforeEach(() => {
      deps.repo.replaceIfWithinQuota.mockResolvedValue(null)
    })

    const refused = async () =>
      service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() }).catch((e) => e)

    it('object vừa ghi bị gỡ; object CŨ không bị chạm', async () => {
      await refused()
      const newPath = putCall()[0]
      expect(deps.storage.remove).toHaveBeenCalledTimes(1)
      expect(deps.storage.remove).toHaveBeenCalledWith(newPath)
      expect(deps.storage.remove).not.toHaveBeenCalledWith(OLD_PATH)
    })

    it('đọc lại: hàng đã removed → 404', async () => {
      deps.repo.findByIdForOrg
        .mockResolvedValueOnce(liveRow)
        .mockResolvedValueOnce({ ...liveRow, status: 'removed' })
      expect(await refused()).toBeInstanceOf(NotFoundError)
    })

    it('đọc lại: hàng biến mất → 404', async () => {
      deps.repo.findByIdForOrg.mockResolvedValueOnce(liveRow).mockResolvedValueOnce(null)
      expect(await refused()).toBeInstanceOf(NotFoundError)
    })

    it('đọc lại: status đổi sang expired → 409', async () => {
      deps.repo.findByIdForOrg
        .mockResolvedValueOnce(liveRow)
        .mockResolvedValueOnce({ ...liveRow, status: 'expired' })
      const err = await refused()
      expect(err).toBeInstanceOf(ConflictError)
      expect(err.i18nMessage.key).toBe('artifact:update.status_refuses')
    })

    it('đọc lại: hàng vẫn live → thua race quota → 403 trục byte', async () => {
      const err = await refused()
      expect(err).toBeInstanceOf(ForbiddenError)
      expect(err.i18nMessage.params.field).toBe('$t(label.storage)')
    })

    it('gỡ object mới thất bại thì lỗi vẫn là lỗi phân loại, không phải lỗi storage', async () => {
      deps.storage.remove.mockRejectedValue(new Error('storage down'))
      expect(await refused()).toBeInstanceOf(ForbiddenError)
    })
  })

  describe('trạng thái nào được thay (R4)', () => {
    it.each(['blocked', 'quarantined', 'expired', 'scanning'])(
      '%s → 409, không chạm storage',
      async (status) => {
        deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status })
        const err = await service
          .replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })
          .catch((e) => e)
        expect(err).toBeInstanceOf(ConflictError)
        expect(err.i18nMessage.key).toBe('artifact:update.status_refuses')
        expect(deps.storage.put).not.toHaveBeenCalled()
      }
    )

    it('removed → 404 như getForOrg/deleteForOrg, không chạm storage', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(deps.storage.put).not.toHaveBeenCalled()
    })

    it('không thuộc org → 404, không phải 403', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue(null)
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('draft thay được — touch point vẫn null, status vẫn draft', async () => {
      const draft = { ...draftRow, storage_path: OLD_PATH }
      deps.repo.findByIdForOrg.mockResolvedValue(draft)
      deps.repo.replaceIfWithinQuota.mockResolvedValue({ ...draft })
      const result = await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })
      expect(result.status).toBe('draft')
      expect(result.short_url).toBeNull()
      expect(result.touch_point_id).toBeNull()
    })
  })

  describe('kiểm file — tái dùng lớp 1 và lớp 2 của create()', () => {
    it('đuôi không nhận → 400, trước khi đọc byte và trước khi chạm storage', async () => {
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile({ name: 'x.exe' }) })
      ).rejects.toBeInstanceOf(BadRequestError)
      expect(deps.storage.put).not.toHaveBeenCalled()
    })

    it('file rỗng → 400', async () => {
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile({ size: 0 }) })
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('file > 10 MB → 413 (khác create(), cố ý — spec R2), đúng 10 MB thì qua', async () => {
      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, {
          file: fakeFile({ name: 'big.html', size: ARTIFACT_MAX_BYTES + 1 }),
        })
        .catch((e) => e)
      expect(err).toBeInstanceOf(PayloadTooLargeError)
      expect(err.i18nMessage.key).toBe('common:messages.error.field_exceed_limit')
      expect(deps.storage.put).not.toHaveBeenCalled()

      deps.repo.sumSizeBytesByOrg.mockResolvedValue(0)
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, {
          file: fakeFile({ name: 'ok.html', size: ARTIFACT_MAX_BYTES }),
        })
      ).resolves.toBeDefined()
    })

    it('byte không khớp đuôi → 400, storage không bị chạm', async () => {
      await expect(
        service.replaceContent(ORG, USER, ARTIFACT_ID, {
          file: fakeFile({ name: 'fake.pdf', size: 32, body: '<h1>not a pdf</h1>' }),
        })
      ).rejects.toBeInstanceOf(BadRequestError)
      expect(deps.storage.put).not.toHaveBeenCalled()
    })

    it('đổi loại html → pdf được phép: kind và content_type đi theo FORMAT mới (R6)', async () => {
      await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })
      const [, , next] = deps.repo.replaceIfWithinQuota.mock.calls[0]
      expect(next.kind).toBe('pdf')
      expect(next.content_type).toBe('application/pdf')
    })

    it('đổi sang html: content_type kèm charset, storage nhận MIME trần — vết của incident', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, kind: 'pdf' })
      await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile({ name: 'v3.html' }) })
      const [, , next] = deps.repo.replaceIfWithinQuota.mock.calls[0]
      expect(next.content_type).toBe(ARTIFACT_CONTENT_TYPE)
      expect(putCall()[2]).toBe(ARTIFACT_STORAGE_MIME)
    })
  })

  it('thiếu quyền → từ chối TRƯỚC khi đọc hàng; cùng cổng add_touch_point với create/publish', async () => {
    deps.ensurePolicy.mockRejectedValue(new Error('denied'))
    await expect(service.replaceContent(ORG, USER, ARTIFACT_ID, { file: pdf() })).rejects.toThrow(
      'denied'
    )
    expect(deps.ensurePolicy).toHaveBeenCalledWith(ORG, 'add_touch_point')
    expect(deps.repo.findByIdForOrg).not.toHaveBeenCalled()
    expect(deps.storage.put).not.toHaveBeenCalled()
  })

  it('toDTO: updated_at đi ra DTO; hàng chưa có cột thì rơi về created_at', () => {
    expect(service.toDTO({ ...liveRow, updated_at: '2026-10-05T00:00:00.000Z' }).updated_at).toBe(
      '2026-10-05T00:00:00.000Z'
    )
    const { updated_at: _dropped, ...legacy } = liveRow
    void _dropped
    expect(service.toDTO(legacy as any).updated_at).toBe(liveRow.created_at)
  })
})

/**
 * Spec R10. Hai con số phải là ĐÚNG hai truy vấn mà pre-check của create()/publish() dùng — nếu
 * endpoint tự tính kiểu khác, "còn trống 0.2 MB" trên hộp thoại và cú 403 ngay sau đó sẽ nói hai số.
 */
describe('ArtifactService.quotaForOrg', () => {
  it('trả used_bytes từ sumSizeBytesByOrg, live_count từ countLiveByOrg, trần từ hằng', async () => {
    deps.repo.sumSizeBytesByOrg.mockResolvedValue(12_345)
    deps.repo.countLiveByOrg.mockResolvedValue(2)

    await expect(service.quotaForOrg(ORG)).resolves.toEqual({
      used_bytes: 12_345,
      quota_bytes: ARTIFACT_QUOTA_FREE_BYTES,
      live_count: 2,
      live_quota: ARTIFACT_QUOTA_FREE_LIVE,
    })
    expect(deps.repo.sumSizeBytesByOrg).toHaveBeenCalledWith(ORG)
    expect(deps.repo.countLiveByOrg).toHaveBeenCalledWith(ORG)
  })

  it('không chạm storage, không ghi gì', async () => {
    await service.quotaForOrg(ORG)
    expect(deps.storage.put).not.toHaveBeenCalled()
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
    expect(deps.repo.publishIfWithinQuota).not.toHaveBeenCalled()
    expect(deps.repo.replaceIfWithinQuota).not.toHaveBeenCalled()
  })
})

/**
 * Đường MCP `publish_artifact` (spec docs/artifact-wave3-mcp-publish.md R4). Mock repository như mọi test
 * ở trên; điều được chứng minh là THỨ TỰ và BƯỚC BÙ — "Nothing was created" phải đúng ở cả nhánh pre-check
 * lẫn nhánh publish ném.
 */
describe('ArtifactService.createAndPublish', () => {
  const htmlFile = (body = '<!doctype html><h1>v1</h1>') =>
    fakeFile({ name: 'index.html', size: Buffer.byteLength(body, 'utf8'), body })
  const input = () => ({ name: 'Bảng giá T10', file: htmlFile() })

  beforeEach(() => {
    // publish() đọc lại hàng vừa tạo; discardDraft() cũng vậy. Cả hai thấy một nháp chưa có touch point.
    deps.repo.findByIdForOrg.mockResolvedValue({ ...draftRow })
  })

  it('đủ 3 live → 403 quota_live TRƯỚC create: không upload, không hàng, không touch point', async () => {
    deps.repo.countLiveByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_LIVE)

    const error = await rejectionOf(service.createAndPublish(ORG, USER, input()))

    expect(error).toBeInstanceOf(ForbiddenError)
    expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
    expect(error.i18nMessage?.params).toEqual({ limit: ARTIFACT_QUOTA_FREE_LIVE })
    expect(deps.storage.put).not.toHaveBeenCalled()
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
    expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
  })

  it('thành công: countLive → create → publish; trả DTO live với short_url, tên là tên truyền vào', async () => {
    const order: string[] = []
    deps.repo.countLiveByOrg.mockImplementation(async () => {
      order.push('count')
      return 2
    })
    deps.storage.put.mockImplementation(async () => {
      order.push('put')
      return { path: 'p' }
    })
    deps.createTouchPoint.mockImplementation(async () => {
      order.push('touch-point')
      return { id: 'tp-1', short_url: 'https://s.li2.ai/abc', path_qr_code: 'org/qr.svg' }
    })

    const dto = await service.createAndPublish(ORG, USER, {
      ...input(),
      slug: 'bang-gia-t10',
      domain_id: '44444444-4444-4444-8444-444444444444',
    })

    // publish() đếm lại lần hai — pre-check của nó vẫn chạy; cái thêm vào là lần đếm TRƯỚC put.
    expect(order).toEqual(['count', 'put', 'count', 'touch-point'])
    expect(dto.status).toBe('live')
    expect(dto.short_url).toBe('https://s.li2.ai/abc')
    expect(dto.path_qr_code).toBe('org/qr.svg')
    expect(deps.repo.createIfWithinQuota.mock.calls[0][0]).toMatchObject({
      name: 'Bảng giá T10',
      kind: 'html',
      size_bytes: Buffer.byteLength('<!doctype html><h1>v1</h1>'),
    })
    // slug / domain_id đi tới createTouchPoint qua publish(), không bị rơi.
    const [, payload] = deps.createTouchPoint.mock.calls[0] as any[]
    expect(payload.slug).toBe('bang-gia-t10')
    expect(payload.domain_id).toBe('44444444-4444-4444-8444-444444444444')
    expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
  })

  it('không nhận access_mode: publish() không gọi updateAccessForOrg — hàng giữ DEFAULT public', async () => {
    await service.createAndPublish(ORG, USER, input())
    expect(deps.repo.updateAccessForOrg).not.toHaveBeenCalled()
  })

  describe('publish ném → xoá CỨNG nháp, ném lại lỗi gốc', () => {
    const slugTaken = () =>
      new ConflictError('Slug was taken', { key: 'common:messages.error.slug_is_taken' })

    it('slug trùng: storage.remove(path nháp) rồi deleteDraftById(org, id), lỗi là lỗi của publish', async () => {
      deps.createTouchPoint.mockRejectedValue(slugTaken())
      const order: string[] = []
      deps.storage.remove.mockImplementation(async () => void order.push('remove'))
      deps.repo.deleteDraftById.mockImplementation(async () => {
        order.push('delete-row')
        return 1
      })

      const error = await service.createAndPublish(ORG, USER, input()).catch((e) => e)

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.i18nMessage.key).toBe('common:messages.error.slug_is_taken')
      // Object trước, hàng sau — cùng thứ tự với deleteForOrg và cùng lý do.
      expect(order).toEqual(['remove', 'delete-row'])
      expect(deps.storage.remove).toHaveBeenCalledWith(draftRow.storage_path)
      const createdId = (deps.repo.createIfWithinQuota.mock.calls[0][0] as any).id
      expect(deps.repo.deleteDraftById).toHaveBeenCalledWith(ORG, createdId)
      // KHÔNG bia mộ: nháp chưa ai thấy, 410 cho một token chưa công khai là sai.
      expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
    })

    it('thua race slot (publishIfWithinQuota null): gỡ touch point VÀ nháp, lỗi quota_live', async () => {
      deps.repo.publishIfWithinQuota.mockResolvedValue(null)

      const error = await rejectionOf(service.createAndPublish(ORG, USER, input()))

      expect(error.i18nMessage?.key).toBe('artifact:errors.quota_live')
      expect(deps.deleteTouchPoint).toHaveBeenCalledWith(ORG, 'tp-1', USER)
      expect(deps.storage.remove).toHaveBeenCalledWith(draftRow.storage_path)
      expect(deps.repo.deleteDraftById).toHaveBeenCalledOnce()
    })

    it('dọn nháp thất bại (storage.remove ném) → vẫn ném lỗi gốc, hàng KHÔNG bị xoá, log error có id + path', async () => {
      deps.createTouchPoint.mockRejectedValue(slugTaken())
      deps.storage.remove.mockRejectedValue(new Error('storage down'))

      const error = await service.createAndPublish(ORG, USER, input()).catch((e) => e)

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.message).not.toContain('storage down')
      // Object còn thì hàng phải còn: một hàng mất mà object còn là rác không ai tìm được.
      expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
      const [fields] = logError.mock.calls.at(-1) as any[]
      expect(fields.artifactId).toBeTruthy()
      expect(fields.storagePath).toBe(draftRow.storage_path)
    })

    it('deleteDraftById ném → vẫn lỗi gốc', async () => {
      deps.createTouchPoint.mockRejectedValue(slugTaken())
      deps.repo.deleteDraftById.mockRejectedValue(new Error('db down'))

      const error = await service.createAndPublish(ORG, USER, input()).catch((e) => e)
      expect(error).toBeInstanceOf(ConflictError)
    })

    it('hàng đọc lại không còn là nháp (đã có touch point) → không xoá gì', async () => {
      deps.createTouchPoint.mockRejectedValue(slugTaken())
      deps.repo.findByIdForOrg
        .mockResolvedValueOnce({ ...draftRow }) // publish() đọc
        .mockResolvedValueOnce({ ...draftRow, status: 'live', touch_point_id: 'tp-x' }) // discardDraft() đọc

      await service.createAndPublish(ORG, USER, input()).catch(() => undefined)

      expect(deps.storage.remove).not.toHaveBeenCalled()
      expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
    })
  })

  it('create() ném (quota byte) → không có nháp để dọn, không gọi deleteDraftById', async () => {
    deps.repo.sumSizeBytesByOrg.mockResolvedValue(ARTIFACT_QUOTA_FREE_BYTES)

    await expect(service.createAndPublish(ORG, USER, input())).rejects.toBeInstanceOf(
      ForbiddenError
    )
    expect(deps.repo.deleteDraftById).not.toHaveBeenCalled()
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
  })
})

/**
 * R8a — số trong `params` để MCP viết câu lỗi. Key không đổi; chỉ thêm trường.
 */
describe('params số cho MCP (spec mcp-publish R8a)', () => {
  it('create: file > 10 MB → 400 có size_bytes', async () => {
    const err = await service
      .create(ORG, USER, { file: fakeFile({ size: ARTIFACT_MAX_BYTES + 1 }) })
      .catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestError)
    expect(err.i18nMessage.params).toEqual({
      field: '$t(label.file)',
      limit: ARTIFACT_MAX_BYTES / 1024 / 1024,
      size_bytes: ARTIFACT_MAX_BYTES + 1,
    })
  })

  it('create: quota byte → used_bytes / need_bytes / free_bytes cộng dồn', async () => {
    const used = 28 * 1024 * 1024
    deps.repo.sumSizeBytesByOrg.mockResolvedValue(used)
    const body = 'x'.repeat(4 * 1024 * 1024)

    const error = await rejectionOf(
      service.create(ORG, USER, { file: fakeFile({ name: 'p.html', size: body.length, body }) })
    )

    expect(error.i18nMessage?.params).toMatchObject({
      used_bytes: used,
      need_bytes: 4 * 1024 * 1024,
      free_bytes: ARTIFACT_QUOTA_FREE_BYTES - used,
    })
  })

  it('create thua race: số đọc LẠI sau khi bị từ chối, không phải số lúc pre-check', async () => {
    deps.repo.sumSizeBytesByOrg
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(ARTIFACT_QUOTA_FREE_BYTES)
    deps.repo.createIfWithinQuota.mockResolvedValue(null)

    const error = await rejectionOf(service.create(ORG, USER, { file: fakeFile() }))
    expect(error.i18nMessage?.params).toMatchObject({
      used_bytes: ARTIFACT_QUOTA_FREE_BYTES,
      free_bytes: 0,
    })
  })

  describe('replaceContent', () => {
    const OLD = 3 * 1024 * 1024
    const liveRow = { ...draftRow, status: 'live', touch_point_id: 'tp-1', size_bytes: OLD }
    const htmlOf = (size: number) => fakeFile({ name: 'v2.html', size, body: 'x'.repeat(size) })

    beforeEach(() => {
      deps.repo.findByIdForOrg.mockResolvedValue(liveRow)
    })

    it('file > 10 MB → 413 có size_bytes', async () => {
      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, {
          file: fakeFile({ name: 'big.html', size: ARTIFACT_MAX_BYTES + 1 }),
        })
        .catch((e) => e)
      expect(err).toBeInstanceOf(PayloadTooLargeError)
      expect(err.i18nMessage.params.size_bytes).toBe(ARTIFACT_MAX_BYTES + 1)
    })

    it('quota byte → need_bytes là DELTA, free_bytes cộng cả object sắp bị thay', async () => {
      const used = 29 * 1024 * 1024
      deps.repo.sumSizeBytesByOrg.mockResolvedValue(used)

      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, { file: htmlOf(5 * 1024 * 1024) })
        .catch((e) => e)

      expect(err).toBeInstanceOf(ForbiddenError)
      expect(err.i18nMessage.params).toMatchObject({
        need_bytes: 2 * 1024 * 1024,
        free_bytes: ARTIFACT_QUOTA_FREE_BYTES - used + OLD,
      })
    })

    it('removed → 404 với key artifact:errors.removed (khác not_found của id lạ)', async () => {
      deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })
      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, { file: htmlOf(8) })
        .catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect(err.i18nMessage.key).toBe('artifact:errors.removed')

      deps.repo.findByIdForOrg.mockResolvedValue(null)
      const missing = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, { file: htmlOf(8) })
        .catch((e) => e)
      expect(missing.i18nMessage.key).toBe('common:messages.error.not_found')
    })

    it('RPC từ chối rồi đọc lại thấy removed → cũng key removed', async () => {
      deps.repo.replaceIfWithinQuota.mockResolvedValue(null)
      deps.repo.findByIdForOrg
        .mockResolvedValueOnce(liveRow)
        .mockResolvedValueOnce({ ...liveRow, status: 'removed' })
      const err = await service
        .replaceContent(ORG, USER, ARTIFACT_ID, { file: htmlOf(8) })
        .catch((e) => e)
      expect(err.i18nMessage.key).toBe('artifact:errors.removed')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Wave 4 WP1 — getBySlugForOrg, and the second delete that is no longer a plain not_found
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('ArtifactService.getBySlugForOrg', () => {
  const ORG_SLUG = 'khanhqns-organization'
  const liveRow = {
    ...draftRow,
    status: 'live',
    touch_point_id: 'tp-1',
    touch_points: {
      short_url: 'https://s.li2.ai/bang-gia',
      path_qr_code: 'org/qr.svg',
      slug: 'bang-gia-t10',
    },
    organizations: { org_slug: ORG_SLUG },
  }

  beforeEach(() => {
    deps.findOrgSlug.mockResolvedValue(ORG_SLUG)
  })

  it('reads the org slug first, then resolves the artifact through it', async () => {
    // The repository keys on `org_slug` and not on `organization_id` (it is the public serve
    // resolver), so the two-step is forced rather than chosen.
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue(liveRow)

    const dto = await service.getBySlugForOrg(ORG, 'bang-gia-t10')

    expect(deps.findOrgSlug).toHaveBeenCalledWith(ORG)
    expect(deps.repo.findByOrgSlugAndSlug).toHaveBeenCalledWith(ORG_SLUG, 'bang-gia-t10')
    expect(dto.id).toBe(ARTIFACT_ID)
    expect(dto.short_url).toBe('https://s.li2.ai/bang-gia')
  })

  it('an org with no org_slug → 404, and no query at all', async () => {
    // No `org_slug` means the org has no public artifact address, so there is nothing a slug could
    // resolve to. Asking anyway would be a query that cannot match.
    deps.findOrgSlug.mockResolvedValue(null)

    await expect(service.getBySlugForOrg(ORG, 'bang-gia-t10')).rejects.toBeInstanceOf(NotFoundError)
    expect(deps.repo.findByOrgSlugAndSlug).not.toHaveBeenCalled()
  })

  it('an unknown slug → 404', async () => {
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue(null)
    await expect(service.getBySlugForOrg(ORG, 'khong-co')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('⭐ a row belonging to ANOTHER org → 404, never returned', async () => {
    // THE assertion of this method. The repository resolves through the globally unique `slugs`
    // table; this check is what makes a change to either lookup unable to turn a slug into a
    // cross-tenant read. 404 and not 403: whether a row exists elsewhere is not this caller's
    // business.
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue({
      ...liveRow,
      organization_id: '99999999-9999-4999-8999-999999999999',
    })

    await expect(service.getBySlugForOrg(ORG, 'bang-gia-t10')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('a tombstone → 404, exactly as getForOrg answers one', async () => {
    // `findByOrgSlugAndSlug` does NOT filter `removed` (it serves the 410 page), so this branch is
    // the only thing keeping a taken-down artifact out of a tool response.
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue({ ...liveRow, status: 'removed' })

    await expect(service.getBySlugForOrg(ORG, 'bang-gia-t10')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('carries visits, and counts viewers only in google mode', async () => {
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue(liveRow)
    deps.repo.countVisitsByTouchPoints.mockResolvedValue(new Map([['tp-1', 42]]))

    let dto = await service.getBySlugForOrg(ORG, 'bang-gia-t10')
    expect(dto.visits).toBe(42)
    expect(dto.viewer_count).toBeNull()
    expect(deps.viewRepo.countViewersByArtifact).not.toHaveBeenCalled()

    deps.repo.findByOrgSlugAndSlug.mockResolvedValue({ ...liveRow, access_mode: 'google' })
    dto = await service.getBySlugForOrg(ORG, 'bang-gia-t10')
    expect(dto.viewer_count).toBe(4)
  })

  it('a visits count that fails does not fail the read', async () => {
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue(liveRow)
    deps.repo.countVisitsByTouchPoints.mockRejectedValue(new Error('RPC not applied here'))

    const dto = await service.getBySlugForOrg(ORG, 'bang-gia-t10')
    expect(dto.visits).toBe(0)
  })

  it('never leaks the password hash or the access version', async () => {
    deps.repo.findByOrgSlugAndSlug.mockResolvedValue({
      ...liveRow,
      access_mode: 'password',
      password_hash: 'scrypt$14$8$5$salt$hash-of-secret',
    })

    const serialized = JSON.stringify(await service.getBySlugForOrg(ORG, 'bang-gia-t10'))
    expect(serialized).not.toContain('hash')
    expect(serialized).not.toContain('access_version')
  })
})

describe('ArtifactService.deleteForOrg — the two 404s are now distinguishable (WP1 §4)', () => {
  const liveRow = { ...draftRow, status: 'live', touch_point_id: 'tp-1' }

  it('⭐ a second delete throws artifact:errors.removed, NOT the generic not_found', async () => {
    // Before this wave both branches threw the same `common:messages.error.not_found`, so MCP could
    // not tell "already gone" (a success for the agent) from "no such id" (a real error, possibly a
    // typo or another org's id). The STATUS is unchanged at 404 — the human-facing route maps the key
    // back so the toast a user sees is byte-identical to before.
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'removed' })

    const error = await service.deleteForOrg(ORG, USER, ARTIFACT_ID).catch((e) => e)
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.status).toBe(404)
    expect(error.i18nMessage.key).toBe('artifact:errors.removed')

    // And still nothing touched: `artifact-storage.remove` throws on a missing object, which would
    // turn a completed delete into a 500.
    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.markRemovedForOrg).not.toHaveBeenCalled()
  })

  it('an id that does not exist still throws the GENERIC not_found', async () => {
    // The other half of the same change: if this one drifted to `artifact:errors.removed`, a delete
    // of a mistyped id would come back as `already_removed: true` through MCP — success for a row
    // that was never touched.
    deps.repo.findByIdForOrg.mockResolvedValue(null)

    const error = await service.deleteForOrg(ORG, USER, ARTIFACT_ID).catch((e) => e)
    expect(error.status).toBe(404)
    expect(error.i18nMessage.key).toBe('common:messages.error.not_found')
  })
})
