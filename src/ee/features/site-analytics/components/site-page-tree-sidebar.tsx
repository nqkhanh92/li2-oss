'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Search, Globe, TrendingUp, Clock, ListTree, Calendar, Info, HelpCircle, Flame, Filter } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import { buildPageTree } from '@/ee/features/heatmap/utils/build-page-tree'
import { SitePageTreeNode } from './site-page-tree-node'
import { SitePageList } from './site-page-list'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import type { TopInteractionPage, PageTree } from '@/ee/features/heatmap/types'
import type { DateRange } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'

const SIDEBAR_WIDTH = 300
const COLLAPSED_WIDTH = 44
const WIDE_BREAKPOINT = 1440
const STORAGE_KEY = 'li2_site_analytics_sidebar'
const MODE_STORAGE_KEY = 'li2_site_analytics_sidebar_mode'
/** Mirrors the get_top_interaction_pages RPC limit (see site-analytics.repository.ts getPages).
 *  When the API returns exactly this many rows the global page set is truncated. */
const SITE_PAGES_LIMIT = 500

type SidebarMode = 'top' | 'recent' | 'tree'

const MODE_TOGGLE_CLASS =
  'h-6 gap-1 rounded text-[11px] font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm'

interface SitePageTreeSidebarProps {
  pages: TopInteractionPage[]
  isLoading: boolean
  selectedPage: string | null
  selectedHostname: string | null
  onPageChange: (page: string | null, hostname: string | null, scheme: string) => void
  initialPagePath?: string | null
  initialHostname?: string | null
  onDomainSelect?: (hostname: string, scheme: string) => void
  recentPathKeys?: Set<string>
  /** Human-readable active date range, e.g. "5 May – 4 Jun 2026" — counts are scoped to it. */
  dateRangeLabel?: string
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  hasActiveFilters?: boolean
}

