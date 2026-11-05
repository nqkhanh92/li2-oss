/**
 * ============================================================================
 * `src/infrastructure/scan/clamav-client.ts` — against a REAL TCP server.
 * ============================================================================
 *
 * `net` IS NOT MOCKED, and that is the whole design of this file (spec WP1 "Test bắt buộc"). A mocked
 * socket would let every assertion here pass while the uint32 big-endian frame header — the one part
 * of INSTREAM that is easy to get wrong and impossible to notice, because clamd answers a malformed
 * frame with a plausible-looking error — stayed broken. So each test starts a `net.createServer` on
 * port 0, plays clamd's side of the conversation, and keeps the bytes it was sent.
 *
 * The second thing only a real socket can test: that NO socket is opened when the gate is off. That
 * is asserted by counting connections on a server nobody should reach.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import net from 'node:net'

const logInfo = vi.fn()
const logWarn = vi.fn()
const logError = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: () => ({
      info: (...args: any[]) => logInfo(...args),
      warn: (...args: any[]) => logWarn(...args),
      error: (...args: any[]) => logError(...args),
    }),
  },
}))

import { parseScanReply, ping, scanBuffer, version } from '@/infrastructure/scan/clamav-client'
import { ClamavConfigError, readClamavConfig } from '@/infrastructure/scan/config'

const CHUNK_BYTES = 65536

type FakeClamd = {
  port: number
  /** Every byte the client sent, in order, concatenated across TCP segments. */
  received: () => Buffer
  /** How many TCP connections were accepted. The assertion for "did not open a socket". */
  connections: () => number
  /** Resolves when the server side of a connection closes — proof the client destroyed it. */
  closed: () => Promise<void>
  stop: () => Promise<void>
}

/**
 * `onConnection` plays clamd. It is handed the socket and a getter for the bytes received so far, so
 * a test can wait for the INSTREAM terminator before answering, exactly as clamd does.
 */
const startFakeClamd = async (
  onConnection: (socket: net.Socket, received: () => Buffer) => void
): Promise<FakeClamd> => {
  const chunks: Buffer[] = []
  let connections = 0
  let resolveClosed: () => void
  const closedPromise = new Promise<void>((resolve) => {
    resolveClosed = resolve
  })

  const server = net.createServer((socket) => {
    connections += 1
    socket.on('data', (chunk) => chunks.push(chunk))
    socket.on('close', () => resolveClosed())
    socket.on('error', () => {
      /* a client that destroys mid-write gives us ECONNRESET; not a test failure */
    })
    onConnection(socket, () => Buffer.concat(chunks))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as net.AddressInfo

  return {
    port: address.port,
    received: () => Buffer.concat(chunks),
    connections: () => connections,
    closed: () => closedPromise,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
      }),
  }
}

/** Answer only once the zero-length frame has arrived — the client must finish writing first. */
const replyAfterTerminator = (reply: string) => (socket: net.Socket, received: () => Buffer) => {
  const check = () => {
    const bytes = received()
    if (bytes.length >= 4 && bytes.subarray(bytes.length - 4).equals(Buffer.alloc(4)))
      socket.write(Buffer.from(reply, 'ascii'))
  }
  socket.on('data', check)
}

/** A port that nothing is listening on: bind it, read the number, give it back. */
const closedPort = async (): Promise<number> => {
  const server = net.createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as net.AddressInfo
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return port
}

const enable = (port: number, timeoutMs = 2000) => {
  process.env.CLAMAV_ENABLED = 'true'
  process.env.CLAMAV_HOST = '127.0.0.1'
  process.env.CLAMAV_PORT = String(port)
  process.env.CLAMAV_TIMEOUT_MS = String(timeoutMs)
}

