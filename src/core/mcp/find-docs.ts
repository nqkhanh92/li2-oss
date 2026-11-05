/**
 * ============================================================================
 * `find_li2_docs` + `get_doc_page` — the third and final seam exception (plan §4.2, §4.3, §3).
 * ============================================================================
 *
 * ⚠️ TWO TOOLS, ONE EXCEPTION. §3's count of sanctioned seam exceptions is still THREE, not four.
 * `get_doc_page` is not a new hole in the seam: it is the second half of the same one — same file,
 * same public `docs.li2.ai` reach, same "no identity, no org, no entitlement, no back hop". A fourth
 * exception still requires amending §3. What is forbidden is a tool that reaches a NEW place, and
 * this one reaches nowhere `find_li2_docs` did not already reach.
 *
 * GET the PUBLIC `docs.li2.ai` manifest, keyword-match it, hand back links. No identity, no org, no
 * entitlement, no back hop, no LLM. It is the only tool in this server that touches nothing of the
 * customer's, which is exactly why §3 sanctions it: routing a public document index through an
 * authenticated back hop would buy a hop and a minted token for zero security value.
 *
 * ★ WHY THE SECOND TOOL EXISTS AT ALL (Phase 6 finding F4, measured 2026-07-30). Returning links was
 * supposed to be enough — "Claude Desktop can read them itself". It cannot: the client refuses to
 * fetch a URL that arrived from a third-party MCP tool, and said so in its own words
 * ("web_fetch won't accept URLs from other tools… it needs the URL to come from web_search first").
 * That is a correct prompt-injection defence — a connector must not be able to steer the model's
 * fetcher — so the fix is not to fight it but to move the fetch inside code we control. The client's
 * rule is about the CLIENT fetching, not about MCP tool arguments, so a path handed back into
 * another Li2 tool passes freely.
 *
 * ⛔⛔ `get_doc_page` TAKES A MANIFEST PATH AND NEVER A URL, AND THAT IS THE WHOLE SECURITY DESIGN.
 * Accepting a URL would mean fetching a model-supplied string — the exact SSRF shape the CIMD
 * fetcher needed https-only + private-range denial + per-address DNS pre-flight + `redirect:'error'`
 * + streamed size caps to survive in Phase 3a. The model is *supposed* to pass a URL it got from
 * `find_li2_docs`, but nothing compels it to, and "the model will behave" is not a control. A path
 * is looked up in the map we built from OUR OWN parse of the manifest, and the URL we then fetch is
 * one `toDocsUrl` already rebuilt on our own origin. There is nothing left to validate because there
 * is no attacker-supplied URL anywhere in the path — the vulnerability class is absent by
 * construction, not defended against. A path that is not in the map is a clean tool error, and every
 * hostile shape (a full URL, another origin, `../`, junk) lands on that same one error.
 *
 * ⛔ THIS IS NOT li2-ai's `search_docs` AND MUST NEVER BECOME IT — and the line between them moved
 * with F4, so it is worth being exact. Over there the name is a *signal* that fires a 3-LLM-call
 * pipeline (nav → gate → synthesize) which WE pay for, to pre-chew docs into li2-ai's context
 * budget. Here the client IS the model and the customer pays for their own tokens (plan §0, the same
 * premise that keeps `ai_budget` out of MCP). `get_doc_page` fetches and strips — as li2-ai's KB
 * branch does — but it stops there: NO ranking call, NO gate call, NO synthesis call, no cost of
 * ours per lookup. Fetch-and-strip is plumbing; the three LLM calls are the thing we refuse to pay
 * for. If a future edit adds a model call to this file, it has crossed back over.
 *
 * ★ THE MANIFEST IS REMOTE INPUT AND IS TREATED AS SUCH. Its URLs' host is DISCARDED and every
 * returned URL is rebuilt from the constant below — the same guard as li2-ai's
 * `_parse_manifest_url_path`. Without it, anyone who could edit `llms.txt` could put an arbitrary
 * host in front of a model that is about to fetch it — and since `get_doc_page` now fetches these
 * URLs itself, that guard is no longer protecting only our caller. It protects this process.
 *
 * ⚠️ THE USER-AGENT IS LOAD-BEARING, NOT POLITENESS. The docs CDN does UA filtering and 403s some
 * default agents — li2-ai discovered this the hard way and pins its own (`app/kb/fetch.py`, D2).
 * Dropping this header is a silently empty tool, not a crash.
 *
 * Deliberate divergence from li2-ai: it accepts only `vi/**.md` manifest paths. We accept any, so
 * entries like the OpenAPI spec stay reachable instead of being silently dropped — safe because the
 * host is already ours by then, and because `getDocPage` only MDX-strips what is actually `.md`.
 */
