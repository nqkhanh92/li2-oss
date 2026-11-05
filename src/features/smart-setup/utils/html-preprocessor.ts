import * as cheerio from 'cheerio'

const STRIP_TAGS = ['script', 'style', 'svg', 'noscript', 'iframe', 'template', 'object', 'embed']

// Only these attributes are kept — everything else is stripped.
// These are the attributes Claude needs to generate analytics suggestions.
const ALLOWED_ATTRS = new Set([
  'id', 'class', 'href', 'action', 'name', 'type',
  'method', 'placeholder', 'for', 'role', 'value',
])

const MAX_HTML_BYTES = 100 * 1024 // 100KB

export interface PreprocessedPage {
  html: string
  title: string
  description: string
  truncated: boolean
}

export function preprocessHtml(rawHtml: string): PreprocessedPage {
  const $ = cheerio.load(rawHtml)

  // Extract metadata before stripping
  const title = $('title').first().text().trim()
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''

  // Strip noise tags
  for (const tag of STRIP_TAGS) {
    $(tag).remove()
  }

  // Strip all attributes except the allowlist (covers event handlers, style,
  // data-*, alt, title, aria-*, and any unknown attributes)
  $('*').each((_, el) => {
    const element = $(el)
    const attribs = el.type === 'tag' ? el.attribs : {}
    for (const attr of Object.keys(attribs)) {
      if (!ALLOWED_ATTRS.has(attr)) {
        element.removeAttr(attr)
      }
    }
  })

  // Strip HTML comments (prompt injection vector)
  $('*').contents().each((_, node) => {
    if (node.type === 'comment') {
      $(node).remove()
    }
  })
  // Also strip top-level comments outside elements
  $.root().contents().each((_, node) => {
    if (node.type === 'comment') {
      $(node).remove()
    }
  })

  // Get body content (or full html if no body)
  let html = $('body').html() || $.html()

  // Truncate to max bytes
  const encoder = new TextEncoder()
  const encoded = encoder.encode(html)
  let truncated = false
  if (encoded.length > MAX_HTML_BYTES) {
    const decoder = new TextDecoder()
    html = decoder.decode(encoded.slice(0, MAX_HTML_BYTES))
    truncated = true
  }

  return { html, title, description, truncated }
}

export function isHtmlTooSmall(html: string): boolean {
  return new TextEncoder().encode(html).length < 1024
}

/**
 * Extract unique internal links from raw HTML, resolved to absolute URLs.
 * Skips anchors, mailto, tel, external domains, and obvious asset paths.
 */
export function extractInternalLinks(rawHtml: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const $ = cheerio.load(rawHtml)
  const seen = new Set<string>()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
    try {
      const resolved = new URL(href, base)
      if (resolved.hostname !== base.hostname) return
      if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|pdf|zip)$/i.test(resolved.pathname)) return
      const key = resolved.origin + resolved.pathname
      if (!seen.has(key) && key !== base.origin + base.pathname) {
        seen.add(key)
      }
    } catch {
      // invalid href — skip
    }
  })

  return Array.from(seen)
}
