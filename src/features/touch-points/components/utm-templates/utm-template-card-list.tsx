'use client'

import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { Loader2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { UTMTemplateCard } from './utm-template-card'
// import { DataTablePagination } from '@/shared/components/customize/table/table-pagination'
import { PaginationState, SortingState } from '@/shared/hooks/use-filters'
import { Dispatch, SetStateAction } from 'react'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'

interface UTMTemplateCardListProps {
  data: UTMTemplateListItem[]
  rowCount: number
  isLoading?: boolean
  pagination: PaginationState
  setPagination: Dispatch<SetStateAction<PaginationState>>
  sorting?: SortingState
  setSorting?: Dispatch<SetStateAction<SortingState>>
  onEdit?: (template: UTMTemplateListItem) => void
  onDelete?: (template: UTMTemplateListItem) => void
  selectedRows?: Record<string, boolean>
  onSelectedRowsChange?: (selectedRows: Record<string, boolean>) => void
  enableRowSelection?: boolean
}

export const UTMTemplateCardList = ({
  data,
  rowCount,
  isLoading,
  pagination,
  setPagination,
  onEdit,
  onDelete,
  selectedRows = {},
  onSelectedRowsChange,
  enableRowSelection = true,
}: UTMTemplateCardListProps) => {
  const [localSelectedRows, setLocalSelectedRows] = useState<Record<string, boolean>>({})

  const activeSelectedRows = selectedRows || localSelectedRows

  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {}
    if (checked) {
      data.forEach((template) => {
        newSelection[template.id] = true
      })
    }
    onSelectedRowsChange?.(newSelection)
    setLocalSelectedRows(newSelection)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelection = { ...activeSelectedRows }
    if (checked) {
      newSelection[id] = true
    } else {
      delete newSelection[id]
    }
    onSelectedRowsChange?.(newSelection)
    setLocalSelectedRows(newSelection)
  }

  const selectedCount = useMemo(
    () => Object.values(activeSelectedRows).filter(Boolean).length,
    [activeSelectedRows]
  )

  const isAllSelected = data.length > 0 && selectedCount === data.length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No templates found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {enableRowSelection && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
            aria-label="Select all templates"
          />
          {selectedCount > 0 && (
            <span className="text-sm text-gray-600">{selectedCount} selected</span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {data.map((template) => (
          <UTMTemplateCard
            key={template.id}
            template={template}
            onEdit={onEdit}
            onDelete={onDelete}
            isSelected={enableRowSelection && activeSelectedRows[template.id]}
            onSelectChange={(checked) => handleSelectRow(template.id, checked)}
          />
        ))}
      </div>
    </div>
  )
}
