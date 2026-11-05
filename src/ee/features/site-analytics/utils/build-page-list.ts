import type { TopInteractionPage } from '@/ee/features/heatmap/types'

/**
 * Flat, ranked page list that powers the sidebar's "Top" and "Recent" modes.
 *
 * Unlike the hierarchical page tree (see build-page-tree.ts), this view ignores
 * URL structure entirely and ranks every page globally by click count. This is
 * the scalable default for sites with hundreds of blog posts / dynamic slugs:
 * the long tail simply ranks low instead of producing hundreds of tree rows.
 */
export interface PageListItem {
  /** Stable id, matches the `${hostname}:${page_path}` key used for recency tracking */
  key: string
  hostname: string
  scheme: string
  /** Full path from root, e.g. "/" or "/blog/launch-v2" */
  fullPath: string
  clickCount: number
  /** Has activity in the recent window; false when recency tracking is off */
  isRecent: boolean
  /** In the top 10% by click count (only when >= 5 pages exist) */
  isHot: boolean
  /** clickCount / maxClickCount across the list, 0..1 — drives the inline traffic bar width */
  share: number
}

export type PageListMode = 'top' | 'recent'

/** Recency key — MUST match the format produced in site-analytics-page.tsx (`${hostname}:${page_path}`). */
export function pageKey(hostname: string, pagePath: string): string {
  return `${hostname}:${pagePath}`
}

/**
 * Build a ranked flat list of pages.
 *
 * @param pages           Raw pages from useGetSitePages
 * @param recentPathKeys  Set of `${hostname}:${page_path}` active in the recent window (undefined = tracking off)
 * @param mode            'top' = all pages ranked by clicks; 'recent' = only recently-active pages, ranked by clicks
 */
export function buildPageList(
  pages: TopInteractionPage[],
  recentPathKeys: Set<string> | undefined,
  mode: PageListMode,
): PageListItem[] {
  if (pages.length === 0) return []

  // Hot threshold: top 10% by click count, only meaningful with >= 5 pages.
  // Spread before sorting to avoid mutating the caller's array.
  const hotThreshold =
    pages.length >= 5
      ? [...pages].sort((a, b) => b.click_count - a.click_count)[Math.ceil(pages.length * 0.1) - 1]
          ?.click_count ?? Infinity
      : Infinity

  const maxClick = pages.reduce((max, p) => Math.max(max, p.click_count), 0)

  const items: PageListItem[] = []
  for (const page of pages) {
    const key = pageKey(page.hostname, page.page_path)
    const isRecent = recentPathKeys?.has(key) ?? false

    if (mode === 'recent' && !isRecent) continue

    items.push({
      key,
      hostname: page.hostname,
      scheme: page.scheme,
      fullPath: page.page_path,
      clickCount: page.click_count,
      isRecent,
      isHot: page.click_count >= hotThreshold,
      share: maxClick > 0 ? page.click_count / maxClick : 0,
    })
  }

  items.sort((a, b) => b.clickCount - a.clickCount)
  return items
}
