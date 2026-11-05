'use client'

import { InfiniteVirtualList } from '@/shared/components/ui/infinite-virtual-list'
import { RealtimeTouchpoint } from './columns'
import { useIsMobile } from '@/shared/hooks/use-mobile'

interface RealtimeInteractionsListProps {
  data: RealtimeTouchpoint[]
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onFetchNextPage?: () => void
  renderRow: (interaction: RealtimeTouchpoint, isMobile: boolean) => React.ReactNode
  className?: string
  containerClassName?: string
}

/**
 * Reusable component for rendering a virtualized list of realtime interactions
 *
 * This component handles:
 * - Virtualization for performance (only renders visible items)
 * - Responsive sizing (mobile vs desktop)
 * - Loading and empty states
 *
 * Note: This component receives data from parent (RealtimeGlobe) which is used
 * for both the globe visualization and the list. No separate data fetching needed.
 */
export const RealtimeInteractionsList = ({
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  renderRow,
  className,
  containerClassName,
}: RealtimeInteractionsListProps) => {
  const isMobile = useIsMobile()

  // Responsive estimate size based on screen width
  const getEstimateSize = () => {
    if (typeof window === 'undefined') return 70
    // Mobile: taller due to wrapped content (~135px)
    // Desktop: shorter single-row layout (~50px)
    return window.innerWidth < 768 ? 135 : 50
  }

  return (
    <div className={className}>
      <InfiniteVirtualList
        data={data}
        rowCount={data.length}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        onFetchNextPage={onFetchNextPage}
        renderItem={(interaction) => renderRow(interaction, isMobile)}
        getItemKey={(interaction) => interaction.id}
        estimateSize={getEstimateSize}
        height="100%"
        emptyText="No interactions found"
        loadingText="Loading interactions..."
        overscan={5}
        containerClassName={containerClassName}
        scrollThreshold={100}
      />
    </div>
  )
}