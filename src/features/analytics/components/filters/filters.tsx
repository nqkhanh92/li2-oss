'use client'

import { CalendarIcon } from 'lucide-react'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { BotFilterToggle } from './bot-filter-toggle'
import { UnifiedFilterPopover } from './unified-filter-popover'
import { AppliedFiltersDisplay } from './applied-filters-display'
import { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { Button } from '@/shared/components/ui/button'
import dayjs from '@/shared/lib/dayjs'
import { AllTouchPointVariants } from '@/features/touch-points/types'

interface Tag {
  id: string
  name: string
  color: string
  tp_tag_links?: Array<{ tag_id: string }>
}

interface TouchPoint {
  id: string
  name: string
  collection_id: string | null
  tp_tag_links?: Array<{
    tag_id: string
    tags: {
      id: string
      name: string
      color: string
    }
  }>
}

interface AnalyticFiltersProps {
  // Tag filter props
  tags: Tag[]
  selectedTagIds: string[]
  onTagChange: (value: string[]) => void

  // Touch point filter props
  touchPoints: TouchPoint[]
  selectedTpIds: string[]
  onTouchPointChange: (value: string[]) => void

  // Date range filter props
  dateRange: DateRange | undefined
  onDateRangeChange: (value: DateRange | undefined) => void

  // Bot filter props
  excludeBot: boolean
  onExcludeBotChange: (value: boolean) => void

  // Space filter props (optional)
  spaces?: Array<{ id: string; name: string; color?: string | null }>
  selectedSpaceIds?: string[]
  onSpaceChange?: (spaceIds: string[]) => void

  // UTM filter props
  selectedUtmSources?: string[]
  selectedUtmMediums?: string[]
  selectedUtmCampaigns?: string[]
  onUtmSourceChange?: (values: string[]) => void
  onUtmMediumChange?: (values: string[]) => void
  onUtmCampaignChange?: (values: string[]) => void
  availableUtmSources?: string[]
  availableUtmMediums?: string[]
  availableUtmCampaigns?: string[]
  isLoadingUtmValues?: boolean

  // Interaction type filter props
  selectedInteractionTypes?: AllTouchPointVariants[]
  onInteractionTypeChange?: (values: AllTouchPointVariants[]) => void
  // Hide the interaction-type section entirely (e.g. deep-link analytics, whose
  // RPC has no interaction_type dimension — the control would be dead).
  disabledInteractionType?: boolean
  // Hide the exclude-bots toggle entirely (e.g. deep-link analytics, which forces bot
  // exclusion server-side — App Opens have no bot vector, Clicks must be bot-free).
  disabledExcludeBot?: boolean

  // Loading state
  isLoading?: boolean
}

export const AnalyticFilters: React.FC<AnalyticFiltersProps> = ({
  tags,
  selectedTagIds,
  onTagChange,
  touchPoints,
  selectedTpIds,
  onTouchPointChange,
  dateRange,
  onDateRangeChange,
  excludeBot,
  onExcludeBotChange,
  spaces,
  selectedSpaceIds,
  onSpaceChange,
  selectedUtmSources = [],
  selectedUtmMediums = [],
  selectedUtmCampaigns = [],
  onUtmSourceChange,
  onUtmMediumChange,
  onUtmCampaignChange,
  availableUtmSources = [],
  availableUtmMediums = [],
  availableUtmCampaigns = [],
  isLoadingUtmValues = false,
  selectedInteractionTypes = [],
  onInteractionTypeChange,
  disabledInteractionType = false,
  disabledExcludeBot = false,
  isLoading = false,
}) => {
  const { t } = useTranslation(['common', 'analytic'])
  const isMobile = useIsMobile()

  // Individual removal handlers
  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onTagChange(selectedTagIds.filter((id) => id !== tagId))
    },
    [selectedTagIds, onTagChange]
  )

  const handleRemoveTouchPoint = useCallback(
    (tpId: string) => {
      onTouchPointChange(selectedTpIds.filter((id) => id !== tpId))
    },
    [selectedTpIds, onTouchPointChange]
  )

  const handleRemoveSpace = useCallback(
    (spaceId: string) => {
      if (onSpaceChange) {
        onSpaceChange(selectedSpaceIds?.filter((id) => id !== spaceId) || [])
      }
    },
    [selectedSpaceIds, onSpaceChange]
  )

  const handleRemoveUtmSource = useCallback(
    (value: string) => {
      if (onUtmSourceChange) {
        onUtmSourceChange(selectedUtmSources.filter((v) => v !== value))
      }
    },
    [selectedUtmSources, onUtmSourceChange]
  )

  const handleRemoveUtmMedium = useCallback(
    (value: string) => {
      if (onUtmMediumChange) {
        onUtmMediumChange(selectedUtmMediums.filter((v) => v !== value))
      }
    },
    [selectedUtmMediums, onUtmMediumChange]
  )

  const handleRemoveUtmCampaign = useCallback(
    (value: string) => {
      if (onUtmCampaignChange) {
        onUtmCampaignChange(selectedUtmCampaigns.filter((v) => v !== value))
      }
    },
    [selectedUtmCampaigns, onUtmCampaignChange]
  )

  const handleRemoveInteractionType = useCallback(
    (value: string) => {
      if (onInteractionTypeChange) {
        onInteractionTypeChange(selectedInteractionTypes.filter((v) => v !== value))
      }
    },
    [selectedInteractionTypes, onInteractionTypeChange]
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
              tags={tags}
              touchPoints={touchPoints}
              spaces={spaces}
              selectedTagIds={selectedTagIds}
              selectedTpIds={selectedTpIds}
              selectedSpaceIds={selectedSpaceIds}
              onTagChange={onTagChange}
              onTouchPointChange={onTouchPointChange}
              onSpaceChange={onSpaceChange}
              utmSourceValues={selectedUtmSources}
              utmMediumValues={selectedUtmMediums}
              utmCampaignValues={selectedUtmCampaigns}
              onUtmSourceChange={onUtmSourceChange}
              onUtmMediumChange={onUtmMediumChange}
              onUtmCampaignChange={onUtmCampaignChange}
              availableUtmSources={availableUtmSources}
              availableUtmMediums={availableUtmMediums}
              availableUtmCampaigns={availableUtmCampaigns}
              isLoadingUtmValues={isLoadingUtmValues}
              interactionTypeValues={selectedInteractionTypes}
              onInteractionTypeChange={onInteractionTypeChange}
              disabledInteractionType={disabledInteractionType}
              isLoading={isLoading}
            />

            {/* Date Range Filter - Icon Only */}
            <DateRangePicker
              value={dateRange}
              placeholder={t('filter_by_date')}
              onValueChange={onDateRangeChange}
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
          {/* Bot Filter Toggle */}
          {!disabledExcludeBot && (
            <div className="min-w-0">
              <BotFilterToggle
                value={excludeBot}
                onChange={onExcludeBotChange}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Applied Filters Display */}
        <AppliedFiltersDisplay
          tags={tags}
          selectedTagIds={selectedTagIds}
          touchPoints={touchPoints}
          selectedTpIds={selectedTpIds}
          spaces={spaces}
          selectedSpaceIds={selectedSpaceIds}
          onRemoveTag={handleRemoveTag}
          onRemoveTouchPoint={handleRemoveTouchPoint}
          onRemoveSpace={handleRemoveSpace}
          selectedInteractionTypes={selectedInteractionTypes}
          onRemoveInteractionType={handleRemoveInteractionType}
        />

        {/* Current Filters Display (Time Period - keeping for compatibility) */}
        {dateRange?.from && dateRange?.to && (
          <div className="border-b border-white flex flex-wrap gap-6 items-start py-2 w-full">
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-sm font-medium text-foreground">{t('analytic:current_filters')}</p>
              <div className="flex gap-2 items-center">
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <p className="text-sm text-foreground">{t('analytic:time_period')}:</p>
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
            tags={tags}
            touchPoints={touchPoints}
            spaces={spaces}
            selectedTagIds={selectedTagIds}
            selectedTpIds={selectedTpIds}
            selectedSpaceIds={selectedSpaceIds}
            onTagChange={onTagChange}
            onTouchPointChange={onTouchPointChange}
            onSpaceChange={onSpaceChange}
            utmSourceValues={selectedUtmSources}
            utmMediumValues={selectedUtmMediums}
            utmCampaignValues={selectedUtmCampaigns}
            onUtmSourceChange={onUtmSourceChange}
            onUtmMediumChange={onUtmMediumChange}
            onUtmCampaignChange={onUtmCampaignChange}
            availableUtmSources={availableUtmSources}
            availableUtmMediums={availableUtmMediums}
            availableUtmCampaigns={availableUtmCampaigns}
            isLoadingUtmValues={isLoadingUtmValues}
            interactionTypeValues={selectedInteractionTypes}
            onInteractionTypeChange={onInteractionTypeChange}
            isLoading={isLoading}
          />

          {/* Date Range Filter */}
          <DateRangePicker
            value={dateRange}
            placeholder={t('filter_by_date')}
            onValueChange={onDateRangeChange}
            disableFutureDate
            className="text-slate-600 border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground bg-white!"
          />
        </div>

        {/* Bot Filter Toggle */}
        {!disabledExcludeBot && (
          <BotFilterToggle value={excludeBot} onChange={onExcludeBotChange} disabled={isLoading} />
        )}
      </div>

      {/* Applied Filters Display */}
      <AppliedFiltersDisplay
        tags={tags}
        selectedTagIds={selectedTagIds}
        touchPoints={touchPoints}
        selectedTpIds={selectedTpIds}
        spaces={spaces}
        selectedSpaceIds={selectedSpaceIds}
        selectedUtmSources={selectedUtmSources}
        selectedUtmMediums={selectedUtmMediums}
        selectedUtmCampaigns={selectedUtmCampaigns}
        onRemoveTag={handleRemoveTag}
        onRemoveTouchPoint={handleRemoveTouchPoint}
        onRemoveSpace={handleRemoveSpace}
        onRemoveUtmSource={handleRemoveUtmSource}
        onRemoveUtmMedium={handleRemoveUtmMedium}
        onRemoveUtmCampaign={handleRemoveUtmCampaign}
        selectedInteractionTypes={selectedInteractionTypes}
        onRemoveInteractionType={handleRemoveInteractionType}
      />
    </div>
  )
}
