import type { PageListItem } from './build-page-list'

/**
 * Groups the flat, globally-ranked page list (see build-page-list.ts) into per-domain
 * sections for the sidebar's "Top" / "Recent" modes.
 *
 * Two scaling problems are solved here, both pure and unit-testable:
 *  1. Many domains  → one collapsible DomainSection each, ranked by clicks, with an
 *     adaptive default-expanded heuristic (expand all when few, collapse when many).
 *  2. Many pages    → families of dynamic pages (e.g. /blog/post-1 … /blog/post-400)
 *     fold into a single DomainGroupItem ("/blog/:slug") instead of hundreds of rows.
 *
 * The UI applies the per-domain visible cutoff (`visibleCount`) and renders; this module
 * holds no React/expand state.
 */

const DEFAULTS = {
  /** A "leaf collection" prefix with >= this many pages folds into a single folder.
   *  Low because the leaf-only guard (below) already protects nav sections from folding. */
  foldThreshold: 3,
  /** Children revealed inside an expanded slug group. */
  groupTopN: 5,
  /** Items shown per domain before the "View all N pages" affordance (overview only). */
  domainTopN: 5,
  /** Domains auto-expand by default only when there are at most this many. */
  adaptiveExpandMax: 3,
} as const

export interface BuildDomainSectionsOptions {
  foldThreshold?: number
  groupTopN?: number
  domainTopN?: number
  adaptiveExpandMax?: number
}

export interface DomainPageItem {
  kind: 'page'
  key: string
  hostname: string
  scheme: string
  fullPath: string
  clickCount: number
  isRecent: boolean
  isHot: boolean
  /** Click share within the domain, 0..1 — drives the inline traffic bar. */
  share: number
}

export interface DomainGroupItem {
  kind: 'group'
  /** Stable id, `${hostname}${prefix}`. */
  id: string
  hostname: string
  scheme: string
  /** Folded path prefix, e.g. "/blog". */
  prefix: string
  /** Display label — the section path itself, e.g. "/blog" (no ":slug" jargon). */
  label: string
  /** The real page at `prefix` (the section's index/landing page), merged into the
   *  folder header instead of listed separately. null when no such page exists. */
  indexPage: DomainPageItem | null
  /** Total sub-pages folded into this group (excludes the index page). */
  pageCount: number
  clickCount: number
  isRecent: boolean
  share: number
  /** All children, ranked by clicks desc — drives the inline "reveal all" from "… N more". */
  children: DomainPageItem[]
  /** Highest-traffic children (a prefix of `children`), shown when the group first expands. */
  topChildren: DomainPageItem[]
  /** Pages beyond `topChildren` (drives "… N more"). */
  hiddenChildCount: number
}

export type DomainItem = DomainPageItem | DomainGroupItem

export interface DomainSection {
  hostname: string
  scheme: string
  /** Total leaf pages under this domain. */
  pageCount: number
  clickCount: number
  isRecent: boolean
  /** Adaptive default — UI seeds its expand state from this on first load. */
  defaultExpanded: boolean
  /** ALL ranked items (pages + folded groups). The UI slices to `visibleCount` in overview. */
  items: DomainItem[]
  /** Items shown before "View all" in the multi-domain overview. */
  visibleCount: number
}

/** Immediate parent path, e.g. "/blog/post" → "/blog", "/vi/blog/post" → "/vi/blog".
 *  Returns null for the homepage and top-level pages (depth < 2) — those never fold.
 *  Parenting by the full path (not just the first segment) keeps locale/section prefixes
 *  intact: /vi/blog/* folds to "/vi/blog/:slug" while /vi/pricing stays an individual page. */
function foldPrefix(fullPath: string): string | null {
  if (!fullPath.startsWith('/')) return null
  const segments = fullPath.split('/').filter(Boolean)
  if (segments.length < 2) return null
  return '/' + segments.slice(0, -1).join('/')
}

function toPageItem(item: PageListItem, share: number): DomainPageItem {
  return {
    kind: 'page',
    key: item.key,
    hostname: item.hostname,
    scheme: item.scheme,
    fullPath: item.fullPath,
    clickCount: item.clickCount,
    isRecent: item.isRecent,
    isHot: item.isHot,
    share,
  }
}

