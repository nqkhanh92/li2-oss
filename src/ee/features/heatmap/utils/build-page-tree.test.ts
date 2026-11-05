import { describe, it, expect } from 'vitest'
import { buildPageTree } from './build-page-tree'
import type { TopInteractionPage } from '../types'

const page = (hostname: string, path: string, clicks: number, scheme = 'https'): TopInteractionPage => ({
  hostname,
  page_path: path,
  click_count: clicks,
  scheme,
})

describe('buildPageTree', () => {
  it('returns empty tree for empty input', () => {
    const tree = buildPageTree([])
    expect(tree.domains).toEqual([])
    expect(tree.totalPages).toBe(0)
  })

  it('groups pages under domain nodes', () => {
    const pages = [
      page('example.com', '/about', 100),
      page('example.com', '/contact', 50),
      page('blog.example.com', '/post/1', 200),
    ]
    const tree = buildPageTree(pages)
    expect(tree.domains).toHaveLength(2)
    expect(tree.totalPages).toBe(3)
    expect(tree.domains[0].label).toBe('blog.example.com')
    expect(tree.domains[1].label).toBe('example.com')
  })

  it('creates folder nodes for shared path segments', () => {
    const pages = [
      page('example.com', '/products/shoes', 100),
      page('example.com', '/products/bags', 50),
    ]
    const tree = buildPageTree(pages)
    const domain = tree.domains[0]
    const folder = domain.children.find(c => c.type === 'folder')
    expect(folder).toBeDefined()
    expect(folder!.label).toBe('/products/')
    expect(folder!.clickCount).toBe(150)
    expect(folder!.children).toHaveLength(2)
    expect(folder!.children[0].label).toBe('shoes')
    expect(folder!.children[1].label).toBe('bags')
  })

  it('displays root path as "/ (homepage)"', () => {
    const pages = [page('example.com', '/', 500)]
    const tree = buildPageTree(pages)
    const leaf = tree.domains[0].children[0]
    expect(leaf.type).toBe('leaf')
    expect(leaf.label).toBe('/ (homepage)')
    expect(leaf.fullPath).toBe('/')
  })

  it('keeps query params in leaf name, not as folder', () => {
    const pages = [page('example.com', '/search?q=foo', 100)]
    const tree = buildPageTree(pages)
    const leaf = tree.domains[0].children[0]
    expect(leaf.type).toBe('leaf')
    expect(leaf.fullPath).toBe('/search?q=foo')
  })

  it('flattens paths deeper than 3 folder levels', () => {
    const pages = [page('example.com', '/blog/2026/03/20/post-title', 100)]
    const tree = buildPageTree(pages)
    const blog = tree.domains[0].children[0]
    expect(blog.type).toBe('folder')
    expect(blog.label).toBe('/blog/')
    const year = blog.children[0]
    expect(year.type).toBe('folder')
    expect(year.label).toBe('2026/')
    const leaf = year.children[0]
    expect(leaf.type).toBe('leaf')
    expect(leaf.label).toBe('03/20/post-title')
  })

  it('marks hot pages when >= 5 total pages', () => {
    const pages = [
      page('example.com', '/a', 1000),
      page('example.com', '/b', 100),
      page('example.com', '/c', 90),
      page('example.com', '/d', 80),
      page('example.com', '/e', 70),
    ]
    const tree = buildPageTree(pages)
    const allLeaves = flattenLeaves(tree.domains)
    const hotLeaves = allLeaves.filter(l => l.isHot)
    expect(hotLeaves).toHaveLength(1)
    expect(hotLeaves[0].fullPath).toBe('/a')
  })

  it('does not mark hot pages when fewer than 5 pages', () => {
    const pages = [
      page('example.com', '/a', 1000),
      page('example.com', '/b', 100),
      page('example.com', '/c', 90),
    ]
    const tree = buildPageTree(pages)
    const allLeaves = flattenLeaves(tree.domains)
    expect(allLeaves.every(l => !l.isHot)).toBe(true)
  })

  it('sorts nodes by aggregate click count descending', () => {
    const pages = [
      page('example.com', '/low', 10),
      page('example.com', '/high', 1000),
      page('example.com', '/mid', 100),
    ]
    const tree = buildPageTree(pages)
    const labels = tree.domains[0].children.map(c => c.label)
    expect(labels).toEqual(['/high', '/mid', '/low'])
  })

  it('sets pageCount on domain and folder nodes', () => {
    const pages = [
      page('example.com', '/products/shoes', 100),
      page('example.com', '/products/bags', 50),
      page('example.com', '/about', 200),
    ]
    const tree = buildPageTree(pages)
    const domain = tree.domains[0]
    expect(domain.pageCount).toBe(3)
    const folder = domain.children.find(c => c.type === 'folder')
    expect(folder!.pageCount).toBe(2)
  })

  it('handles single page at root with no folders', () => {
    const pages = [page('example.com', '/about', 100)]
    const tree = buildPageTree(pages)
    expect(tree.domains[0].children).toHaveLength(1)
    expect(tree.domains[0].children[0].type).toBe('leaf')
    expect(tree.domains[0].children[0].label).toBe('/about')
  })
})

function flattenLeaves(domains: any[]): any[] {
  const leaves: any[] = []
  function walk(node: any) {
    if (node.type === 'leaf') leaves.push(node)
    node.children.forEach(walk)
  }
  domains.forEach(walk)
  return leaves
}
