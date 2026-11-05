'use client'

import { useRef, ReactNode, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { ConversionFilters } from './conversion-filters'
import { ConversionStats } from './conversion-stats'
import { ConversionsList } from './conversions-list'
import { FunnelSection } from './funnel-section'
import { TouchpointAttributionWrapper } from './touchpoint-attribution-wrapper'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useFilters } from '@/shared/hooks/use-filters'
import dayjs from '@/shared/lib/dayjs'
import { useDemoMode } from '@/shared/hooks/use-demo-mode'
import { ConversionSource } from '@/core/types/conversions'

export enum ConversionSection {
  FILTERS = 'filters',
  STATS = 'stats',
  ATTRIBUTION = 'attribution',
  FUNNEL = 'funnel',
  LIST = 'list',
}

interface SectionConfig {
  key: ConversionSection
  component: ReactNode
}

export function ConversionsView() {
  const { org_id } = useParams<{ org_id: string }>()
  const { isDemoMode } = useDemoMode()
  // Use useFilters hook for shared filter state
  const { filters, setFilter } = useFilters({
    filters: {
      touch_point_ids: [],
      tag_ids: [],
      collection_ids: [],
      utm_source_values: [],
      utm_medium_values: [],
      utm_campaign_values: [],
      channel_values: [],
      interaction_types: [],
      event_names: [],
      created_at: {
        from: isDemoMode ? dayjs().subtract(1, 'year').valueOf() : dayjs().subtract(7, 'day').valueOf(),
        to: dayjs().valueOf(),
      },
    },
  })

  const createdAt = filters.created_at as unknown as { from: number; to: number }
  const dateRange: DateRange = {
    from: createdAt?.from ? new Date(createdAt.from) : undefined,
    to: createdAt?.to ? new Date(createdAt.to) : undefined,
  }

  const selectedTouchPointIds = (filters.touch_point_ids as string[]) || ['all']
  const selectedTouchPointId = selectedTouchPointIds[0] ?? 'all'

  // Section refs
  const sectionRefs = useRef<Record<ConversionSection, HTMLDivElement | null>>({
    [ConversionSection.FILTERS]: null,
    [ConversionSection.STATS]: null,
    [ConversionSection.ATTRIBUTION]: null,
    [ConversionSection.FUNNEL]: null,
    [ConversionSection.LIST]: null,
  })

  const scrollToSection = (section: ConversionSection) => {
    const element = sectionRefs.current[section]
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const sections: SectionConfig[] = [
    {
      key: ConversionSection.FILTERS,
      component: <ConversionFilters filters={filters} setFilter={setFilter} />,
    },
    {
      key: ConversionSection.STATS,
      component: (
        <ConversionStats
          orgId={org_id}
          filters={{
            dateRange,
            tagIds: (filters.tag_ids as string[]) || [],
            tpIds: (filters.touch_point_ids as string[]) || [],
            collectionIds: (filters.collection_ids as string[]) || [],
            excludeBot: true,
            source: filters.source as ConversionSource,
            eventNames: (filters.event_names as string[]) || [],
            utmSources: (filters.utm_source_values as string[]) || [],
            channels: (filters.channel_values as string[]) || [],
          }}
        />
      ),
    },
    {
      key: ConversionSection.ATTRIBUTION,
      component: selectedTouchPointIds.length !== 1 && (
        <TouchpointAttributionWrapper
          filters={{
            endDate: dateRange.to?.toISOString(),
            startDate: dateRange.from?.toISOString(),
            tagIds: filters.tag_ids as string[],
            touchPointIds: filters.touch_point_ids as string[],
            collectionIds: filters.collection_ids as string[],
            excludeBot: true,
            eventNames: (filters.event_names as string[]) || [],
            utmSources: (filters.utm_source_values as string[]) || [],
            channels: (filters.channel_values as string[]) || [],
          }}
        />
      ),
    },
    {
      key: ConversionSection.FUNNEL,
      component: (
        <FunnelSection
          filters={{
            dateRange,
            tagIds: (filters.tag_ids as string[]) || [],
            tpIds: (filters.touch_point_ids as string[]) || [],
            collectionIds: (filters.collection_ids as string[]) || [],
            excludeBot: true,
            eventNames: (filters.event_names as string[]) || [],
            utmSources: (filters.utm_source_values as string[]) || [],
            channels: (filters.channel_values as string[]) || [],
          }}
          setSelectedEventType={(eventType: 'lead' | 'sale' | null) => {
            setFilter('event_type', eventType)
          }}
          selectedEventType={filters.event_type as 'lead' | 'sale'}
        />
      ),
    },
    {
      key: ConversionSection.LIST,
      component: (
        <ConversionsList
          filters={filters}
          setFilter={setFilter}
          orgId={org_id}
          dateRange={dateRange}
          touchPointId={selectedTouchPointId}
          scrollToSection={scrollToSection}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {sections.map((section) => (
        <div
          key={section.key}
          ref={(el) => {
            sectionRefs.current[section.key] = el
          }}
        >
          {section.component}
        </div>
      ))}
    </div>
  )
}
