/**
 * `find_li2_docs` + `get_doc_page` — the public docs pair (plan §4.2, §4.3, seam exception #3).
 *
 * ★ WHY THESE TESTS EXIST. These tools have no back-hop route and no server-side re-validation
 * behind them, so unlike the six data tools there is no second layer to catch a mistake here. Three
 * properties carry real weight:
 *
 * 1. **The manifest is REMOTE INPUT.** Whoever can edit `llms.txt` is putting URLs in front of a
 *    model that is about to fetch them. The host is discarded and every URL is rebuilt from our own
 *    constant; if that ever regresses, this tool becomes a way to point Claude at an attacker's
 *    page with Li2's endorsement. Nothing else in the system would notice.
 * 2. **`get_doc_page` must never fetch a caller-supplied string.** The whole reason it takes a
 *    manifest PATH and not a URL is that a table lookup cannot be an SSRF. The test that matters is
 *    therefore not "a bad path errors" but "a bad path errors WITHOUT A FETCH" — the day someone
 *    "improves" this by falling back to fetching the argument, the error assertion would still pass
 *    and only the fetch-count assertion would fail.
 * 3. **A docs outage must be a tool error, not a 500.** A 500 crosses as a protocol failure the
 *    model cannot read; a tool error lands in its context where it can tell the user and move on.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { findLi2Docs, getDocPage, __resetDocsCacheForTests } from '@/core/mcp/find-docs'
import { McpToolError } from '@/core/mcp/errors'

const MANIFEST = [
  '# Li2.ai Documentation',
  '',
  '## Docs',
  '',
  '- [Hướng Dẫn Deep Link](https://docs.li2.ai/vi/deep-links/overview.md): Cách thiết lập deep link cho ứng dụng.',
  '- [Track Events](https://docs.li2.ai/vi/conversion-tracking/events.md): Hướng dẫn track lead và sale events.',
  '- [QR Codes](https://docs.li2.ai/vi/qr/intro.md): Tạo và theo dõi mã QR.',
  '',
  '## OpenAPI Specs',
  '',
  '- [Li2 API](https://docs.li2.ai/api-reference/openapi.json)',
].join('\n')

const MANIFEST_URL = 'https://docs.li2.ai/llms.txt'
const DEEP_LINK_PATH = '/vi/deep-links/overview.md'
const DEEP_LINK_URL = `https://docs.li2.ai${DEEP_LINK_PATH}`

function respondWith(body: string, init: { status?: number } = {}) {
  return vi.fn().mockResolvedValue(
    new Response(body, { status: init.status ?? 200, headers: { 'content-type': 'text/plain' } })
  )
}

/**
 * The manifest plus one page, keyed by URL.
 *
 * ⚠️ `mockImplementation`, not a resolved value: a `Response` body is single-use, so a test that
 * fetches twice would fail its second read for an unrelated reason.
 */
function respondByUrl(pages: Record<string, string>, manifest = MANIFEST) {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url === MANIFEST_URL) return new Response(manifest, { status: 200 })
    const page = pages[url]
    if (page === undefined) return new Response('not found', { status: 404 })
    return new Response(page, { status: 200, headers: { 'content-type': 'text/markdown' } })
  })
}

/** Every fetch this call made that was NOT the manifest. */
function pageFetches(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => call[0] as string).filter((url) => url !== MANIFEST_URL)
}

