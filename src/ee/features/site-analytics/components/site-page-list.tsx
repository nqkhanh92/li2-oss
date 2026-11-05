'use client'

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ChevronRight,
  ChevronDown,
  Search,
  Globe,
  Folder,
  Flame,
  ArrowLeft,
  LayoutGrid,
  Check,
  FileText,
  Activity,
} from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import { buildPageList, type PageListItem } from '@/ee/features/site-analytics/utils/build-page-list'
import {
  buildDomainSections,
  type DomainSection,
  type DomainPageItem,
  type DomainGroupItem,
} from '@/ee/features/site-analytics/utils/build-domain-sections'
import type { TopInteractionPage } from '@/ee/features/heatmap/types'

const ROW_HEIGHT = 30

interface SitePageListProps {
  pages: TopInteractionPage[]
  isLoading: boolean
  mode: 'top' | 'recent'
  selectedPage: string | null
  selectedHostname: string | null
  recentPathKeys?: Set<string>
  onPageChange: (page: string | null, hostname: string | null, scheme: string) => void
  onDomainSelect?: (hostname: string, scheme: string) => void
}

// ── Flattened virtual rows ─────────────────────────────────────────────────────

type Row =
  | { kind: 'domain'; section: DomainSection; expanded: boolean }
  | { kind: 'page'; item: DomainPageItem; indent: number; showFavicon: boolean; labelOverride?: string; nested?: boolean }
  | { kind: 'group'; item: DomainGroupItem; expanded: boolean }
  | { kind: 'group-more'; item: DomainGroupItem }
  | { kind: 'group-less'; item: DomainGroupItem }
  | { kind: 'view-all'; section: DomainSection }

interface FlattenState {
  scopedHost: string | null
  expandedDomains: Set<string>
  expandedGroups: Set<string>
  revealedGroups: Set<string>
  searchResults: DomainPageItem[] | null
}

