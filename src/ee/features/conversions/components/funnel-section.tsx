'use client'

import { useParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { ConversionFunnelChart } from './funnel-chart'
import { useGetFunnelData } from '../hooks/queries'
import { AllTouchPointVariants } from '@/features/touch-points/types'
type EventType = 'lead' | 'sale'
interface FunnelSectionProps {
  filters: {
    dateRange?: DateRange
    tagIds?: string[]
    tpIds?: string[]
    collectionIds?: string[]
    includeNullCollection?: boolean
    excludeBot?: boolean
    utmSourceValues?: string[]
    utmMediumValues?: string[]
    utmCampaignValues?: string[]
    interactionTypes?: AllTouchPointVariants[]
    userId?: string
    eventNames?: string[]
    utmSources?: string[]
    channels?: string[]
  }
  setSelectedEventType: (eventType: EventType | null) => void
  selectedEventType: EventType
}

export function FunnelSection({
  filters,
  setSelectedEventType,
  selectedEventType,
}: FunnelSectionProps) {
  const { org_id } = useParams<{ org_id: string }>()

  // Fetch funnel data with comprehensive filters
  const { data: funnelData, isLoading } = useGetFunnelData(org_id, {
    startDate: filters.dateRange?.from?.toISOString(),
    endDate: filters.dateRange?.to?.toISOString(),
    touchPointIds: filters.tpIds,
    tagIds: filters.tagIds,
    collectionIds: filters.collectionIds,
    excludeBot: filters.excludeBot,
    eventNames: filters.eventNames,
    utmSources: filters.utmSources,
    channels: filters.channels,
  })

  const setSelectedStage = (stage: string | null) => {
    if (stage === 'Leads') {
      setSelectedEventType('lead')
    } else if (stage === 'Sales') {
      setSelectedEventType('sale')
    } else {
      setSelectedEventType(null)
    }
  }

  return (
    <ConversionFunnelChart
      data={funnelData?.data?.stages || []}
      conversionRates={
        funnelData?.data?.conversionRates || {
          clicksToLeads: 0,
          leadsToSales: 0,
          overall: 0,
        }
      }
      selectedStage={
        selectedEventType === 'lead' ? 'Leads' : selectedEventType === 'sale' ? 'Sales' : null
      }
      setSelectedStage={setSelectedStage}
      isLoading={isLoading}
    />
  )
}
