import type { TopInteractionPage, PageTree, PageTreeNode } from '../types'

const MAX_FOLDER_DEPTH = 2

export function buildPageTree(pages: TopInteractionPage[], recentPaths?: Set<string>): PageTree {
  if (pages.length === 0) return { domains: [], totalPages: 0 }

  // Determine hot threshold (top 10%, only if >= 5 pages)
  // Use spread to avoid mutating the input array
  const hotThreshold = pages.length >= 5
    ? [...pages].sort((a, b) => b.click_count - a.click_count)[Math.ceil(pages.length * 0.1) - 1]?.click_count ?? Infinity
    : Infinity

  // Group pages by hostname
  const domainMap = new Map<string, TopInteractionPage[]>()
  for (const page of pages) {
    const group = domainMap.get(page.hostname) ?? []
    group.push(page)
    domainMap.set(page.hostname, group)
  }

  // Build domain nodes
  const domains: PageTreeNode[] = []
  for (const [hostname, domainPages] of domainMap) {
    const scheme = domainPages[0].scheme
    const children = buildFolderTree(domainPages, hostname, scheme, hotThreshold, recentPaths)
    const clickCount = domainPages.reduce((sum, p) => sum + p.click_count, 0)
    const hasRecentData = recentPaths !== undefined
      ? domainPages.some(p => recentPaths.has(`${p.hostname}:${p.page_path}`))
      : undefined

    domains.push({
      type: 'domain',
      label: hostname,
      hostname,
      scheme,
      clickCount,
      pageCount: domainPages.length,
      hasRecentData,
      children: sortNodes(children),
    })
  }

  // Sort domains by aggregate click count desc
  domains.sort((a, b) => b.clickCount - a.clickCount)

  return { domains, totalPages: pages.length }
}

function buildFolderTree(
  pages: TopInteractionPage[],
  hostname: string,
  scheme: string,
  hotThreshold: number,
  recentPaths?: Set<string>,
): PageTreeNode[] {
  const root: PageTreeNode[] = []

  for (const page of pages) {
    const path = page.page_path

    if (path === '/') {
      root.push({
        type: 'leaf',
        label: '/ (homepage)',
        fullPath: '/',
        hostname,
        scheme,
        clickCount: page.click_count,
        isHot: page.click_count >= hotThreshold,
        hasRecentData: recentPaths !== undefined ? recentPaths.has(`${hostname}:/`) : undefined,
        children: [],
      })
      continue
    }

    const segments = splitPath(path)
    insertIntoTree(root, segments, page, hostname, scheme, hotThreshold, recentPaths)
  }

  mergeLeafFolders(root)
  return root
}

/**
 * When /blog is tracked as a page AND /blog/post exists, buildFolderTree produces
 * a leaf "/blog" and a folder "/blog/" as siblings. This pass merges them: the leaf's
 * page data moves into folder.selfPage and the leaf is removed.
 */
function mergeLeafFolders(nodes: PageTreeNode[]): void {
  const foldersByBase = new Map<string, PageTreeNode>()
  for (const node of nodes) {
    if (node.type === 'folder') {
      foldersByBase.set(node.label.replace(/\/$/, ''), node)
    }
  }

  const toRemove: number[] = []
  nodes.forEach((node, idx) => {
    if (node.type === 'leaf' && node.fullPath) {
      const folder = foldersByBase.get(node.label)
      if (folder) {
        folder.selfPage = { fullPath: node.fullPath, clickCount: node.clickCount, isHot: node.isHot }
        // Propagate recent data up if the merged leaf was recent
        if (node.hasRecentData) folder.hasRecentData = true
        toRemove.push(idx)
      }
    }
  })

  for (let i = toRemove.length - 1; i >= 0; i--) {
    nodes.splice(toRemove[i], 1)
  }

  for (const node of nodes) {
    if (node.children.length > 0) mergeLeafFolders(node.children)
  }
}

function splitPath(path: string): string[] {
  const withoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path
  const parts = withoutLeadingSlash.split('/')
  return parts.filter(p => p.length > 0)
}

function insertIntoTree(
  nodes: PageTreeNode[],
  segments: string[],
  page: TopInteractionPage,
  hostname: string,
  scheme: string,
  hotThreshold: number,
  recentPaths?: Set<string>,
): void {
  if (segments.length === 0) return

  const isRecent = recentPaths !== undefined ? recentPaths.has(`${hostname}:${page.page_path}`) : undefined

  if (segments.length === 1) {
    nodes.push({
      type: 'leaf',
      label: '/' + segments[0],
      fullPath: page.page_path,
      hostname,
      scheme,
      clickCount: page.click_count,
      isHot: page.click_count >= hotThreshold,
      hasRecentData: isRecent,
      children: [],
    })
    return
  }

  const folderDepth = Math.min(segments.length - 1, MAX_FOLDER_DEPTH)
  const folderSegments = segments.slice(0, folderDepth)
  const leafSegments = segments.slice(folderDepth)

  let currentLevel = nodes
  for (let i = 0; i < folderSegments.length; i++) {
    const seg = folderSegments[i]
    const folderLabel = (i === 0 ? '/' : '') + seg + '/'
    let folder = currentLevel.find(n => n.type === 'folder' && n.label === folderLabel)
    if (!folder) {
      folder = {
        type: 'folder',
        label: folderLabel,
        hostname,
        scheme,
        clickCount: 0,
        pageCount: 0,
        hasRecentData: recentPaths !== undefined ? false : undefined,
        children: [],
      }
      currentLevel.push(folder)
    }
    currentLevel = folder.children
  }

  const leafLabel = leafSegments.join('/')
  currentLevel.push({
    type: 'leaf',
    label: leafLabel,
    fullPath: page.page_path,
    hostname,
    scheme,
    clickCount: page.click_count,
    isHot: page.click_count >= hotThreshold,
    hasRecentData: isRecent,
    children: [],
  })

  updateAggregates(nodes)
}

function updateAggregates(nodes: PageTreeNode[]): void {
  for (const node of nodes) {
    if (node.type === 'folder') {
      updateAggregates(node.children)
      node.clickCount = node.children.reduce((sum, c) => sum + c.clickCount, 0)
      node.pageCount = node.children.reduce(
        (sum, c) => sum + (c.type === 'leaf' ? 1 : (c.pageCount ?? 0)),
        0,
      )
      if (node.hasRecentData !== undefined) {
        node.hasRecentData = node.children.some(c => c.hasRecentData === true)
      }
      sortNodes(node.children)
    }
  }
}

function sortNodes(nodes: PageTreeNode[]): PageTreeNode[] {
  nodes.sort((a, b) => {
    // Recent nodes come before non-recent; undefined (no tracking) treated as neutral
    const aRecent = a.hasRecentData === true ? 1 : 0
    const bRecent = b.hasRecentData === true ? 1 : 0
    if (aRecent !== bRecent) return bRecent - aRecent
    return b.clickCount - a.clickCount
  })
  return nodes
}