const ENV_KEYS = ['CLAMAV_ENABLED', 'CLAMAV_HOST', 'CLAMAV_PORT', 'CLAMAV_TIMEOUT_MS'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    // Deleted, not just saved: `vitest.config.ts` loads `.env.local`, so a developer with these set
    // locally would otherwise run a different test than CI does.
    delete process.env[key]
  }
  logInfo.mockClear()
  logWarn.mockClear()
  logError.mockClear()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('scanBuffer — verdicts clamd can give', () => {
  it('"stream: OK" → { ok: true }', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: OK\0'))
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('<h1>hi</h1>'), { orgId: 'org-1' })

    expect(result.ok).toBe(true)
    // Clean is `info`, not silence: it is what makes "how long does a scan take" answerable from the
    // logs on LiHi (spec §5 A1/A2) without adding a metric.
    expect(logInfo).toHaveBeenCalledOnce()
    await clamd.stop()
  })

  it('"stream: <SIG> FOUND" → infected, with the signature name carried out for the log', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: Eicar-Test-Signature FOUND\0'))
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('eicar'), { artifactId: 'a-1', orgId: 'org-1' })

    expect(result).toMatchObject({
      ok: false,
      reason: 'infected',
      signature: 'Eicar-Test-Signature',
    })
    expect(logWarn).toHaveBeenCalledOnce()
    // The one assertion that keeps the "never log file contents" rule honest.
    expect(JSON.stringify(logWarn.mock.calls[0])).not.toContain('eicar')
    await clamd.stop()
  })

  it('"INSTREAM size limit exceeded. ERROR" → too-large, NOT infected', async () => {
    const clamd = await startFakeClamd(
      replyAfterTerminator('INSTREAM size limit exceeded. ERROR\0')
    )
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('x'.repeat(100)))

    expect(result).toMatchObject({ ok: false, reason: 'too-large' })
    await clamd.stop()
  })

  it('an unknown ERROR reply is "unavailable" — a verdict we did not get is never the user’s fault', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('UNKNOWN COMMAND\0'))
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('x'))

    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
    await clamd.stop()
  })
})

describe('scanBuffer — failures that must not hang', () => {
  it('server accepts the bytes and never answers → timeout, and the socket is destroyed', async () => {
    const clamd = await startFakeClamd(() => {
      /* accept, read, stay silent — clamd wedged mid-reload looks exactly like this */
    })
    enable(clamd.port, 300)

    const startedAt = Date.now()
    const result = await scanBuffer(Buffer.from('x'.repeat(1000)))
    const elapsed = Date.now() - startedAt

    expect(result).toMatchObject({ ok: false, reason: 'timeout' })
    expect(elapsed).toBeGreaterThanOrEqual(290)
    expect(elapsed).toBeLessThan(300 + 500)
    // Proof the socket was destroyed rather than leaked: the server saw its end close. Without this
    // the request would return while the connection stayed open, and a fail-closed upload path would
    // leak one socket per refused upload.
    await clamd.closed()
    await clamd.stop()
  })

  it('nothing listening on the port → unavailable (ECONNREFUSED), not a crash', async () => {
    enable(await closedPort())

    const result = await scanBuffer(Buffer.from('x'))

    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
    expect(logError).toHaveBeenCalledOnce()
  })

  it('server hangs up mid-stream → unavailable, and the promise settles exactly once', async () => {
    const clamd = await startFakeClamd((socket) => {
      socket.once('data', () => socket.destroy())
    })
    enable(clamd.port)

    let settlements = 0
    const result = await scanBuffer(Buffer.alloc(400 * 1024, 0x41)).then((value) => {
      settlements += 1
      return value
    })

    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
    // A dropped connection fires `error` (EPIPE/ECONNRESET) AND `close`, and the write loop is still
    // running — three paths into `settle`. Waiting past the request proves none of them produced a
    // second settlement or an unhandled rejection.
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(settlements).toBe(1)
    await clamd.stop()
  })

  it('a verdict already received wins over the close that follows it', async () => {
    // The observable half of "settles once": clamd answering and hanging up immediately must come
    // back OK. If `close` could settle a second time, or first, this would read as unavailable.
    const clamd = await startFakeClamd((socket, received) => {
      socket.on('data', () => {
        const bytes = received()
        if (bytes.length >= 4 && bytes.subarray(bytes.length - 4).equals(Buffer.alloc(4))) {
          socket.write(Buffer.from('stream: OK\0', 'ascii'))
          socket.end()
        }
      })
    })
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('<h1>hi</h1>'))

    expect(result.ok).toBe(true)
    await clamd.stop()
  })
})

