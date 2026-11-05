/**
 * ============================================================================
 * LAYER 3, the malware gate, as `create()` / `replaceContent()` wire it up (spec WP2).
 * ============================================================================
 *
 * `clamav-client` IS mocked here — its own wire behaviour is covered against a real socket in
 * `src/__tests__/unit/scan/clamav-client.test.ts`. What this file is for is the three things only the
 * service decides:
 *
 *  1. WHAT DOES NOT HAPPEN on a refusal. No `storage.put`, no row, no touch point, no quota movement.
 *     Every one of those is asserted negatively, because "nothing was created" is a promise the MCP
 *     refusal makes to an agent in those words.
 *  2. THAT THE TWO FAILURES ARE DIFFERENT. `infected` is 400 with `scan_infected`, everything else is
 *     503 with `scan_unavailable`. A user has to be able to tell "your file" from "our scanner".
 *  3. WHERE IN THE ORDER IT SITS. The cheap local checks must refuse before the scan is paid for.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://app.li2.ai'

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

const logWarn = vi.fn()
const logError = vi.fn()
const logInfo = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: () => ({
      warn: (...args: any[]) => logWarn(...args),
      error: (...args: any[]) => logError(...args),
      info: (...args: any[]) => logInfo(...args),
    }),
  },
}))

const scanBuffer = vi.fn()
vi.mock('@/infrastructure/scan/clamav-client', () => ({
  scanBuffer: (...args: any[]) => scanBuffer(...args),
}))

import { ArtifactService } from '@/core/services/artifact.service'
import { ARTIFACT_CONTENT_TYPE, ARTIFACT_FORMATS } from '@/core/types/artifact.type'
import { ClamavConfigError } from '@/infrastructure/scan/config'
import {
  BadRequestError,
  ServiceUnavailableError,
} from '@/infrastructure/response/errors/domain.errors'

const ORG = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333'

const CLEAN = { ok: true, durationMs: 12 }
const SKIPPED = { ok: true, skipped: true, durationMs: 0 }
const INFECTED = {
  ok: false,
  reason: 'infected',
  signature: 'Eicar-Test-Signature',
  durationMs: 31,
}
/** A password-protected PDF: FOUND on the wire, but nothing was ever scanned. */
const ENCRYPTED = {
  ok: false,
  reason: 'encrypted',
  signature: 'Heuristics.Encrypted.PDF',
  durationMs: 18,
}

const fakeFile = (overrides: Partial<{ name: string; size: number; bytes: Buffer }> = {}) => {
  const { name = 'page.html', bytes = Buffer.from('<h1>hi</h1>', 'utf8') } = overrides
  const size = overrides.size ?? bytes.byteLength
  return {
    name,
    size,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  }
}

/** A head that satisfies a format's signature, so layer 2 passes and layer 3 is reached. */
const bytesFor = (extension: string) => {
  const format = ARTIFACT_FORMATS.find((f) => f.extension === extension)!
  const head = Buffer.alloc(64, 0x00)
  // Biến thể ĐẦU TIÊN là đủ để qua cổng — `matchesMagic` là OR giữa các biến thể.
  for (const { offset, hex } of format.magic[0] ?? []) Buffer.from(hex, 'hex').copy(head, offset)
  return head
}

const liveRow = {
  id: ARTIFACT_ID,
  organization_id: ORG,
  user_id: USER,
  name: 'My page',
  kind: 'html',
  status: 'live',
  serve_token: 'abcdef0123456789',
  storage_path: `${ORG}/${ARTIFACT_ID}.html`,
  content_type: ARTIFACT_CONTENT_TYPE,
  size_bytes: 11,
  touch_point_id: 'tp-1' as string | null,
  created_at: '2026-10-21T00:00:00.000Z',
  updated_at: '2026-10-21T00:00:00.000Z',
  access_mode: 'public',
  password_hash: null as string | null,
  access_version: 1,
  password_set_at: null as string | null,
  touch_points: { short_url: 'https://s.li2.ai/abc', path_qr_code: 'org/qr.png', slug: 'abc' },
}

