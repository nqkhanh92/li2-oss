'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Filter,
  Tags,
  Link2,
  Folder,
  ArrowLeft,
  GoalIcon,
  Megaphone,
  Share2,
  PointerIcon,
  ChevronDown,
  Loader2,
  Signal,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/lib/utils'
import { useIsMobile } from '@/shared/hooks/use-mobile'
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

interface Space {
  id: string
  name: string
  color?: string | null
}

interface UnifiedFilterPopoverProps {
  // Tags
  tags: Tag[]
  selectedTagIds: string[]
  onTagChange: (value: string[]) => void

  // Touch points
  touchPoints: TouchPoint[]
  selectedTpIds: string[]
  onTouchPointChange: (value: string[]) => void

  // Spaces
  spaces?: Space[]
  selectedSpaceIds?: string[]
  onSpaceChange?: (value: string[]) => void

  // UTM filters
  utmSourceValues?: string[]
  utmMediumValues?: string[]
  utmCampaignValues?: string[]
  onUtmSourceChange?: (values: string[]) => void
  onUtmMediumChange?: (values: string[]) => void
  onUtmCampaignChange?: (values: string[]) => void
  availableUtmSources?: string[]
  availableUtmMediums?: string[]
  availableUtmCampaigns?: string[]
  isLoadingUtmValues?: boolean

  // Channel filter
  channelValues?: string[]
  availableChannels?: string[]
  onChannelChange?: (values: string[]) => void
  isLoadingChannelValues?: boolean

  // Interaction type filters
  interactionTypeValues?: AllTouchPointVariants[]
  onInteractionTypeChange?: (values: AllTouchPointVariants[]) => void
  disabledInteractionType?: boolean

  // Loading state
  isLoading?: boolean

  // Callback fired once when the popover first opens
  onOpen?: () => void
}

type ViewState =
  | 'menu'
  | 'tags'
  | 'touchpoints'
  | 'spaces'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'interaction_type'
  | 'channel'

