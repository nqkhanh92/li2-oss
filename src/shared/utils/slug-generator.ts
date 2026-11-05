// url-structure-generator.ts
export type GenerateOptions = {
  maxWords?: number // default: 12
  minWords?: number // default: 6
  ignoreExtensions?: Set<string> // override if needed
  meaninglessSegments?: Set<string>
}

const DEFAULT_IGNORE_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.php',
  '.aspx',
  '.jsp',
  '.cfm',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.xml',
  '.json',
])

const DEFAULT_MEANINGLESS = new Set([
  'index',
  'home',
  'main',
  'default',
  'page',
  'article',
  'post',
  'content',
  'view',
  'show',
  'detail',
  'item',
  'id',
  'www',
  'blog',
  'news',
  'site',
  'web',
])

const COMMON_SUBDOMAINS = new Set([
  'www',
  'blog',
  'news',
  'shop',
  'store',
  'api',
  'app',
  'mail',
  'm',
  'mobile',
])

const COMMON_DOMAIN_SKIP = new Set(['site', 'page', 'blog', 'news'])

/** Lowercases, replaces separators with spaces, strips special chars, squashes spaces. */
export function cleanSegment(segment: string): string {
  const lowered = segment.toLowerCase()
  const sepToSpace = lowered.replace(/[_\-\+=\.]/g, ' ')
  const stripSpecial = sepToSpace.replace(/[^a-z0-9\s]/g, '')
  return stripSpecial.trim().replace(/\s+/g, ' ')
}

/** Splits on spaces and camelCase; filters short/trivial tokens. */
export function splitIntoWords(
  segment: string,
  meaningless = DEFAULT_MEANINGLESS,
  maxWords = 12,
  minWords = 6
): string[] {
  const words: string[] = []
  for (const part of segment.split(/\s+/)) {
    // camelCase splitter: groups of lowercase or Capitalized tokens
    const camel = part.match(/[a-z]+|[A-Z][a-z]*/g)
    if (camel) {
      for (const w of camel) words.push(w.toLowerCase())
    } else if (part) {
      words.push(part.toLowerCase())
    }
  }
  const filtered = words.filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !meaningless.has(w))
  if (filtered.length < minWords) return []
  return filtered.slice(0, maxWords)
}

/** Removes a known extension if present. */
export function stripKnownExtension(
  input: string,
  ignoreExtensions = DEFAULT_IGNORE_EXTENSIONS
): string {
  const lower = input.toLowerCase()
  for (const ext of Array.from(ignoreExtensions)) {
    if (lower.endsWith(ext)) {
      return input.slice(0, input.length - ext.length)
    }
  }
  return input
}

