'use client'
// import { useFilters } from '@/shared/hooks/use-filters'
// import { CustomTable } from '@/shared/components/customize/table/custom-table'
// import { Plus } from 'lucide-react'
// import { touchPointInTagDetailColumns } from '@/features/touch-points/components/columns'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
// import { useBulkDeleteTouchPoint } from '@/features/touch-points/hooks/mutations'
// import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
// import { useRef } from 'react'
import { useParams } from 'next/navigation'
// import { useRouter } from 'next/navigation'
// import { TableActionProvider } from '@/shared/providers/table-action-provider'
// import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
// import { Button } from '@/shared/components/ui/button'
// import { AddTouchPointForm } from '@/features/touch-points/components/forms/add-touch-point-form'
// import { useBulkDeleteTouchPointFromTag } from '@/features/tags/hooks/mutations'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

/**
 * A component for displaying the count of touch points linked to a tag.
 * Note: Full table functionality is temporarily disabled pending collection permission implementation.
 *
 * @returns {JSX.Element}
 */
export const TouchPointListInTag = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isHeadless = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enableRowSelection = true,
}: {
  isHeadless?: boolean
  enableRowSelection?: boolean
}) => {
  const { org_id, tag_id }: { org_id: string; tag_id: string } = useParams()
  const { t } = useTranslation('touchpoint')

  // Simplified query - only need count, so minimal page size
  const { data, isLoading } = useGetTouchPoints(org_id, {
    pagination: { pageIndex: 0, pageSize: 1 },
    search: '',
    sorting: [],
    filters: {
      ...(tag_id ? { tag_ids: [tag_id] } : {}),
    },
  })

  // const { pagination, setPagination, sorting, filters, setSorting } = useFilters({
  //   pagination: {
  //     pageIndex: 0,
  //     pageSize: 10,
  //   },
  //   search: '',
  //   sorting: [
  //     {
  //       id: 'created_at',
  //       desc: true,
  //     },
  //   ],
  // })
  // const { data, isLoading } = useGetTouchPoints(org_id, {
  //   pagination,
  //   search: '',
  //   sorting,
  //   filters: {
  //     ...filters,
  //     ...(tag_id ? { tag_ids: [tag_id] } : {}),
  //   },
  // })

  // const createTouchPointRef = useRef<DialogCustomRef>(null)
  // const router = useRouter()
  // //Delete remove tag from touch point
  // const { mutate: removeTagFromTouchPoint, isPending: isRemovingTag } =
  //   useBulkDeleteTouchPointFromTag(org_id, tag_id)
  // const onDeleteBulkRemoveTagFromTouchPoint = ({
  //   selectedRows,
  //   callback,
  // }: {
  //   selectedRows: Record<string, boolean>
  //   callback?: () => void
  // }) => {
  //   const selectedIds = Object.entries(selectedRows)
  //     .filter(([_, isSelected]) => isSelected)
  //     .map(([id]) => id)
  //   removeTagFromTouchPoint(selectedIds, {
  //     onSuccess: () => {
  //       callback?.()
  //     },
  //   })
  // }

  return (
    <div className="bg-background rounded-2xl p-4">
      <div className="flex gap-2 items-center text-sm font-medium text-slate-500">
        <span className="min-h-10 w-10 py-[2px] px-4 flex flex-col items-center justify-center gap-[10px] rounded-[8px] bg-primary text-white">
          {isLoading ? <Skeleton className="h-5" /> : data?.rowCount || 0}
        </span>
        {t('common:label.link')}
      </div>
    </div>
  )

  // Full table implementation - temporarily disabled pending collection permission implementation
  // return (
  //   <div>
  //     <TableActionProvider
  //       actions={[
  //         {
  //           name: 'edit',
  //           label: t('common:buttons.edit', { field: '' }),
  //           action: (row) => {
  //             router.push(`/org/${org_id}/touch-points/${row.id}`)
  //           },
  //         },
  //       ]}
  //     >
  //       <CustomTable
  //         className="bg-background rounded-2xl"
  //         extras={
  //           <>
  //             <div className="flex md:p-2 items-center gap-[6px] self-stretch border-b-2 border-slate-50 w-full">
  //               <CustomDialog
  //                 ref={createTouchPointRef}
  //                 noFooter
  //                 button={
  //                   <Button
  //                     size="default"
  //                     variant="secondary"
  //                     className="font-medium gap-1"
  //                     type="button"
  //                     iconLeft={<Plus />}
  //                   >
  //                     {t('common:buttons.add', {
  //                       field: t('common:label.link'),
  //                     })}
  //                   </Button>
  //                 }
  //                 title={t('common:buttons.add', {
  //                   field: t('common:label.link'),
  //                 })}
  //                 size="md"
  //               >
  //                 {({ close }) => <AddTouchPointForm tag_id={tag_id} close={close} />}
  //               </CustomDialog>
  //               <div className="flex gap-2 py-1 md:px-8 px-4 flex-1 items-center text-sm font-medium text-slate-500">
  //                 <span className="min-h-10 w-10 py-[2px] px-4 flex flex-col items-center justify-center gap-[10px] rounded-[8px] bg-primary text-white">
  //                   {isLoading ? <Skeleton className="h-5" /> : data?.data?.length || 0}
  //                 </span>
  //                 {t('common:label.link')}
  //               </div>
  //             </div>
  //           </>
  //         }
  //         pagination={pagination}
  //         setPagination={setPagination}
  //         setSorting={setSorting}
  //         sorting={sorting}
  //         columns={touchPointInTagDetailColumns}
  //         enableColumnToggle={false}
  //         data={data?.data || []}
  //         rowCount={data?.rowCount}
  //         enableRowSelection={enableRowSelection}
  //         onDeleteSelected={onDeleteBulkRemoveTagFromTouchPoint}
  //         isLoading={isLoading}
  //         isDeleting={isRemovingTag}
  //         isHeadless={isHeadless}
  //       />
  //     </TableActionProvider>
  //     <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
  //   </div>
  // )
}
