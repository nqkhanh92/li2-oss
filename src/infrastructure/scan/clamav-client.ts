import 'server-only'
import net from 'node:net'

import { logger } from '@/infrastructure/logging/logger'

import { readClamavConfig, type ClamavConfig } from './config'

/**
 * ============================================================================
 * clamd INSTREAM client — hand written, no dependency (spec §2.4).
 * ============================================================================
 *
 * WHY NOT A LIBRARY. `clamscan` shells out to the `clamdscan` binary, which is not in li2-app's
 * `node` image, so it would fail at runtime in exactly the environment it is meant for. `clamdjs` is
 * unmaintained and ships no types. What is left to write is three commands over a TCP socket:
 *
 *   PING      → "zPING\0"      → "PONG\0"
 *   VERSION   → "zVERSION\0"   → "ClamAV 1.4.x/27xxx/Tue …\0"
 *   INSTREAM  → "zINSTREAM\0", then N frames { uint32 BE length | bytes }, then a zero-length frame
 *             → "stream: OK\0"
 *             | "stream: <SIGNATURE> FOUND\0"
 *             | "INSTREAM size limit exceeded. ERROR\0"
 *
 * The `z` prefix is the null-terminated command dialect; it is the one that lets clamd read a
 * command without waiting on the socket to close.
 *
 * THE RESULT IS A THREE-BRANCH UNION, NOT A BOOLEAN. A boolean would merge "this file contains
 * malware" with "we could not check", and those two owe the user two different sentences: one is
 * about their file, the other is about our system. WP2 maps them to a 400 and a 503 for that reason.
 *
 * EVERY PATH SETTLES EXACTLY ONCE, AND NO PATH HANGS. `timeout`, `error`, `close` and a parsed reply
 * all funnel through one `settle()` guarded by a boolean, and the socket is destroyed there. A hung
 * upload is worse than a refused one: the user has no error to act on and the request holds a
 * connection until something upstream gives up.
 *
 * NOTHING FROM THE FILE IS EVER LOGGED — only `{ artifactId, orgId, sizeBytes, signature,
 * durationMs }`. The scanned bytes are a customer's document.
 */

/** 64 KB frames. One 10 MB frame is legal (the length is a uint32) but loses backpressure, and a
 * `StreamMaxLength` refusal then surfaces in the middle of a write instead of as a reply. */
const CHUNK_BYTES = 65536

const INSTREAM_TERMINATOR = Buffer.alloc(4)

const log = logger.child({ module: 'clamav' })

export type ScanFailureReason = 'infected' | 'encrypted' | 'unavailable' | 'timeout' | 'too-large'

/**
 * `AlertEncryptedArchive` / `AlertEncryptedDoc` (both on in `deploy/clamav/clamd.conf`) make clamd
 * answer FOUND for a container it cannot open — a password-protected PDF, a ZIP with an encrypted
 * entry. That is not malware, it is "we were not allowed to look", and the two owe the user
 * different sentences.
 *
 * THE MATCH IS BY PREFIX, NOT BY A LIST. Known names today are `Heuristics.Encrypted.Zip`, `.RAR`,
 * `.7Zip`, `.PDF`, `.DOC`/`.Doc` — but the set grows with the signature database, and a variant we
 * have never seen must land on "password-protected", never on "malware". Case-insensitive because
 * the casing of the trailing segment is already inconsistent upstream (`DOC` vs `Doc`).
 */
const ENCRYPTED_SIGNATURE_PREFIX = 'heuristics.encrypted.'

export function isEncryptedSignature(signature: string): boolean {
  return signature.toLowerCase().startsWith(ENCRYPTED_SIGNATURE_PREFIX)
}

/**
 * The verdict without the clock. Split out from `ScanResult` so `durationMs` is added in ONE place
 * (`settle`) instead of at every `resolve` — and because `Omit<Union, 'durationMs'>` does not
 * distribute over a union in TypeScript, it collapses to the keys the members share.
 */