/** Fallback random slug. */
export function generateFallbackSlug(): string {
  const prefixes = ['web', 'site', 'page', 'link', 'url', 'external']
  const n = Math.floor(Math.random() * 900) + 100 // 100..999
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${n}`
}

/** Extract meaningful slug from a single path segment. */
export function processPathSegment(segment: string, opts?: GenerateOptions): string | null {
  if (!segment) return null

  const ignoreExt = opts?.ignoreExtensions ?? DEFAULT_IGNORE_EXTENSIONS
  const meaningless = opts?.meaninglessSegments ?? DEFAULT_MEANINGLESS
  const maxWords = opts?.maxWords ?? 12
  const minWords = opts?.minWords ?? 6

  const base = stripKnownExtension(segment, ignoreExt)

  if (meaningless.has(base.toLowerCase())) return null
  if (/^\d+$/.test(base)) return null

  const cleaned = cleanSegment(base)
  if (!cleaned || cleaned.length < 3) return null

  const words = splitIntoWords(cleaned, meaningless, maxWords, minWords)
  if (words.length >= minWords) return words.join('-')
  return null
}

/** Extract from URL path (walk from last segment to first). */
export function extractFromPath(path: string, opts?: GenerateOptions): string | null {
  if (!path || path === '/') return null
  // Decode and split
  const decoded = decodeURIComponent(path)
  const segments = decoded.split('/').filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const slug = processPathSegment(segments[i], opts)
    if (slug) return slug
  }
  return null
}

/** Extract from query parameters using meaningful keys. */
export function extractFromQuery(query: string, opts?: GenerateOptions): string | null {
  if (!query) return null

  const maxWords = opts?.maxWords ?? 12
  const minWords = opts?.minWords ?? 6
  const meaningless = opts?.meaninglessSegments ?? DEFAULT_MEANINGLESS

  const meaningfulParams = ['title', 'name', 'article', 'post', 'page', 'q', 'search', 'topic']
  const sp = new URLSearchParams(query)

  for (const key of meaningfulParams) {
    const value = sp.get(key)
    if (value) {
      const cleaned = cleanSegment(value)
      const words = splitIntoWords(cleaned, meaningless, maxWords, minWords)
      if (words.length >= minWords) return words.join('-')
    }
  }
  return null
}

/** Extract from subdomain if it’s not a common one. */
export function extractFromSubdomain(netloc: string, opts?: GenerateOptions): string | null {
  if (!netloc) return null
  const maxWords = opts?.maxWords ?? 12
  const minWords = opts?.minWords ?? 6
  const meaningless = opts?.meaninglessSegments ?? DEFAULT_MEANINGLESS

  try {
    const host = netloc.split(':')[0]
    const parts = host.split('.')
    if (parts.length >= 3) {
      const sub = parts[0].toLowerCase()
      if (COMMON_SUBDOMAINS.has(sub)) return null
      const cleaned = cleanSegment(sub)
      const words = splitIntoWords(cleaned, meaningless, maxWords, minWords)
      if (words.length >= minWords) return words.join('-')
    }
  } catch {
    // ignore
  }
  return null
}

/** Extract a domain-based slug (2nd-level label). */
export function extractFromDomain(netloc: string, opts?: GenerateOptions): string | null {
  if (!netloc) return null
  const minWords = opts?.minWords ?? 6
  try {
    const host = netloc.split(':')[0].toLowerCase()
    const parts = host.split('.')
    if (parts.length >= 2) {
      const domain = parts[parts.length - 2]
      if (domain.length >= 4 && !COMMON_DOMAIN_SKIP.has(domain)) {
        const words = splitIntoWords(domain, DEFAULT_MEANINGLESS, opts?.maxWords ?? 12, minWords)
        if (words.length >= minWords) return words.join('-')
      }
    }
  } catch {
    // ignore
  }
  return null
}
export function validateAndSanitizeSlug(rawSlug: string): string | null {
  if (!rawSlug || typeof rawSlug !== 'string') return null

  return rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Max 50 characters
}

export class URLStructureGenerator {
  private ignoreExtensions: Set<string>
  private meaninglessSegments: Set<string>

  constructor(opts?: { ignoreExtensions?: Set<string>; meaninglessSegments?: Set<string> }) {
    this.ignoreExtensions = opts?.ignoreExtensions ?? DEFAULT_IGNORE_EXTENSIONS
    this.meaninglessSegments = opts?.meaninglessSegments ?? DEFAULT_MEANINGLESS
  }

  generateSlugFromUrl(inputUrl: string, maxWords = 12, minWords = 6): string {
    try {
      const parsed = new URL(inputUrl)

      const pathSlug = extractFromPath(parsed.pathname, {
        maxWords,
        minWords,
        ignoreExtensions: this.ignoreExtensions,
        meaninglessSegments: this.meaninglessSegments,
      })
      if (pathSlug) return pathSlug

      const querySlug = extractFromQuery(parsed.search, {
        maxWords,
        minWords,
        meaninglessSegments: this.meaninglessSegments,
      })
      if (querySlug) return querySlug

      const subdomainSlug = extractFromSubdomain(parsed.host, {
        maxWords,
        minWords,
        meaninglessSegments: this.meaninglessSegments,
      })
      if (subdomainSlug) return subdomainSlug

      const domainSlug = extractFromDomain(parsed.host, { maxWords, minWords })
      if (domainSlug) return domainSlug

      // fallback always works
      return generateFallbackSlug()
    } catch {
      return generateFallbackSlug()
    }
  }

  /**
   * Generate a slug from a page title
   * @param title - The page title to convert to a slug
   * @param maxWords - Maximum number of words (default: 12)
   * @param minWords - Minimum number of words (default: 6)
   * @returns Generated slug from the title
   */
  generateSlugFromTitle(title: string, maxWords = 12, minWords = 6): string {
    if (!title || typeof title !== 'string') {
      return generateFallbackSlug()
    }

    // Clean the title
    const cleaned = cleanSegment(title)
    if (!cleaned || cleaned.length < 3) {
      return generateFallbackSlug()
    }

    // Split into words
    const words = splitIntoWords(cleaned, this.meaninglessSegments, maxWords, minWords)

    // If we have enough words, return the slug
    if (words.length >= minWords) {
      return words.join('-')
    }

    // If not enough words, try with relaxed minWords requirement
    const relaxedWords = splitIntoWords(cleaned, this.meaninglessSegments, maxWords, 3)
    if (relaxedWords.length >= 3) {
      return relaxedWords.join('-')
    }

    // Final fallback
    return generateFallbackSlug()
  }
}

// ----------------------
// Quick demo / test
// ----------------------
export function demo(): Array<{ url: string; slug: string }> {
  const g = new URLStructureGenerator()
  const urls = [
    // Blog articles
    'https://techcrunch.com/2024/01/15/ai-startup-raises-funding-round/',
    'https://medium.com/@user/how-to-build-react-apps',
    'https://dev.to/author/understanding-javascript-closures',
    // E-commerce
    'https://amazon.com/products/wireless-bluetooth-headphones/dp/B08XYZ123',
    'https://store.nike.com/running-shoes/air-max-270',
    // Documentation
    'https://docs.python.org/3/tutorial/introduction.html',
    'https://api.github.com/repos/facebook/react',
    // News sites
    'https://cnn.com/2024/01/politics/election-news-update',
    'https://bbc.co.uk/news/technology-12345678',
    // Query parameters
    'https://example.com/article?title=machine-learning-basics&id=123',
    'https://search.google.com/search?q=python+tutorial',
    // Subdomains
    'https://blog.stripe.com/payment-processing-guide',
    'https://engineering.uber.com/scaling-microservices',
    // Tricky cases
    'https://example.com/',
    'https://example.com/index.html',
    'https://example.com/page/123',
    'https://t.co/abc123',
  ]
  return urls.map((url) => ({ url, slug: g.generateSlugFromUrl(url, 12, 6) }))
}
