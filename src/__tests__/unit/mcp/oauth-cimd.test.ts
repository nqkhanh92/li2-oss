/**
 * CIMD fetcher — the SSRF surface (plan Phase 3a checklist, §5).
 *
 * ★ WHY THIS FILE EXISTS AT ALL. `fetchClientIdMetadataDocument` performs an outbound HTTP request
 * to a URL chosen by an unauthenticated stranger, from inside the app's own network. That is the
 * textbook shape of a Server-Side Request Forgery, and under spec 2025-11-25 it is not optional:
 * Client ID Metadata Documents are the SHOULD and DCR is only a MAY, so this is the PRIMARY way a
 * client is identified.
 *
 * Every case below is a real, published SSRF technique — cloud metadata at 169.254.169.254, an
 * IPv6 AAAA smuggled in beside a harmless IPv4, an IPv4-mapped IPv6 literal, a redirect from a
 * public host to a private one. A regression here does not throw or log; it silently gives an
 * attacker a proxy into the private network.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }))

vi.mock('node:dns/promises', () => ({ lookup: mockLookup }))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { fetchClientIdMetadataDocument } from '@/core/services/mcp-oauth.service'

const CLIENT_ID = 'https://client.example.com/mcp-client.json'
const PUBLIC_V4 = [{ address: '93.184.216.34', family: 4 }]

const mockFetch = vi.fn()

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/** The document a well-behaved client publishes. */
function validDocument(clientId = CLIENT_ID) {
  return {
    client_id: clientId,
    client_name: 'Example Agent',
    redirect_uris: ['https://client.example.com/callback'],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  mockLookup.mockResolvedValue(PUBLIC_V4)
  mockFetch.mockResolvedValue(jsonResponse(validDocument()))
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('URL-level rejections — refused before a socket is ever opened', () => {
  it.each([
    ['plaintext http', 'http://client.example.com/doc.json'],
    ['a non-default port (an internal port scanner otherwise)', 'https://client.example.com:8080/d.json'],
    ['embedded credentials', 'https://user:pass@client.example.com/d.json'],
    ['a non-web scheme', 'file:///etc/passwd'],
    ['an unparseable URL', 'https://['],
  ])('rejects %s', async (_label, url) => {
    await expect(fetchClientIdMetadataDocument(url)).rejects.toMatchObject({
      error: 'invalid_client',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('DNS-level rejections — the hostname is not the target, the address is', () => {
  it.each([
    ['loopback', [{ address: '127.0.0.1', family: 4 }]],
    ['0.0.0.0 "this network"', [{ address: '0.0.0.0', family: 4 }]],
    ['RFC 1918 10/8', [{ address: '10.0.0.5', family: 4 }]],
    ['RFC 1918 172.16/12', [{ address: '172.20.1.1', family: 4 }]],
    ['RFC 1918 192.168/16', [{ address: '192.168.1.1', family: 4 }]],
    ['cloud instance metadata', [{ address: '169.254.169.254', family: 4 }]],
    ['CGNAT / shared address space', [{ address: '100.64.0.1', family: 4 }]],
    ['IPv6 loopback', [{ address: '::1', family: 6 }]],
    ['IPv6 unique local', [{ address: 'fd00::1', family: 6 }]],
    ['IPv6 link-local', [{ address: 'fe80::1', family: 6 }]],
    ['an IPv4-mapped IPv6 private address', [{ address: '::ffff:10.0.0.1', family: 6 }]],
    ['a 6to4 address, which can encapsulate a private v4 destination', [{ address: '2002:0a00:0001::', family: 6 }]],
  ])('rejects %s', async (_label, addresses) => {
    mockLookup.mockResolvedValue(addresses)
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects when ANY resolved address is private, not just the first', async () => {
    // The classic bypass: publish a harmless A record and a private AAAA, and hope the checker only
    // looks at one of them. Node may connect to either.
    mockLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: 'fd00::1', family: 6 },
    ])
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects when DNS resolves to nothing at all', async () => {
    mockLookup.mockResolvedValue([])
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects when DNS fails', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('allows a public address', async () => {
    const { client } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(client.source).toBe('cimd')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('Transport controls', () => {
  it('refuses to follow redirects', async () => {
    // Without this, a public URL that 302s to 169.254.169.254 defeats the DNS check entirely.
    await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(mockFetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ redirect: 'error' }))
  })

  it('sends an abort signal, so a hung server cannot pin a request handler', async () => {
    await fetchClientIdMetadataDocument(CLIENT_ID)
    const init = mockFetch.mock.calls[0][1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects a document that declares itself over the size cap', async () => {
    mockFetch.mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-length': String(10 * 1024 * 1024) } })
    )
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects an oversized body even when content-length LIES about it', async () => {
    // `content-length` is a claim, not a fact; the bytes are counted as they arrive.
    const oversized = 'x'.repeat(70 * 1024)
    mockFetch.mockResolvedValue(
      new Response(oversized, { status: 200, headers: { 'content-length': '2' } })
    )
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects a non-200 response', async () => {
    mockFetch.mockResolvedValue(new Response('nope', { status: 404 }))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects a network failure without leaking the cause', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:443'))
    const error = await fetchClientIdMetadataDocument(CLIENT_ID).catch((e) => e)
    expect(error.description).not.toContain('10.0.0.1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('Document validation', () => {
  it('rejects a document whose client_id is not the URL it was fetched from', async () => {
    // ★ The impersonation guard. Without it, a document at an attacker's URL could claim to BE
    // another client and bring its redirect_uris along.
    mockFetch.mockResolvedValue(jsonResponse(validDocument('https://claude.ai/other-client.json')))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects a client_id that differs only by a trailing slash', async () => {
    mockFetch.mockResolvedValue(jsonResponse(validDocument(`${CLIENT_ID}/`)))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it.each([
    ['no redirect_uris', { client_id: CLIENT_ID }],
    ['an empty redirect_uris', { client_id: CLIENT_ID, redirect_uris: [] }],
    ['a non-array redirect_uris', { client_id: CLIENT_ID, redirect_uris: 'https://a/b' }],
    ['a plaintext redirect_uri', { client_id: CLIENT_ID, redirect_uris: ['http://evil.example/cb'] }],
    ['a non-string entry', { client_id: CLIENT_ID, redirect_uris: [42] }],
  ])('rejects a document with %s', async (_label, doc) => {
    mockFetch.mockResolvedValue(jsonResponse(doc))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('rejects a body that is not JSON', async () => {
    mockFetch.mockResolvedValue(new Response('<html>hello</html>', { status: 200 }))
    await expect(fetchClientIdMetadataDocument(CLIENT_ID)).rejects.toMatchObject({
      error: 'invalid_client',
    })
  })

  it('substitutes a placeholder when the document omits client_name', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ client_id: CLIENT_ID, redirect_uris: ['https://client.example.com/cb'] })
    )
    const { client } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(client.clientName).toBe('Unnamed MCP client')
  })

  it('caps a hostile client_name rather than storing it whole', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ ...validDocument(), client_name: 'A'.repeat(5000) })
    )
    const { client } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(client.clientName).toHaveLength(128)
  })

  it('returns exactly the fields the consent screen and authorize need', async () => {
    const { client } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(client).toEqual({
      clientId: CLIENT_ID,
      clientName: 'Example Agent',
      redirectUris: ['https://client.example.com/callback'],
      source: 'cimd',
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('Cache-Control handling', () => {
  it.each([
    ['no header at all', {}, 300],
    ['max-age within bounds', { 'cache-control': 'public, max-age=600' }, 600],
    ['max-age clamped UP off the floor', { 'cache-control': 'max-age=1' }, 60],
    ['max-age clamped DOWN to a day', { 'cache-control': 'max-age=31536000' }, 86400],
  ])('honours %s', async (_label, headers, expected) => {
    mockFetch.mockResolvedValue(jsonResponse(validDocument(), headers as Record<string, string>))
    const { cacheTtlSeconds } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(cacheTtlSeconds).toBe(expected)
  })

  it.each([['no-store'], ['no-cache']])('does not cache a document marked %s', async (directive) => {
    mockFetch.mockResolvedValue(jsonResponse(validDocument(), { 'cache-control': directive }))
    const { cacheTtlSeconds } = await fetchClientIdMetadataDocument(CLIENT_ID)
    expect(cacheTtlSeconds).toBeNull()
  })
})
