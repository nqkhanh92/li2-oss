'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarIcon } from 'lucide-react'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { UnifiedFilterPopover } from '@/features/analytics/components/filters/unified-filter-popover'
import { AppliedFiltersDisplay } from '@/features/analytics/components/filters/applied-filters-display'
import { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import dayjs from '@/shared/lib/dayjs'

import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetTouchPointDropdown } from '@/features/touch-points/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import {
  useGetConversionEventNames,
  useGetConversionUtmSources,
  useGetConversionChannels,
} from '../hooks/queries'

interface ConversionFiltersProps {
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
}

export function ConversionFilters({ filters, setFilter }: ConversionFiltersProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['common', 'conversions'])
  const isMobile = useIsMobile()

  // Fetch dropdown data
  const { data: tagDropdowns } = useGetTagDropdowns(org_id)
  const { data: touchPointDropdowns, isLoading: isLoadingTouchPoints } = useGetTouchPointDropdown(org_id)
  const { data: collectionsData, isLoading: isLoadingCollections } =
    useGetCollectionsDropdown(org_id)
  const accessibleCollections = collectionsData?.data || []
  const { data: eventNamesData } = useGetConversionEventNames(org_id)
  const eventNames = eventNamesData?.data || []
  const [utmSourceEnabled, setUtmSourceEnabled] = useState(false)
  const [channelEnabled, setChannelEnabled] = useState(false)

  const { data: utmSourcesData, isLoading: isLoadingUtmSources } = useGetConversionUtmSources(
    org_id,
    utmSourceEnabled
  )
  const availableUtmSources = utmSourcesData?.data || []
  const { data: channelsData, isLoading: isLoadingChannels } = useGetConversionChannels(
    org_id,
    channelEnabled
  )
  const availableChannels = channelsData?.data || []

  // Parse filters
  const createdAt = filters.created_at as unknown as { from: number; to: number }
  const dateRange: DateRange = {
    from: createdAt?.from ? new Date(createdAt.from) : undefined,
    to: createdAt?.to ? new Date(createdAt.to) : undefined,
  }

  const selectedTagIds = (filters.tag_ids as string[]) || []
  const selectedTpIds = (filters.touch_point_ids as string[]) || []
  const selectedSpaceIds = (filters.collection_ids as string[]) || []
  const selectedEventName = (filters.event_names as string[])?.[0] || 'all'
  const selectedUtmSources = (filters.utm_source_values as string[]) || []
  const selectedChannels = (filters.channel_values as string[]) || []

  // Filter touch points based on selected tags
  const touchPointOptions = React.useMemo(() => {
    if (selectedTagIds.length > 0) {
      return (
        touchPointDropdowns?.filter((tp) =>
          tp.tp_tag_links.some((tp_tag_link) => selectedTagIds.includes(tp_tag_link.tag_id))
        ) || []
      )
    }
    return touchPointDropdowns || []
  }, [selectedTagIds, touchPointDropdowns])

  // Update touch points when tag filter changes — skip while dropdown data is still loading
  // to avoid wiping URL-provided touch_point_ids before the list resolves
  useEffect(() => {
    if (isLoadingTouchPoints) return
    if (selectedTpIds.length > 0) {
      const needUpdate = selectedTpIds.some(
        (tp_id) => !touchPointOptions.map((tp) => tp.id).includes(tp_id)
      )
      if (needUpdate) {
        const newTpIds = selectedTpIds.filter((tp_id) =>
          touchPointOptions.map((tp) => tp.id).includes(tp_id)
        )
        setFilter('touch_point_ids', newTpIds)
      }
    }
  }, [touchPointOptions, selectedTpIds, isLoadingTouchPoints])

  // Handler functions
  const handleDateRangeChange = useCallback(
    (value: DateRange | undefined) => {
      if (value?.from && value?.to) {
        setFilter('created_at', {
          from: dayjs(value.from).valueOf(),
          to: dayjs(value.to).valueOf(),
        })
      }
    },
    [setFilter]
  )

  const handleTagChange = useCallback(
    (value: string[]) => {
      setFilter('tag_ids', value)
    },
    [setFilter]
  )

  const handleTouchPointChange = useCallback(
    (value: string[]) => {
      setFilter('touch_point_ids', value)
    },
    [setFilter]
  )

  const handleSpaceChange = useCallback(
    (value: string[]) => {
      setFilter('collection_ids', value)
    },
    [setFilter]
  )

  const handleEventNameChange = useCallback(
    (value: string) => {
      setFilter('event_names', value === 'all' ? [] : [value])
    },
    [setFilter]
  )

  const handleUtmSourceChange = useCallback(
    (value: string[]) => {
      setFilter('utm_source_values', value)
    },
    [setFilter]
  )

  const handleChannelChange = useCallback(
    (value: string[]) => {
      setFilter('channel_values', value)
    },
    [setFilter]
  )

  const eventNameSelect = (
    <Select value={selectedEventName} onValueChange={handleEventNameChange}>
      <SelectTrigger className="w-44 h-10 px-4 py-[10px] text-[14px] font-normal leading-[20px] bg-card border border-solid border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 [&>span]:truncate">
        <SelectValue placeholder={t('conversions:filters.eventName.all', 'All events')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('conversions:filters.eventName.all', 'All events')}</SelectItem>
        {eventNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  // Individual removal handlers
  const handleRemoveTag = useCallback(
    (tagId: string) => {
      handleTagChange(selectedTagIds.filter((id) => id !== tagId))
    },
    [selectedTagIds, handleTagChange]
  )

  const handleRemoveTouchPoint = useCallback(
    (tpId: string) => {
      handleTouchPointChange(selectedTpIds.filter((id) => id !== tpId))
    },
    [selectedTpIds, handleTouchPointChange]
  )

  const handleRemoveSpace = useCallback(
    (spaceId: string) => {
      handleSpaceChange(selectedSpaceIds.filter((id) => id !== spaceId))
    },
    [selectedSpaceIds, handleSpaceChange]
  )

  const handleRemoveUtmSource = useCallback(
    (value: string) => {
      handleUtmSourceChange(selectedUtmSources.filter((v) => v !== value))
    },
    [selectedUtmSources, handleUtmSourceChange]
  )

  const handleRemoveChannel = useCallback(
    (value: string) => {
      handleChannelChange(selectedChannels.filter((v) => v !== value))
    },
    [selectedChannels, handleChannelChange]
  )

  // Helper to get date range display text
  const getDateRangeText = () => {
    if (!dateRange?.from || !dateRange?.to) return null
    const from = dayjs(dateRange.from)
    const to = dayjs(dateRange.to)
    const days = to.diff(from, 'day')

    if (days === 7) return t('common:analytics.filters.last_7_days')
    if (days === 30) return t('common:analytics.filters.last_month')
    if (days === 365) return t('common:analytics.filters.last_year')
    return `${from.format('L')} - ${to.format('L')}`
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Filter Buttons Row */}
        <div className="flex gap-4 items-center w-full justify-between">
          {/* Unified Filter Button - Icon Only */}
          <div className="flex gap-4 items-center">
            <UnifiedFilterPopover
              tags={tagDropdowns || []}
              touchPoints={touchPointOptions || []}
              spaces={accessibleCollections}
              selectedTagIds={selectedTagIds}
              selectedTpIds={selectedTpIds}
              selectedSpaceIds={selectedSpaceIds}
              onTagChange={handleTagChange}
              onTouchPointChange={handleTouchPointChange}
              onSpaceChange={handleSpaceChange}
              isLoading={isLoadingCollections}
              utmSourceValues={selectedUtmSources}
              availableUtmSources={availableUtmSources}
              onUtmSourceChange={handleUtmSourceChange}
              isLoadingUtmValues={isLoadingUtmSources}
              channelValues={selectedChannels}
              availableChannels={availableChannels}
              onChannelChange={handleChannelChange}
              isLoadingChannelValues={isLoadingChannels}
              onOpen={() => {
                setUtmSourceEnabled(true)
                setChannelEnabled(true)
              }}
            />

            {/* Event Name Filter */}
            {eventNameSelect}

            {/* Date Range Filter - Icon Only */}
            <DateRangePicker
              value={dateRange}
              placeholder={t('common:filter.by_created_at')}
              onValueChange={handleDateRangeChange}
              disableFutureDate
              button={
                <Button
                  variant={'outline'}
                  className="bg-white w-[38px] h-[38px] text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground"
                  size={'icon'}
                >
                  <CalendarIcon className="w-[18px] h-[18px]" />
                </Button>
              }
              className="px-0"
            />
          </div>
        </div>

        {/* Applied Filters Display */}
        <AppliedFiltersDisplay
          tags={tagDropdowns || []}
          selectedTagIds={selectedTagIds}
          touchPoints={touchPointOptions || []}
          selectedTpIds={selectedTpIds}
          spaces={accessibleCollections}
          selectedSpaceIds={selectedSpaceIds}
          onRemoveTag={handleRemoveTag}
          onRemoveTouchPoint={handleRemoveTouchPoint}
          onRemoveSpace={handleRemoveSpace}
          selectedUtmSources={selectedUtmSources}
          onRemoveUtmSource={handleRemoveUtmSource}
          selectedChannels={selectedChannels}
          onRemoveChannel={handleRemoveChannel}
        />

        {/* Current Filters Display (Time Period) */}
        {dateRange?.from && dateRange?.to && (
          <div className="border-b border-white flex flex-wrap gap-6 items-start py-2 w-full">
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-sm font-medium text-foreground">{t('common:current_filters')}</p>
              <div className="flex gap-2 items-center">
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <p className="text-sm text-foreground">{t('common:time_period')}:</p>
                <div className="flex gap-0.5 items-center justify-center rounded-full">
                  <p className="text-sm text-slate-600">{getDateRangeText()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop view
  return (
    <div className="flex flex-col gap-4">
      {/* Filter Buttons Row */}
      <div className="flex items-center gap-4 justify-between">
        {/* Unified Filter Popover */}
        <div className="flex items-center gap-4">
          <UnifiedFilterPopover
            tags={tagDropdowns || []}
            touchPoints={touchPointOptions || []}
            spaces={accessibleCollections}
            selectedTagIds={selectedTagIds}
            selectedTpIds={selectedTpIds}
            selectedSpaceIds={selectedSpaceIds}
            onTagChange={handleTagChange}
            onTouchPointChange={handleTouchPointChange}
            onSpaceChange={handleSpaceChange}
            isLoading={isLoadingCollections}
            disabledInteractionType={true}
            utmSourceValues={selectedUtmSources}
            availableUtmSources={availableUtmSources}
            onUtmSourceChange={handleUtmSourceChange}
            isLoadingUtmValues={isLoadingUtmSources}
            channelValues={selectedChannels}
            availableChannels={availableChannels}
            onChannelChange={handleChannelChange}
            isLoadingChannelValues={isLoadingChannels}
            onOpen={() => {
              setUtmSourceEnabled(true)
              setChannelEnabled(true)
            }}
          />

          {/* Event Name Filter */}
          {eventNameSelect}

          {/* Date Range Filter */}
          <DateRangePicker
            value={dateRange}
            placeholder={t('common:filter_by_date')}
            onValueChange={handleDateRangeChange}
            disableFutureDate
            className="text-slate-600 border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground bg-white!"
          />
        </div>
      </div>

      {/* Applied Filters Display */}
      <AppliedFiltersDisplay
        tags={tagDropdowns || []}
        selectedTagIds={selectedTagIds}
        touchPoints={touchPointOptions || []}
        selectedTpIds={selectedTpIds}
        spaces={accessibleCollections}
        selectedSpaceIds={selectedSpaceIds}
        onRemoveTag={handleRemoveTag}
        onRemoveTouchPoint={handleRemoveTouchPoint}
        onRemoveSpace={handleRemoveSpace}
        selectedUtmSources={selectedUtmSources}
        onRemoveUtmSource={handleRemoveUtmSource}
        selectedChannels={selectedChannels}
        onRemoveChannel={handleRemoveChannel}
      />
    </div>
  )
}
