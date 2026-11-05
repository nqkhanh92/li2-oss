import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Separator } from '@/shared/components/ui/separator'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import {
  ArrowRight,
  CalendarFoldIcon,
  ChevronDownIcon,
  Crown,
  FileDown,
  SparklesIcon,
  Tags,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MasterResetBtn } from './master-reset-btn'
import { toPng } from 'html-to-image'
import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select-v2'
import { SpaceFilter } from '@/features/analytics/components/filters/space-filter'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { useParams } from 'next/navigation'

export const FilterAdvancedAnalyticNewUI = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const {
    allowExtraAdvancedAnalytic,
    timePeriods,
    filterBy,
    setFilterBy,
    timePeriod,
    setTimePeriod,
    selectedTags,
    selectedTouchpoints,
    setSelectedTags,
    setSelectedTouchpoints,
    allTags,
    allTouchpoints,
    spaceId,
    selectedSpaceIds,
    setSelectedSpaceIds,
  } = useAdvancedAnalyticsProvider()

  // Fetch collections for space filter (only if not in space-specific analytics)
  const { data: collectionsData, isLoading: isLoadingCollections } = useGetCollectionsDropdown(
    org_id,
    { enabled: !spaceId }
  )
  const collections = collectionsData?.data || []
  const showSpaceFilter = !spaceId && collections.length > 0

  const [open, setOpen] = useState(false)
  const [selectingTags, setSelectingTags] = useState<string[]>([])
  const [selectingTouchpoints, setSelectingTouchpoints] = useState<string[]>([])
  const availableTouchpoints = useMemo(() => {
    if (selectingTags?.length === 0 || selectingTags?.length === undefined) {
      return allTouchpoints
    }
    return allTouchpoints?.filter((touchpoint: any) =>
      touchpoint.tp_tag_links?.some(
        (tag: any) => Array.isArray(selectingTags) && selectingTags?.includes(tag.tag_id)
      )
    )
  }, [selectingTags, allTouchpoints])

  useEffect(() => {
    setSelectingTouchpoints((pre) =>
      pre.filter((tpId) => availableTouchpoints?.some((tp) => tp.id === tpId))
    )
  }, [availableTouchpoints])

  const getFilterSummary = () => {
    if (
      (selectedTags.length < 1 && selectedTouchpoints?.length === 0) ||
      selectedTouchpoints?.length === undefined
    ) {
      return `• Time Period: Last ${timePeriod} days • Links: All`
    }

    const tagNames = Array.isArray(selectedTags)
      ? selectedTags
          .map((tagId: string) => allTags?.find((tag: any) => tag.id === tagId)?.name)
          .filter(Boolean)
      : []

    const tagText = tagNames?.length > 0 ? ` from '${tagNames.join(', ')}' tags` : ''
    return `• Time Period: Last ${timePeriod} days • Link name: ${selectedTouchpoints
      ?.map((tpId) => allTouchpoints?.find((tp) => tp.id === tpId)?.name)
      ?.join(', ')}
      ${tagText}
      `
  }

  const handleApply = useCallback(() => {
    if (allowExtraAdvancedAnalytic) {
      setSelectedTags(selectingTags)
      setSelectedTouchpoints(selectingTouchpoints)
    } else {
      if (filterBy === 'tags') {
        setSelectedTouchpoints([])
        setSelectedTags(selectingTags)
      } else {
        setSelectedTouchpoints(selectingTouchpoints)
        setSelectedTags([])
      }
    }
    setOpen(false)
  }, [allowExtraAdvancedAnalytic, filterBy, selectingTags, selectingTouchpoints])

  const handleCancel = useCallback(() => {
    setSelectedTags(selectedTags || [])
    setSelectedTouchpoints(selectedTouchpoints || [])
    setOpen(false)
  }, [selectedTags, selectedTouchpoints])

  if (!allowExtraAdvancedAnalytic) {
    return (
      <div className="flex flex-col gap-2">
        {/* Premium Tier - Hierarchical Filters */}
        <div className="flex flex-row justify-between w-full">
          <div className="flex flex-row items-center gap-4 w-full">
            {/* Step 1: Filter by Tags */}
            <DropdownMenu
              open={open}
              onOpenChange={(_open) => {
                setOpen(_open)
                if (!_open) {
                  handleCancel()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-[8px] bg-transparent text-slate-400 font-normal hover:border-slate-400`}
                  iconLeft={<Tags />}
                >
                  Tags/Links
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="bottom"
                className="flex px-6 py-3 rounded-[6px] bg-card shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] overflow-visible max-w-[550px] w-[550px]"
              >
                <div className="flex flex-col gap-3 w-full">
                  <RadioGroup
                    className="flex gap-4 text-nowrap tracking-[-0.014px]"
                    defaultValue="tags"
                    value={filterBy}
                    onValueChange={(value: 'tags' | 'touchpoints') => setFilterBy?.(value)}
                  >
                    {[
                      { value: 'tags', label: 'Filter by tag' },
                      { value: 'touchpoints', label: 'Filter by link' },
                    ].map((item) => (
                      <div
                        key={item.value}
                        className="flex items-center gap-2 has-[button[data-state=checked]]:text-slate-700 has-[button[data-state=checked]]:font-medium text-sm text-slate-500"
                      >
                        <RadioGroupItem value={item.value} id={`r-${item.value}`} />
                        <label htmlFor={`r-${item.value}`}>{item.label}</label>
                      </div>
                    ))}
                  </RadioGroup>
                  {filterBy === 'tags' && (
                    <FancyMultiSelect
                      placeholder="Select tags"
                      allow_add={false}
                      value={selectedTags}
                      options={
                        allTags?.map((tag) => ({
                          value: tag.id,
                          label: tag.name,
                          color: tag.color,
                        })) || []
                      }
                      onChange={(value) => setSelectingTags?.(value)}
                      className="bg-card rounded-[8px] border border-slate-200 text-slate-600"
                      resultClassName="max-h-[400px] overflow-y-visible"
                    />
                  )}
                  {filterBy === 'touchpoints' && (
                    <FancyMultiSelect
                      placeholder="Choose links to filter"
                      allow_add={false}
                      value={selectedTouchpoints}
                      options={
                        availableTouchpoints?.map((touchpoint) => ({
                          label: touchpoint.name,
                          value: touchpoint.id,
                        })) || []
                      }
                      onChange={(value) => setSelectingTouchpoints?.(value)}
                      className="bg-card rounded-[8px] border border-slate-200 text-slate-600"
                      resultClassName="max-h-[400px] overflow-y-visible"
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button size={'sm'} variant="secondary" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button size={'sm'} onClick={handleApply}>
                      Apply
                    </Button>
                  </div>
                  {!allowExtraAdvancedAnalytic && (
                    <>
                      <Separator />
                      <div className="flex gap-2 flex-col">
                        <span className="text-slate-500 text-xs font-normal">
                          Unlock 3 more metrics with Premium
                        </span>
                        <Button
                          variant="outline"
                          type="button"
                          iconLeft={<SparklesIcon />}
                          iconRight={<ArrowRight />}
                          className="w-fit"
                          onClick={() => toast.info('To do later')}
                        >
                          Upgrade now
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<CalendarFoldIcon />}
                  iconRight={<ChevronDownIcon />}
                  className="bg-transparent text-slate-400 font-normal hover:border-slate-400"
                >
                  {timePeriods?.find((period) => period.value === timePeriod)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="border-none rounded-[6px] shadow-[0_4px_8px_0_rgba(5,27,68,0.08)]"
                align="start"
              >
                <>
                  {timePeriods?.map((period) => {
                    const isSelectable = !period.premium || allowExtraAdvancedAnalytic
                    return (
                      <DropdownMenuItem
                        key={period.value}
                        onClick={() => setTimePeriod?.(period.value)}
                        disabled={!isSelectable}
                      >
                        <DropdownMenuLabel className="font-normal flex items-center gap-2">
                          {period.label}
                          {period.premium && (
                            <Crown className="w-3 h-3 inline ml-1 fill-neutral-900 stroke-neutral-900" />
                          )}
                        </DropdownMenuLabel>
                      </DropdownMenuItem>
                    )
                  })}
                  {!allowExtraAdvancedAnalytic && (
                    <>
                      <Separator />
                      <div className="flex gap-2 flex-col px-4 py-3">
                        <span className="text-slate-500 text-xs font-normal">
                          Unlock 3 more metrics with Premium
                        </span>
                        <Button
                          variant="outline"
                          type="button"
                          iconLeft={<SparklesIcon />}
                          iconRight={<ArrowRight />}
                          onClick={() => toast.info('To do later')}
                        >
                          Upgrade now
                        </Button>
                      </div>
                    </>
                  )}
                </>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* <Button
            variant="outline"
            onClick={handleExportPNG}
            size="sm"
            className={`gap-2 px-4 py-[10px] rounded-[8px] h-9 hover:border-primary border-slate-200 text-slate-400 hover:text-primary duration-200 font-normal bg-transparent`}
          >
            <FileDown className="w-4 h-4" />
            Export PNG
          </Button> */}
        </div>

        {/* NEW: Space Filter */}
        {/* Note: Disabled for now */}
        {/* {showSpaceFilter && (
          <div className="mt-4">
            <SpaceFilter
              spaces={collections}
              selectedSpaceIds={selectedSpaceIds || []}
              onSpaceChange={(spaceIds) => setSelectedSpaceIds?.(spaceIds)}
              isLoading={isLoadingCollections}
            />
          </div>
        )} */}

        {/* Filter Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-medium">Current filters:</span> {getFilterSummary?.() || ''}
          </div>
          {allowExtraAdvancedAnalytic &&
            (selectedTags?.length || selectedTouchpoints?.length || timePeriod !== 7) && (
              <MasterResetBtn />
            )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Premium Tier - Hierarchical Filters */}
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-row items-center gap-4 w-full">
          {/* Step 1: Filter by Tags */}
          <DropdownMenu
            open={open}
            onOpenChange={(_open) => {
              setOpen(_open)
              if (!_open) {
                handleCancel()
              }
            }}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Tags />}
                className="bg-transparent text-slate-400 font-normal hover:border-slate-400 "
              >
                Tags/Links
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              className="flex px-6 py-3 rounded-[6px] bg-card shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] overflow-visible max-w-[550px] w-[550px]"
              onPointerDownOutside={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('[data-radix-popper-content-wrapper]')) {
                  e.preventDefault()
                }
              }}
            >
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2">
                  <h2 className="text-foreground text-[15px] font-medium">Select tags</h2>
                  <FancyMultiSelect
                    placeholder="Select tags"
                    allow_add={false}
                    value={selectingTags}
                    options={allTags?.map((tag) => ({
                      label: tag.name,
                      value: tag.id,
                      color: tag.color,
                    }))}
                    onChange={(value) => setSelectingTags?.(value)}
                    className="bg-background rounded-[8px] border border-slate-200 text-slate-600"
                    resultClassName="max-h-[400px] overflow-y-visible"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-foreground text-[15px] font-medium">Select links</h2>
                  <FancyMultiSelect
                    placeholder="Select one or many links to filter"
                    allow_add={false}
                    value={selectingTouchpoints}
                    options={availableTouchpoints?.map((tp) => ({
                      label: tp.name,
                      value: tp.id,
                      extra:
                        tp.tp_tag_links?.map((tag) => ({
                          value: tag.tags.id,
                          label: tag.tags.name,
                          color: tag.tags.color,
                        })) || [],
                    }))}
                    onChange={(value) => setSelectingTouchpoints?.(value)}
                    className="bg-background rounded-[8px] border border-slate-200 text-slate-600"
                    isAdvancedAnalytics={true}
                    resultClassName="max-h-[400px] overflow-y-visible"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size={'sm'} variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size={'sm'} onClick={handleApply}>
                    Apply
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<CalendarFoldIcon />}
                iconRight={<ChevronDownIcon />}
                className="bg-transparent text-slate-400 font-normal hover:border-slate-400"
              >
                {timePeriods?.find((period) => period.value === timePeriod)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="border-none rounded-[6px] shadow-[0_4px_8px_0_rgba(5,27,68,0.08)]"
              align="start"
            >
              <>
                {timePeriods?.map((period) => {
                  const isSelectable = !period.premium || allowExtraAdvancedAnalytic
                  return (
                    <DropdownMenuItem
                      key={period.value}
                      onClick={() => setTimePeriod?.(period.value)}
                      disabled={!isSelectable}
                    >
                      <DropdownMenuLabel className="font-normal flex items-center gap-2">
                        {period.label}
                        {period.premium && (
                          <Crown className="w-3 h-3 inline ml-1 fill-neutral-900 stroke-neutral-900" />
                        )}
                      </DropdownMenuLabel>
                    </DropdownMenuItem>
                  )
                })}
                {!allowExtraAdvancedAnalytic && (
                  <>
                    <Separator />
                    <div className="flex gap-2 flex-col px-4 py-3">
                      <span className="text-slate-500 text-xs font-normal">
                        Unlock 3 more metrics with Premium
                      </span>
                      <Button
                        variant="outline"
                        type="button"
                        iconLeft={<SparklesIcon />}
                        iconRight={<ArrowRight />}
                        onClick={() => toast.info('To do later')}
                      >
                        Upgrade now
                      </Button>
                    </div>
                  </>
                )}
              </>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* <Button
          variant="outline"
          onClick={handleExportPNG}
          size="sm"
          className={`gap-2 px-4 py-[10px] rounded-[8px] h-9 hover:border-primary border-slate-200 text-slate-400 hover:text-primary duration-200 font-normal bg-transparent`}
        >
          <FileDown className="w-4 h-4" />
          Export PNG
        </Button> */}
      </div>

      {/* NEW: Space Filter */}
      {/* Note: Disabled for now */}
      {/* {showSpaceFilter && (
        <div className="mt-4">
          <SpaceFilter
            spaces={collections}
            selectedSpaceIds={selectedSpaceIds || []}
            onSpaceChange={(spaceIds) => setSelectedSpaceIds?.(spaceIds)}
            isLoading={isLoadingCollections}
          />
        </div>
      )} */}

      {/* Filter Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-medium">Current filters:</span> {getFilterSummary?.() || ''}
        </div>
        {allowExtraAdvancedAnalytic &&
          (selectedTags?.length || selectedTouchpoints?.length || timePeriod !== 7) && (
            <MasterResetBtn />
          )}
      </div>
    </div>
  )
}