import { logger } from '@/infrastructure/logging/logger'
import { McpToolError } from './errors'
import { stripMdx } from './strip-mdx'
import type { z } from 'zod'
import type {
  docEntrySchema,
  docPageResultSchema,
  findDocsResultSchema,
} from '@/shared/schemas/agent-tools'

const log = logger.child({ module: 'mcp-find-docs' })

/** Constant, never configurable: it is the trust anchor that makes a manifest URL safe to return. */
const DOCS_BASE_URL = 'https://docs.li2.ai'
const MANIFEST_URL = `${DOCS_BASE_URL}/llms.txt`

/** Matches li2-ai's `KB_CACHE_TTL_S`. Long enough to make a chatty session one fetch, short enough
 *  that a docs release shows up the same day without a deploy. */
const MANIFEST_TTL_MS = 15 * 60 * 1000
/** A static index is ~12 KB today. Anything near this cap means the URL now serves something else. */
const MAX_MANIFEST_BYTES = 256 * 1024
/** A CDN file that takes 10s means the site is down; fail to a clean tool error rather than hang. */
const FETCH_TIMEOUT_MS = 10_000
const USER_AGENT = 'li2-mcp/0.1'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

/**
 * ⛔ THE ONLY SIZE LIMIT. A PAGE IS RETURNED WHOLE OR NOT AT ALL — never trimmed (Kei, 2026-07-30).
 *
 * A truncating cap was built first and then removed, and the measurement that killed it is worth
 * keeping: cutting `vi/deep-links/mobile-integration.md` at 24 000 characters dropped 10 of its 15
 * headings — the ENTIRE 6-step Android integration walkthrough, idempotency, production testing —
 * and the cut landed mid-Kotlin-snippet. A model reading that would state, with justified
 * confidence, that Android integration ends at `handleAppLink`. Partial documentation is not most of
 * an answer; it is a wrong answer that looks complete.
 *
 * Pagination was the obvious repair and is worse: when the model needs the whole page it pays for
 * part 1 TWICE (once when read, again as conversation context on the turn that fetches part 2), and
 * it still relies on the model choosing to ask for part 2 — the same "trust the client's behaviour"
 * assumption F4 already falsified once.
 *
 * So the limit is a REFUSAL, not a trim, and it is set where refusing is honest: 128 K characters is
 * ~3.5× the largest page in the live corpus (37 KB, measured 2026-07-30, and the ONLY page that the
 * old 24 000 cap ever touched). Anything past it is not a documentation page that grew — it is a URL
 * that has started serving something else, and returning a fifth of that helps nobody.
 *
 * ⚠️ It counts CHARACTERS of the decoded body, not bytes on the wire, and that is the number that
 * matters: characters are what reach the model's context.
 */
const MAX_PAGE_CHARS = 128 * 1024

/** A title hit outranks a description hit: titles are curated, descriptions are prose that repeats
 *  common words across half the corpus. */
const TITLE_WEIGHT = 3
const DESCRIPTION_WEIGHT = 1

/**
 * ★ `path` IS THE JOIN BETWEEN THE TWO TOOLS, and the reason `get_doc_page` needs no URL validation.
 * It is the manifest URL's pathname with exactly one leading slash (`/vi/deep-links/overview.md`),
 * which is also the key of `byPath`. Returned to the model so it can hand it straight back — a
 * client that copies this field verbatim is the ONLY supported way to reach a page.
 *
 * ⭐ P0.4 — inferred from the Zod in `shared/schemas/agent-tools.ts`, which is also what `tools.ts`
 * generates the two docs tools' `outputSchema` from. The shape is unchanged; the declaration moved
 * so there is one of it.
 */
export type DocEntry = z.infer<typeof docEntrySchema>

/** Parsed once per manifest fetch. `byPath` is what makes reading a page a table lookup instead of
 *  a URL fetch, so it is built HERE — never derived later from anything a caller said. */
interface DocsIndex {
  entries: DocEntry[]
  byPath: Map<string, DocEntry>
}

/** Module-level, per-instance, no eviction: the value is one small array and a concurrent cold-key
 *  race is a benign double-GET of an idempotent request. */
let manifestCache: { fetchedAt: number; index: DocsIndex } | null = null

