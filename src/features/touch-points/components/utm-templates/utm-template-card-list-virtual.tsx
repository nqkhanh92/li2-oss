'use client'

import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { UTMTemplateCard } from './utm-template-card'
import { useVirtualizer } from '@tanstack/react-virtual'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'

interface UTMTemplateCardListVirtualProps {
  data: UTMTemplateListItem[]
  rowCount: number
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onFetchNextPage?: () => void
  onEdit?: (template: UTMTemplateListItem) => void
  onDelete?: (template: UTMTemplateListItem) => void
  selectedRows: Record<string, boolean>
  onSelectedRowsChange: (selectedRows: Record<string, boolean>) => void
  enableRowSelection?: boolean
}

const ITEM_HEIGHT = 96 // Estimated height of each card item

export const UTMTemplateCardListVirtual = ({
  data,
  rowCount,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  onEdit,
  onDelete,
  selectedRows,
  onSelectedRowsChange,
  enableRowSelection = true,
}: UTMTemplateCardListVirtualProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const lastFetchedIndexRef = useRef<number>(-1)

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelection = { ...selectedRows }
    if (checked) {
      newSelection[id] = true
    } else {
      delete newSelection[id]
    }
    onSelectedRowsChange(newSelection)
  }

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent !== 'jsdom'
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  })

  // Handle infinite scroll - only fetch when user scrolls to bottom and more data exists
  // NOTE: Don't know how it works, but it works :v
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems()
    const [lastItem] = [...virtualItems].reverse()

    if (!lastItem) return

    const scrollElement = parentRef.current
    if (!scrollElement) return

    // Check if content is actually scrollable and user has scrolled
    const isScrollable = scrollElement.scrollHeight > scrollElement.clientHeight
    const isNearBottom =
      scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100

    // Only trigger fetch when:
    // 1. Content is scrollable OR user has scrolled (not just initial render)
    // 2. Last visible item is at or near the end of current data
    // 3. User is near the bottom of the scroll container
    // 4. There are more pages to load (hasNextPage is true)
    // 5. We're not already fetching (isFetchingNextPage is false)
    // 6. We haven't already triggered a fetch at this data length
    // console.dir({'isScrollable': isScrollable, 'isNearBottom': isNearBottom, 'lastItem.index': lastItem.index, 'data.length': data.length, 'hasNextPage': hasNextPage, 'isFetchingNextPage': isFetchingNextPage, 'lastFetchedIndexRef.current': lastFetchedIndexRef.current})
    if (
      isScrollable &&
      isNearBottom &&
      lastItem.index >= data.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      lastFetchedIndexRef.current < data.length
    ) {
      lastFetchedIndexRef.current = data.length
      onFetchNextPage?.()
    }
  }, [data.length, hasNextPage, isFetchingNextPage, onFetchNextPage, virtualizer.getVirtualItems()])

  const virtualItems_render = virtualizer.getVirtualItems()

  if (isLoading && data.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (data.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No templates found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div ref={parentRef} className="w-full overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
        {virtualItems_render.map((virtualItem) => {
          const template = data[virtualItem.index]

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="pb-4"
            >
              {template && (
                <UTMTemplateCard
                  template={template}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isSelected={enableRowSelection && selectedRows[template.id]}
                  onSelectChange={(checked) => handleSelectRow(template.id, checked)}
                />
              )}
            </div>
          )
        })}
        </div>
      </div>

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      )}
    </div>
  )
}