function pushItem(
  rows: Row[],
  item: DomainPageItem | DomainGroupItem,
  expandedGroups: Set<string>,
  revealedGroups: Set<string>,
  indent: number,
) {
  if (item.kind === 'page') {
    rows.push({ kind: 'page', item, indent, showFavicon: false })
    return
  }
  const expanded = expandedGroups.has(item.id)
  rows.push({ kind: 'group', item, expanded })
  if (!expanded) return

  // "… N more" reveals the whole folder inline; otherwise show the top-N preview.
  const revealed = revealedGroups.has(item.id)
  const kids = revealed ? item.children : item.topChildren
  for (const child of kids) {
    // Show the path relative to the folder prefix, e.g. "/vi/blog/post" under
    // "/vi/blog/:slug" renders as "post" — the distinguishing part, no repeated prefix.
    const relative = child.fullPath.startsWith(item.prefix)
      ? child.fullPath.slice(item.prefix.length).replace(/^\//, '')
      : child.fullPath
    rows.push({
      kind: 'page',
      item: child,
      indent: indent + 1,
      showFavicon: false,
      labelOverride: relative || child.fullPath,
      nested: true,
    })
  }
  if (revealed) {
    if (item.children.length > item.topChildren.length) rows.push({ kind: 'group-less', item })
  } else if (item.hiddenChildCount > 0) {
    rows.push({ kind: 'group-more', item })
  }
}

function flattenRows(sections: DomainSection[], state: FlattenState): Row[] {
  // Search dissolves grouping → a flat ranked list of matches.
  if (state.searchResults) {
    return state.searchResults.map((item) => ({ kind: 'page' as const, item, indent: 0, showFavicon: true }))
  }

  const rows: Row[] = []

  // Drill-in: a single domain, all items, no cutoff.
  if (state.scopedHost) {
    const section = sections.find((s) => s.hostname === state.scopedHost)
    if (!section) return rows
    for (const item of section.items) pushItem(rows, item, state.expandedGroups, state.revealedGroups, 1)
    return rows
  }

  // Overview: every domain as a collapsible section.
  for (const section of sections) {
    const expanded = state.expandedDomains.has(section.hostname)
    rows.push({ kind: 'domain', section, expanded })
    if (!expanded) continue
    for (const item of section.items.slice(0, section.visibleCount)) {
      pushItem(rows, item, state.expandedGroups, state.revealedGroups, 1)
    }
    if (section.pageCount > section.visibleCount) rows.push({ kind: 'view-all', section })
  }
  return rows
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SitePageList({
  pages,
  isLoading,
  mode,
  selectedPage,
  selectedHostname,
  recentPathKeys,
  onPageChange,
  onDomainSelect,
}: SitePageListProps) {
  const { t } = useTranslation('heatmap')
  const parentRef = useRef<HTMLDivElement>(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [scopedHost, setScopedHost] = useState<string | null>(null)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [revealedGroups, setRevealedGroups] = useState<Set<string>>(new Set())
  const [switcherOpen, setSwitcherOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 200)
    return () => clearTimeout(timer)
  }, [searchInput])

  const allItems = useMemo(() => buildPageList(pages, recentPathKeys, mode), [pages, recentPathKeys, mode])
  const sections = useMemo(() => buildDomainSections(allItems), [allItems])

  // Seed domain expand state from the adaptive default whenever the data reshapes.
  useEffect(() => {
    setExpandedDomains(new Set(sections.filter((s) => s.defaultExpanded).map((s) => s.hostname)))
  }, [sections])

  // A scoped domain that no longer exists (mode/data change) drops back to the overview.
  useEffect(() => {
    if (scopedHost && !sections.some((s) => s.hostname === scopedHost)) setScopedHost(null)
  }, [sections, scopedHost])

  const searchResults = useMemo<DomainPageItem[] | null>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    const pool = scopedHost ? allItems.filter((p) => p.hostname === scopedHost) : allItems
    const matched = pool.filter(
      (p) => p.fullPath.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q),
    )
    const max = Math.max(1, ...matched.map((p) => p.clickCount))
    return matched.map((p) => toPageItem(p, p.clickCount / max))
  }, [searchQuery, allItems, scopedHost])

  const rows = useMemo(
    () => flattenRows(sections, { scopedHost, expandedDomains, expandedGroups, revealedGroups, searchResults }),
    [sections, scopedHost, expandedDomains, expandedGroups, revealedGroups, searchResults],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const toggleDomain = useCallback((host: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(host)) next.delete(host)
      else next.add(host)
      return next
    })
  }, [])

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleReveal = useCallback((id: string) => {
    setRevealedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const enterDomain = useCallback((host: string) => {
    setScopedHost(host)
    setSwitcherOpen(false)
  }, [])

  const exitScope = useCallback(() => {
    setScopedHost(null)
    setSwitcherOpen(false)
  }, [])

  const allExpanded = sections.length > 0 && sections.every((s) => expandedDomains.has(s.hostname))
  const toggleAll = useCallback(() => {
    setExpandedDomains(allExpanded ? new Set() : new Set(sections.map((s) => s.hostname)))
  }, [allExpanded, sections])

  const scopedSection = scopedHost ? sections.find((s) => s.hostname === scopedHost) : undefined

  // ── Render ────────────────────────────────────────────────────────────────

  function renderRow(row: Row) {
    switch (row.kind) {
      case 'domain': {
        const s = row.section
        const isSelected = selectedPage === null && selectedHostname === s.hostname
        return (
          <div className="flex w-full items-center">
            <button
              className="flex h-7 w-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => toggleDomain(s.hostname)}
              title={row.expanded ? t('sidebar.collapse') : t('sidebar.expand')}
            >
              {row.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <button
              className={cn(
                'flex h-7 min-w-0 flex-1 items-center gap-2 pr-2.5 text-left text-xs',
                isSelected && 'font-semibold',
              )}
              onClick={() => onDomainSelect?.(s.hostname, s.scheme)}
            >
              <Favicon hostname={s.hostname} />
              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{s.hostname}</span>
              {s.isRecent && <RecentDot title={t('sidebar.legend_recent')} />}
              <span
                className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground tabular-nums"
                title={t('sidebar.pagesCount', { count: s.pageCount })}
              >
                <FileText className="h-2.5 w-2.5" />
                {s.pageCount}
              </span>
              <span
                className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums"
                title={t('sidebar.interactions_count', { count: s.clickCount })}
              >
                <Activity className="h-2.5 w-2.5" />
                {formatCount(s.clickCount)}
              </span>
            </button>
          </div>
        )
      }
      case 'page': {
        const p = row.item
        const isSelected = p.fullPath === selectedPage && p.hostname === selectedHostname
        return (
          <button
            className={cn(
              'relative flex h-7 w-full items-center gap-2 overflow-hidden border-l-2 pr-2.5 text-left text-xs transition-colors',
              isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted/50',
            )}
            style={{ paddingLeft: indentPx(row.indent) }}
            onClick={() => onPageChange(p.fullPath, p.hostname, p.scheme)}
            title={`${p.hostname}${p.fullPath}`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-primary/10"
              style={{ width: `${Math.round(p.share * 100)}%` }}
              aria-hidden
            />
            {row.nested && (
              <span
                className="absolute inset-y-0 z-1 w-px bg-border"
                style={{ left: indentPx(row.indent) - 9 }}
                aria-hidden
              />
            )}
            {row.showFavicon && <span className="relative z-10"><Favicon hostname={p.hostname} /></span>}
            {row.nested && <FileText className="relative z-10 h-3 w-3 shrink-0 text-muted-foreground/70" />}
            <span
              className={cn(
                'relative z-10 min-w-0 flex-1 truncate',
                isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {row.labelOverride ?? pageLabel(p.fullPath)}
            </span>
            {p.isHot ? (
              <span className="relative z-10 flex" title={t('sidebar.legend_hot')}>
                <Flame className="h-3 w-3 shrink-0 text-amber-500" />
              </span>
            ) : p.isRecent ? (
              <RecentDot title={t('sidebar.legend_recent')} />
            ) : null}
            <span className="relative z-10 shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {formatCount(p.clickCount)}
            </span>
          </button>
        )
      }
      case 'group': {
        const g = row.item
        const idx = g.indexPage
        // The folder's body opens the section's landing page when one exists; otherwise
        // it just toggles. The chevron always toggles, so a merged folder is still expandable.
        const isSelected = idx != null && idx.fullPath === selectedPage && g.hostname === selectedHostname
        return (
          <div
            className="relative flex w-full items-center overflow-hidden"
            style={{ paddingLeft: indentPx(1) }}
          >
            <span
              className="absolute inset-y-0 left-0 bg-primary/[0.07]"
              style={{ width: `${Math.round(g.share * 100)}%` }}
              aria-hidden
            />
            <button
              className="relative z-10 flex h-7 w-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => toggleGroup(g.id)}
              title={row.expanded ? t('sidebar.collapse') : t('sidebar.expand')}
            >
              {row.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            <button
              className={cn(
                'relative z-10 flex h-7 min-w-0 flex-1 items-center gap-2 pr-2.5 text-left text-xs transition-colors',
                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
              )}
              onClick={() => (idx ? onPageChange(idx.fullPath, g.hostname, g.scheme) : toggleGroup(g.id))}
              title={idx ? `${g.hostname}${idx.fullPath}` : g.label}
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{g.label}</span>
              {g.isRecent && <RecentDot title={t('sidebar.legend_recent')} />}
              <span
                className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground tabular-nums"
                title={t('sidebar.pagesCount', { count: g.pageCount })}
              >
                <FileText className="h-2.5 w-2.5" />
                {g.pageCount}
              </span>
              {idx && (
                <span
                  className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums"
                  title={t('sidebar.interactions_count', { count: idx.clickCount })}
                >
                  <Activity className="h-2.5 w-2.5" />
                  {formatCount(idx.clickCount)}
                </span>
              )}
            </button>
          </div>
        )
      }
      case 'group-more':
        return (
          <button
            className="flex h-7 w-full items-center text-left text-[11px] font-medium text-primary hover:underline"
            style={{ paddingLeft: indentPx(2) }}
            onClick={() => toggleReveal(row.item.id)}
          >
            {t('sidebar.more_count', { count: row.item.hiddenChildCount })}
          </button>
        )
      case 'group-less':
        return (
          <button
            className="flex h-7 w-full items-center text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
            style={{ paddingLeft: indentPx(2) }}
            onClick={() => toggleReveal(row.item.id)}
          >
            {t('sidebar.show_less')}
          </button>
        )
      case 'view-all':
        return (
          <button
            className="flex h-7 w-full items-center text-left text-[11px] font-medium text-primary hover:underline"
            style={{ paddingLeft: indentPx(1) }}
            onClick={() => enterDomain(row.section.hostname)}
          >
            {t('sidebar.view_all', { count: row.section.pageCount, host: row.section.hostname })}
          </button>
        )
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search */}
      <div className="border-b px-2.5 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-8 text-xs"
            placeholder={scopedHost ? t('sidebar.search_in', { host: scopedHost }) : t('sidebar.searchPages')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Scope bar / breadcrumb */}
      {scopedHost ? (
        <div className="flex items-center gap-1.5 border-b px-2.5 py-1.5 text-[11px]">
          <button
            className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={exitScope}
          >
            <ArrowLeft className="h-3 w-3" />
            {t('sidebar.all_domains')}
          </button>
          <span className="text-muted-foreground">/</span>
          <DomainSwitcher
            sections={sections}
            currentHost={scopedHost}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            onSelect={enterDomain}
            onAll={exitScope}
            trigger={
              <button className="flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold text-foreground hover:bg-muted">
                <Favicon hostname={scopedHost} />
                <span className="max-w-[120px] truncate">{scopedHost}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            }
          />
        </div>
      ) : sections.length > 1 ? (
        <div className="flex items-center justify-between border-b px-2.5 py-1.5">
          <DomainSwitcher
            sections={sections}
            currentHost={null}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            onSelect={enterDomain}
            onAll={exitScope}
            trigger={
              <button className="flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted">
                <LayoutGrid className="h-3 w-3 text-muted-foreground" />
                {t('sidebar.all_domains')}
                <span className="text-muted-foreground tabular-nums">{sections.length}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            }
          />
          <button className="text-[11px] font-medium text-muted-foreground hover:text-foreground" onClick={toggleAll}>
            {allExpanded ? t('sidebar.collapse_all') : t('sidebar.expand_all')}
          </button>
        </div>
      ) : null}

      {/* List */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            {t('sidebar.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center text-xs text-muted-foreground">
            <Globe className="h-6 w-6 opacity-50" />
            <p>{searchQuery.trim() ? t('sidebar.no_matches') : t('sidebar.noData')}</p>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index]
              if (!row) return null
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  className="absolute left-0 top-0 w-full"
                  style={{ height: ROW_HEIGHT, transform: `translateY(${vi.start}px)` }}
                >
                  {renderRow(row)}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {scopedSection && !searchQuery.trim() && (
        <div className="border-t px-2.5 py-1.5 text-center text-[10px] text-muted-foreground">
          {t('sidebar.showing_all', { count: scopedSection.pageCount })}
        </div>
      )}
    </div>
  )
}

// ── Sub-components & helpers ────────────────────────────────────────────────────

function DomainSwitcher({
  sections,
  currentHost,
  open,
  onOpenChange,
  onSelect,
  onAll,
  trigger,
}: {
  sections: DomainSection[]
  currentHost: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (host: string) => void
  onAll: () => void
  trigger: ReactNode
}) {
  const { t } = useTranslation('heatmap')
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? sections.filter((s) => s.hostname.toLowerCase().includes(q)) : sections
  }, [filter, sections])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <div className="flex items-center gap-1.5 border-b px-2 pb-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            autoFocus
            className="h-6 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            placeholder={t('sidebar.switch_domain')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto pt-1">
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold hover:bg-muted"
            onClick={onAll}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">{t('sidebar.all_domains')}</span>
            {currentHost === null && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
          {filtered.map((s) => (
            <button
              key={s.hostname}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => onSelect(s.hostname)}
            >
              <Favicon hostname={s.hostname} />
              <span className="min-w-0 flex-1 truncate">{s.hostname}</span>
              <span
                className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums"
                title={t('sidebar.pagesCount', { count: s.pageCount })}
              >
                <FileText className="h-2.5 w-2.5" />
                {s.pageCount}
              </span>
              {currentHost === s.hostname && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Favicon({ hostname }: { hostname: string }) {
  const [error, setError] = useState(false)
  if (error) return <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-sm"
      onError={() => setError(true)}
    />
  )
}

function RecentDot({ title }: { title?: string }) {
  // A card-colored disk under the dot punches through any traffic-fill bar behind
  // it, so the dot reads identically on a folder/page row (over a bar) and on a
  // domain row (plain card) — the emerald halo always sits on the card surface.
  return (
    <span
      title={title}
      className="relative z-10 flex shrink-0 items-center justify-center rounded-full bg-card p-0.5"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
    </span>
  )
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

function indentPx(indent: number): number {
  return 10 + indent * 14
}

function pageLabel(fullPath: string): string {
  return fullPath === '/' ? '/' : fullPath
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}
