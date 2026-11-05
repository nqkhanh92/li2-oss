import { DropdownMenu, DropdownMenuSubContent } from '@/shared/components/ui/dropdown-menu'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { ArrowRight, Filter, SparklesIcon } from 'lucide-react'
import { DropdownMenuContent } from '@/shared/components/ui/dropdown-menu'
import { DropdownMenuLabel } from '@/shared/components/ui/dropdown-menu'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select-v2'

export const CombinedFilter = () => {
  const {
    selectedTags,
    selectedTouchpoints,
    setSelectedTags,
    setSelectedTouchpoints,
    allowExtraAdvancedAnalytic: allowMultiFilter,
  } = useAdvancedAnalyticsProvider()
  const [open, setOpen] = useState(false)

  const [filter, setFilter] = useState<'tags' | 'touchpoints'>('tags')
  const { allTags, allTouchpoints } = useAdvancedAnalyticsProvider()

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

  const handleApply = useCallback(() => {
    if (allowMultiFilter) {
      setSelectedTags(selectingTags)
      setSelectedTouchpoints(selectingTouchpoints)
    } else {
      if (filter === 'tags') {
        setSelectingTouchpoints([])
        setSelectedTags(selectingTags)
      } else {
        setSelectingTags([])
        setSelectedTouchpoints(selectingTouchpoints)
      }
    }
    setOpen(false)
  }, [allowMultiFilter, filter, selectingTags, selectingTouchpoints])

  const handleCancel = useCallback(() => {
    setSelectingTags(selectedTags || [])
    setSelectingTouchpoints(selectedTouchpoints || [])
    setOpen(false)
  }, [selectedTags, selectedTouchpoints])

  return (
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
        <Button variant="outline" className="ml-auto" type="button" iconLeft={<Filter />}>
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[576px] z-10 overflow-visible">
        <div className="px-6 py-4 space-y-3">
          {allowMultiFilter ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-foreground text-[15px] font-semibold">Select tag</h2>
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
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-foreground text-[15px] font-semibold">Select touchpoint</h2>
                <FancyMultiSelect
                  placeholder="Select touchpoints"
                  allow_add={false}
                  value={selectingTouchpoints}
                  options={allTouchpoints?.map((touchpoint) => ({
                    label: touchpoint.name,
                    value: touchpoint.id,
                  }))}
                  onChange={(value) => setSelectingTouchpoints?.(value)}
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold">Choose filter type</h2>
              <RadioGroup
                className="flex gap-4 text-nowrap tracking-[-0.014px]"
                defaultValue="tags"
                value={filter}
                onValueChange={(value: 'tags' | 'touchpoints') => setFilter(value)}
              >
                {[
                  { value: 'tags', label: 'Filter by tag' },
                  { value: 'touchpoints', label: 'Filter by touchpoint' },
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
              {filter === 'tags' && (
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
                />
              )}
              {filter === 'touchpoints' && (
                <FancyMultiSelect
                  placeholder="Select touchpoints"
                  allow_add={false}
                  value={selectingTouchpoints}
                  options={allTouchpoints?.map((touchpoint) => ({
                    label: touchpoint.name,
                    value: touchpoint.id,
                  }))}
                  onChange={(value) => setSelectingTouchpoints?.(value)}
                />
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button size={'sm'} variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size={'sm'} onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
        {!allowMultiFilter && (
          <div className="px-6 space-y-2 py-3 border-t border-slate-300">
            <p className="text-xs text-slate-500">
              Unlock dual filters with Premium (Filter by Tag + Touchpoint name at the same time)
            </p>
            <Button
              size={'sm'}
              variant="secondary"
              type="button"
              iconLeft={<SparklesIcon />}
              iconRight={<ArrowRight />}
            >
              Upgrade now
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