/** ⚠️ Tests only — the cache would otherwise leak a fixture into the next test file. */
export function __resetDocsCacheForTests(): void {
  manifestCache = null
}

const MANIFEST_LINE = /^-\s*\[([^\]]*)\]\(([^)]+)\)(?::\s*(.*))?$/

/**
 * The manifest's own URL is parsed for its PATH only (see the file header).
 *
 * ★ THE INVARIANT IS "the returned URL is under `DOCS_BASE_URL`", not "the path looks tidy", and the
 * difference matters. A `..` check here would be DEAD CODE: `new URL()` resolves the path before we
 * ever see it, so `…/vi/../../etc/x.md` arrives as `/etc/x.md` with no `..` left to find — and a
 * traversal is harmless anyway once the host is ours, because the worst it can produce is a 404 on
 * docs.li2.ai. So the guard that is kept is the one that can actually fail: the built URL is
 * re-parsed and its origin compared. That catches the real regression — someone "simplifying" this
 * function into returning the manifest's own URL.
 */
function toDocsUrl(rawUrl: string): { path: string; url: string } | null {
  let path: string
  try {
    // The base makes a relative manifest URL work too; an absolute one has its host dropped here.
    path = new URL(rawUrl, DOCS_BASE_URL).pathname
  } catch {
    return null
  }
  const trimmed = path.replace(/^\/+/, '')
  if (!trimmed) return null
  /**
   * ★ THE EXTENSION IS KEPT — do not "tidy" this back into the pretty URL (measured 2026-07-30).
   *
   * li2-ai's `doc_url` strips `.md` because its consumer is a human clicking a citation. Ours is a
   * MODEL that has to read the page, and the two forms are not the same document: `.md` serves
   * 8 KB of `text/markdown`, while the extensionless page serves ~354 KB of `text/html` whose
   * content is client-rendered. Both return 200, which is why this looked fine until a real client
   * tried it — Claude Desktop routed here correctly, then failed to fetch, having been handed a
   * JavaScript shell with no readable text in it.
   *
   * The manifest is entirely extensioned today (53 × `.md`, 1 × `.json`), so passing the path
   * through unchanged is also what keeps the OpenAPI entry working.
   */
  const built = `${DOCS_BASE_URL}/${trimmed}`
  if (new URL(built).origin !== DOCS_BASE_URL) return null
  return { path: `/${trimmed}`, url: built }
}

function parseManifest(body: string): DocsIndex {
  const entries: DocEntry[] = []
  const byPath = new Map<string, DocEntry>()
  for (const line of body.split('\n')) {
    const match = MANIFEST_LINE.exec(line.trim())
    if (!match) continue
    const resolved = toDocsUrl(match[2])
    if (!resolved) continue
    const entry: DocEntry = {
      title: match[1].trim(),
      path: resolved.path,
      url: resolved.url,
      description: (match[3] ?? '').trim(),
    }
    entries.push(entry)
    // First wins on a duplicate path: manifest order is the docs team's curation, and a later line
    // silently overwriting an earlier one would make the same path mean different things over time.
    if (!byPath.has(entry.path)) byPath.set(entry.path, entry)
  }
  return { entries, byPath }
}

/**
 * The only failure this module raises to a caller. Every mode — network, non-200, oversized, decode,
 * zero entries — collapses here, so `call-tool.ts` has exactly one thing to catch and the client
 * never sees a 500 (plan Phase 4: "a manifest fetch failure must degrade to a clean tool error").
 */
function manifestUnavailable(): McpToolError {
  return new McpToolError(
    'upstream_unavailable',
    'The Li2 documentation index could not be reached right now. Answer from what you already know, ' +
      'or point the user at https://docs.li2.ai — do not retry in a loop.'
  )
}

