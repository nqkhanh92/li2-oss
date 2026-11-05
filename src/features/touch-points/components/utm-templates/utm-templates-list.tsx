'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useFilters } from '@/shared/hooks/use-filters'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useParams } from 'next/navigation'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { useBulkDeleteUTMTemplates } from '@/features/touch-points/hooks/useUTMTemplates'
import { useUTMTemplatesInfiniteScroll } from '@/features/touch-points/hooks/useUTMTemplatesInfiniteScroll'
import { useTranslation } from 'react-i18next'
import { CreateUTMTemplateForm } from './create-utm-template-form'
import { EditUTMTemplateForm } from './edit-utm-template-form'
import { UTMTemplatesEmptyState } from './utm-templates-empty-state'
import { UTMTemplateCardListVirtual } from './utm-template-card-list-virtual'
import { Button } from '@/shared/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'

interface UTMTemplatesListProps {
  blocked: boolean
}

export const UTMTemplatesList = ({ blocked }: UTMTemplatesListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<UTMTemplateListItem | null>(null)
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})
  const { sorting, filters, search, setSearch } = useFilters({
    search: '',
    sorting: [
      {
        id: 'created_at',
        desc: true,
      },
    ],
  })
  const { org_id }: { org_id: string } = useParams()

  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useUTMTemplatesInfiniteScroll({
    org_id,
    search,
    sorting,
    filters,
  })

  // Flatten all pages into a single array
  const allData = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
    [infiniteData?.pages]
  )

  const rowCount = infiniteData?.pages[0]?.rowCount ?? 0

  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteUTMTemplates(org_id)
  const onDeleteBulk = (selectedRowsData: Record<string, boolean>) => {
    const selectedIds = Object.entries(selectedRowsData)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    bulkDelete(selectedIds, {
      onSuccess: () => {
        setSelectedRows({})
      },
    })
  }

  const { t } = useTranslation('common')

  const hasNoData = !isLoading && (!allData || allData.length === 0)
  const selectedCount = useMemo(
    () => Object.values(selectedRows).filter(Boolean).length,
    [selectedRows]
  )

  // Indeterminate state for select-all checkbox
  const isIndeterminate = selectedCount > 0 && selectedCount < allData.length

  return (
    <div className="flex flex-col">
      {hasNoData ? (
        <UTMTemplatesEmptyState onCreateClick={() => setIsDialogOpen(true)} isBlocked={blocked} />
      ) : (
        <>
          {/* Header with Search and Create Button */}
          <div className="flex items-center justify-between mb-6">
            <DataFilterItem
              name="searchTemplate"
              type="search"
              setSearch={setSearch}
              search={search}
              placeholder="Search by title..."
              className="w-[250px] bg-card"
            />

            {/* Create Button */}
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={blocked}
              className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
              <span className="text-base font-medium">Create UTM templates</span>
            </Button>
          </div>

          {/* Table Header with Select All */}
          <div className="flex items-center gap-1.5 px-2 py-1 border-b-2 border-slate-50 mb-4">
            <div className="flex items-center justify-center pl-2 gap-2">
              <Checkbox
                checked={
                  selectedCount === allData.length && allData.length > 0
                    ? true
                    : isIndeterminate
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection: Record<string, boolean> = {}
                    allData.forEach((template) => {
                      newSelection[template.id] = true
                    })
                    setSelectedRows(newSelection)
                  } else {
                    setSelectedRows({})
                  }
                }}
              />
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                  </span>
                  <Button
                    onClick={() => onDeleteBulk(selectedRows)}
                    disabled={isDeleting}
                    variant="ghost"
                    size="sm"
                    className="size-4 text-semantic-error hover:text-semantic-error/80"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between flex-1 px-2 py-1">
              <p className="text-sm font-medium text-slate-500">Information</p>
            </div>
          </div>

          <UTMTemplateCardListVirtual
            data={allData}
            rowCount={rowCount}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onFetchNextPage={fetchNextPage}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            enableRowSelection
            onEdit={(template) => {
              setSelectedTemplate(template)
              setIsEditDialogOpen(true)
            }}
            onDelete={(template) => {
              onDeleteBulk({ [template.id]: true })
            }}
          />
        </>
      )}

      <CustomDialogV2
        title={t('buttons.create', { field: t('module.utmTemplates') })}
        description=""
        size="sm"
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <CreateUTMTemplateForm
          onSuccess={() => {
            setIsDialogOpen(false)
          }}
          onClose={() => {
            setIsDialogOpen(false)
          }}
        />
      </CustomDialogV2>

      {selectedTemplate && (
        <CustomDialogV2
          title={t('buttons.edit', { field: t('module.utmTemplates') })}
          description=""
          size="sm"
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        >
          <EditUTMTemplateForm
            template={selectedTemplate}
            onSuccess={() => {
              setSelectedTemplate(null)
              setIsEditDialogOpen(false)
            }}
            onCancel={() => {
              setSelectedTemplate(null)
              setIsEditDialogOpen(false)
            }}
          />
        </CustomDialogV2>
      )}
    </div>
  )
}