const makeDeps = () => ({
  repo: {
    createIfWithinQuota: vi.fn(async (row: any) => ({ ...liveRow, ...row, status: 'draft' })),
    publishIfWithinQuota: vi.fn(async (_orgId: string, id: string, tpId: string) => ({
      ...liveRow,
      id,
      touch_point_id: tpId,
    })),
    replaceIfWithinQuota: vi.fn(async () => ({ ...liveRow })),
    findByIdForOrg: vi.fn(async () => ({ ...liveRow })),
    findByOrgSlugAndSlug: vi.fn(),
    listByOrg: vi.fn(),
    countLiveByOrg: vi.fn(async () => 0),
    sumSizeBytesByOrg: vi.fn(async () => 0),
    markRemovedForOrg: vi.fn(async () => 1),
    deleteDraftById: vi.fn(async () => 1),
    countVisitsByTouchPoints: vi.fn(async () => new Map<string, number>()),
    touchUpdatedAtForOrg: vi.fn(async () => 1),
    updateAccessForOrg: vi.fn(async () => ({ ...liveRow })),
  },
  hashPassword: vi.fn(async (plain: string) => `hash-of-${plain}`),
  hasGoogleClient: vi.fn(() => false),
  viewRepo: { countViewersByArtifact: vi.fn(async () => 0) },
  storage: { put: vi.fn(async () => ({ path: 'p' })), remove: vi.fn(async () => undefined) },
  createTouchPoint: vi.fn(async () => ({
    id: 'tp-1',
    short_url: 'https://s.li2.ai/abc',
    path_qr_code: 'org/qr.png',
  })),
  deleteTouchPoint: vi.fn(async () => 1),
  updateTouchPoint: vi.fn(async () => ({ id: 'tp-1', slug: 'abc' })),
  ensurePolicy: vi.fn(async () => undefined),
  ensureDeletePolicy: vi.fn(async () => 'ALL'),
  findOrgSlug: vi.fn(async (): Promise<string | null> => null),
})

let deps: ReturnType<typeof makeDeps>
let service: ArtifactService

beforeEach(() => {
  deps = makeDeps()
  service = new ArtifactService(deps as any)
  scanBuffer.mockReset()
  scanBuffer.mockResolvedValue(CLEAN)
  logWarn.mockClear()
  logError.mockClear()
  logInfo.mockClear()
})

/** The whole point of a gate before `storage.put`: nothing downstream of it ran. */
const expectNothingWritten = () => {
  expect(deps.storage.put).not.toHaveBeenCalled()
  expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  expect(deps.repo.replaceIfWithinQuota).not.toHaveBeenCalled()
  expect(deps.createTouchPoint).not.toHaveBeenCalled()
}

describe('create() — a file clamd refuses', () => {
  it('throws 400 scan_infected, and nothing reaches storage or the database', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_infected')
    expectNothingWritten()
  })

  it('does not put the signature name in anything the client can read', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    // `BaseError.toResponse()` sends `message` and `i18nMessage` to the browser. Naming the rule the
    // file tripped would tell whoever wanted it through exactly what to change (spec WP2 §5).
    expect(JSON.stringify(await error.toResponse().json())).not.toContain('Eicar')
    // It IS logged — that is the only record of who was refused for what, which is the mitigation
    // for the top risk in the spec (a false positive on legitimate customer content).
    expect(JSON.stringify(logWarn.mock.calls)).toContain('Eicar-Test-Signature')
  })

  it('scans the whole buffer, and tells the scanner which org it is for', async () => {
    const bytes = Buffer.from('<h1>hello world</h1>', 'utf8')

    await service.create(ORG, USER, { file: fakeFile({ bytes }) })

    expect(scanBuffer).toHaveBeenCalledOnce()
    const [scanned, meta] = scanBuffer.mock.calls[0]
    expect(Buffer.isBuffer(scanned)).toBe(true)
    expect((scanned as Buffer).equals(bytes)).toBe(true)
    expect(meta).toEqual({ orgId: ORG, artifactId: undefined })
  })
})

/**
 * A THIRD OUTCOME, and the reason it exists: `AlertEncryptedArchive` / `AlertEncryptedDoc` make clamd
 * answer FOUND for a password-protected PDF — something a user is perfectly entitled to upload. Both
 * refusals are 400, so only the KEY tells the two apart, and the key is what picks the sentence the
 * user reads. Getting it wrong tells someone with a legitimate document that it contains malware.
 */