async function loadManifest(): Promise<DocsIndex> {
  if (manifestCache && Date.now() - manifestCache.fetchedAt < MANIFEST_TTL_MS) {
    return manifestCache.index
  }

  let response: Response
  try {
    response = await fetch(MANIFEST_URL, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/plain' },
      // A manifest that 302s to another host is the header guard's attack in redirect form.
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    log.error({ err: error }, '[mcp] docs manifest fetch failed')
    throw manifestUnavailable()
  }

  if (!response.ok) {
    log.error({ status: response.status }, '[mcp] docs manifest returned a non-200')
    throw manifestUnavailable()
  }

  const body = await response.text()
  // Checked AFTER read rather than on content-length, which a chunked CDN response may omit. The
  // cap exists to stop a wrong URL becoming a parse of something huge, not to save the download.
  if (body.length > MAX_MANIFEST_BYTES) {
    log.error({ bytes: body.length }, '[mcp] docs manifest exceeds the size cap')
    throw manifestUnavailable()
  }

  const index = parseManifest(body)
  // A silently empty manifest reads to the model as "Li2 has no documentation", which is a worse
  // lie than an outage. Fail loud, and do NOT cache the emptiness.
  if (index.entries.length === 0) {
    log.error('[mcp] docs manifest parsed to 0 entries — the format may have changed')
    throw manifestUnavailable()
  }

  manifestCache = { fetchedAt: Date.now(), index }
  return index
}

/**
 * Fold a Vietnamese string to plain ASCII-ish letters so an unaccented query still matches.
 *
 * The corpus is Vietnamese and MCP clients type queries both ways ("huong dan" vs "hướng dẫn"), so
 * without this half the index is unreachable from an English keyboard. NFD + combining-mark strip
 * handles the tone and vowel marks; `đ` is a distinct letter with no decomposition and needs its own
 * line — miss it and every "dashboard/đăng ký"-style term silently stops matching.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function terms(query: string): string[] {
  return fold(query)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Keyword matching over a curated flat index — NOT semantic search (plan §4.2). Its quality is
 *  exactly the quality of the manifest's descriptions, and the tool description says so. */
function rank(entries: DocEntry[], query: string): DocEntry[] {
  const queryTerms = terms(query)
  if (queryTerms.length === 0) return []

  return entries
    .map((entry, index) => {
      const title = fold(entry.title)
      const description = fold(entry.description)
      let score = 0
      for (const term of queryTerms) {
        if (title.includes(term)) score += TITLE_WEIGHT
        else if (description.includes(term)) score += DESCRIPTION_WEIGHT
      }
      return { entry, score, index }
    })
    .filter((scored) => scored.score > 0)
    // Manifest order breaks ties, so the same query always returns the same list — the docs team
    // curates that order, and a stable answer is a prompt-cache hit for the client's model.
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((scored) => scored.entry)
}

export type FindDocsResult = z.infer<typeof findDocsResultSchema>

/**
 * `args` arrive UNVALIDATED: the low-level MCP `Server` does not enforce `inputSchema` (Phase 0.1
 * uses it precisely to keep the SDK's zod away from ours), and this tool has no back-hop route to
 * re-parse for it. So the schema in `tools.ts` is advisory and this function is the real validator.
 */
export async function findLi2Docs(args: Record<string, unknown>): Promise<FindDocsResult> {
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (!query) {
    throw new McpToolError(
      'invalid_arguments',
      'find_li2_docs needs a non-empty "query" of keywords to match against Li2 documentation ' +
        'titles and descriptions, e.g. "deep link setup".'
    )
  }

  const limit = clampLimit(args.limit)
  const { entries } = await loadManifest()
  const results = rank(entries, query).slice(0, limit)

  if (results.length === 0) {
    return {
      query,
      results: [],
      note:
        'No Li2 documentation page matched those keywords. Try fewer or more general words — ' +
        'matching is literal over page titles and descriptions, not semantic.',
    }
  }
  return { query, results }
}

/** Out-of-range or nonsense clamps rather than rejects: the limit is a preference, and failing a
 *  whole lookup over it would trade a useful answer for a lecture. */
function clampLimit(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value)))
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// `get_doc_page` — the other half of the pair (plan §4.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** `content` is MDX-stripped, and WHOLE. There is no partial success here — see `MAX_PAGE_CHARS`. */
export type DocPageResult = z.infer<typeof docPageResultSchema>

/**
 * ★ THE ONLY THING DONE TO A CALLER-SUPPLIED PATH, and it is deliberately almost nothing.
 *
 * Trim, then collapse leading slashes to exactly one, then look the result up in the map. That is
 * the entire treatment: no URL parsing, no `..` handling, no origin check — because none of those
 * can matter to a MAP LOOKUP. A full URL, a foreign origin, `../../etc/passwd`, and a line of junk
 * are all simply keys that are not in the map, and they all fail identically.
 *
 * The slash tolerance is ergonomics with no security cost: a model that copies `path` verbatim hits
 * the key exactly, and one that helpfully strips the leading slash still lands. `//evil.example/x`
 * normalises to `/evil.example/x`, which is a miss — as it should be.
 */
function normalizeDocPath(raw: string): string {
  return `/${raw.trim().replace(/^\/+/, '')}`
}