export function buildDomainSections(
  items: PageListItem[],
  options: BuildDomainSectionsOptions = {},
): DomainSection[] {
  const { foldThreshold, groupTopN, domainTopN, adaptiveExpandMax } = { ...DEFAULTS, ...options }
  if (items.length === 0) return []

  // Preserve global-rank input order within each domain bucket.
  const byDomain = new Map<string, PageListItem[]>()
  for (const item of items) {
    const bucket = byDomain.get(item.hostname) ?? []
    bucket.push(item)
    byDomain.set(item.hostname, bucket)
  }

  const sections: DomainSection[] = []
  for (const [hostname, pages] of byDomain) {
    const scheme = pages[0].scheme

    const pagesByPath = new Map(pages.map((p) => [p.fullPath, p]))

    // Bucket fold-eligible pages (depth >= 2) by their immediate parent prefix.
    const prefixBuckets = new Map<string, PageListItem[]>()
    for (const page of pages) {
      const prefix = foldPrefix(page.fullPath)
      if (prefix === null) continue
      const bucket = prefixBuckets.get(prefix) ?? []
      bucket.push(page)
      prefixBuckets.set(prefix, bucket)
    }

    // A "section path" is any path that has children — exactly the bucket keys.
    const sectionPaths = [...prefixBuckets.keys()]

    // Fold only a FLAT leaf collection: enough pages, and no sub-section nested beneath
    // it. /vi/blog folds; /vi never does (it contains the sub-section /vi/blog) — at any
    // depth, with or without a locale prefix, and whether or not the sub-section has an
    // index page. This is what makes /vi/blog and /en/blog fold consistently while the
    // nav roots /vi and /en stay expanded.
    const foldedPrefixes = new Set(
      [...prefixBuckets.entries()]
        .filter(
          ([prefix, ps]) =>
            ps.length >= foldThreshold &&
            !sectionPaths.some((s) => s !== prefix && s.startsWith(prefix + '/')),
        )
        .map(([prefix]) => prefix),
    )

    // A folded prefix that is also a real page is the section's index/landing page;
    // it heads the folder instead of being listed separately.
    const foldedIndexPaths = new Set([...foldedPrefixes].filter((p) => pagesByPath.has(p)))

    // Pages that stay individual: drop folded children and folded index pages.
    const individualPages = pages.filter((page) => {
      if (foldedIndexPaths.has(page.fullPath)) return false
      const prefix = foldPrefix(page.fullPath)
      return prefix === null || !foldedPrefixes.has(prefix)
    })

    // Build raw (unscaled) items so we can derive a domain-wide share denominator.
    const groupRaws = [...foldedPrefixes].map((prefix) => {
      const groupPages = prefixBuckets.get(prefix)!
      const clickCount = groupPages.reduce((sum, p) => sum + p.clickCount, 0)
      return { prefix, groupPages, clickCount }
    })

    const maxClick = Math.max(
      1,
      ...pages.map((p) => p.clickCount),
      ...groupRaws.map((g) => g.clickCount),
    )

    const pageItems: DomainItem[] = individualPages.map((p) =>
      toPageItem(p, p.clickCount / maxClick),
    )

    const groupItems: DomainItem[] = groupRaws.map(({ prefix, groupPages, clickCount }) => {
      const children = [...groupPages]
        .sort((a, b) => b.clickCount - a.clickCount)
        .map((p) => toPageItem(p, p.clickCount / maxClick))
      const topChildren = children.slice(0, groupTopN)
      const indexRaw = pagesByPath.get(prefix)
      return {
        kind: 'group' as const,
        id: `${hostname}${prefix}`,
        hostname,
        scheme,
        prefix,
        label: prefix,
        indexPage: indexRaw ? toPageItem(indexRaw, indexRaw.clickCount / maxClick) : null,
        pageCount: groupPages.length,
        clickCount,
        isRecent: groupPages.some((p) => p.isRecent),
        share: clickCount / maxClick,
        children,
        topChildren,
        hiddenChildCount: groupPages.length - topChildren.length,
      }
    })

    const domainItems = [...pageItems, ...groupItems].sort((a, b) => b.clickCount - a.clickCount)

    sections.push({
      hostname,
      scheme,
      pageCount: pages.length,
      clickCount: pages.reduce((sum, p) => sum + p.clickCount, 0),
      isRecent: pages.some((p) => p.isRecent),
      defaultExpanded: false, // set after we know the domain count
      items: domainItems,
      visibleCount: Math.min(domainTopN, domainItems.length),
    })
  }

  sections.sort((a, b) => b.clickCount - a.clickCount)

  // Adaptive expand: open everything when there are few domains, collapse when many.
  const expandByDefault = sections.length <= adaptiveExpandMax
  for (const section of sections) section.defaultExpanded = expandByDefault

  return sections
}
