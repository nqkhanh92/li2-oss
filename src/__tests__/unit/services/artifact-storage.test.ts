import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.SUPABASE_URL = 'https://supa.example.test'
process.env.SUPABASE_SERVICE_KEY = 'service-key-for-tests'

const download = vi.fn()
const createSignedUrl = vi.fn()
const upload = vi.fn()
const removeFn = vi.fn()
const from = vi.fn((_bucket: string) => ({ download, createSignedUrl, upload, remove: removeFn }))

vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: { storage: { from: (bucket: string) => from(bucket) } },
}))

import {
  ARTIFACT_BUCKET,
  createSignedUrlFor,
  get,
  getBytes,
  getRangeStream,
  remove,
} from '@/infrastructure/storage/artifact-storage'
import { AppError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'

/**
 * Bytes that are NOT valid UTF-8: the JPEG start-of-image marker. Any binary format contains
 * sequences like this — 0xFF is never a legal UTF-8 lead byte.
 */
const BINARY = Buffer.from([0xff, 0xd8, 0xff, 0xe0])

const blobOf = (buf: Buffer) => new Blob([new Uint8Array(buf)])

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('getBytes vs get — they are not interchangeable', () => {
  /**
   * This is the whole point of B1. `get()` existed first and returns `data.text()`, which was
   * correct while html was the only kind. The two are kept apart by this pair of assertions: if
   * someone "simplifies" the serve path back to one function, one of them goes red.
   */
  it('getBytes trả đúng từng byte của một file nhị phân', async () => {
    download.mockResolvedValue({ data: blobOf(BINARY), error: null })

    const bytes = await getBytes('org/a.pdf')

    expect(from).toHaveBeenCalledWith(ARTIFACT_BUCKET)
    expect(Buffer.compare(bytes, BINARY)).toBe(0)
  })

  it('get() (text) LÀM HỎNG chính những byte đó — thầm lặng, không ném lỗi', async () => {
    download.mockResolvedValue({ data: blobOf(BINARY), error: null })

    const text = await get('org/a.pdf')
    const roundTripped = Buffer.from(text, 'utf8')

    expect(Buffer.compare(roundTripped, BINARY)).not.toBe(0)
    // U+FFFD REPLACEMENT CHARACTER: the decoder swallowed the bytes and said nothing.
    expect(text).toContain('�')
  })

  it('getBytes ném NotFoundError khi storage báo lỗi', async () => {
    download.mockResolvedValue({ data: null, error: { message: 'Object not found' } })
    await expect(getBytes('org/missing.pdf')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('getRangeStream', () => {
  const storageAnswer = (
    buf: Buffer,
    status: number,
    headers: Record<string, string> = {}
  ) => new Response(status === 416 ? null : new Uint8Array(buf), { status, headers })

  const stubFetch = (response: Response) => {
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('forward NGUYÊN VĂN header Range của client và dùng service key', async () => {
    const fetchMock = stubFetch(storageAnswer(BINARY, 206, { 'content-range': 'bytes 0-3/4096' }))

    await getRangeStream('org/clip.mp4', 'bytes=0-3')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://supa.example.test/storage/v1/object/authenticated/artifact-content/org/clip.mp4'
    )
    // Verbatim: not re-serialised from parsed numbers, which is how a second implementation of the
    // same arithmetic gets the chance to disagree with the first.
    expect(init.headers.Range).toBe('bytes=0-3')
    expect(init.headers.Authorization).toBe('Bearer service-key-for-tests')
    expect(init.headers.apikey).toBe('service-key-for-tests')
  })

  it('một Range dạng bytes=100- (không có cận trên) đi qua y nguyên', async () => {
    const fetchMock = stubFetch(storageAnswer(BINARY, 206, { 'content-range': 'bytes 100-199/200' }))

    await getRangeStream('org/clip.mp4', 'bytes=100-')

    expect(fetchMock.mock.calls[0][1].headers.Range).toBe('bytes=100-')
  })

  it('không có Range → KHÔNG gửi header Range nào cả', async () => {
    const fetchMock = stubFetch(storageAnswer(BINARY, 200))

    const stream = await getRangeStream('org/clip.mp4', null)

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Range')
    expect(stream.status).toBe(200)
  })

  it('trả lại status và ba header của storage, không tự tính lại', async () => {
    stubFetch(
      storageAnswer(BINARY, 206, {
        'content-range': 'bytes 0-3/4096',
        'content-length': '4',
        'accept-ranges': 'bytes',
      })
    )

    const stream = await getRangeStream('org/clip.mp4', 'bytes=0-3')

    expect(stream.status).toBe(206)
    expect(stream.contentRange).toBe('bytes 0-3/4096')
    expect(stream.contentLength).toBe('4')
    expect(stream.acceptRanges).toBe('bytes')
  })

  /**
   * The body must arrive as a stream, not a Buffer. If someone "simplifies" this back to
   * `await response.arrayBuffer()` the whole 10MB lands in memory and nothing else fails.
   */
  it('body là ReadableStream, KHÔNG phải Buffer đã đọc hết', async () => {
    stubFetch(storageAnswer(BINARY, 206, { 'content-range': 'bytes 0-3/4' }))

    const stream = await getRangeStream('org/clip.mp4', 'bytes=0-3')

    expect(stream.body).toBeInstanceOf(ReadableStream)
    expect(Buffer.compare(Buffer.from(await new Response(stream.body).arrayBuffer()), BINARY)).toBe(0)
  })

  /**
   * A player seeking past the end of a file is normal traffic, not a failure. Turning it into a
   * throw would make it a 500 and a log line for something the player recovers from by itself.
   */
  it('416 của storage đi qua như DỮ LIỆU, không ném lỗi', async () => {
    stubFetch(storageAnswer(BINARY, 416, { 'content-range': 'bytes */4096' }))

    const stream = await getRangeStream('org/clip.mp4', 'bytes=99999-')

    expect(stream.status).toBe(416)
  })

  it('storage trả 404 → NotFoundError, không rơi thành 500', async () => {
    stubFetch(new Response('nope', { status: 404 }))

    await expect(getRangeStream('org/gone.mp4', null)).rejects.toBeInstanceOf(NotFoundError)
  })

  /**
   * An org id and an artifact id are both uuids today, but the path is built from data, and a path
   * segment that reaches the URL unescaped is how a storage key turns into a different storage key.
   */
  it('escape từng segment của path, không escape dấu /', async () => {
    const fetchMock = stubFetch(storageAnswer(BINARY, 200))

    await getRangeStream('org one/tên có dấu.mp4', null)

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/artifact-content/org%20one/')
    expect(url).not.toContain(' ')
    expect(url.split('/artifact-content/')[1].split('/')).toHaveLength(2)
  })
})

describe('createSignedUrlFor', () => {
  it('ký đúng bucket, đúng path, đúng thời hạn được truyền vào', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://s/signed?token=x' }, error: null })

    const url = await createSignedUrlFor('org/deck.pptx', 900)

    expect(from).toHaveBeenCalledWith(ARTIFACT_BUCKET)
    expect(createSignedUrl).toHaveBeenCalledWith('org/deck.pptx', 900)
    expect(url).toBe('https://s/signed?token=x')
  })

  it('lỗi ký → NotFoundError', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } })
    await expect(createSignedUrlFor('org/gone.pptx', 900)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('remove', () => {
  it('xoá đúng path trong đúng bucket, dạng mảng như API đòi', async () => {
    removeFn.mockResolvedValue({ data: [{ name: 'org/a.mp4' }], error: null })

    await remove('org/a.mp4')

    expect(from).toHaveBeenCalledWith(ARTIFACT_BUCKET)
    expect(removeFn).toHaveBeenCalledWith(['org/a.mp4'])
  })

  /**
   * It must THROW, and the caller must stop. Swallowing the error would let the row be deleted while
   * the object stays in the bucket — storage that `sum(size_bytes)` no longer counts and no UI can
   * reach. That leak is invisible; a row with a missing object is not.
   */
  /**
   * G5. Supabase's `remove` answers with the list of objects it actually deleted, so a key that is
   * already gone comes back as an EMPTY list with no error. That must be success: the goal state
   * already holds, and a second DELETE after one that died between steps has to be able to finish.
   */
  it('object đã không còn (danh sách rỗng, không error) → KHÔNG ném, đó là idempotent', async () => {
    removeFn.mockResolvedValue({ data: [], error: null })

    await expect(remove('org/already-gone.mp4')).resolves.toBeUndefined()
  })

  it('storage báo lỗi thật → ném AppError, người gọi dừng lại', async () => {
    removeFn.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(remove('org/a.mp4')).rejects.toBeInstanceOf(AppError)
  })
})