export type ScanVerdict =
  /** Clean, or not scanned at all because the gate is off (`skipped`). */
  | { ok: true; skipped?: true }
  /** clamd matched a signature. The name is for the log, never for the UI (spec WP2 §5). */
  | { ok: false; reason: 'infected'; signature: string }
  /**
   * clamd matched a `Heuristics.Encrypted.*` signature: the file is password-protected, so it was
   * never scanned. Kept out of `infected` so the user is never told a legitimate encrypted document
   * contains malware. The name is still carried for the log, same rule as above.
   */
  | { ok: false; reason: 'encrypted'; signature: string }
  /** We did not get an answer we could trust. The user must not be told their file is bad. */
  | { ok: false; reason: 'unavailable' | 'timeout' | 'too-large'; detail?: string }

export type ScanResult = ScanVerdict & { durationMs: number }

/** Only identifiers — see the "nothing from the file" rule above. Both optional: `create()` scans
 * before it has a row, so there is no artifact id yet on the path that matters most. */
export type ScanMeta = {
  artifactId?: string
  orgId?: string
}

/**
 * Scan a buffer that is already in memory.
 *
 * Returns `{ ok: true, skipped: true }` without opening a socket when `CLAMAV_ENABLED` is off, and
 * logs nothing in that case: a per-request line for the default configuration is how real warnings
 * get buried.
 */
export async function scanBuffer(buffer: Buffer, meta: ScanMeta = {}): Promise<ScanResult> {
  const config = readClamavConfig()
  if (!config.enabled) return { ok: true, skipped: true, durationMs: 0 }

  const result = await instream(buffer, config)
  logResult(result, buffer.byteLength, meta)
  return result
}

/** `true` when clamd answered PONG. Used by `/api/internal/scan-health`, never by the upload path —
 * a PING before every scan would double the round trips and still not prove the next one answers. */
export async function ping(): Promise<boolean> {
  const config = readClamavConfig()
  if (!config.enabled) return false
  const reply = await simpleCommand('zPING\0', config)
  return reply?.trim() === 'PONG'
}

/** The engine and signature-database version, e.g. `ClamAV 1.4.6/27891/Tue Oct 21 …`. `null` when
 * clamd is unreachable or the gate is off — the health route reports that as `reachable: false`. */
export async function version(): Promise<string | null> {
  const config = readClamavConfig()
  if (!config.enabled) return null
  const reply = await simpleCommand('zVERSION\0', config)
  return reply ? reply.trim() : null
}

// ── wire protocol ──

function logResult(result: ScanResult, sizeBytes: number, meta: ScanMeta): void {
  const base = { ...meta, sizeBytes, durationMs: result.durationMs }

  if (result.ok) {
    log.info(base, 'ClamAV scan clean')
    return
  }

  if (result.reason === 'infected') {
    /**
     * `warn`, not `error`: a signature match is the layer working, not the system failing. It is
     * logged at all because this is the only record of WHO was refused for WHAT — the mitigation for
     * the top risk in the spec (§6, false positives on legitimate customer content).
     */
    log.warn({ ...base, signature: result.signature }, 'ClamAV refused a file: signature matched')
    return
  }

  if (result.reason === 'encrypted') {
    /**
     * `info`, not `warn`: uploading a password-protected document is a normal thing for a user to
     * do, and the only reason it is refused is that we cannot see inside. Logged so that "how often
     * does this hit real users" is answerable — it is the cost of `AlertEncryptedArchive` being on.
     */
    log.info(
      { ...base, signature: result.signature },
      'ClamAV refused a file: encrypted, could not be scanned'
    )
    return
  }

  /** `error`: an upload was refused for a reason that is ours, not the user's. Fail-closed means
   * these lines are the signal that uploads are being turned away (§2.5). */
  log.error(
    { ...base, reason: result.reason, detail: result.detail },
    'ClamAV scan did not complete'
  )
}

/**
 * Parse one clamd reply. `null` means "nothing complete has arrived yet", which is what lets the
 * `data` handler be called per TCP segment without inventing a result from half a line.
 */
