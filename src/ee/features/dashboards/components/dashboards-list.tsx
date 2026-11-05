'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { Plus, ArrowUpDown, Search, Pin, LayoutDashboard, Users, LayoutGrid, List, Settings, ArrowRight } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { Button } from '@/shared/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { AnimatedTabs } from '@/shared/components/animation/animated-tabs'
import { authStore } from '@/shared/stores/profile-store'
import { useFilters } from '@/shared/hooks/use-filters'
import { useGetDashboards } from '../hooks/queries'
import { useDuplicateDashboard } from '../hooks/mutations'
import { partitionByOwner, partitionByPinned } from '../utils/dashboard-filters'
import { sortDashboards, type SortField } from '../utils/dashboard-sort'
import { useViewMode, type ViewMode } from '../hooks/use-view-mode'
import { useDashboardShortcuts } from '../hooks/use-dashboard-shortcuts'
import { useBulkSelection } from '../hooks/use-bulk-selection'
import { DashboardCard } from './dashboard-card'
import { DashboardListRow } from './dashboard-list-row'
import { BulkActionBar } from './bulk-action-bar'
import { DashboardCreateSheet } from './dashboard-create-sheet'
import { DashboardEmptyState } from './dashboard-empty-state'
import { EmptySection } from '@/shared/components/customize/empty-section'

const CARD_VARIANTS = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

const CARD_TRANSITION = { duration: 0.15, ease: 'easeOut' as const }

const SORT_OPTIONS = [
  { value: 'updated_at:desc', labelKey: 'list.sort.updatedAt', defaultLabel: 'Recently updated' },
  { value: 'name:asc', labelKey: 'list.sort.nameAsc', defaultLabel: 'Name A-Z' },
  { value: 'name:desc', labelKey: 'list.sort.nameDesc', defaultLabel: 'Name Z-A' },
  { value: 'created_at:desc', labelKey: 'list.sort.newestFirst', defaultLabel: 'Newest first' },
  { value: 'created_at:asc', labelKey: 'list.sort.oldestFirst', defaultLabel: 'Oldest first' },
  { value: 'widget_count:desc', labelKey: 'list.sort.mostWidgets', defaultLabel: 'Most widgets' },
] as const

function TabEmptyState({
  activeTab,
  t,
  onSwitchToMy,
  onCreateNew,
}: {
  activeTab: string
  t: (key: string, opts?: Record<string, unknown>) => string
  onSwitchToMy: () => void
  onCreateNew: () => void
}) {
  if (activeTab === 'shared') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6 h-24 w-32">
          <div className="absolute top-0 left-3 h-18 w-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50" />
          <div className="absolute top-3 left-6 h-18 w-24 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1 p-2.5">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="h-1.5 w-8 rounded-full bg-slate-100" />
              <div className="mt-1 flex gap-1">
                <div className="h-4 w-4 rounded-sm bg-sky-100" />
                <div className="h-4 w-4 rounded-sm bg-emerald-100" />
                <div className="h-4 w-4 rounded-sm bg-amber-100" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-white">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {t('list.tabEmpty.shared.title', { defaultValue: 'No shared dashboards yet' })}
        </p>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
          {t('list.tabEmpty.shared.description', {
            defaultValue: 'When a teammate shares a dashboard with you, it appears here. You can also share yours from any dashboard\'s Access Settings.',
          })}
        </p>
        <div className="mt-5 flex items-center gap-5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            {t('list.tabEmpty.shared.step1', { defaultValue: 'Open a dashboard' })}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {t('list.tabEmpty.shared.step2', { defaultValue: 'Access Settings' })}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span>{t('list.tabEmpty.shared.step3', { defaultValue: 'Add members' })}</span>
        </div>
        <Button variant="outline" size="sm" className="mt-5" onClick={onSwitchToMy}>
          {t('list.tabEmpty.shared.cta', { defaultValue: 'Go to My Dashboards' })}
        </Button>
      </div>
    )
  }

  if (activeTab === 'my') {
    return (
      <EmptySection
        size="sm"
        IconComponent={<LayoutDashboard className="text-slate-300" />}
        title={t('list.tabEmpty.my.title', { defaultValue: "You haven't created any dashboards yet" })}
        description={t('list.tabEmpty.my.description', { defaultValue: 'Create your first dashboard to start tracking what matters.' })}
        action={
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('list.newDashboard', { defaultValue: 'New Dashboard' })}
          </Button>
        }
      />
    )
  }

  return null
}