describe('create() — a file protected by a password', () => {
  it('throws 400 scan_encrypted, not scan_infected, and nothing is written', async () => {
    scanBuffer.mockResolvedValue(ENCRYPTED)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_encrypted')
    expectNothingWritten()
  })

  it('says nothing about malware anywhere the client can read', async () => {
    scanBuffer.mockResolvedValue(ENCRYPTED)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)
    const sent = JSON.stringify(await error.toResponse().json())

    expect(sent).not.toMatch(/malware|virus|infected/i)
    // Same rule as a signature match: the name of the heuristic stays out of the response.
    expect(sent).not.toContain('Heuristics')
  })

  it('is logged at info with the signature, not at warn — it is not a malware hit', async () => {
    scanBuffer.mockResolvedValue(ENCRYPTED)

    await service.create(ORG, USER, { file: fakeFile() }).catch(() => undefined)

    expect(logWarn).not.toHaveBeenCalled()
    expect(JSON.stringify(logInfo.mock.calls)).toContain('Heuristics.Encrypted.PDF')
  })

  it.each([
    ['Heuristics.Encrypted.Zip'],
    ['Heuristics.Encrypted.RAR'],
    ['heuristics.encrypted.pdf'],
    // A variant that does not exist yet must not fall back to "malware" at this layer either.
    ['Heuristics.Encrypted.Foo'],
  ])('%s → scan_encrypted', async (signature) => {
    // The classification itself lives in the client, so the service is handed `reason` already
    // decided. Driving the real client here would mean a socket; what this asserts is that every
    // variant arrives on the branch that produces the password sentence.
    scanBuffer.mockResolvedValue({ ok: false, reason: 'encrypted', signature, durationMs: 9 })

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_encrypted')
  })

  it('a real signature match still answers scan_infected — the split did not swallow it', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_infected')
  })

  it('replaceContent() → 400 scan_encrypted, and the live content survives', async () => {
    scanBuffer.mockResolvedValue(ENCRYPTED)

    const error = await service
      .replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })
      .catch((e) => e)

    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_encrypted')
    expect(deps.storage.put).not.toHaveBeenCalled()
    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.replaceIfWithinQuota).not.toHaveBeenCalled()
  })
})

describe('create() — the scan did not produce a verdict (fail closed)', () => {
  it.each([
    ['unavailable', { ok: false, reason: 'unavailable', detail: 'ECONNREFUSED', durationMs: 3 }],
    [
      'timeout',
      { ok: false, reason: 'timeout', detail: 'no answer in 15000 ms', durationMs: 15000 },
    ],
    ['too-large', { ok: false, reason: 'too-large', detail: 'size limit', durationMs: 40 }],
  ])('%s → 503 scan_unavailable, nothing written', async (_label, verdict) => {
    scanBuffer.mockResolvedValue(verdict)

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error).toBeInstanceOf(ServiceUnavailableError)
    expect(error.status).toBe(503)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_unavailable')
    expectNothingWritten()
  })

  it('a misconfigured CLAMAV_* env is 503 too, not a 500', async () => {
    // The gate was asked for and cannot be provided. Refusing is right; crashing would read as a bug
    // in this code path rather than as an operator mistake, and the log line names the variable.
    scanBuffer.mockRejectedValue(new ClamavConfigError('CLAMAV_HOST is empty'))

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error.status).toBe(503)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_unavailable')
    expect(JSON.stringify(logError.mock.calls)).toContain('CLAMAV_HOST')
    expectNothingWritten()
  })

  it('an error that is NOT about the scanner is not disguised as a scan outage', async () => {
    // A bug inside the client must keep its own identity: turning every throw into "try again in a
    // few minutes" would hide a real defect behind a sentence that invites a retry forever.
    scanBuffer.mockRejectedValue(new TypeError('buffer is not a Buffer'))

    const error = await service.create(ORG, USER, { file: fakeFile() }).catch((e) => e)

    expect(error).toBeInstanceOf(TypeError)
  })
})

describe('create() — a clean file, and a gate that is off', () => {
  it('clean → the pre-scan flow runs unchanged and a draft comes back', async () => {
    const dto = await service.create(ORG, USER, { file: fakeFile() })

    expect(dto.status).toBe('draft')
    expect(deps.storage.put).toHaveBeenCalledOnce()
    expect(deps.repo.createIfWithinQuota).toHaveBeenCalledOnce()
  })

  it('CLAMAV_ENABLED=false → skipped, upload succeeds, and NO warning is logged', async () => {
    scanBuffer.mockResolvedValue(SKIPPED)

    const dto = await service.create(ORG, USER, { file: fakeFile() })

    expect(dto.status).toBe('draft')
    expect(deps.storage.put).toHaveBeenCalledOnce()
    // This is the assertion that protects production on merge day: the default configuration must
    // behave exactly as it did before this feature, including in the logs. A per-upload warning for
    // the default is how the warnings that matter get ignored.
    expect(logWarn).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
  })
})