beforeEach(() => {
  __resetDocsCacheForTests()
  vi.stubGlobal('fetch', respondWith(MANIFEST))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The manifest is untrusted input
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('manifest URLs are rebuilt, never echoed', () => {
  it('DISCARDS the host on every manifest line', async () => {
    // The attack: an edited (or mirrored) manifest points a model at somebody else's site while
    // wearing Li2's name. We parse the path and rebuild; the host in the file is never used.
    vi.stubGlobal(
      'fetch',
      respondWith('- [Free Money](https://evil.example/vi/steal.md): Totally legitimate.')
    )
    const result = await findLi2Docs({ query: 'money' })

    expect(result.results).toHaveLength(1)
    // Path and extension both survive; only the HOST is replaced. The `.md` is load-bearing — it is
    // the machine-readable form a model can actually read (see `toDocsUrl`).
    expect(result.results[0].url).toBe('https://docs.li2.ai/vi/steal.md')
    expect(result.results[0].path).toBe('/vi/steal.md')
    expect(JSON.stringify(result)).not.toContain('evil.example')
  })

  it('keeps a traversal attempt inside docs.li2.ai instead of following it out', async () => {
    // `new URL()` resolves `..` before we see it, so the path normalizes rather than being rejected
    // — and that is fine: the host is ours by construction, so the worst outcome is a 404 on
    // docs.li2.ai. What must never happen is the URL leaving our origin. Both lines are checked
    // because the protocol-relative form (`//host/...`) is the one that reads like a path and is not.
    vi.stubGlobal(
      'fetch',
      respondWith(
        [
          '- [Escape](https://docs.li2.ai/vi/../../etc/passwd.md): traversal attempt.',
          '- [Sneaky](//evil.example/vi/x.md): protocol-relative traversal attempt.',
        ].join('\n')
      )
    )
    const result = await findLi2Docs({ query: 'traversal attempt' })

    expect(result.results).not.toHaveLength(0)
    for (const entry of result.results) {
      expect(new URL(entry.url).origin).toBe('https://docs.li2.ai')
    }
    expect(JSON.stringify(result)).not.toContain('evil.example')
  })

  it('passes every extension through unchanged, including the OpenAPI .json', async () => {
    // The path is echoed verbatim (F4: the `.md` form is the one a model can read, and mangling the
    // `.json` would 404 an entry the model would then blame on itself).
    const result = await findLi2Docs({ query: 'api' })
    expect(result.results[0].url).toBe('https://docs.li2.ai/api-reference/openapi.json')
    expect(result.results[0].path).toBe('/api-reference/openapi.json')
  })

  it('pins the User-Agent — the docs CDN 403s some defaults', async () => {
    const fetchMock = respondWith(MANIFEST)
    vi.stubGlobal('fetch', fetchMock)
    await findLi2Docs({ query: 'qr' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://docs.li2.ai/llms.txt')
    expect((init.headers as Record<string, string>)['user-agent']).toBe('li2-mcp/0.1')
    // A redirect to another host is the host-discard guard restated in HTTP.
    expect(init.redirect).toBe('error')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Matching
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('keyword matching', () => {
  it('matches an UNACCENTED query against Vietnamese text', async () => {
    // The corpus is Vietnamese; MCP clients type from English keyboards. Without diacritic folding
    // roughly half the index is unreachable and the tool looks broken rather than empty.
    const result = await findLi2Docs({ query: 'huong dan deep link' })
    expect(result.results.map((r) => r.title)).toContain('Hướng Dẫn Deep Link')
  })

  it('ranks a title hit above a description-only hit', async () => {
    // "Hướng Dẫn" appears in one title and in another page's description. Titles are curated;
    // descriptions repeat common words, so a description-only match must not outrank a title.
    const result = await findLi2Docs({ query: 'huong dan' })
    expect(result.results[0].title).toBe('Hướng Dẫn Deep Link')
  })

  it('returns a note, not a bare empty array, when nothing matches', async () => {
    // `{"results":[]}` alone reads to a model as "Li2 has no documentation about this".
    const result = await findLi2Docs({ query: 'zzzznotathing' })
    expect(result.results).toEqual([])
    expect(result.note).toContain('No Li2 documentation page matched')
  })

  it('clamps limit instead of rejecting the call', async () => {
    // The limit is a preference. Failing a whole lookup over it trades an answer for a lecture.
    expect((await findLi2Docs({ query: 'li2', limit: 0 })).results.length).toBeLessThanOrEqual(20)
    expect((await findLi2Docs({ query: 'a', limit: 999 })).results.length).toBeLessThanOrEqual(20)
    const limited = await findLi2Docs({ query: 'huong dan track qr', limit: 1 })
    expect(limited.results).toHaveLength(1)
  })

  it('rejects an empty query with a fixable message', async () => {
    // The low-level MCP `Server` does NOT enforce inputSchema (Phase 0.1 keeps the SDK's zod away
    // from ours), so this function is the only validator this tool has.
    await expect(findLi2Docs({})).rejects.toSatisfy(
      (e: unknown) => McpToolError.is(e) && e.reason === 'invalid_arguments'
    )
    await expect(findLi2Docs({ query: '   ' })).rejects.toSatisfy((e: unknown) => McpToolError.is(e))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Failure is a tool error, never a 500
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('docs outage', () => {
  // ⚠️ FACTORIES, not mocks. An `it.each` array is evaluated at COLLECTION time, so a `vi.fn()`
  // built inline there is stripped of its implementation by the first `afterEach`'s
  // `restoreAllMocks()` — every case then gets an `undefined` fetch and fails for the wrong reason.
  it.each([
    ['a non-200', () => respondWith('nope', { status: 503 })],
    ['a network failure', () => vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))],
    [
      'a manifest that parses to nothing',
      () => respondWith('# Just a heading\n\nno list items here'),
    ],
  ])('turns %s into a clean tool error', async (_label, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch())
    const error = await findLi2Docs({ query: 'deep link' }).catch((e) => e)

    expect(McpToolError.is(error)).toBe(true)
    expect((error as McpToolError).reason).toBe('upstream_unavailable')
    // The message must not leak the reason, and must not send the model into a retry loop.
    expect((error as McpToolError).clientMessage).toContain('do not retry in a loop')
    expect((error as McpToolError).clientMessage).not.toContain('ECONNREFUSED')
  })

  it('does not cache an empty manifest — a docs fix must take effect', async () => {
    vi.stubGlobal('fetch', respondWith('# nothing'))
    await findLi2Docs({ query: 'qr' }).catch(() => undefined)

    const healthy = respondWith(MANIFEST)
    vi.stubGlobal('fetch', healthy)
    expect((await findLi2Docs({ query: 'qr' })).results).toHaveLength(1)
    expect(healthy).toHaveBeenCalledTimes(1)
  })
})

describe('caching', () => {
  it('fetches the manifest once across several lookups', async () => {
    const fetchMock = respondWith(MANIFEST)
    vi.stubGlobal('fetch', fetchMock)

    await findLi2Docs({ query: 'qr' })
    await findLi2Docs({ query: 'events' })
    await findLi2Docs({ query: 'deep link' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The boundary the whole tool exists to respect
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe('organization data', () => {
  it('returns links and nothing else — no org axis exists in this tool', async () => {
    // Plan §4.2: this is the one tool that touches no customer data. If a future edit ever gives it
    // an org_id or a back hop, that is a fourth seam exception and §3 forbids it.
    const result = await findLi2Docs({ query: 'deep link' })
    for (const entry of result.results) {
      expect(Object.keys(entry).sort()).toEqual(['description', 'path', 'title', 'url'])
      expect(entry.url.startsWith('https://docs.li2.ai/')).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// `get_doc_page` — a table lookup, never a fetch of what the caller said (plan §4.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PAGE_MDX = [
  '> ## Documentation Index',
  '> Fetch the complete documentation index at: https://docs.li2.ai/llms.txt',
  '',
  '# Tổng Quan Deep Link',
  '',
  '<Info>',
  '  **Bạn sẽ học**: Deep Link là gì.',
  '</Info>',
  '',
  '<Steps>',
  '  <Step title="Cấu hình domain">',
  '    Thêm domain vào Li2.',
  '  </Step>',
  '  <Step title="Xác minh">',
  '    Tải file lên.',
  '  </Step>',
  '</Steps>',
  '',
  // An OPEN Card, because that is what the live corpus contains: 143 open, 0 self-closing
  // (counted across all 54 pages, 2026-07-30). A self-closing one is dropped, matching li2-ai.
  '<Card title="Tài liệu SDK" href="https://docs.li2.ai/vi/sdk.md">Xem thêm.</Card>',
  '',
  '```swift',
  'let handler = Li2<Deep>()  // <NotATag> inside a fence must survive',
  '```',
  '',
  'Dùng `<TeamID>.<BundleID>` làm định danh.',
].join('\n')

describe('get_doc_page — the path is a key, not a URL', () => {
  /**
   * ⛔ THE FIVE HOSTILE SHAPES FROM THE PLAN'S §4.3 CHECK. Each is a string a model could produce
   * instead of a manifest path — the second is the one that matters most, because a URL is exactly
   * what a well-meaning model would pass and exactly what must never be fetched.
   */
  it.each([
    ['a full docs URL', DEEP_LINK_URL],
    ['a URL on another origin', 'https://evil.example/steal.md'],
    ['a traversal', '/vi/../../etc/passwd'],
    ['a protocol-relative host', '//evil.example/vi/x.md'],
    ['junk', 'not a path at all !!'],
    ['a real-looking path the manifest does not list', '/vi/does-not-exist.md'],
  ])('rejects %s with the same error and WITHOUT fetching anything', async (_label, path) => {
    const fetchMock = respondByUrl({ [DEEP_LINK_URL]: PAGE_MDX })
    vi.stubGlobal('fetch', fetchMock)

    const error = await getDocPage({ path }).catch((e) => e)

    expect(McpToolError.is(error)).toBe(true)
    expect((error as McpToolError).reason).toBe('not_found')
    // ★ The assertion that actually guards the design. The manifest is fetched (that is the lookup
    // table); nothing else is. A regression that "helpfully" fetched the argument would still
    // produce an error for the junk cases and would still pass every other check in this file.
    expect(pageFetches(fetchMock)).toEqual([])
  })

  it('gives the same error for every one of them, byte for byte', async () => {
    vi.stubGlobal('fetch', respondByUrl({}))
    const messages = await Promise.all(
      [DEEP_LINK_URL, 'https://evil.example/x.md', '../../etc/passwd', 'zzz'].map((path) =>
        getDocPage({ path }).catch((e: McpToolError) => e.clientMessage)
      )
    )
    expect(new Set(messages).size).toBe(1)
  })

  it('rejects a missing path before it even loads the manifest', async () => {
    const fetchMock = respondByUrl({})
    vi.stubGlobal('fetch', fetchMock)

    await expect(getDocPage({})).rejects.toSatisfy(
      (e: unknown) => McpToolError.is(e) && e.reason === 'invalid_arguments'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches OUR rebuilt URL even when the manifest names another host', async () => {
    // The composed attack: poison the manifest, then have the model read the poisoned entry. The
    // path resolves to an entry whose `url` we rebuilt, so the fetch lands on docs.li2.ai anyway.
    const fetchMock = respondByUrl(
      { 'https://docs.li2.ai/vi/steal.md': '# Harmless' },
      '- [Free Money](https://evil.example/vi/steal.md): Totally legitimate.'
    )
    vi.stubGlobal('fetch', fetchMock)

    const found = await findLi2Docs({ query: 'money' })
    const page = await getDocPage({ path: found.results[0].path })

    expect(pageFetches(fetchMock)).toEqual(['https://docs.li2.ai/vi/steal.md'])
    expect(JSON.stringify(page)).not.toContain('evil.example')
  })
})

describe('get_doc_page — the pair composes', () => {
  it('reads a page using the path find_li2_docs returned, with no other input', async () => {
    // The property F4 needs: search → read, with the model copying one field. Tested as a PAIR
    // because testing them apart is what let the links-only design ship in the first place.
    const fetchMock = respondByUrl({ [DEEP_LINK_URL]: PAGE_MDX })
    vi.stubGlobal('fetch', fetchMock)

    const found = await findLi2Docs({ query: 'deep link' })
    const page = await getDocPage({ path: found.results[0].path })

    expect(page.path).toBe(DEEP_LINK_PATH)
    expect(page.url).toBe(DEEP_LINK_URL)
    expect(page.title).toBe('Hướng Dẫn Deep Link')
    expect(page.content).toContain('Tổng Quan Deep Link')
    // Four fields and no fifth: there is no `truncated`, because there is no truncation.
    expect(Object.keys(page).sort()).toEqual(['content', 'path', 'title', 'url'])
    // One manifest fetch for both calls — the cache is shared, as plan §4.3 requires.
    expect(fetchMock.mock.calls.filter((c) => c[0] === MANIFEST_URL)).toHaveLength(1)
  })

  it('accepts the path with or without its leading slash', async () => {
    // Tolerated because it is a MAP LOOKUP: normalising the key cannot widen what is reachable.
    vi.stubGlobal('fetch', respondByUrl({ [DEEP_LINK_URL]: PAGE_MDX }))
    const withSlash = await getDocPage({ path: DEEP_LINK_PATH })
    const without = await getDocPage({ path: DEEP_LINK_PATH.slice(1) })
    expect(without.content).toBe(withSlash.content)
  })
})

describe('get_doc_page — MDX never reaches the model', () => {
  it('unwraps components, numbers steps, and keeps fenced code byte for byte', async () => {
    vi.stubGlobal('fetch', respondByUrl({ [DEEP_LINK_URL]: PAGE_MDX }))
    const page = await getDocPage({ path: DEEP_LINK_PATH })

    // No JSX survives outside code.
    expect(page.content).not.toContain('<Info>')
    expect(page.content).not.toContain('<Steps>')
    expect(page.content).not.toContain('<Card')
    // The text INSIDE those components does survive — unwrapping is not deleting.
    expect(page.content).toContain('**Bạn sẽ học**: Deep Link là gì.')
    // Attribute-borne titles are the only place a step's name lives once the tag is gone.
    expect(page.content).toContain('**Bước 1: Cấu hình domain**')
    expect(page.content).toContain('**Bước 2: Xác minh**')
    expect(page.content).toContain('**Tài liệu SDK** (https://docs.li2.ai/vi/sdk.md)')
    // A snippet that merely LOOKS like JSX must be untouched, or we hand out code that will not
    // compile and nothing anywhere reports it.
    expect(page.content).toContain('let handler = Li2<Deep>()  // <NotATag> inside a fence must survive')
    expect(page.content).toContain('`<TeamID>.<BundleID>`')
    // The per-page "Documentation Index" blockquote is pure noise repeated on every page.
    expect(page.content).not.toContain('Documentation Index')
  })

  it('leaves a non-markdown entry alone — the OpenAPI spec is not MDX', async () => {
    const specUrl = 'https://docs.li2.ai/api-reference/openapi.json'
    const spec = '{"info":{"title":"Li2 API","description":"a <b> in a string"}}'
    vi.stubGlobal('fetch', respondByUrl({ [specUrl]: spec }))

    const page = await getDocPage({ path: '/api-reference/openapi.json' })
    // Running a JSX-tag regex over JSON would silently eat text out of a string value.
    expect(page.content).toBe(spec)
  })
})

describe('get_doc_page — whole page or nothing (Kei, 2026-07-30)', () => {
  /**
   * ⛔ THE RULE THIS BLOCK EXISTS TO KEEP: a page is NEVER shortened. A 24 000-character cap was
   * built first and measured against the live corpus before being removed — it dropped 10 of the 15
   * headings of `vi/deep-links/mobile-integration.md`, including the entire 6-step Android
   * walkthrough, and cut mid-Kotlin-snippet. A model reading that says Android integration ends at
   * `handleAppLink`, with no way to know it is wrong. Partial docs are not a partial answer; they
   * are a wrong answer that looks whole. Anyone re-adding a trim here should read that measurement
   * first, in the `MAX_PAGE_CHARS` comment.
   */
  it('returns a very long page in full, with no marker and nothing removed', async () => {
    // 40 000 characters — well past the old cap, and larger than any page in the live corpus.
    const longPage = ['# Long', ...Array.from({ length: 4000 }, (_, i) => `Dòng số ${i}.`)].join('\n')
    expect(longPage.length).toBeGreaterThan(40_000)
    vi.stubGlobal('fetch', respondByUrl({ [DEEP_LINK_URL]: longPage }))

    const page = await getDocPage({ path: DEEP_LINK_PATH })

    expect(page.content).toBe(longPage)
    expect(page.content).not.toContain('TRUNCATED')
    // The last line is the assertion that matters: the tail is what a truncating cap eats, and the
    // tail of a how-to page is where troubleshooting and "next steps" live.
    expect(page.content.endsWith('Dòng số 3999.')).toBe(true)
  })

  it('REFUSES a page that is absurdly large instead of returning part of it', async () => {
    // ~3.5x the largest real page is not a doc page that grew; it is a URL serving something else.
    // Refusing is honest where trimming would be a quiet lie — and the message says so, so the model
    // cannot answer as though it had read the beginning.
    const huge = 'x'.repeat(128 * 1024 + 1)
    vi.stubGlobal('fetch', respondByUrl({ [DEEP_LINK_URL]: huge }))

    const error = await getDocPage({ path: DEEP_LINK_PATH }).catch((e) => e)

    expect(McpToolError.is(error)).toBe(true)
    expect((error as McpToolError).reason).toBe('upstream_unavailable')
    expect((error as McpToolError).clientMessage).toContain(
      'do not answer as though you had read part of it'
    )
  })
})

describe('get_doc_page — a page outage is a tool error', () => {
  it.each([
    ['a 404 from the CDN', () => respondByUrl({})],
    [
      'a network failure on the page',
      () =>
        vi.fn().mockImplementation(async (url: string) => {
          if (url === MANIFEST_URL) return new Response(MANIFEST, { status: 200 })
          throw new Error('ECONNREFUSED')
        }),
    ],
  ])('turns %s into a clean tool error, never a 500', async (_label, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch())
    const error = await getDocPage({ path: DEEP_LINK_PATH }).catch((e) => e)

    expect(McpToolError.is(error)).toBe(true)
    expect((error as McpToolError).reason).toBe('upstream_unavailable')
    expect((error as McpToolError).clientMessage).toContain('do not retry in a loop')
    expect((error as McpToolError).clientMessage).not.toContain('ECONNREFUSED')
  })

  it('pins the User-Agent and refuses redirects on the page fetch too', async () => {
    // Same reasoning as the manifest: the CDN 403s some default agents, and a 302 to another host is
    // the host-discard guard restated in HTTP.
    const fetchMock = respondByUrl({ [DEEP_LINK_URL]: '# Doc' })
    vi.stubGlobal('fetch', fetchMock)
    await getDocPage({ path: DEEP_LINK_PATH })

    const call = fetchMock.mock.calls.find((c) => c[0] === DEEP_LINK_URL) as [string, RequestInit]
    expect((call[1].headers as Record<string, string>)['user-agent']).toBe('li2-mcp/0.1')
    expect(call[1].redirect).toBe('error')
    expect((call[1].headers as Record<string, string>).authorization).toBeUndefined()
  })
})
