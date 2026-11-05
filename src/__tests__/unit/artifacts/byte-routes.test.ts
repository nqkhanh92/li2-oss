import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const getLiveTargetByToken = vi.fn()
const streamBytes = vi.fn()

vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: {
    getLiveTargetByToken: (...args: any[]) => getLiveTargetByToken(...args),
    streamBytes: (...args: any[]) => streamBytes(...args),
  },
}))
const evaluateGate = vi.fn()
vi.mock('@/core/services/artifact-gate.service', () => ({
  artifactGateService: { evaluateGate: (...args: any[]) => evaluateGate(...args) },
}))

import { NextRequest } from 'next/server'
import { GET as fileGET } from '@/app/(artifact)/a/[token]/file/route'
import { dynamic as fileDynamic } from '@/app/(artifact)/a/[token]/file/route'
import { GET as downloadGET } from '@/app/(artifact)/a/[token]/download/route'
import { dynamic as downloadDynamic } from '@/app/(artifact)/a/[token]/download/route'
import { dynamic as serveDynamic } from '@/app/(artifact)/a/[token]/route'

const TOKEN = 'abcdef0123456789'

const target = (over: Record<string, unknown> = {}) => ({
  id: 'artifact-1',
  serveToken: TOKEN,
  kind: 'video',
  storagePath: 'org-1/artifact-1.mp4',
  contentType: 'video/mp4',
  name: 'Video giới thiệu',
  sizeBytes: 4096,
  access: { mode: 'public', passwordHash: null, accessVersion: 1, organizationId: 'org-1' },
  ...over,
})

const streamOf = (over: Record<string, unknown> = {}) => ({
  status: 206,
  body: new Response(new Uint8Array([0, 1, 2, 3])).body,
  contentLength: '4',
  contentRange: 'bytes 0-3/4096',
  acceptRanges: 'bytes',
  ...over,
})

const callFile = (headers: Record<string, string> = {}) =>
  fileGET(new NextRequest(`https://app.li2.ai/a/${TOKEN}/file`, { headers }), {
    params: { token: TOKEN },
  })

const callDownload = () =>
  downloadGET(new NextRequest(`https://app.li2.ai/a/${TOKEN}/download`), {
    params: { token: TOKEN },
  })

beforeEach(() => {
  vi.clearAllMocks()
  evaluateGate.mockResolvedValue({ kind: 'allow' })
})

/**
 * R10 — cùng cổng với `/a/<token>`, nhưng KHÔNG HTML: `<video>` và trình tải không hiển thị được
 * form. Chặn → 401 (hoặc 403 khi đã biết danh tính), body rỗng, header giữ đúng hình của byte route.
 */
describe('cổng trên byte route', () => {
  const refusals = [
    [{ kind: 'password-required', hint: 'none' }, 401],
    [{ kind: 'locked', retryAfterSeconds: 600 }, 401],
    [{ kind: 'private-login' }, 401],
    [{ kind: 'google-required', hint: 'none' }, 401],
    [{ kind: 'unavailable' }, 401],
    [{ kind: 'private-denied', email: 'x@y.z' }, 403],
  ] as const

  it.each(refusals)('/file: verdict %j → %i không body, không stream', async (verdict, status) => {
    getLiveTargetByToken.mockResolvedValue(target())
    evaluateGate.mockResolvedValue(verdict)

    const res = await callFile({ range: 'bytes=0-3' })

    expect(res.status).toBe(status)
    expect(res.body).toBeNull()
    expect(await res.text()).toBe('')
    expect(streamBytes).not.toHaveBeenCalled()
    expect(res.headers.get('content-security-policy')).toContain("media-src 'self'")
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toBeNull()
  })

  it.each(refusals)('/download: verdict %j → %i không body', async (verdict, status) => {
    getLiveTargetByToken.mockResolvedValue(target())
    evaluateGate.mockResolvedValue(verdict)

    const res = await callDownload()

    expect(res.status).toBe(status)
    expect(res.body).toBeNull()
    expect(res.headers.get('content-disposition')).toBeNull()
    expect(streamBytes).not.toHaveBeenCalled()
  })

  it('cổng nhận request thật (để đọc cookie) và target của hàng', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf())
    await callFile({ cookie: 'artifact_viewer=abc' })
    expect(evaluateGate).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ id: 'artifact-1' })
    )
    expect(
      (evaluateGate.mock.calls[0][0] as NextRequest).cookies.get('artifact_viewer')?.value
    ).toBe('abc')
  })

  it('⭐ A12: removed → 404 trước cổng — cổng không được hỏi', async () => {
    getLiveTargetByToken.mockResolvedValue(null)
    expect((await callFile()).status).toBe(404)
    expect((await callDownload()).status).toBe(404)
    expect(evaluateGate).not.toHaveBeenCalled()
  })
})