/**
 * One error for every way a path can be wrong. There is no oracle concern here — the whole corpus is
 * public — but a single message is what makes the model's recovery unambiguous: go back to
 * `find_li2_docs`, do not improvise a URL.
 */
function docPathUnknown(): McpToolError {
  return new McpToolError(
    'not_found',
    'That page is not in the Li2 documentation index. Call find_li2_docs first and pass the exact ' +
      '"path" value from one of its results — this tool takes a documentation path, never a URL, ' +
      'and never a path it did not hand you.'
  )
}

function pageUnavailable(url: string): McpToolError {
  return new McpToolError(
    'upstream_unavailable',
    `That Li2 documentation page could not be read right now. Tell the user they can open ${url} ` +
      'themselves, and answer from what you already know — do not retry in a loop.'
  )
}

/**
 * Separate from `pageUnavailable` because the recovery differs: retrying an outage may work, and
 * retrying a page that is too large never will. Both refuse rather than trim — the plan's rule is
 * that a page arrives whole or not at all (see `MAX_PAGE_CHARS`), because a partial integration
 * guide is a wrong answer wearing the clothes of a complete one.
 */
function pageTooLarge(url: string): McpToolError {
  return new McpToolError(
    'upstream_unavailable',
    'That Li2 documentation page is far larger than a documentation page should be, so it was not ' +
      `read rather than being returned half-finished. Tell the user to open ${url} directly — do ` +
      'not retry, and do not answer as though you had read part of it.'
  )
}

/**
 * Same fetch posture as the manifest, for the same reasons: a pinned UA because the docs CDN filters
 * some defaults, `redirect: 'error'` so a 302 cannot walk this off our origin, a timeout so a dead
 * CDN is a tool error rather than a hung client.
 *
 * NOT CACHED, unlike the manifest. A page is read once per conversation, it is 8-37 KB, and a cache
 * keyed by an unbounded path set is a memory leak in a long-lived Node process. The manifest earns
 * its cache by being fetched on EVERY call of either tool; a page does not.
 */
async function fetchDocPage(url: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/markdown, text/plain' },
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    log.error({ err: error, url }, '[mcp] docs page fetch failed')
    throw pageUnavailable(url)
  }

  if (!response.ok) {
    // A 404 here means the manifest lists a page the site no longer serves — our index is stale, not
    // the caller's request. Same clean error either way; the log line is what tells us which.
    log.error({ status: response.status, url }, '[mcp] docs page returned a non-200')
    throw pageUnavailable(url)
  }

  const body = await response.text()
  // Checked AFTER the read rather than on `content-length`, which a chunked CDN response may omit —
  // and the cap is about what would reach the model's context, not about saving the download.
  if (body.length > MAX_PAGE_CHARS) {
    log.error({ chars: body.length, url }, '[mcp] docs page exceeds the size cap')
    throw pageTooLarge(url)
  }
  return body
}

/**
 * `args` arrive UNVALIDATED, exactly as in `findLi2Docs` — the low-level MCP `Server` does not
 * enforce `inputSchema` (Phase 0.1), so this function is the real validator.
 */
export async function getDocPage(args: Record<string, unknown>): Promise<DocPageResult> {
  const raw = typeof args.path === 'string' ? args.path.trim() : ''
  if (!raw) {
    throw new McpToolError(
      'invalid_arguments',
      'get_doc_page needs a "path" — the exact value of the "path" field on a find_li2_docs result, ' +
        'e.g. "/vi/deep-links/overview.md". Call find_li2_docs first if you do not have one.'
    )
  }

  const { byPath } = await loadManifest()
  const entry = byPath.get(normalizeDocPath(raw))
  // ★ The miss returns BEFORE any fetch. Nothing a caller says can cause a request to be made; only
  // a URL we parsed out of the manifest ourselves can. Phase 4c's lesson, one layer down: the check
  // that matters is the one no later code can reach around.
  if (!entry) {
    log.debug('[mcp] get_doc_page called with a path that is not in the manifest')
    throw docPathUnknown()
  }

  const body = await fetchDocPage(entry.url)
  // MDX stripping applies to MDX. The manifest also carries the OpenAPI `.json`, and running a
  // JSX-tag regex over a JSON document risks silently eating a string that merely looks like a tag.
  const content = entry.path.endsWith('.md') ? stripMdx(body).trim() : body.trim()

  return { path: entry.path, title: entry.title, url: entry.url, content }
}
