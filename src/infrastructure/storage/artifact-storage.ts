import 'server-only'

import { supabaseService } from '@/infrastructure/database/supabase'
import { AppError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'

/**
 * Artifacts live in their OWN private bucket, not `proxi-public-user-upload`.
 * That bucket is public and its helpers force `image/*`; an artifact is attacker-controlled HTML, so
 * it must never be reachable by a direct storage URL — it is read back here, server side, and
 * re-served from `/a/<token>` under a locked-down CSP.
 */
export const ARTIFACT_BUCKET = 'artifact-content'

/**
 * `upsert: false` on purpose: a path is derived from a freshly minted artifact id, so a collision
 * means something is wrong upstream and must surface, not silently overwrite another org's content.
 */
export async function put(
  path: string,
  body: Buffer,
  contentType: string
): Promise<{ path: string }> {
  const { data, error } = await supabaseService.storage
    .from(ARTIFACT_BUCKET)
    .upload(path, body, { upsert: false, cacheControl: '0', contentType })

  if (error) {
    /**
     * Bucket từ chối MIME là lỗi CẤU HÌNH, không phải lỗi của file.
     *
     * `allowed_mime_types` của bucket và `ARTIFACT_STORAGE_MIMES` trong code là hai nửa phải đi
     * cùng nhau; lệch nhau thì mọi upload của định dạng đó hỏng **tất định**. Câu mặc định
     * ("thử lại với tệp khác") chỉ đúng với lỗi ngẫu nhiên — ở đây nó chỉ người dùng đi sai
     * hướng, vì tệp khác cùng định dạng sẽ hỏng y hệt.
     *
     * Đo trên LiHi 2026-10-24, khi migration thêm markdown/Office/ảnh chưa được áp:
     * `mime type text/markdown is not supported` → 500 + câu "thử tệp khác". Người vận hành
     * phải đọc log server mới biết là thiếu một migration.
     */
    if (/mime type .* is not supported/i.test(error.message))
      throw new AppError(
        `Storage bucket rejected MIME "${contentType}" — allowed_mime_types is out of step with ARTIFACT_STORAGE_MIMES. Apply the pending artifacts migration.`,
        { key: 'common:messages.error.format_not_enabled' }
      )

    throw new AppError(error.message, {
      key: 'common:messages.error.upload_failed',
      params: { field: '$t(label.file)' },
    })
  }

  return { path: data.path }
}

/**
 * Deletes the object. Called BEFORE the row is deleted, and the order is load-bearing.
 *
 * An object left in the bucket with no row pointing at it is invisible: quota is `sum(size_bytes)`
 * over rows, so an orphan consumes real storage that nothing counts and nobody can find. The other
 * way round — a row whose object has gone — is visible, is a 404 on one link, and is fixable.
 * So the irreversible, uncountable failure is the one that has to happen first.
 *
 * IDEMPOTENT (§3 G5), and that is what makes a half-failed delete repairable. `remove` returns the
 * list of objects it actually deleted, so a key that is already gone comes back as an EMPTY list with
 * no error — and an empty list is success here, because the goal state ("this object does not exist")
 * already holds. A second DELETE after one that died between steps must be able to finish.
 *
 * A real failure — credentials, network, the bucket itself — still throws, and the caller must stop:
 * deleting the row after a failed remove is the one outcome nothing can repair, because with the row
 * gone there is no `storage_path` left to clean up by.
 */
export async function remove(path: string): Promise<void> {
  const { error } = await supabaseService.storage.from(ARTIFACT_BUCKET).remove([path])

  if (error)
    // `some_error`, not a field-shaped key: the caller did nothing wrong and there is nothing for
    // them to fix. The detail that matters is in `error.message`, which goes to the log, not the UI.
    throw new AppError(error.message, {
      key: 'common:messages.error.some_error',
    })
}

/**
 * TEXT ONLY — for `kind = 'html'`.
 *
 * `Blob.text()` decodes the bytes as UTF-8 and replaces anything that is not valid UTF-8 with
 * U+FFFD. That is fine for an HTML document and silently destroys a PDF, a .pptx or an MP4: the
 * corruption happens inside the decoder, so nothing throws and the route happily serves a broken
 * file. Binary formats must use `getBytes`. A unit test pins that difference so the two do not get
 * merged back together by someone tidying up.
 */
export async function get(path: string): Promise<string> {
  const { data, error } = await supabaseService.storage.from(ARTIFACT_BUCKET).download(path)

  if (error || !data)
    throw new NotFoundError(error?.message ?? 'Artifact content not found', {
      key: 'common:messages.error.not_found',
      params: { field: '$t(label.file)' },
    })

  return data.text()
}

/** Raw bytes, unchanged. The only safe way to read a PDF, a .pptx or a video back out. */
export async function getBytes(path: string): Promise<Buffer> {
  const { data, error } = await supabaseService.storage.from(ARTIFACT_BUCKET).download(path)

  if (error || !data)
    throw new NotFoundError(error?.message ?? 'Artifact content not found', {
      key: 'common:messages.error.not_found',
      params: { field: '$t(label.file)' },
    })

  return Buffer.from(await data.arrayBuffer())
}

/**
 * What storage answered, forwarded rather than re-derived.
 *
 * `status` is storage's own status — 200, 206 or 416. The three headers are its own too. The caller
 * copies them onto its response instead of computing a range itself, because computing it again is
 * a second place for the arithmetic to be wrong.
 */
export type ArtifactByteStream = {
  status: number
  body: ReadableStream<Uint8Array> | null
  contentLength: string | null
  contentRange: string | null
  acceptRanges: string | null
}

/**
 * The object's bytes, optionally a byte range, as a STREAM.
 *
 * This bypasses `@supabase/storage-js` on purpose, and that is not a preference — its `download()`
 * takes no Range option at all. Its signature accepts only `{ transform }`, and the implementation
 * passes just `this.headers` to the underlying `get`, dropping the per-request `parameters`
 * argument the fetch helper would accept. There is no public seam to hand it a Range header, so the
 * REST endpoint it would have called is called here directly, with the same service-role
 * credentials the rest of the server-side data path already uses.
 *
 * `rangeHeader` is forwarded VERBATIM and the response is handed back unparsed. Storage on LiHi was
 * measured answering `bytes=0-99` with 206 and a correct `Content-Range`, `bytes=100-` with the
 * remainder, and no Range with 200 plus `Accept-Ranges` — so parsing the header here to recompute
 * what it already computed would only add a second, disagreeing implementation. A range past the
 * end comes back as 416 and is passed through as 416.
 *
 * The body is never buffered: `response.body` goes straight out. Next 14 pipes a `ReadableStream`
 * with real backpressure (`send-response.js:39-43`, `pipe-readable.js:31-65`), so a 10MB video is
 * never resident in memory — provided the route keeps `dynamic = 'force-dynamic'`, without which
 * the SSG branch blobs the whole body to cache it.
 */
export async function getRangeStream(
  path: string,
  rangeHeader: string | null
): Promise<ArtifactByteStream> {
  const baseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!baseUrl || !serviceKey)
    throw new AppError('Supabase storage is not configured', {
      key: 'common:messages.error.some_error',
    })

  const url = `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/authenticated/${ARTIFACT_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    },
    cache: 'no-store',
  })

  /**
   * 416 is a legitimate answer to a legitimate question, so it travels back to the caller as data.
   * Anything else that is not a success means the object is not readable, and that is a 404 to the
   * visitor — a 500 would tell them something about our storage that a missing file should not.
   */
  if (!response.ok && response.status !== 416)
    throw new NotFoundError(`Artifact content not found (${response.status})`, {
      key: 'common:messages.error.not_found',
      params: { field: '$t(label.file)' },
    })

  return {
    status: response.status,
    body: response.body,
    contentLength: response.headers.get('content-length'),
    contentRange: response.headers.get('content-range'),
    acceptRanges: response.headers.get('accept-ranges'),
  }
}

/**
 * A short-lived URL a THIRD PARTY can fetch — today, Office Online rendering a .pptx.
 *
 * The bucket stays private: this signs one object for one window rather than opening the bucket up.
 * The caller must mint a fresh one per render and must never persist it; a signed URL written into
 * a row is a permanent URL with extra steps.
 */
export async function createSignedUrlFor(path: string, expiresInSeconds: number): Promise<string> {
  const { data, error } = await supabaseService.storage
    .from(ARTIFACT_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl)
    throw new NotFoundError(error?.message ?? 'Artifact content not found', {
      key: 'common:messages.error.not_found',
      params: { field: '$t(label.file)' },
    })

  return data.signedUrl
}