describe('GET /a/[token]/file', () => {
  it('404 khi không có gì để phục vụ — không phân biệt token sai với artifact draft', async () => {
    getLiveTargetByToken.mockResolvedValue(null)
    expect((await callFile()).status).toBe(404)

    vi.clearAllMocks()
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(null)
    expect((await callFile()).status).toBe(404)
  })

  /**
   * The whole contract of this route: the client's Range goes to storage untouched. Nothing here
   * parses it, so nothing here can disagree with what storage computed.
   */
  it('forward NGUYÊN VĂN header Range của client xuống service', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf())

    await callFile({ range: 'bytes=1024-2047' })

    expect(streamBytes).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'artifact-1' }),
      'bytes=1024-2047'
    )
  })

  it('không có Range → truyền null, không bịa ra một khoảng', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf({ status: 200, contentRange: null }))

    await callFile()

    expect(streamBytes).toHaveBeenCalledWith(expect.anything(), null)
  })

  it('206 của storage đi ra nguyên vẹn: status + Content-Range + Content-Length', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf())

    const res = await callFile({ range: 'bytes=0-3' })

    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-3/4096')
    expect(res.headers.get('content-length')).toBe('4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-disposition')).toBe('inline')
  })

  it('200 khi không có Range, vẫn quảng cáo Accept-Ranges: bytes', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(
      streamOf({ status: 200, contentRange: null, contentLength: '4096' })
    )

    const res = await callFile()

    expect(res.status).toBe(200)
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('content-range')).toBeNull()
  })

  /**
   * `Content-Range: bytes * /<total>` is what lets a player recover: it learns the real length and
   * its next request is in range. Without it the player retries the same bad range.
   */
  it('416 mang theo Content-Range bytes */<size> lấy từ size_bytes của hàng, không HEAD lên storage', async () => {
    getLiveTargetByToken.mockResolvedValue(target({ sizeBytes: 4096 }))
    // contentRange deliberately null: the total must come from the ROW, not from storage echoing it
    // back. Forwarding storage's header here would hide the fact that we never need a HEAD request.
    streamBytes.mockResolvedValue(streamOf({ status: 416, body: null, contentRange: null }))

    const res = await callFile({ range: 'bytes=99999-' })

    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBe('bytes */4096')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('bốn header không phụ thuộc kind và CSP có mặt trên cả byte route', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf())

    const res = await callFile({ range: 'bytes=0-3' })

    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('content-security-policy')).toContain("media-src 'self'")
  })

  it('body ra ngoài vẫn là stream, không bị đọc hết thành buffer', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf())

    const res = await callFile({ range: 'bytes=0-3' })

    expect(res.body).toBeInstanceOf(ReadableStream)
  })
})

describe('GET /a/[token]/download', () => {
  it('404 khi không có gì để phục vụ', async () => {
    getLiveTargetByToken.mockResolvedValue(null)
    expect((await callDownload()).status).toBe(404)
  })

  it('KHÔNG hỏi Range — download không cần nó', async () => {
    getLiveTargetByToken.mockResolvedValue(target())
    streamBytes.mockResolvedValue(streamOf({ status: 200, contentRange: null }))

    await callDownload()

    expect(streamBytes).toHaveBeenCalledWith(expect.anything(), null)
  })

  it('attachment với TÊN ARTIFACT, không phải serve token, và có dấu tiếng Việt', async () => {
    getLiveTargetByToken.mockResolvedValue(target({ name: 'Báo giá tháng 9' }))
    streamBytes.mockResolvedValue(streamOf({ status: 200, contentRange: null }))

    const res = await callDownload()
    const disposition = res.headers.get('content-disposition')!

    expect(disposition).toMatch(/^attachment; /)
    expect(disposition).toContain("filename*=UTF-8''B%C3%A1o%20gi%C3%A1%20th%C3%A1ng%209.mp4")
    expect(disposition).not.toContain(TOKEN)
  })

  it('đuôi file lấy từ storage_path, nên .ppt và .pptx không lẫn nhau', async () => {
    for (const extension of ['.ppt', '.pptx']) {
      vi.clearAllMocks()
      getLiveTargetByToken.mockResolvedValue(
        target({ kind: 'slides', storagePath: `org-1/artifact-1${extension}`, name: 'Deck' })
      )
      streamBytes.mockResolvedValue(streamOf({ status: 200, contentRange: null }))

      expect((await callDownload()).headers.get('content-disposition')).toContain(
        `filename="Deck${extension}"`
      )
    }
  })
})

/**
 * Both byte routes stream. `base-server.js` takes the `isSSG` branch for a route without this export
 * and buffers the whole body via `response.blob()` to cache it — a 10MB video resident in memory,
 * with no test and no log line to say so. This assertion is the only thing that notices.
 */
describe('force-dynamic trên cả ba route', () => {
  it('cả ba export dynamic = force-dynamic', () => {
    expect(serveDynamic).toBe('force-dynamic')
    expect(fileDynamic).toBe('force-dynamic')
    expect(downloadDynamic).toBe('force-dynamic')
  })
})

/**
 * `/a/*` must stay OUT of the middleware matcher. Adding it to `publicPath` instead would make an
 * authenticated route public; dropping the path out of the matcher is the only safe way. The two new
 * byte routes are covered by the same `a/` alternative — this asserts it rather than assuming it.
 */
describe('middleware matcher loại cả ba route /a/*', () => {
  const matcher = () => {
    const source = readFileSync(resolve(process.cwd(), 'src/middleware.ts'), 'utf8')
    const pattern = source.match(/'(\/\(\(\?!.*?\).\*\))'/)?.[1]
    expect(pattern, 'không tìm được matcher trong src/middleware.ts').toBeTruthy()
    return new RegExp(`^${pattern!.replace(/\\\\/g, '\\')}$`)
  }

  it('không khớp /a/<token>, /a/<token>/file, /a/<token>/download', () => {
    const re = matcher()
    for (const path of [`/a/${TOKEN}`, `/a/${TOKEN}/file`, `/a/${TOKEN}/download`])
      expect(re.test(path), path).toBe(false)
  })

  it('vẫn khớp một route dashboard bình thường — matcher chưa bị nới quá tay', () => {
    expect(matcher().test('/org/abc/artifacts')).toBe(true)
  })
})
