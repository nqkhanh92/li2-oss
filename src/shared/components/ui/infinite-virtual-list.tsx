'use client'

import { useVirtualizer, VirtualizerOptions } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export interface InfiniteVirtualListProps<T> {
  // Data
  data: T[]
  rowCount?: number

  // Loading states
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onFetchNextPage?: () => void

  // Rendering
  renderItem: (item: T, index: number) => ReactNode
  getItemKey: (item: T, index: number) => string | number
  estimateSize: number | (() => number)

  // Styling
  className?: string
  containerClassName?: string
  height?: string | number

  // Empty state
  emptyText?: string
  loadingText?: string

  // Virtualization options
  overscan?: number

  // Custom scroll trigger threshold (default: 100px from bottom)
  scrollThreshold?: number
}

/**
 * Reusable infinite scroll virtual list component
 *
 * @example
 * ```tsx
 * <InfiniteVirtualList
 *   data={templates}
 *   isLoading={isLoading}
 *   isFetchingNextPage={isFetchingNextPage}
 *   hasNextPage={hasNextPage}
 *   onFetchNextPage={fetchNextPage}
 *   renderItem={(template) => <TemplateCard template={template} />}
 *   getItemKey={(template) => template.id}
 *   estimateSize={128}
 *   height="600px"
 * />
 * ```
 */
export function InfiniteVirtualList<T>({
  data,
  rowCount,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  renderItem,
  getItemKey,
  estimateSize,
  className,
  containerClassName,
  height = '600px',
  emptyText = 'No items found',
  loadingText = 'Loading...',
  overscan = 10,
  scrollThreshold = 100,
}: InfiniteVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const lastFetchedIndexRef = useRef<number>(-1)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent !== 'jsdom'
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan,
  })

  // Handle infinite scroll - only fetch when user scrolls to bottom and more data exists
  useEffect(() => {
    const scrollElement = parentRef.current
    if (!scrollElement) return

    const checkAndFetchMore = () => {
      const virtualItems = virtualizer.getVirtualItems()
      const [lastItem] = [...virtualItems].reverse()

      if (!lastItem) return

      // Check if content is actually scrollable and user has scrolled
      const isScrollable = scrollElement.scrollHeight > scrollElement.clientHeight
      const isNearBottom =
        scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight <
        scrollThreshold

      // Debug logging
      // console.log('InfiniteVirtualList Scroll Debug:', {
      //   isScrollable,
      //   isNearBottom,
      //   scrollHeight: scrollElement.scrollHeight,
      //   clientHeight: scrollElement.clientHeight,
      //   scrollTop: scrollElement.scrollTop,
      //   distanceFromBottom:
      //     scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight,
      //   lastItemIndex: lastItem.index,
      //   dataLength: data.length,
      //   hasNextPage,
      //   isFetchingNextPage,
      //   lastFetchedIndex: lastFetchedIndexRef.current,
      // })

      // Only trigger fetch when:
      // 1. Content is scrollable AND user is near the bottom
      // 2. Last visible item is at or near the end of current data
      // 3. There are more pages to load (hasNextPage is true)
      // 4. We're not already fetching (isFetchingNextPage is false)
      // 5. We haven't already triggered a fetch at this data length
      if (
        isScrollable &&
        isNearBottom &&
        lastItem.index >= data.length - 1 &&
        hasNextPage &&
        !isFetchingNextPage &&
        lastFetchedIndexRef.current < data.length
      ) {
        console.log('🚀 Triggering fetchNextPage')
        lastFetchedIndexRef.current = data.length
        onFetchNextPage?.()
      }
    }

    // Check on mount and when dependencies change
    checkAndFetchMore()

    // Listen to scroll events
    scrollElement.addEventListener('scroll', checkAndFetchMore)
    return () => scrollElement.removeEventListener('scroll', checkAndFetchMore)
  }, [
    data.length,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
    scrollThreshold,
    virtualizer,
  ])

  const virtualItems = virtualizer.getVirtualItems()

  // Initial loading state
  if (isLoading && data.length === 0) {
    return (
      <div
        className={cn('flex justify-center items-center', containerClassName)}
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{loadingText}</span>
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0 && !isLoading) {
    return (
      <div
        className={cn('flex justify-center items-center', containerClassName)}
        style={{ height }}
      >
        <p className="text-slate-500">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', containerClassName)}>
      <div
        ref={parentRef}
        className={cn('w-full overflow-y-auto', className)}
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = data[virtualItem.index]
            if (!item) return null

            return (
              <div
                key={getItemKey(item, virtualItem.index)}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderItem(item, virtualItem.index)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        </div>
      )}
    </div>
  )
}