describe('scanBuffer — the INSTREAM framing on the wire', () => {
  it('sends zINSTREAM, 200 KB as four uint32-BE frames, then a zero-length frame', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: OK\0'))
    enable(clamd.port)

    const payload = Buffer.alloc(200 * 1024)
    for (let i = 0; i < payload.byteLength; i++) payload[i] = i % 251

    const result = await scanBuffer(payload)
    expect(result.ok).toBe(true)

    const wire = clamd.received()
    const command = Buffer.from('zINSTREAM\0', 'ascii')
    expect(wire.subarray(0, command.byteLength).equals(command)).toBe(true)

    // Walk the frames the way clamd does: read a big-endian uint32, take that many bytes, repeat.
    let offset = command.byteLength
    const lengths: number[] = []
    const body: Buffer[] = []
    while (offset < wire.byteLength) {
      const length = wire.readUInt32BE(offset)
      offset += 4
      if (length === 0) break
      lengths.push(length)
      body.push(wire.subarray(offset, offset + length))
      offset += length
    }

    expect(lengths).toEqual([CHUNK_BYTES, CHUNK_BYTES, CHUNK_BYTES, 200 * 1024 - 3 * CHUNK_BYTES])
    // Terminator consumed, nothing after it: a trailing byte would desynchronise clamd's reader.
    expect(offset).toBe(wire.byteLength)
    // Byte-exact round trip. Catches an off-by-one in the frame header as a content mismatch rather
    // than as a plausible-looking verdict.
    expect(Buffer.concat(body).equals(payload)).toBe(true)

    await clamd.stop()
  })

  it('an empty buffer still sends a well-formed stream (command + terminator only)', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: OK\0'))
    enable(clamd.port)

    const result = await scanBuffer(Buffer.alloc(0))

    expect(result.ok).toBe(true)
    expect(
      clamd.received().equals(Buffer.concat([Buffer.from('zINSTREAM\0', 'ascii'), Buffer.alloc(4)]))
    ).toBe(true)
    await clamd.stop()
  })
})

describe('CLAMAV_ENABLED=false — the default, and it must cost nothing', () => {
  it('returns skipped without opening a socket and without logging', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: OK\0'))
    process.env.CLAMAV_HOST = '127.0.0.1'
    process.env.CLAMAV_PORT = String(clamd.port)
    // CLAMAV_ENABLED deliberately left unset: "unset" is the state production is in on merge day.

    const result = await scanBuffer(Buffer.from('x'))

    expect(result).toEqual({ ok: true, skipped: true, durationMs: 0 })
    expect(clamd.connections()).toBe(0)
    // No warn per request. A line on every upload for the DEFAULT configuration is how the lines that
    // matter get ignored — the same reasoning as `safe-browsing.ts`' warn-once.
    expect(logInfo).not.toHaveBeenCalled()
    expect(logWarn).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
    await clamd.stop()
  })

  it('CLAMAV_ENABLED=false is OFF, not "a non-empty string is truthy"', async () => {
    const clamd = await startFakeClamd(replyAfterTerminator('stream: OK\0'))
    enable(clamd.port)
    process.env.CLAMAV_ENABLED = 'false'

    const result = await scanBuffer(Buffer.from('x'))

    expect(result).toMatchObject({ ok: true, skipped: true })
    expect(clamd.connections()).toBe(0)
    await clamd.stop()
  })

  it('ping and version answer without a socket when the gate is off', async () => {
    const clamd = await startFakeClamd(() => {
      /* nobody should get here */
    })
    process.env.CLAMAV_HOST = '127.0.0.1'
    process.env.CLAMAV_PORT = String(clamd.port)

    expect(await ping()).toBe(false)
    expect(await version()).toBeNull()
    expect(clamd.connections()).toBe(0)
    await clamd.stop()
  })
})

describe('ping and version', () => {
  it('PING → PONG, and the command goes out in the z dialect', async () => {
    const clamd = await startFakeClamd((socket) => {
      socket.on('data', () => socket.write(Buffer.from('PONG\0', 'ascii')))
    })
    enable(clamd.port)

    expect(await ping()).toBe(true)
    expect(clamd.received().toString('ascii')).toBe('zPING\0')
    await clamd.stop()
  })

  it('VERSION → the engine string, trimmed', async () => {
    const clamd = await startFakeClamd((socket) => {
      socket.on('data', () => socket.write(Buffer.from('ClamAV 1.4.6/27891/Tue Oct 21\0', 'ascii')))
    })
    enable(clamd.port)

    expect(await version()).toBe('ClamAV 1.4.6/27891/Tue Oct 21')
    await clamd.stop()
  })

  it('unreachable clamd → ping false, version null (never a throw)', async () => {
    enable(await closedPort(), 500)

    expect(await ping()).toBe(false)
    expect(await version()).toBeNull()
  })
})

