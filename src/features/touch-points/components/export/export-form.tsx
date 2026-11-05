'use client'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getColumns } from '../../constants/import'
import { useColumnSelection } from '../../hooks/use-column-selection'
import { useExportTouchPointsData } from '../../hooks/use-export-touch-points-data'
import { createExportStrategy } from '../../utils/export-strategies'
import { ColumnSelector } from './column-selector'
import { CalendarDays, Search, Tag, FolderOpen } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'

type ExportFormProps = {
  close: () => void
  qrOnly?: boolean
  nfcOnly?: boolean
}

export const ExportForm = ({ qrOnly, nfcOnly }: ExportFormProps) => {
  const { t } = useTranslation('touchpoint')
  const { org_id } = useParams<{ org_id: string }>()
  const searchParams = useSearchParams()

  const columns = getColumns(t).filter((col) => !col.exportDisabled)
  const [useCurrentFilters, setUseCurrentFilters] = useState(false)

  const { selectedColumns, toggleColumn } = useColumnSelection({
    initialColumns: columns.filter((col) => col.checked).map((col) => col.id),
  })

  const exportStrategy = useMemo(() => createExportStrategy('csv'), [])

  // Parse active filters from URL params (written by useFilters on the list page)
  const { urlDateRange, urlExtraFilters, urlSearch, activeChips } = useMemo(() => {
    const createdFrom = searchParams.get('created_at[from]')
    const createdTo = searchParams.get('created_at[to]')
    const search = searchParams.get('search') || undefined

    const tagIds: string[] = []
    let i = 0
    while (searchParams.has(`tag_ids[${i}]`)) {
      tagIds.push(searchParams.get(`tag_ids[${i}]`)!)
      i++
    }

    const collectionId = searchParams.get('collection_id') || undefined

    const urlDateRange =
      createdFrom || createdTo
        ? {
            from: createdFrom ? new Date(Number(createdFrom)) : undefined,
            to: createdTo ? new Date(Number(createdTo)) : undefined,
          }
        : undefined

    const urlExtraFilters: Record<string, any> = {}
    if (tagIds.length) urlExtraFilters.tag_ids = tagIds
    if (collectionId) urlExtraFilters.collection_id = collectionId

    const activeChips: { icon: React.ReactNode; label: string }[] = []
    if (urlDateRange) {
      const from = urlDateRange.from ? dayjs(urlDateRange.from).format('MMM D') : ''
      const to = urlDateRange.to ? dayjs(urlDateRange.to).format('MMM D') : ''
      activeChips.push({
        icon: <CalendarDays className="w-3 h-3" />,
        label: from && to ? `${from} – ${to}` : from || to,
      })
    }
    if (tagIds.length) {
      activeChips.push({
        icon: <Tag className="w-3 h-3" />,
        label: t('common:filter.search_by_tag', 'Tags') + ` (${tagIds.length})`,
      })
    }
    if (collectionId) {
      activeChips.push({
        icon: <FolderOpen className="w-3 h-3" />,
        label: t('common:filter.search_by_collection', 'Collection'),
      })
    }
    if (search) {
      activeChips.push({
        icon: <Search className="w-3 h-3" />,
        label: `"${search}"`,
      })
    }

    return { urlDateRange, urlExtraFilters, urlSearch: search, activeChips }
  }, [searchParams, t])

  const { exportData, isExporting } = useExportTouchPointsData({
    orgId: org_id,
    qrOnly,
    nfcOnly,
    columns,
    exportStrategy,
    dateRange: useCurrentFilters ? urlDateRange : undefined,
    extraFilters: useCurrentFilters ? urlExtraFilters : undefined,
    search: useCurrentFilters ? urlSearch : undefined,
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Apply current filters toggle */}
      <div
        className={`flex flex-col gap-2.5 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
          useCurrentFilters
            ? 'border-primary/30 bg-primary/[0.03]'
            : 'border-slate-200 hover:border-slate-300'
        }`}
        onClick={() => setUseCurrentFilters((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium cursor-pointer">
              {t('touchpoint:export.use_current_filters')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('touchpoint:export.use_current_filters_desc')}
            </p>
          </div>
          <Switch
            checked={useCurrentFilters}
            onCheckedChange={setUseCurrentFilters}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {useCurrentFilters && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {activeChips.length > 0 ? (
              activeChips.map((chip, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {chip.icon}
                  {chip.label}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">
                {t('touchpoint:export.no_active_filters')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Column selector */}
      <div className="flex flex-col gap-3 px-4 py-3 border-slate-200 border rounded-xl">
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns}
          onToggle={toggleColumn}
          label={t('touchpoint:export.columns_label')}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => exportData(selectedColumns)} disabled={isExporting}>
          {t('common:buttons.export_field')}
        </Button>
      </div>
    </div>
  )
}
