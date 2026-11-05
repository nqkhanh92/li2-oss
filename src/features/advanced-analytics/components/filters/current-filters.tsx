import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { X } from 'lucide-react'

export const CurrentFilters = () => {
  const { selectedTags, selectedTouchpoints, allTags, allTouchpoints, timePeriod } =
    useAdvancedAnalyticsProvider()
  return (
    <div className="text-[14px] flex items-center gap-1">
      <p className="font-medium">Current filters: </p>
      <p className="flex items-center gap-1">
        <span className="inline-block w-[4px] h-[4px] rounded-full bg-primary"></span>
        <span className="text-foreground">Time period:</span>{' '}
        <span className="text-slate-600">Last {timePeriod} days</span>
        <X className="w-3 h-3 cursor-pointer text-slate-600" />
      </p>

      {selectedTouchpoints.length === 0 && selectedTags.length === 0 && (
        <p className="flex items-center gap-1">
          <span className="inline-block w-[4px] h-[4px] rounded-full bg-primary"></span>
          <span className="text-foreground">Touchpoints:</span>{' '}
          <span className="text-slate-600">All touchpoints</span>
          <X className="w-3 h-3 cursor-pointer text-slate-600" />
        </p>
      )}

      {selectedTags.length > 0 && selectedTouchpoints.length === 0 && (
        <p className="flex items-center gap-1">
          <span className="inline-block w-[4px] h-[4px] rounded-full bg-primary"></span>
          <span className="text-foreground">Tags:</span>{' '}
          <span className="text-slate-600">{selectedTags.length} selected</span>
          <X className="w-3 h-3 cursor-pointer text-slate-600" />
        </p>
      )}
      {selectedTouchpoints.length > 0 && (
        <p className="flex items-center gap-1">
          <span className="inline-block w-[4px] h-[4px] rounded-full bg-primary"></span>
          <span className="text-foreground">Touchpoints:</span>{' '}
          <span className="text-slate-600">{selectedTouchpoints.length} selected</span>
          <X className="w-3 h-3 cursor-pointer text-slate-600" />
        </p>
      )}
    </div>
  )
}