describe('readClamavConfig — read at call time', () => {
  it('defaults: off, clamav:3310, 15 s', () => {
    expect(readClamavConfig()).toEqual({
      enabled: false,
      host: 'clamav',
      port: 3310,
      timeoutMs: 15000,
    })
  })

  it('picks up a change to process.env made after the module was imported', () => {
    expect(readClamavConfig().enabled).toBe(false)
    process.env.CLAMAV_ENABLED = 'true'
    expect(readClamavConfig().enabled).toBe(true)
  })

  it('enabled with a blanked CLAMAV_HOST throws, and the message names the variable', () => {
    process.env.CLAMAV_ENABLED = 'true'
    process.env.CLAMAV_HOST = '   '

    expect(() => readClamavConfig()).toThrow(ClamavConfigError)
    expect(() => readClamavConfig()).toThrow(/CLAMAV_HOST/)
  })

  it('a non-numeric port or timeout throws naming the variable, rather than scanning port NaN', () => {
    process.env.CLAMAV_PORT = 'three-three-one-zero'
    expect(() => readClamavConfig()).toThrow(/CLAMAV_PORT/)

    delete process.env.CLAMAV_PORT
    process.env.CLAMAV_TIMEOUT_MS = '0'
    expect(() => readClamavConfig()).toThrow(/CLAMAV_TIMEOUT_MS/)
  })
})

describe('parseScanReply — the reply grammar on its own', () => {
  it('returns null until the NUL terminator arrives, so half a reply is never a verdict', () => {
    expect(parseScanReply('stream: Eicar-Test-Signa')).toBeNull()
    expect(parseScanReply('')).toBeNull()
    expect(parseScanReply('\0')).toBeNull()
  })

  it('a signature name containing spaces is kept whole', () => {
    expect(parseScanReply('stream: Win.Test.EICAR_HDB-1 FOUND\0')).toEqual({
      ok: false,
      reason: 'infected',
      signature: 'Win.Test.EICAR_HDB-1',
    })
  })
})

/**
 * ============================================================================
 * `Heuristics.Encrypted.*` — FOUND, but not malware.
 * ============================================================================
 *
 * `AlertEncryptedArchive` and `AlertEncryptedDoc` are on in `deploy/clamav/clamd.conf`, so a
 * password-protected PDF — a normal thing for a user to upload — comes back on the SAME wire shape as
 * EICAR. Telling that user their document contains malware is the worst sentence this feature can
 * produce, so the split has to happen here, where the name is read.
 *
 * MATCHED BY PREFIX, ON PURPOSE. The variants below are the ones we know today; the signature
 * database adds more, and a name nobody has written a test for must land on "password-protected",
 * never on "malware". That is what the invented `.Foo` case is for.
 */
describe('a Heuristics.Encrypted.* signature is "encrypted", never "infected"', () => {
  it.each([
    'Heuristics.Encrypted.Zip',
    'Heuristics.Encrypted.RAR',
    'Heuristics.Encrypted.7Zip',
    'Heuristics.Encrypted.PDF',
    'Heuristics.Encrypted.DOC',
    'Heuristics.Encrypted.Doc',
    // clamd's casing of the trailing segment is already inconsistent, and a reply arriving in a
    // casing we did not predict must not be read as malware.
    'heuristics.encrypted.pdf',
    'HEURISTICS.ENCRYPTED.ZIP',
    // A variant that does not exist yet. The prefix rule is the reason this passes.
    'Heuristics.Encrypted.Foo',
  ])('%s → reason "encrypted"', (signature) => {
    expect(parseScanReply(`stream: ${signature} FOUND\0`)).toEqual({
      ok: false,
      reason: 'encrypted',
      signature,
    })
  })

  it.each([
    'Eicar-Test-Signature',
    'Win.Test.EICAR_HDB-1',
    // Same words, not the prefix: a signature that merely mentions encryption is still malware.
    'Html.Trojan.Encrypted-1',
    'Heuristics.Phishing.Email.SpoofedDomain',
  ])('%s stays "infected"', (signature) => {
    expect(parseScanReply(`stream: ${signature} FOUND\0`)).toMatchObject({
      ok: false,
      reason: 'infected',
      signature,
    })
  })

  it('over a real socket: the verdict is "encrypted" and the log line is info, not warn', async () => {
    const clamd = await startFakeClamd(
      replyAfterTerminator('stream: Heuristics.Encrypted.PDF FOUND\0')
    )
    enable(clamd.port)

    const result = await scanBuffer(Buffer.from('%PDF-1.7 encrypted'), { orgId: 'org-1' })

    expect(result).toMatchObject({
      ok: false,
      reason: 'encrypted',
      signature: 'Heuristics.Encrypted.PDF',
    })
    // `warn` is reserved for "a signature matched" — an operator reading these lines must not see a
    // password-protected upload in the same bucket as a malware hit.
    expect(logWarn).not.toHaveBeenCalled()
    expect(logInfo).toHaveBeenCalledOnce()
    expect(JSON.stringify(logInfo.mock.calls[0])).toContain('Heuristics.Encrypted.PDF')
    await clamd.stop()
  })
})