describe('the order of the layers — the cheap checks refuse before the expensive one', () => {
  it('an .exe renamed .pdf is refused by magic bytes, and clamd is never called', async () => {
    const exe = Buffer.alloc(64, 0x00)
    Buffer.from('MZ', 'ascii').copy(exe, 0)

    const error = await service
      .create(ORG, USER, { file: fakeFile({ name: 'invoice.pdf', bytes: exe }) })
      .catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.i18nMessage?.key).toBe('common:messages.error.invalid_file_type')
    expect(scanBuffer).not.toHaveBeenCalled()
  })

  it.each([
    ['an unsupported extension', { name: 'notes.txt' }],
    ['an empty file', { name: 'page.html', size: 0 }],
  ])('%s is refused without a round trip to clamd', async (_label, overrides) => {
    await service.create(ORG, USER, { file: fakeFile(overrides) }).catch(() => undefined)

    expect(scanBuffer).not.toHaveBeenCalled()
  })

  it('a refused upload does not move the quota — it is never even read', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    await service.create(ORG, USER, { file: fakeFile() }).catch(() => undefined)

    // `sum(size_bytes)` is computed over rows, and no row was written, so usage cannot have changed.
    // Asserting the read never happened is the stronger statement: the gate is upstream of the whole
    // quota conversation, so there is no path where a refused upload bills an org.
    expect(deps.repo.sumSizeBytesByOrg).not.toHaveBeenCalled()
    expect(deps.repo.createIfWithinQuota).not.toHaveBeenCalled()
  })

  it('a .pdf whose bytes are a real PDF reaches the scanner', async () => {
    await service.create(ORG, USER, {
      file: fakeFile({ name: 'deck.pdf', bytes: bytesFor('.pdf') }),
    })

    expect(scanBuffer).toHaveBeenCalledOnce()
  })
})

describe('replaceContent() — the live content must survive a refusal', () => {
  it('infected → 400, the old object is NOT deleted and the row is untouched', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    const error = await service
      .replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })
      .catch((e) => e)

    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_infected')
    expect(deps.storage.put).not.toHaveBeenCalled()
    // The one that matters most here: a QR code already printed keeps resolving to the old page.
    expect(deps.storage.remove).not.toHaveBeenCalled()
    expect(deps.repo.replaceIfWithinQuota).not.toHaveBeenCalled()
  })

  it('unavailable → 503, same guarantee', async () => {
    scanBuffer.mockResolvedValue({ ok: false, reason: 'unavailable', durationMs: 2 })

    const error = await service
      .replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })
      .catch((e) => e)

    expect(error.status).toBe(503)
    expect(deps.storage.put).not.toHaveBeenCalled()
    expect(deps.storage.remove).not.toHaveBeenCalled()
  })

  it('names the artifact being replaced in the scan metadata', async () => {
    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })

    expect(scanBuffer.mock.calls[0][1]).toEqual({ orgId: ORG, artifactId: ARTIFACT_ID })
  })

  it('clean → the replace runs through, old object removed as before', async () => {
    await service.replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })

    expect(deps.storage.put).toHaveBeenCalledOnce()
    expect(deps.repo.replaceIfWithinQuota).toHaveBeenCalledOnce()
    expect(deps.storage.remove).toHaveBeenCalledWith(liveRow.storage_path)
  })

  it('a status that refuses a replace is answered before the scan is paid for', async () => {
    deps.repo.findByIdForOrg.mockResolvedValue({ ...liveRow, status: 'quarantined' } as any)

    await service
      .replaceContent(ORG, USER, ARTIFACT_ID, { file: fakeFile() })
      .catch(() => undefined)

    expect(scanBuffer).not.toHaveBeenCalled()
  })
})

describe('createAndPublish() — the MCP path inherits the gate, it does not repeat it', () => {
  it('infected → 400, and no touch point, link or QR is ever minted', async () => {
    scanBuffer.mockResolvedValue(INFECTED)

    const error = await service
      .createAndPublish(ORG, USER, { file: fakeFile(), name: 'My page' })
      .catch((e) => e)

    expect(error.status).toBe(400)
    expect(error.i18nMessage?.key).toBe('artifact:errors.scan_infected')
    expect(deps.createTouchPoint).not.toHaveBeenCalled()
    expect(deps.repo.publishIfWithinQuota).not.toHaveBeenCalled()
    expectNothingWritten()
  })

  it('scans ONCE, not twice — the gate lives in create(), not in both', async () => {
    // `publish()` re-reads the row it is about to flip, and the default fixture is already `live`.
    deps.repo.findByIdForOrg.mockResolvedValue({
      ...liveRow,
      status: 'draft',
      touch_point_id: null,
      touch_points: null,
    } as any)

    await service.createAndPublish(ORG, USER, { file: fakeFile(), name: 'My page' })

    // A second layer here would double the latency of every `publish_artifact` call to re-check the
    // bytes it just checked.
    expect(scanBuffer).toHaveBeenCalledOnce()
  })
})