export const UnifiedFilterPopover: React.FC<UnifiedFilterPopoverProps> = ({
  tags,
  selectedTagIds,
  onTagChange,
  touchPoints,
  selectedTpIds,
  onTouchPointChange,
  spaces = [],
  selectedSpaceIds = [],
  onSpaceChange,
  utmSourceValues = [],
  utmMediumValues = [],
  utmCampaignValues = [],
  onUtmSourceChange,
  onUtmMediumChange,
  onUtmCampaignChange,
  availableUtmSources = [],
  availableUtmMediums = [],
  availableUtmCampaigns = [],
  isLoadingUtmValues = false,
  channelValues = [],
  availableChannels = [],
  onChannelChange,
  isLoadingChannelValues = false,
  interactionTypeValues = [],
  onInteractionTypeChange,
  disabledInteractionType = false,

  isLoading = false,
  onOpen,
}) => {
  const { t } = useTranslation(['common', 'analytic'])
  const isMobile = useIsMobile()

  // View state
  const [activeView, setActiveView] = useState<ViewState>('menu')
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Temporary selections (for Apply/Cancel pattern)
  const [tempSelections, setTempSelections] = useState({
    tags: selectedTagIds,
    touchpoints: selectedTpIds,
    spaces: selectedSpaceIds || [],
    utmSources: utmSourceValues,
    utmMediums: utmMediumValues,
    utmCampaigns: utmCampaignValues,
    channels: channelValues,
    interactionTypes: interactionTypeValues,
  })

  // Sync temp state with props when popover opens
  // Only sync when popover transitions from closed to open, not on every prop change
  const prevPopoverOpen = useRef(popoverOpen)
  useEffect(() => {
    if (popoverOpen && !prevPopoverOpen.current) {
      // Popover just opened, sync temp selections with current props
      setTempSelections({
        tags: selectedTagIds,
        touchpoints: selectedTpIds,
        spaces: selectedSpaceIds || [],
        utmSources: utmSourceValues,
        utmMediums: utmMediumValues,
        utmCampaigns: utmCampaignValues,
        channels: channelValues,
        interactionTypes: interactionTypeValues,
      })
      onOpen?.()
    }
    prevPopoverOpen.current = popoverOpen
  }, [
    popoverOpen,
    selectedTagIds,
    selectedTpIds,
    selectedSpaceIds,
    utmSourceValues,
    utmMediumValues,
    utmCampaignValues,
    interactionTypeValues,
  ])

  // Calculate available items based on ALL current selections
  const availableItems = useMemo(() => {
    const { tags: selectedTags, touchpoints: selectedTps, spaces: selectedSpaces } = tempSelections

    // Start with all items
    let availableTouchpoints = touchPoints
    let availableTags = tags
    let availableSpaces = spaces

    // Filter TouchPoints based on selected Spaces
    if (selectedSpaces && selectedSpaces.length > 0) {
      availableTouchpoints = availableTouchpoints?.filter(
        (tp) => tp.collection_id && selectedSpaces.includes(tp.collection_id)
      )
    }

    // Filter TouchPoints based on selected Tags
    if (selectedTags && selectedTags.length > 0) {
      availableTouchpoints = availableTouchpoints?.filter((tp) =>
        tp.tp_tag_links?.some((link) => selectedTags.includes(link.tag_id))
      )
    }

    // Filter Tags based on selected Spaces (via available TouchPoints)
    if (selectedSpaces && selectedSpaces.length > 0) {
      const touchpointsInSpaces = touchPoints?.filter(
        (tp) => tp.collection_id && selectedSpaces.includes(tp.collection_id)
      )
      const tagIdsInSpaces = new Set(
        touchpointsInSpaces?.flatMap((tp) => tp.tp_tag_links?.map((link) => link.tag_id) || [])
      )
      availableTags = availableTags?.filter((tag) => tagIdsInSpaces.has(tag.id))
    }

    // Filter Tags based on selected TouchPoints
    if (selectedTps && selectedTps.length > 0) {
      const selectedTouchpoints = touchPoints?.filter((tp) => selectedTps.includes(tp.id))
      const tagIdsInTouchpoints = new Set(
        selectedTouchpoints?.flatMap((tp) => tp.tp_tag_links?.map((link) => link.tag_id) || [])
      )
      availableTags = availableTags?.filter((tag) => tagIdsInTouchpoints.has(tag.id))
    }

    // Filter Spaces based on selected Tags or TouchPoints
    if (selectedTags && selectedTags.length > 0) {
      const touchpointsWithTags = touchPoints?.filter((tp) =>
        tp.tp_tag_links?.some((link) => selectedTags.includes(link.tag_id))
      )
      const spaceIdsWithTags = new Set(
        touchpointsWithTags
          ?.map((tp) => tp.collection_id)
          .filter((id): id is string => id !== null) || []
      )
      availableSpaces = availableSpaces?.filter((space) => spaceIdsWithTags.has(space.id))
    }

    if (selectedTps && selectedTps.length > 0) {
      const selectedTouchpoints = touchPoints?.filter((tp) => selectedTps.includes(tp.id))
      const spaceIdsWithTouchpoints = new Set(
        selectedTouchpoints
          ?.map((tp) => tp.collection_id)
          .filter((id): id is string => id !== null) || []
      )
      availableSpaces = availableSpaces?.filter((space) => spaceIdsWithTouchpoints.has(space.id))
    }

    return {
      touchpoints: availableTouchpoints,
      tags: availableTags,
      spaces: availableSpaces,
      utmSources: availableUtmSources,
      utmMediums: availableUtmMediums,
      utmCampaigns: availableUtmCampaigns,
      channels: availableChannels,
    }
  }, [
    tempSelections,
    touchPoints,
    tags,
    spaces,
    availableUtmSources,
    availableUtmMediums,
    availableUtmCampaigns,
    availableChannels,
  ])

  // Auto-remove incompatible selections when available items change
  useEffect(() => {
    setTempSelections((prev) => {
      const newSelections = {
        touchpoints: prev.touchpoints.filter((tpId) =>
          availableItems.touchpoints?.some((tp) => tp.id === tpId)
        ),
        tags: prev.tags.filter((tagId) => availableItems.tags?.some((tag) => tag.id === tagId)),
        spaces: prev.spaces.filter((spaceId) =>
          availableItems.spaces?.some((space) => space.id === spaceId)
        ),
        utmSources: prev.utmSources,
        utmMediums: prev.utmMediums,
        utmCampaigns: prev.utmCampaigns,
      }

      // Only update if something actually changed (prevent infinite loops)
      if (
        JSON.stringify(prev.touchpoints) !== JSON.stringify(newSelections.touchpoints) ||
        JSON.stringify(prev.tags) !== JSON.stringify(newSelections.tags) ||
        JSON.stringify(prev.spaces) !== JSON.stringify(newSelections.spaces)
      ) {
        return { ...prev, ...newSelections }
      }
      return prev
    })
  }, [availableItems])

  // Handle popover open/close
  const handleOpenChange = useCallback((open: boolean) => {
    setPopoverOpen(open)
    if (!open) {
      // Reset to menu view when closing
      setActiveView('menu')
    }
  }, [])

  // Handle Apply button
  const handleApply = useCallback(() => {
    onTagChange(tempSelections.tags)
    onTouchPointChange(tempSelections.touchpoints)
    if (onSpaceChange) {
      onSpaceChange(tempSelections.spaces)
    }
    if (onUtmSourceChange) {
      onUtmSourceChange(tempSelections.utmSources)
    }
    if (onUtmMediumChange) {
      onUtmMediumChange(tempSelections.utmMediums)
    }
    if (onUtmCampaignChange) {
      onUtmCampaignChange(tempSelections.utmCampaigns)
    }
    if (onChannelChange) {
      onChannelChange(tempSelections.channels)
    }
    if (onInteractionTypeChange) {
      onInteractionTypeChange(tempSelections.interactionTypes)
    }
    setPopoverOpen(false)
    setActiveView('menu')
  }, [
    tempSelections,
    onTagChange,
    onTouchPointChange,
    onSpaceChange,
    onUtmSourceChange,
    onUtmMediumChange,
    onUtmCampaignChange,
    onInteractionTypeChange,
  ])

  // Handle Cancel button
  const handleCancel = useCallback(() => {
    setTempSelections({
      tags: selectedTagIds,
      touchpoints: selectedTpIds,
      spaces: selectedSpaceIds || [],
      utmSources: utmSourceValues,
      utmMediums: utmMediumValues,
      utmCampaigns: utmCampaignValues,
      channels: channelValues,
      interactionTypes: interactionTypeValues,
    })
    setPopoverOpen(false)
    setActiveView('menu')
  }, [
    selectedTagIds,
    selectedTpIds,
    selectedSpaceIds,
    utmSourceValues,
    utmMediumValues,
    utmCampaignValues,
    channelValues,
    interactionTypeValues,
  ])

  // Handle back button
  const handleBack = useCallback(() => {
    setActiveView('menu')
  }, [])

  // Handle item toggle in selection view
  const handleItemToggle = useCallback((itemId: string, filterType: ViewState) => {
    setTempSelections((prev) => {
      let key: keyof typeof prev
      if (filterType === 'tags') key = 'tags'
      else if (filterType === 'touchpoints') key = 'touchpoints'
      else if (filterType === 'spaces') key = 'spaces'
      else if (filterType === 'utm_source') key = 'utmSources'
      else if (filterType === 'utm_medium') key = 'utmMediums'
      else if (filterType === 'utm_campaign') key = 'utmCampaigns'
      else if (filterType === 'interaction_type') key = 'interactionTypes'
      else if (filterType === 'channel') key = 'channels'
      else key = 'tags' // fallback

      const currentSelection = prev[key] as string[]
      const newSelection = currentSelection.includes(itemId)
        ? currentSelection.filter((id) => id !== itemId)
        : [...currentSelection, itemId]

      return {
        ...prev,
        [key]: newSelection,
      }
    })
  }, [])

  // Render menu view
  const renderMenuView = () => {
    const filterOptions = [
      {
        id: 'tags',
        icon: Tags,
        label: t('analytic:filter.tags', 'Tags'),
        count: tempSelections.tags.length,
        onClick: () => setActiveView('tags'),
      },
      {
        id: 'touchpoints',
        icon: Link2,
        label: t('analytic:filter.links', 'Links'),
        count: tempSelections.touchpoints.length,
        onClick: () => setActiveView('touchpoints'),
      },
    ]

    // Add spaces option if available
    if (spaces && spaces.length > 0) {
      filterOptions.push({
        id: 'spaces',
        icon: Folder,
        label: t('analytic:filter.spaces', 'Spaces'),
        count: tempSelections.spaces.length,
        onClick: () => setActiveView('spaces'),
      })
    }

    const isLazyMode = !!onOpen

    // Show UTM source always in lazy mode (onOpen provided), or when data is loaded
    if (isLazyMode || (availableUtmSources && availableUtmSources.length > 0)) {
      filterOptions.push({
        id: 'utm_source',
        icon: Share2,
        label: t('analytic:filter.utm_source', 'UTM Source'),
        count: tempSelections.utmSources.length,
        onClick: () => setActiveView('utm_source'),
      })
    }

    // Show Channel always in lazy mode, or when data is loaded
    if (isLazyMode || (availableChannels && availableChannels.length > 0)) {
      filterOptions.push({
        id: 'channel',
        icon: Signal,
        label: t('analytic:filter.channel', 'Channel'),
        count: tempSelections.channels.length,
        onClick: () => setActiveView('channel'),
      })
    }

    if (availableUtmMediums && availableUtmMediums.length > 0) {
      filterOptions.push({
        id: 'utm_medium',
        icon: Megaphone,
        label: t('analytic:filter.utm_medium', 'UTM Medium'),
        count: tempSelections.utmMediums.length,
        onClick: () => setActiveView('utm_medium'),
      })
    }

    if (availableUtmCampaigns && availableUtmCampaigns.length > 0) {
      filterOptions.push({
        id: 'utm_campaign',
        icon: GoalIcon,
        label: t('analytic:filter.utm_campaign', 'UTM Campaign'),
        count: tempSelections.utmCampaigns.length,
        onClick: () => setActiveView('utm_campaign'),
      })
    }

    // Add Interaction Type filter option
    if (!disabledInteractionType) {
      filterOptions.push({
        id: 'interaction_type',
        icon: PointerIcon,
        label: t('analytic:filter.interaction_type', 'Interaction Type'),
        count: tempSelections.interactionTypes.length,
        onClick: () => setActiveView('interaction_type'),
      })
    }
    return (
      <div className="flex flex-col">
        <div className="px-4 py-3 border-b">
          <h4 className="text-sm font-medium text-foreground">
            {t('analytic:filter.select_filter_type', 'Select filter type')}
          </h4>
        </div>
        <div className="flex flex-col py-2">
          {filterOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={option.onClick}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-foreground">{option.label}</span>
                </div>
                {option.count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                    {option.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render item selection view
  const renderItemSelectionView = () => {
    let items: any[] = []
    let title = ''
    let searchPlaceholder = ''
    let emptyMessage = ''
    let filterType: ViewState = 'tags'

    if (activeView === 'tags') {
      items = availableItems.tags || []
      title = t('analytic:filter.filter_by_tags', 'Filter by Tags')
      searchPlaceholder = t('analytic:filter.search_tags', 'Search tags...')
      emptyMessage = t('analytic:filter.no_tags_found', 'No tags found')
      filterType = 'tags'
    } else if (activeView === 'touchpoints') {
      items = availableItems.touchpoints || []
      title = t('analytic:filter.filter_by_links', 'Filter by Links')
      searchPlaceholder = t('analytic:filter.search_links', 'Search links...')
      emptyMessage = t('analytic:filter.no_links_found', 'No links found')
      filterType = 'touchpoints'
    } else if (activeView === 'spaces') {
      items = availableItems.spaces || []
      title = t('analytic:filter.filter_by_spaces', 'Filter by Spaces')
      searchPlaceholder = t('analytic:filter.search_spaces', 'Search spaces...')
      emptyMessage = t('analytic:filter.no_spaces_found', 'No spaces found')
      filterType = 'spaces'
    } else if (activeView === 'utm_source') {
      // Map string values to { id, name } format for UTM sources
      items = (availableItems.utmSources || []).map((value) => ({ id: value, name: value }))
      title = t('analytic:filter.filter_by_utm_source', 'Filter by UTM Source')
      searchPlaceholder = t('analytic:filter.search_utm_source', 'Search sources...')
      emptyMessage = t('analytic:filter.no_utm_source_found', 'No sources found')
      filterType = 'utm_source'
    } else if (activeView === 'utm_medium') {
      // Map string values to { id, name } format for UTM mediums
      items = (availableItems.utmMediums || []).map((value) => ({ id: value, name: value }))
      title = t('analytic:filter.filter_by_utm_medium', 'Filter by UTM Medium')
      searchPlaceholder = t('analytic:filter.search_utm_medium', 'Search mediums...')
      emptyMessage = t('analytic:filter.no_utm_medium_found', 'No mediums found')
      filterType = 'utm_medium'
    } else if (activeView === 'utm_campaign') {
      // Map string values to { id, name } format for UTM campaigns
      items = (availableItems.utmCampaigns || []).map((value) => ({ id: value, name: value }))
      title = t('analytic:filter.filter_by_utm_campaign', 'Filter by UTM Campaign')
      searchPlaceholder = t('analytic:filter.search_utm_campaign', 'Search campaigns...')
      emptyMessage = t('analytic:filter.no_utm_campaign_found', 'No campaigns found')
      filterType = 'utm_campaign'
    } else if (activeView === 'channel') {
      items = (availableItems.channels || []).map((value) => ({ id: value, name: value }))
      title = t('analytic:filter.filter_by_channel', 'Filter by Channel')
      searchPlaceholder = t('analytic:filter.search_channel', 'Search channels...')
      emptyMessage = t('analytic:filter.no_channel_found', 'No channels found')
      filterType = 'channel'
    } else if (activeView === 'interaction_type') {
      // Map interaction types to { id, name } format
      items = [
        { id: 'LINK', name: t('dashboard:interaction_channels.short_link', 'Short Link') },
        { id: 'QR', name: t('dashboard:interaction_channels.scan', 'QR Scan') },
        { id: 'NFC', name: t('dashboard:interaction_channels.tap', 'NFC Tap') },
      ]
      title = t('analytic:filter.filter_by_interaction_type', 'Filter by Interaction Type')
      searchPlaceholder = t(
        'analytic:filter.search_interaction_type',
        'Search interaction types...'
      )
      emptyMessage = t('analytic:filter.no_interaction_type_found', 'No interaction types found')
      filterType = 'interaction_type'
    }

    const selectedItems =
      filterType === 'tags'
        ? tempSelections.tags
        : filterType === 'touchpoints'
          ? tempSelections.touchpoints
          : filterType === 'spaces'
            ? tempSelections.spaces
            : filterType === 'utm_source'
              ? tempSelections.utmSources
              : filterType === 'utm_medium'
                ? tempSelections.utmMediums
                : filterType === 'utm_campaign'
                  ? tempSelections.utmCampaigns
                  : filterType === 'interaction_type'
                    ? tempSelections.interactionTypes
                    : filterType === 'channel'
                      ? tempSelections.channels
                      : []

    const selectedCount = selectedItems.length

    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-sm font-medium text-foreground flex-1">{title}</h4>
        </div>

        {/* Search and list */}
        <div className="flex-1 overflow-hidden">
          {(isLoadingUtmValues &&
            (activeView === 'utm_source' ||
              activeView === 'utm_medium' ||
              activeView === 'utm_campaign')) ||
          (isLoadingChannelValues && activeView === 'channel') ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Command>
              <div className="px-3 py-2">
                <CommandInput placeholder={searchPlaceholder} />
              </div>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </CommandEmpty>
              <CommandList className="max-h-[280px] overflow-y-auto px-2">
                <CommandGroup>
                  {items.map((item) => {
                    const isSelected = selectedItems.includes(item.id)
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={() => handleItemToggle(item.id, filterType)}
                        className="flex items-center gap-2 py-2.5 cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemToggle(item.id, filterType)}
                          className="pointer-events-none"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.color && (
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <span className="truncate text-sm">{item.name}</span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </div>

        {/* Selection count footer */}
        <div className="px-4 py-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {t('analytic:filter.items_selected', {
              count: selectedCount,
              defaultValue: `${selectedCount} items selected`,
            })}
          </p>
        </div>

        {/* Action buttons footer */}
        <div className="flex gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1">
            {t('common:buttons.cancel')}
          </Button>
          <Button size="sm" onClick={handleApply} className="flex-1">
            {t('common:buttons.apply')}
          </Button>
        </div>
      </div>
    )
  }

  // Determine if any filters are active
  const hasActiveFilters =
    selectedTagIds.length > 0 ||
    selectedTpIds.length > 0 ||
    (selectedSpaceIds && selectedSpaceIds.length > 0) ||
    utmSourceValues.length > 0 ||
    utmMediumValues.length > 0 ||
    utmCampaignValues.length > 0 ||
    channelValues.length > 0 ||
    interactionTypeValues.length > 0

  return (
    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {isMobile ? (
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-foreground',
              hasActiveFilters && 'text-foreground border-primary'
            )}
            disabled={isLoading}
          >
            <Filter className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            className={cn(
              'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground text-s! font-normal!',
              hasActiveFilters && 'text-foreground border-primary'
            )}
            iconLeft={<Filter />}
            iconRight={<ChevronDown />}
            disabled={isLoading}
          >
            {t('analytic:filter.filter_by', 'Filter by')}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-0',
          isMobile ? 'w-full' : activeView === 'menu' ? 'w-[320px]' : 'w-[400px]'
        )}
        align="start"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
        }}
      >
        {activeView === 'menu' ? renderMenuView() : renderItemSelectionView()}
      </PopoverContent>
    </Popover>
  )
}