export function parseScanReply(raw: string): ScanVerdict | null {
  const terminated = raw.includes('\0')
  const text = raw.replace(/\0/g, '').trim()
  // A reply with no NUL yet may still be mid-flight; an empty string is never an answer.
  if (!terminated || !text) return null

  const found = /^stream:\s*(.+?)\s+FOUND$/i.exec(text)
  if (found) {
    const signature = found[1]
    // The split happens HERE, at the only place that reads clamd's vocabulary. Everything above this
    // layer gets a `reason` and never has to know what a ClamAV heuristic is called.
    return isEncryptedSignature(signature)
      ? { ok: false, reason: 'encrypted', signature }
      : { ok: false, reason: 'infected', signature }
  }

  if (/^stream:\s*OK$/i.test(text)) return { ok: true }

  /**
   * `StreamMaxLength` (clamd default 25 MB) is above our own 10 MB ceiling, so this branch should be
   * unreachable today. It exists because the day someone raises `ARTIFACT_MAX_BYTES` and forgets
   * clamd, the failure has to be readable instead of arriving as a generic "unavailable".
   */
  if (/size limit exceeded/i.test(text)) return { ok: false, reason: 'too-large', detail: text }

  // Any other ERROR, or a reply shape we do not know: we did not get a verdict. Not the user's file.
  return { ok: false, reason: 'unavailable', detail: text }
}

function instream(buffer: Buffer, config: ClamavConfig): Promise<ScanResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    let settled = false
    let reply = ''

    const socket = net.connect({ host: config.host, port: config.port })
    socket.setTimeout(config.timeoutMs)

    const settle = (result: ScanVerdict) => {
      if (settled) return
      settled = true
      // Destroying here fires `close`, which re-enters this function — the boolean above is what
      // makes that a no-op rather than a second resolve.
      socket.destroy()
      resolve({ ...result, durationMs: Date.now() - startedAt })
    }

    /**
     * clamd answers "size limit exceeded" and hangs up while we are still writing, so an `error`
     * (EPIPE) or a `close` can arrive with a perfectly good verdict already in the buffer. Read it
     * before falling back to "unavailable", or a real answer gets reported as an outage.
     */
    const settleFromReplyOr = (fallback: ScanVerdict) => settle(parseScanReply(reply) ?? fallback)

    socket.on('data', (chunk) => {
      reply += chunk.toString('utf8')
      const parsed = parseScanReply(reply)
      if (parsed) settle(parsed)
    })

    socket.on('timeout', () =>
      settle({
        ok: false,
        reason: 'timeout',
        detail: `clamd did not answer within ${config.timeoutMs} ms`,
      })
    )

    socket.on('error', (err: NodeJS.ErrnoException) =>
      settleFromReplyOr({
        ok: false,
        reason: 'unavailable',
        detail: err.code ? `${err.code}: ${err.message}` : err.message,
      })
    )

    socket.on('close', () =>
      settleFromReplyOr({
        ok: false,
        reason: 'unavailable',
        detail: 'clamd closed the connection before answering',
      })
    )

    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0', 'ascii'))

      let offset = 0
      const writeFrames = () => {
        if (settled || socket.destroyed) return

        while (offset < buffer.byteLength) {
          const end = Math.min(offset + CHUNK_BYTES, buffer.byteLength)
          const frame = Buffer.allocUnsafe(4 + (end - offset))
          frame.writeUInt32BE(end - offset, 0)
          buffer.copy(frame, 4, offset, end)
          offset = end

          // Honour backpressure: `write` returning false means the kernel buffer is full, and
          // ignoring it is how a 10 MB upload turns into unbounded memory in this process.
          if (!socket.write(frame)) {
            socket.once('drain', writeFrames)
            return
          }
        }

        socket.write(INSTREAM_TERMINATOR)
      }

      writeFrames()
    })
  })
}

/** PING / VERSION share one shape: write a `z`-command, read until the NUL. `null` on any failure —
 * the health route turns that into `reachable: false` and has no use for the distinction. */
function simpleCommand(command: string, config: ClamavConfig): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false
    let reply = ''

    const socket = net.connect({ host: config.host, port: config.port })
    socket.setTimeout(config.timeoutMs)

    const settle = (value: string | null) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }

    socket.on('connect', () => socket.write(Buffer.from(command, 'ascii')))
    socket.on('data', (chunk) => {
      reply += chunk.toString('utf8')
      if (reply.includes('\0')) settle(reply.replace(/\0/g, ''))
    })
    socket.on('timeout', () => settle(null))
    socket.on('error', () => settle(null))
    socket.on('close', () => settle(reply.includes('\0') ? reply.replace(/\0/g, '') : null))
  })
}