export function DashboardsList() {
  const { t } = useTranslation('dashboards')
  const { org_id } = useParams<{ org_id: string }>()
  const { data: dashboards, isLoading } = useGetDashboards(org_id)
  const duplicateDashboard = useDuplicateDashboard(org_id)
  const profile = authStore((s) => s.profile)

  const prefersReducedMotion = useReducedMotion()
  const [viewMode, setViewMode] = useViewMode()

  const { search, setSearch, sorting, setSorting, filters, setFilter } = useFilters({
    search: '',
    sorting: [{ id: 'updated_at', desc: true }],
    filters: { tab: 'all' },
  })

  const activeTab = (filters.tab as string) || 'all'
  const setTab = (tab: string) => setFilter('tab', tab)

  const sortValue = `${sorting[0]?.id ?? 'updated_at'}:${sorting[0]?.desc ? 'desc' : 'asc'}`
  const handleSortChange = (value: string) => {
    const [id, dir] = value.split(':')
    setSorting([{ id, desc: dir === 'desc' }])
  }

  const [createOpen, setCreateOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { selectedIds, isSelecting, toggle: toggleSelect, clearAll: clearSelection, isSelected } =
    useBulkSelection(`${search}::${activeTab}`)

  const { mine: myDashboards, shared: sharedDashboards } = useMemo(
    () => partitionByOwner(dashboards ?? [], profile?.id),
    [dashboards, profile?.id],
  )

  // Client-side pipeline: tab → search → sort
  const filtered = useMemo(() => {
    let list = dashboards ?? []

    // 1. Tab filter
    if (activeTab === 'my') list = myDashboards
    else if (activeTab === 'shared') list = sharedDashboards

    // 2. Search filter
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.name.toLowerCase().includes(q))
    }

    // 3. Sort
    const sortField = (sorting[0]?.id ?? 'updated_at') as SortField
    const sortDesc = sorting[0]?.desc ?? true
    list = sortDashboards(list, sortField, sortDesc)

    return list
  }, [dashboards, myDashboards, sharedDashboards, activeTab, search, sorting])

  // Split filtered results into pinned (horizontal row) and unpinned (main grid)
  const { pinned: pinnedDashboards, unpinned: unpinnedDashboards } = useMemo(
    () => partitionByPinned(filtered),
    [filtered],
  )

  // Keyboard shortcuts — operates on the full filtered list (pinned + unpinned)
  const handleFocusSearch = useCallback(() => {
    // DataFilterItem doesn't forward ref — find input by container
    const input = searchInputRef.current?.querySelector('input')
    input?.focus()
  }, [])
  const handleCreateNew = useCallback(() => setCreateOpen(true), [])
  const { focusedIndex } = useDashboardShortcuts({
    items: filtered,
    orgId: org_id,
    viewMode,
    onCreateNew: handleCreateNew,
    onFocusSearch: handleFocusSearch,
    gridRef,
  })
  const focusedId = focusedIndex !== null ? filtered[focusedIndex]?.id ?? null : null

  // Tab definitions for AnimatedTabs
  const tabs = useMemo(() => [
    {
      id: 'all',
      label: (
        <span className="flex items-center gap-1.5">
          {t('list.tabAll', { defaultValue: 'All' })}
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{dashboards?.length ?? 0}</Badge>
        </span>
      ),
    },
    {
      id: 'my',
      label: (
        <span className="flex items-center gap-1.5">
          {t('list.tabMy', { defaultValue: 'My Dashboards' })}
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{myDashboards.length}</Badge>
        </span>
      ),
    },
    {
      id: 'shared',
      label: (
        <span className="flex items-center gap-1.5">
          {t('list.tabShared', { defaultValue: 'Shared with me' })}
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{sharedDashboards.length}</Badge>
        </span>
      ),
    },
  ], [t, dashboards?.length, myDashboards.length, sharedDashboards.length])

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!dashboards || dashboards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <DashboardEmptyState onCreateClick={() => setCreateOpen(true)} />
        <DashboardCreateSheet open={createOpen} onOpenChange={setCreateOpen} hideTrigger />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      <div className="flex items-center gap-2.5">
        <div className="w-56" ref={searchInputRef}>
          <DataFilterItem
            type="search"
            name="search"
            placeholder={t('list.searchPlaceholder', { defaultValue: 'Search dashboards...' })}
            search={search}
            setSearch={setSearch}
          />
        </div>
        <Select value={sortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-auto gap-1.5 text-xs h-9">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          className="hidden md:flex"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9 p-0">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9 p-0">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <DashboardCreateSheet open={createOpen} onOpenChange={setCreateOpen} hideTrigger />


      <div className="border-b border-slate-200">
        <AnimatedTabs tabs={tabs} value={activeTab} onValueChange={setTab} />
      </div>


      {filtered.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            {t('list.noSearchResults.title', { defaultValue: 'No dashboards found' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {t('list.noSearchResults.description', {
              defaultValue: 'No dashboards match "{{query}}"',
              query: search,
            })}
          </p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSearch('')}>
            {t('list.noSearchResults.clear', { defaultValue: 'Clear search' })}
          </Button>
        </div>
      ) : (
        <div ref={gridRef}>

          {/* Pinned section — grid view only (horizontal scroll cards).
              In list view, pinned items merge into the flat list below with inline pin icons. */}
          {pinnedDashboards.length > 0 && viewMode === 'grid' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Pin className="h-3 w-3" />
                {t('list.pinnedSection', { defaultValue: 'Pinned' })}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-200">
                <LayoutGroup id="pinned-cards">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pinnedDashboards.map((dashboard) => (
                    <motion.div
                      key={dashboard.id}
                      layout={!prefersReducedMotion}
                      variants={prefersReducedMotion ? undefined : CARD_VARIANTS}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={CARD_TRANSITION}
                      className="snap-start"
                    >
                      <DashboardCard
                        dashboard={dashboard}
                        orgId={org_id}
                        compact
                        isFocused={focusedId === dashboard.id}
                        isSelected={isSelected(dashboard.id)}
                        isSelecting={isSelecting}
                        onToggleSelect={toggleSelect}
                        onDuplicate={(id) => duplicateDashboard.mutate(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                </LayoutGroup>
              </div>
            </div>
          )}


          {unpinnedDashboards.length === 0 && pinnedDashboards.length === 0 && !search ? (
            <TabEmptyState
              activeTab={activeTab}
              t={t}
              onSwitchToMy={() => setTab('my')}
              onCreateNew={() => setCreateOpen(true)}
            />
          ) : (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <LayoutGroup id="unpinned-cards">
                <AnimatePresence mode="popLayout" initial={false}>
                  {unpinnedDashboards.map((dashboard) => (
                    <motion.div
                      key={dashboard.id}
                      layout={!prefersReducedMotion}
                      variants={prefersReducedMotion ? undefined : CARD_VARIANTS}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={CARD_TRANSITION}
                    >
                      <DashboardCard
                        dashboard={dashboard}
                        orgId={org_id}
                        isFocused={focusedId === dashboard.id}
                        isSelected={isSelected(dashboard.id)}
                        isSelecting={isSelecting}
                        onToggleSelect={toggleSelect}
                        onDuplicate={(id) => duplicateDashboard.mutate(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                </LayoutGroup>

                {/* "+" new dashboard card — always static, never animated */}
                <button
                  onClick={() => setCreateOpen(true)}
                  className="group flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors duration-200">
                      <Plus className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors duration-200" />
                    </div>
                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                      {t('list.newDashboard', { defaultValue: 'New Dashboard' })}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              /* List view: flat list of ALL filtered items (pinned shown via inline icon, no separate section) */
              <div className="flex flex-col divide-y divide-slate-100">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filtered.map((dashboard) => (
                    <motion.div
                      key={dashboard.id}
                      variants={prefersReducedMotion ? undefined : CARD_VARIANTS}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={CARD_TRANSITION}
                    >
                      <DashboardListRow
                        dashboard={dashboard}
                        orgId={org_id}
                        isFocused={focusedId === dashboard.id}
                        isSelected={isSelected(dashboard.id)}
                        isSelecting={isSelecting}
                        onToggleSelect={toggleSelect}
                        onDuplicate={(id) => duplicateDashboard.mutate(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* "+" new dashboard row — matches row height/padding */}
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors duration-150"
                >
                  <Plus className="h-4 w-4" />
                  {t('list.newDashboard', { defaultValue: 'New Dashboard' })}
                </button>
              </div>
            )
          )}
        </div>
      )}

      <BulkActionBar selectedIds={selectedIds} orgId={org_id} onClearAll={clearSelection} />
    </div>
  )
}
