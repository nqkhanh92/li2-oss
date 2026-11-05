import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useGetTouchPointsNotInTag } from '@/features/touch-points/hooks/queries'
import { useFilters } from '@/shared/hooks/use-filters'
import { touchPointInAddToTagColumns } from '../columns'
import { Table, TableBody, TableCell, TableRow } from '@/shared/components/ui/table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Button } from '@/shared/components/ui/button'
import { useUpdateTpInTag } from '@/features/tags/hooks/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
export const AddTouchPointForm = ({ tag_id, close }: { tag_id: string; close: () => void }) => {
  const [search, setSearch] = useState<string>('')
  const { org_id }: { org_id: string } = useParams()
  const { pagination, setPagination, sorting, setSorting } = useFilters({
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },
    search: search,
    sorting: [
      {
        id: 'created_at',
        desc: true,
      },
    ],
  })
  const { data, isLoading } = useGetTouchPointsNotInTag(org_id, tag_id, {
    pagination,
    search,
    sorting,
    filters: [],
  })
  const { mutate: updateTpInTag, isPending } = useUpdateTpInTag(org_id, tag_id)
  const handleUpdateTag = () => {
    const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id)
    updateTpInTag(
      {
        touch_point_ids: selectedIds,
      },
      {
        onSuccess: () => {
          close()
        },
      }
    )
  }

  const { t } = useTranslation('touchpoint')
  const table = useReactTable({
    columns: touchPointInAddToTagColumns,
    data: data?.data || [],
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
    state: {
      pagination,
      sorting,
    },
    rowCount: data?.rowCount,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  })

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DataFilterItem
        name="search"
        placeholder={t('common:filter.search_by_name')}
        type="search"
        setSearch={setSearch}
        search={search}
      />
      <div className="rounded-md">
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Table className="p-4 flex flex-col items-start self-stretch rounded-2xl bg-slate-100 max-h-[400px] overflow-y-scroll">
            <TableBody className="w-full">
              {table.getRowModel().rows?.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="flex items-center w-full data-[state=selected]:bg-background data-[state=selected]:rounded-[8px] py-1 px-0 gap-[6px] hover:bg-white hover:rounded-[8px]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="flex">
                        {isLoading ? (
                          <div className="w-full flex items-center justify-center">
                            <Loader2 className="animate-spin w-5 h-5" />
                          </div>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>{t('common:form.no_data')}</TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex gap-6 w-full items-start self-stretch">
        <Button type="button" onClick={close} variant="secondary">
          {t('touchpoint:touch_point_edit.button_list.back_button')}
        </Button>
        <LoadingButton
          type="submit"
          isLoading={isPending}
          className="gap-[6px] flex-1 w-full"
          onClick={handleUpdateTag}
          disabled={table.getSelectedRowModel().rows.length === 0}
        >
          {t('common:buttons.add', {
            field: t('common:label.link'),
          })}
        </LoadingButton>
      </div>
    </div>
  )
}