export function SitePageTreeSidebar({
  pages,
  isLoading,
  selectedPage,
  selectedHostname,
  onPageChange,
  initialPagePath,
  initialHostname,
  onDomainSelect,
  recentPathKeys,
  dateRangeLabel,
  dateRange,
  onDateRangeChange,
  hasActiveFilters = false,
}: SitePageTreeSidebarProps) {
  const { t } = useTranslation('heatmap')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'collapsed'
    return window.innerWidth < WIDE_BREAKPOINT
  })
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === 'undefined') return 'top'
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'recent' || stored === 'tree' ? stored : 'top'
  })
  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  }, [mode])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 200)
    return () => clearTimeout(timer)
  }, [searchInput])

  const tree = useMemo(() => buildPageTree(pages, recentPathKeys), [pages, recentPathKeys])

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree
    return filterTree(tree, searchQuery.trim().toLowerCase())
  }, [tree, searchQuery])

  // Smart auto-expand on data load
  useEffect(() => {
    if (pages.length === 0) return
    const newExpanded = computeAutoExpand(tree, initialPagePath, initialHostname)
    setExpandedNodes(newExpanded)
  }, [tree, initialPagePath, initialHostname, pages.length])

  // Auto-expand all nodes when searching (so matches are visible)
  useEffect(() => {
    if (searchQuery.trim()) {
      const allExpanded = new Set<string>()
      expandAll(filteredTree, allExpanded)
      setExpandedNodes(allExpanded)
    } else if (pages.length > 0) {
      setExpandedNodes(computeAutoExpand(tree, initialPagePath, initialHostname))
    }
  }, [searchQuery, filteredTree, tree, initialPagePath, initialHostname, pages.length])

  // Responsive collapse
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < WIDE_BREAKPOINT)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded')
      return next
    })
  }, [])

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (path: string, hostname: string, scheme: string) => {
      onPageChange(path, hostname, scheme)
    },
    [onPageChange],
  )

  const visibleNodeIds = useMemo(() => {
    const ids: string[] = []
    function collect(node: PageTree['domains'][number], parentId: string) {
      const nodeId = node.type === 'domain' ? node.hostname : `${parentId}/${node.label}`
      ids.push(nodeId)
      if (expandedNodes.has(nodeId)) {
        node.children.forEach((child) => collect(child, nodeId))
      }
    }
    filteredTree.domains.forEach(d => collect(d, ''))
    return ids
  }, [filteredTree, expandedNodes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = focusedNodeId ? visibleNodeIds.indexOf(focusedNodeId) : -1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (idx < visibleNodeIds.length - 1) {
          const nextId = visibleNodeIds[idx + 1]
          setFocusedNodeId(nextId)
          scrollToNode(nextId)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (idx > 0) {
          const prevId = visibleNodeIds[idx - 1]
          setFocusedNodeId(prevId)
          scrollToNode(prevId)
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (focusedNodeId && !expandedNodes.has(focusedNodeId)) toggleNode(focusedNodeId)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (focusedNodeId && expandedNodes.has(focusedNodeId)) toggleNode(focusedNodeId)
        break
      case 'Enter':
        e.preventDefault()
        if (focusedNodeId) {
          const node = findNodeById(filteredTree, focusedNodeId)
          if (node?.type === 'leaf' && node.fullPath) {
            handleSelect(node.fullPath, node.hostname, node.scheme)
          } else if (node?.type === 'folder' && node.selfPage) {
            handleSelect(node.selfPage.fullPath, node.hostname, node.scheme)
          } else if (node?.type === 'domain' && onDomainSelect) {
            toggleNode(focusedNodeId)
            onDomainSelect(node.hostname, node.scheme)
          } else if (node) {
            toggleNode(focusedNodeId)
          }
        }
        break
    }
  }, [focusedNodeId, visibleNodeIds, expandedNodes, toggleNode, filteredTree, handleSelect, onDomainSelect])

  const renderTree = (node: PageTree['domains'][number], depth: number, nodeId: string) => {
    const isExpanded = expandedNodes.has(nodeId)
    return (
      <div key={nodeId}>
        <SitePageTreeNode
          node={node}
          depth={depth}
          selectedPath={selectedPage}
          selectedHostname={selectedHostname}
          expanded={isExpanded}
          onToggle={toggleNode}
          onSelect={handleSelect}
          nodeId={nodeId}
          focusedNodeId={focusedNodeId}
          onDomainSelect={onDomainSelect}
        />
        {isExpanded && node.children.map(child => {
          const childId = `${nodeId}/${child.label}`
          return renderTree(child, depth + 1, childId)
        })}
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div
        className="flex flex-col items-center border-r bg-card py-2 gap-1.5"
        style={{ width: COLLAPSED_WIDTH, minWidth: COLLAPSED_WIDTH }}
      >
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md border bg-primary/10 text-primary hover:bg-primary/20"
          onClick={toggleCollapse}
          title={t('sidebar.expandTree')}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div className="my-1 h-px w-6 bg-border" />
        {tree.domains.map(domain => (
          <div
            key={domain.hostname}
            className="flex h-7 w-7 items-center justify-center rounded border bg-background"
            title={`${domain.hostname} (${domain.pageCount} pages)`}
          >
            <CollapsedFavicon hostname={domain.hostname} />
          </div>
        ))}
      </div>
    )
  }

  const activePreset = detectActivePreset(dateRange)
  const isCapped = pages.length >= SITE_PAGES_LIMIT

  return (
    <div
      className="flex flex-col border-r bg-card"
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
    >
      {/* Session Replay header */}
      <div className="flex flex-col gap-3 border-b py-4">
        <div className="px-4">
          <p className="text-l font-medium text-foreground">Site Analytics</p>
        </div>
        <div className="flex items-center gap-2 px-4">
          <div className="flex flex-1 h-[38px] items-center rounded-md border border-border bg-card overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onDateRangeChange?.(getPresetRange(preset))}
                className={cn(
                  'flex h-full flex-1 items-center justify-center border-r border-border !text-s transition-colors',
                  activePreset === preset
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {preset}
              </button>
            ))}
            <DateRangePicker
              placeholder=""
              value={dateRange}
              onValueChange={onDateRangeChange ?? (() => {})}
              disableFutureDate
              button={
                <button className={cn(
                  'flex h-full flex-1 items-center justify-center px-2 transition-colors',
                  !activePreset && dateRange?.from
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                  <Calendar className="h-4 w-4" />
                </button>
              }
            />
          </div>
          <button className={cn(
            'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[6px] border bg-card transition-colors',
            hasActiveFilters
              ? 'border-[1.5px] border-primary text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}>
            <Filter className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('sidebar.pages')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {t('sidebar.pagesCount', { count: tree.totalPages })}
          </span>
          {mode !== 'tree' && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground hover:text-foreground"
                  title={t('sidebar.legend_title')}
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-2.5 text-xs">
                <p className="mb-2 text-[11px] font-semibold text-foreground">{t('sidebar.legend_title')}</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    {t('sidebar.legend_recent')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="h-3 w-3 shrink-0 text-amber-500" />
                    {t('sidebar.legend_hot')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-4 shrink-0 rounded-sm bg-primary/10 ring-1 ring-primary/20" />
                    {t('sidebar.legend_bar')}
                  </li>
                </ul>
              </PopoverContent>
            </Popover>
          )}
          <button
            className="flex h-5 w-5 items-center justify-center rounded border bg-background text-muted-foreground hover:text-foreground"
            onClick={toggleCollapse}
            title={t('sidebar.collapseSidebar')}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="border-b px-2.5 py-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => value && setMode(value as SidebarMode)}
          className="grid w-full grid-cols-3 gap-0.5 rounded-md bg-muted p-0.5"
        >
          <ToggleGroupItem value="top" className={MODE_TOGGLE_CLASS} aria-label={t('sidebar.mode_top')}>
            <TrendingUp className="h-3 w-3" />
            {t('sidebar.mode_top')}
          </ToggleGroupItem>
          <ToggleGroupItem value="recent" className={MODE_TOGGLE_CLASS} aria-label={t('sidebar.mode_recent')}>
            <Clock className="h-3 w-3" />
            {t('sidebar.mode_recent')}
          </ToggleGroupItem>
          <ToggleGroupItem value="tree" className={MODE_TOGGLE_CLASS} aria-label={t('sidebar.mode_tree')}>
            <ListTree className="h-3 w-3" />
            {t('sidebar.mode_tree')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isCapped && (
        <div className="flex items-center gap-1.5 border-b px-2.5 py-1 text-[10px] text-muted-foreground">
          <span
            className="flex shrink-0 items-center gap-1"
            title={t('sidebar.page_cap_tooltip', { count: SITE_PAGES_LIMIT })}
          >
            {t('sidebar.page_cap', { count: SITE_PAGES_LIMIT })}
            <Info className="h-3 w-3" />
          </span>
        </div>
      )}

      {mode === 'tree' ? (
        <>
          <div className="border-b px-2.5 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-7 pl-8 text-xs"
                placeholder={t('sidebar.searchPages')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto py-1.5 outline-none"
            role="tree"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                {t('sidebar.loading')}
              </div>
            ) : filteredTree.totalPages === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center text-xs text-muted-foreground">
                <Globe className="h-6 w-6 opacity-50" />
                <p>{t('sidebar.noData')}</p>
                <p className="text-[10px]">{t('sidebar.noDataDesc')}</p>
              </div>
            ) : (
              filteredTree.domains.map((domain, i) => {
                const domainId = domain.hostname
                return (
                  <div key={domainId}>
                    {renderTree(domain, 0, domainId)}
                    {i < filteredTree.domains.length - 1 && (
                      <div className="mx-2.5 my-1.5 h-px bg-border" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : (
        <SitePageList
          pages={pages}
          isLoading={isLoading}
          mode={mode}
          selectedPage={selectedPage}
          selectedHostname={selectedHostname}
          recentPathKeys={recentPathKeys}
          onPageChange={onPageChange}
          onDomainSelect={onDomainSelect}
        />
      )}
    </div>
  )
}

function getPresetRange(preset: '7d' | '30d' | '90d'): DateRange {
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return {
    from: dayjs().subtract(days, 'day').startOf('day').toDate(),
    to: dayjs().endOf('day').toDate(),
  }
}

function detectActivePreset(dateRange?: DateRange): '7d' | '30d' | '90d' | null {
  if (!dateRange?.from || !dateRange?.to) return null
  const today = dayjs().startOf('day')
  const to = dayjs(dateRange.to).startOf('day')
  if (!to.isSame(today, 'day')) return null
  const days = today.diff(dayjs(dateRange.from).startOf('day'), 'day')
  if (days === 7) return '7d'
  if (days === 30) return '30d'
  if (days === 90) return '90d'
  return null
}

function CollapsedFavicon({ hostname }: { hostname: string }) {
  const [imgError, setImgError] = useState(false)
  if (imgError) {
    return <Globe className="h-3.5 w-3.5 text-muted-foreground" />
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
      alt=""
      className="h-3.5 w-3.5 rounded-sm"
      onError={() => setImgError(true)}
    />
  )
}

function scrollToNode(nodeId: string) {
  const el = document.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`) as HTMLElement
  el?.scrollIntoView({ block: 'nearest' })
}

function findNodeById(tree: PageTree, targetId: string): PageTree['domains'][number] | null {
  for (const domain of tree.domains) {
    if (domain.hostname === targetId) return domain
    const found = findInChildren(domain.children, domain.hostname, targetId)
    if (found) return found
  }
  return null
}

function findInChildren(
  nodes: PageTree['domains'][number][],
  parentId: string,
  targetId: string,
): PageTree['domains'][number] | null {
  for (const node of nodes) {
    const nodeId = `${parentId}/${node.label}`
    if (nodeId === targetId) return node
    if (node.children.length > 0) {
      const found = findInChildren(node.children, nodeId, targetId)
      if (found) return found
    }
  }
  return null
}

function computeAutoExpand(
  tree: PageTree,
  initialPagePath?: string | null,
  initialHostname?: string | null,
): Set<string> {
  const expanded = new Set<string>()
  const total = tree.totalPages

  if (initialPagePath && initialHostname) {
    for (const domain of tree.domains) {
      if (domain.hostname === initialHostname) {
        expanded.add(domain.hostname)
        expandPathToTarget(domain.children, domain.hostname, initialPagePath, expanded)
        break
      }
    }
    return expanded
  }

  if (tree.domains.length === 1) {
    expanded.add(tree.domains[0].hostname)
  }

  if (total < 20) {
    expandAll(tree, expanded)
  } else if (total <= 50) {
    for (const domain of tree.domains) {
      expanded.add(domain.hostname)
    }
  }

  return expanded
}

function expandAll(tree: PageTree, expanded: Set<string>): void {
  function walk(nodes: PageTree['domains'][number][], parentId: string) {
    for (const node of nodes) {
      const nodeId = parentId ? `${parentId}/${node.label}` : node.hostname
      if (node.children.length > 0) {
        expanded.add(nodeId)
        walk(node.children, nodeId)
      }
    }
  }
  for (const domain of tree.domains) {
    expanded.add(domain.hostname)
    walk(domain.children, domain.hostname)
  }
}

function expandPathToTarget(
  nodes: PageTree['domains'][number][],
  parentId: string,
  targetPath: string,
  expanded: Set<string>,
): boolean {
  for (const node of nodes) {
    const nodeId = `${parentId}/${node.label}`
    if (node.type === 'leaf' && node.fullPath === targetPath) {
      return true
    }
    if (node.type === 'folder' && node.children.length > 0) {
      if (expandPathToTarget(node.children, nodeId, targetPath, expanded)) {
        expanded.add(nodeId)
        return true
      }
    }
  }
  return false
}

function filterTree(tree: PageTree, query: string): PageTree {
  const filtered: PageTree = { domains: [], totalPages: 0 }

  for (const domain of tree.domains) {
    const domainMatches = domain.hostname.toLowerCase().includes(query)
    const filteredChildren = filterNodes(domain.children, query, domainMatches)

    if (domainMatches || filteredChildren.length > 0) {
      const pageCount = countLeaves(filteredChildren)
      filtered.domains.push({
        ...domain,
        children: filteredChildren,
        pageCount,
      })
      filtered.totalPages += pageCount
    }
  }

  return filtered
}

function filterNodes(
  nodes: PageTree['domains'][number][],
  query: string,
  parentMatches: boolean,
): PageTree['domains'][number][] {
  const result: PageTree['domains'][number][] = []

  for (const node of nodes) {
    const fullText = `${node.hostname}${node.fullPath ?? node.label}`.toLowerCase()
    const nodeMatches = fullText.includes(query)

    if (node.type === 'leaf') {
      if (nodeMatches || parentMatches) result.push(node)
    } else {
      const filteredChildren = filterNodes(node.children, query, nodeMatches)
      if (nodeMatches || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    }
  }

  return result
}

function countLeaves(nodes: PageTree['domains'][number][]): number {
  let count = 0
  for (const node of nodes) {
    if (node.type === 'leaf') count++
    else count += countLeaves(node.children)
  }
  return count
}
