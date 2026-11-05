import { describe, it, expect } from 'vitest'
import { buildPageList, pageKey } from '@/ee/features/site-analytics/utils/build-page-list'
import type { TopInteractionPage } from '@/ee/features/heatmap/types'

function page(path: string, clicks: number, host = 'example.com'): TopInteractionPage {
  return { scheme: 'https', hostname: host, page_path: path, click_count: clicks }
}

describe('buildPageList', () => {
  it('returns an empty array for no pages', () => {
    expect(buildPageList([], undefined, 'top')).toEqual([])
  })

  it('ranks pages by click count descending', () => {
    const pages = [page('/a', 10), page('/b', 50), page('/c', 30)]
    const list = buildPageList(pages, undefined, 'top')
    expect(list.map(i => i.fullPath)).toEqual(['/b', '/c', '/a'])
  })

  it('does not mutate the input array', () => {
    const pages = [page('/a', 10), page('/b', 50)]
    const snapshot = pages.map(p => p.page_path)
    buildPageList(pages, undefined, 'top')
    expect(pages.map(p => p.page_path)).toEqual(snapshot)
  })

  it('computes share relative to the most-clicked page', () => {
    const list = buildPageList([page('/a', 100), page('/b', 25)], undefined, 'top')
    expect(list[0].share).toBe(1)
    expect(list[1].share).toBe(0.25)
  })

  it('gives share 0 when all pages have zero clicks', () => {
    const list = buildPageList([page('/a', 0), page('/b', 0)], undefined, 'top')
    expect(list.every(i => i.share === 0)).toBe(true)
  })

  it('marks pages in the recent set as recent', () => {
    const recent = new Set([pageKey('example.com', '/b')])
    const list = buildPageList([page('/a', 10), page('/b', 5)], recent, 'top')
    expect(list.find(i => i.fullPath === '/a')?.isRecent).toBe(false)
    expect(list.find(i => i.fullPath === '/b')?.isRecent).toBe(true)
  })

  it('treats all pages as non-recent when tracking is off (undefined set)', () => {
    const list = buildPageList([page('/a', 10)], undefined, 'top')
    expect(list[0].isRecent).toBe(false)
  })

  it("'recent' mode keeps only recently-active pages, still ranked by clicks", () => {
    const recent = new Set([pageKey('example.com', '/a'), pageKey('example.com', '/c')])
    const pages = [page('/a', 10), page('/b', 99), page('/c', 40)]
    const list = buildPageList(pages, recent, 'recent')
    expect(list.map(i => i.fullPath)).toEqual(['/c', '/a'])
  })

  it("'recent' mode returns empty when nothing is recent", () => {
    expect(buildPageList([page('/a', 10)], new Set(), 'recent')).toEqual([])
  })

  it('flags the top 10% as hot only when at least 5 pages exist', () => {
    // 10 pages -> ceil(10 * 0.1) = 1 -> only the single highest is hot
    const pages = Array.from({ length: 10 }, (_, i) => page(`/p${i}`, (i + 1) * 10))
    const list = buildPageList(pages, undefined, 'top')
    const hot = list.filter(i => i.isHot)
    expect(hot).toHaveLength(1)
    expect(hot[0].clickCount).toBe(100)
  })

  it('never marks pages hot below the 5-page floor', () => {
    const list = buildPageList([page('/a', 100), page('/b', 1)], undefined, 'top')
    expect(list.every(i => i.isHot === false)).toBe(true)
  })

  it('ranks across multiple domains in one flat list', () => {
    const pages = [page('/a', 10, 'one.com'), page('/b', 80, 'two.com'), page('/c', 40, 'one.com')]
    const list = buildPageList(pages, undefined, 'top')
    expect(list.map(i => `${i.hostname}${i.fullPath}`)).toEqual([
      'two.com/b',
      'one.com/c',
      'one.com/a',
    ])
  })

  it('builds keys that match the recency-set format', () => {
    expect(pageKey('example.com', '/blog/x')).toBe('example.com:/blog/x')
  })
})
