'use client'

import { useTranslation } from 'react-i18next'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { Button } from '@/shared/components/ui/button'
import { Monitor, Tablet, Smartphone, MousePointerClick, List, ExternalLink, Crosshair } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { DeviceType } from '../types'

type ViewMode = 'heatmap' | 'clickmap'

interface HeatmapControlsProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  deviceType: DeviceType | undefined
  onDeviceTypeChange: (type: DeviceType | undefined) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  pageUrl: string | null
  onOpenToolbar: (mode: 'heatmap' | 'tagger') => void
  toolbarLoading: boolean
  canCreateEvents?: boolean
}

export function HeatmapControls({
  dateRange,
  onDateRangeChange,
  deviceType,
  onDeviceTypeChange,
  viewMode,
  onViewModeChange,
  pageUrl,
  onOpenToolbar,
  toolbarLoading,
  canCreateEvents,
}: HeatmapControlsProps) {
  const { t } = useTranslation('heatmap')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date range picker */}
        <DateRangePicker
          placeholder={t('controls.selectDateRange')}
          value={dateRange}
          onValueChange={onDateRangeChange}
          disableFutureDate
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Device type filter */}
        <ToggleGroup
          className="flex gap-0 -space-x-px rounded-md border overflow-hidden shadow-xs shadow-black/5"
          type="single"
          variant="outline"
          value={deviceType ?? 'all'}
          onValueChange={(value) => {
            if (value) {
              onDeviceTypeChange(value === 'all' ? undefined : (value as DeviceType))
            }
          }}
        >
          <ToggleGroupItem
            value="all"
            className="rounded-none shadow-none border-none px-3"
          >
            {t('controls.all')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="desktop"
            className="rounded-none shadow-none border-none px-3"
          >
            <Monitor className="mr-1.5 h-4 w-4" />
            {t('controls.desktop')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tablet"
            className="rounded-none shadow-none border-none px-3"
          >
            <Tablet className="mr-1.5 h-4 w-4" />
            {t('controls.tablet')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="mobile"
            className="rounded-none shadow-none border-none px-3"
          >
            <Smartphone className="mr-1.5 h-4 w-4" />
            {t('controls.mobile')}
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <ToggleGroup
            className="flex gap-0 -space-x-px rounded-md border overflow-hidden shadow-xs shadow-black/5"
            type="single"
            variant="outline"
            value={viewMode}
            onValueChange={(value) => {
              if (value) onViewModeChange(value as ViewMode)
            }}
          >
            <ToggleGroupItem
              value="heatmap"
              className="rounded-none shadow-none border-none px-3"
            >
              <MousePointerClick className="mr-1.5 h-4 w-4" />
              {t('controls.heatmap')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="clickmap"
              className="rounded-none shadow-none border-none px-3"
            >
              <List className="mr-1.5 h-4 w-4" />
              {t('controls.clickmap')}
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Toolbar buttons — opens customer site with session token */}
          {pageUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={toolbarLoading}
                onClick={() => onOpenToolbar('heatmap')}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                {t('controls.viewOnSite')}
              </Button>

              {canCreateEvents && (
                <Button
                  variant="default"
                  size="sm"
                  disabled={toolbarLoading}
                  onClick={() => onOpenToolbar('tagger')}
                >
                  <Crosshair className="h-4 w-4 mr-1.5" />
                  {t('controls.tagEventsOnSite')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
