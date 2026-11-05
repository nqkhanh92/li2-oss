import { describe, it, expect } from 'vitest'
import { buildDomainSections, type DomainGroupItem, type DomainPageItem } from '@/ee/features/site-analytics/utils/build-domain-sections'
import type { PageListItem } from '@/ee/features/site-analytics/utils/build-page-list'

function item(fullPath: string, clickCount: number, host = 'a.com', extra: Partial<PageListItem> = {}): PageListItem {
  return {
    key: `${host}:${fullPath}`,
    hostname: host,
    scheme: 'https',
    fullPath,
    clickCount,
    isRecent: false,
    isHot: false,
    share: 0,
    ...extra,
  }
}

/** N pages under one prefix, descending click counts. */
function family(prefix: string, n: number, base = 100, host = 'a.com'): PageListItem[] {
  return Array.from({ length: n }, (_, i) => item(`${prefix}/post-${i}`, base - i, host))
}

describe('buildDomainSections', () => {
  it('returns empty for no items', () => {
    expect(buildDomainSections([])).toEqual([])
  })

  it('groups pages by domain and ranks sections by total clicks', () => {
    const sections = buildDomainSections([
      item('/', 10, 'small.com'),
      item('/', 200, 'big.com'),
      item('/x', 50, 'big.com'),
    ])
    expect(sections.map((s) => s.hostname)).toEqual(['big.com', 'small.com'])
    expect(sections[0].pageCount).toBe(2)
    expect(sections[0].clickCount).toBe(250)
  })

  it('folds a large path family into a single folder, labelled by the section path', () => {
    const sections = buildDomainSections([item('/', 500), ...family('/blog', 12)])
    const blog = sections[0].items.find((i): i is DomainGroupItem => i.kind === 'group')
    expect(blog).toBeDefined()
    expect(blog!.prefix).toBe('/blog')
    expect(blog!.label).toBe('/blog')
    expect(blog!.indexPage).toBeNull() // no "/blog" page exists
    expect(blog!.pageCount).toBe(12)
    expect(blog!.clickCount).toBe(family('/blog', 12).reduce((s, p) => s + p.clickCount, 0))
  })

  it('does not fold a family below the threshold', () => {
    const sections = buildDomainSections([item('/', 500), ...family('/blog', 2)])
    expect(sections[0].items.every((i) => i.kind === 'page')).toBe(true)
    // 1 homepage + 2 individual blog pages
    expect(sections[0].items).toHaveLength(3)
  })

  it('respects a custom fold threshold', () => {
    const sections = buildDomainSections([...family('/blog', 4)], { foldThreshold: 4 })
    expect(sections[0].items).toHaveLength(1)
    expect(sections[0].items[0].kind).toBe('group')
  })

  it('folds by the immediate parent path, not the first segment (locale prefixes)', () => {
    const sections = buildDomainSections([
      item('/vi/pricing', 100),
      item('/vi/support', 50),
      ...Array.from({ length: 10 }, (_, i) => item(`/vi/blog/post-${i}`, 30 - i)),
    ])
    const items = sections[0].items
    const group = items.find((i): i is DomainGroupItem => i.kind === 'group')
    expect(group).toBeDefined()
    expect(group!.prefix).toBe('/vi/blog')
    expect(group!.label).toBe('/vi/blog')
    expect(group!.pageCount).toBe(10)
    // /vi/pricing and /vi/support share parent /vi (only 2 leaves) → stay individual, not lumped in
    const individualPaths = items
      .filter((i): i is DomainPageItem => i.kind === 'page')
      .map((i) => i.fullPath)
      .sort()
    expect(individualPaths).toEqual(['/vi/pricing', '/vi/support'])
  })

  it('folds a top-level collection on a flat site (no locale prefix)', () => {
    const sections = buildDomainSections([
      item('/about', 100),
      item('/pricing', 90),
      ...family('/blog', 5),
    ])
    const group = sections[0].items.find((i): i is DomainGroupItem => i.kind === 'group')
    expect(group?.prefix).toBe('/blog')
    expect(group?.pageCount).toBe(5)
    const individualPaths = sections[0].items
      .filter((i): i is DomainPageItem => i.kind === 'page')
      .map((i) => i.fullPath)
      .sort()
    expect(individualPaths).toEqual(['/about', '/pricing'])
  })

  it('never folds a nav root that contains a sub-section, even with no index page', () => {
    // /shop has 4 leaf pages AND a nested sub-section /shop/sale/* (no /shop or /shop/sale page)
    const sections = buildDomainSections([
      item('/shop/a', 40),
      item('/shop/b', 30),
      item('/shop/c', 20),
      item('/shop/d', 10),
      ...family('/shop/sale', 5),
    ])
    const groups = sections[0].items.filter((i): i is DomainGroupItem => i.kind === 'group')
    // Only the leaf collection /shop/sale folds; /shop stays expanded as individual pages.
    expect(groups.map((g) => g.prefix)).toEqual(['/shop/sale'])
    const individualPaths = sections[0].items
      .filter((i): i is DomainPageItem => i.kind === 'page')
      .map((i) => i.fullPath)
      .sort()
    expect(individualPaths).toEqual(['/shop/a', '/shop/b', '/shop/c', '/shop/d'])
  })

  it('merges a real index page into its folder header and drops it from the page list', () => {
    const sections = buildDomainSections([
      item('/blog', 500), // the section landing page
      ...family('/blog', 10),
    ])
    const group = sections[0].items.find((i): i is DomainGroupItem => i.kind === 'group')
    expect(group?.indexPage?.fullPath).toBe('/blog')
    expect(group?.indexPage?.clickCount).toBe(500)
    expect(group?.pageCount).toBe(10) // sub-pages only, index excluded
    // /blog is NOT also listed as an individual page row
    const hasStandaloneIndex = sections[0].items.some(
      (i) => i.kind === 'page' && i.fullPath === '/blog',
    )
    expect(hasStandaloneIndex).toBe(false)
  })

  it('never folds the homepage or top-level pages', () => {
    // 10 distinct top-level pages — each is its own prefix of size 1, so nothing folds
    const pages = Array.from({ length: 10 }, (_, i) => item(`/page${i}`, 100 - i))
    const sections = buildDomainSections([item('/', 999), ...pages])
    expect(sections[0].items.every((i) => i.kind === 'page')).toBe(true)
    expect(sections[0].items).toHaveLength(11)
  })

  it('reveals only the top N children inside a group and counts the rest as hidden', () => {
    const sections = buildDomainSections([...family('/blog', 30)], { groupTopN: 5 })
    const group = sections[0].items[0] as DomainGroupItem
    expect(group.topChildren).toHaveLength(5)
    expect(group.hiddenChildCount).toBe(25)
    // children are the highest-traffic pages, descending
    const clicks = group.topChildren.map((c) => c.clickCount)
    expect(clicks).toEqual([...clicks].sort((a, b) => b - a))
  })

  it('retains every child for inline reveal, ranked desc, with topChildren as its prefix', () => {
    const sections = buildDomainSections([...family('/blog', 30)], { groupTopN: 5 })
    const group = sections[0].items[0] as DomainGroupItem
    expect(group.children).toHaveLength(30)
    expect(group.topChildren).toEqual(group.children.slice(0, 5))
    const clicks = group.children.map((c) => c.clickCount)
    expect(clicks).toEqual([...clicks].sort((a, b) => b - a))
  })

  it('ranks folded groups against individual pages by click count', () => {
    // group sums to a large number, should rank above a smaller standalone page
    const sections = buildDomainSections([
      item('/pricing', 50),
      ...family('/blog', 10, 30), // sums to 30+29+...+21 = 255
    ])
    expect(sections[0].items[0].kind).toBe('group')
    expect(sections[0].items[1].kind).toBe('page')
  })

  it('computes within-domain share with the top item at 1', () => {
    const sections = buildDomainSections([item('/', 100), item('/x', 25)])
    const home = sections[0].items.find((i) => i.kind === 'page' && i.fullPath === '/')!
    const x = sections[0].items.find((i) => i.kind === 'page' && (i as { fullPath: string }).fullPath === '/x')!
    expect(home.share).toBe(1)
    expect(x.share).toBe(0.25)
  })

  it('marks a section/group recent when any underlying page is recent', () => {
    const sections = buildDomainSections([
      ...family('/blog', 10),
      item('/blog/post-0', 100, 'a.com', { isRecent: true }), // duplicate-ish recent member
    ])
    expect(sections[0].isRecent).toBe(true)
  })

  it('auto-expands all sections when there are few domains (<= 3)', () => {
    const sections = buildDomainSections([
      item('/', 10, 'a.com'),
      item('/', 10, 'b.com'),
      item('/', 10, 'c.com'),
    ])
    expect(sections.every((s) => s.defaultExpanded)).toBe(true)
  })

  it('auto-collapses all sections when there are many domains (> 3)', () => {
    const sections = buildDomainSections(
      ['a', 'b', 'c', 'd', 'e'].map((h) => item('/', 10, `${h}.com`)),
    )
    expect(sections.every((s) => !s.defaultExpanded)).toBe(true)
  })

  it('caps visibleCount at domainTopN', () => {
    const pages = Array.from({ length: 9 }, (_, i) => item(`/p${i}`, 100 - i))
    const sections = buildDomainSections(pages, { domainTopN: 5 })
    expect(sections[0].items.length).toBe(9)
    expect(sections[0].visibleCount).toBe(5)
  })

  it('does not mutate the input array', () => {
    const input = [item('/b', 1), item('/a', 2)]
    const snapshot = input.map((p) => p.fullPath)
    buildDomainSections(input)
    expect(input.map((p) => p.fullPath)).toEqual(snapshot)
  })
})
