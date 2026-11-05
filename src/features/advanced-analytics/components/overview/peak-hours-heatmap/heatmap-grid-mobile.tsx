import { Breakdown, HeatmapDaum } from '@/core/types/analytics/peak-heatmap.type'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { Button } from '@/shared/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { Separator } from '@/shared/components/ui/separator'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import {
  ArrowRight,
  ChevronDown,
  Crown,
  Link,
  QrCode,
  SparklesIcon,
  UserRound,
  Wifi,
} from 'lucide-react'
import React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  heatmap_data: HeatmapDaum[]
}

const heatmapLevels = [
  { label: 'Level 0', color: 'bg-red-50' },
  { label: 'Level 1', color: 'bg-red-100' },
  { label: 'Level 2', color: 'bg-red-200' },
  { label: 'Level 3', color: 'bg-red-300' },
  { label: 'Level 4', color: 'bg-red-400' },
  { label: 'Level 5', color: 'bg-red-500' },
  { label: 'Level 6', color: 'bg-red-600 text-white' },
  { label: 'Level 7', color: 'bg-red-700 text-white' },
  { label: 'Level 8', color: 'bg-red-800 text-white' },
  { label: 'Level 9', color: 'bg-red-900 text-white' },
]

const timeBlocks = [
  { label: '0-6:00', start: 0, end: 6 },
  { label: '6-12:00', start: 6, end: 12 },
  { label: '12-18:00', start: 12, end: 18 },
  { label: '18-24:00', start: 18, end: 24 },
]

export const HeatmapGridMobile = ({ heatmap_data }: Props) => {
  const { t } = useTranslation('advanced_analytics')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const maxInteractions = Math.max(...heatmap_data.map((d) => d.interactions), 0)

  const getColor = (interactions: number, maxInteractions: number) => {
    if (interactions <= 0) return heatmapLevels[0].color

    const levelsCount = heatmapLevels.length - 1
    const intensity = maxInteractions > 0 ? interactions / maxInteractions : 0

    let levelIndex = Math.ceil(intensity * levelsCount)
    if (levelIndex > levelsCount) levelIndex = levelsCount

    return heatmapLevels[levelIndex].color
  }

  const { allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()

  // Track which tooltip's collapsible is open (day-hour key)
  const [openCell, setOpenCell] = useState<string | null>(null)

  const mappingDetailVisit = {
    unique_users: { label: t('peak_hours.label_unique_visits'), icon: UserRound },
    link_clicks: { label: t('peak_hours.label_link_clicks'), icon: Link },
    qr_scans: { label: t('peak_hours.label_qr_scans'), icon: QrCode },
    nfc_taps: { label: t('peak_hours.label_nfc_taps'), icon: QrCode },
    wifi_accesses: { label: t('peak_hours.label_wifi'), icon: Wifi },
  } satisfies Record<string, { label: string; icon: React.ElementType }>

  const [showValue, setShowValue] = useState<boolean>(false)

  return (
    <LockableSection
      lockBy="plan"
      locked={!allowExtraAdvancedAnalytic}
      renderLock={
        <Button
          variant="outline"
          type="button"
          iconLeft={<SparklesIcon />}
          className="text-primary border-neutral-500 bg-background gap-2 rounded-full px-3 py-1.5 text-xs font-medium leading-4 h-auto shadow-xs hover:bg-guest-white hover:border-neutral-500"
        >
          {t('peak_hours.upgrade_plan')}
        </Button>
      }
    >
      <div className="rounded-2xl p-4 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]">
        {/* Legend */}
        <div className="flex md:flex-row flex-col md:items-center justify-between mb-4 gap-2">
          <div className="text-sm font-medium text-gray-700">{t('peak_hours.heatmap_title')}</div>
          <div className="flex md:items-center items-center space-x-2">
            <Switch
              className="data-[state=unchecked]:bg-slate-300"
              checked={showValue}
              onCheckedChange={() => setShowValue(!showValue)}
              disabled={!allowExtraAdvancedAnalytic} // disable when not allowed
              checkedIcon={<Crown className="h-5 w-5 p-1 text-neutral-900 fill-neutral-900" />}
              uncheckedIcon={<Crown className="h-5 w-5 p-1 text-neutral-900 fill-neutral-900" />}
            />
            <span className="text-xs text-gray-500">{t('peak_hours.show_values')}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-px min-w-fit pb-4">
            {/* Hour headers */}
            <div></div>
            {timeBlocks.map((block, idx) => (
              <div key={`header-${idx}`} className="text-center text-xs text-gray-500 px-1">
                {block.label}
              </div>
            ))}

            {/* Rows */}
            {days.map((dayName, dayIndex) => {
              // For each time block, sum interactions and breakdown
              const dayBlocks = timeBlocks.map((block) => {
                const pointsInBlock = heatmap_data.filter(
                  (p) =>
                    p.day_name === dayName &&
                    p.hour_of_day >= block.start &&
                    p.hour_of_day < block.end
                )

                // Sum interactions for the block
                const totalInteractions = pointsInBlock.reduce(
                  (sum, p) => sum + (p.interactions || 0),
                  0
                )

                // Sum breakdown keys for the block
                const breakdownSum: Record<string, number> = {}
                pointsInBlock.forEach((p) => {
                  Object.entries(p.breakdown || {}).forEach(([key, value]) => {
                    breakdownSum[key] = (breakdownSum[key] || 0) + (value as number)
                  })
                  breakdownSum['unique_users'] =
                    (breakdownSum['unique_users'] || 0) + (p.unique_users || 0)
                })

                return { interactions: totalInteractions, breakdown: breakdownSum }
              })

              return (
                <React.Fragment key={`row-${dayIndex}`}>
                  <div className="text-center text-xs text-gray-500 px-2">
                    {dayName.slice(0, 3)}
                  </div>
                  {dayBlocks.map(({ interactions, breakdown }, blockIndex) => {
                    const cellKey = `${dayIndex}-${blockIndex}`
                    return (
                      <Tooltip key={cellKey}>
                        <TooltipTrigger asChild>
                          {showValue ? (
                            <div
                              className={`h-[30px] min-w-[40px] ${getColor(
                                interactions,
                                maxInteractions
                              )} hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer flex items-center justify-center text-xs`}
                            >
                              {interactions}
                            </div>
                          ) : (
                            <div
                              className={`h-[30px] min-w-[40px] ${getColor(
                                interactions,
                                maxInteractions
                              )} hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer`}
                            />
                          )}
                        </TooltipTrigger>
                        <TooltipContent className="text-center text-black bg-background p-2 rounded">
                          <div className="">
                            {dayName} ({timeBlocks[blockIndex].label})
                            <Separator className="my-2" />
                            <Collapsible
                              open={openCell === cellKey}
                              onOpenChange={() =>
                                setOpenCell(openCell === cellKey ? null : cellKey)
                              }
                              className="flex w-[300px] flex-col gap-1"
                            >
                              <div className="flex items-center justify-between gap-1 px-2">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    iconRight={<ChevronDown />}
                                    className="h-auto flex items-center gap-2 justify-between w-full text-slate-500 font-normal text-xs px-0"
                                  >
                                    <span>
                                      {t('peak_hours.total_visit')}{' '}
                                      <span className="font-semibold">{interactions}</span>
                                    </span>
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent className="flex flex-col gap-1 text-left px-2">
                                {Object.keys(breakdown).length > 0 ? (
                                  Object.entries(breakdown).map(([key, value]) => {
                                    // key is string, so we need to safely check mapping exists
                                    if (key in mappingDetailVisit) {
                                      const { label, icon: Icon } =
                                        mappingDetailVisit[key as keyof typeof mappingDetailVisit]
                                      return (
                                        <div
                                          key={`${cellKey}-${key}`}
                                          className="flex items-center gap-1 text-xs"
                                        >
                                          <Icon className="w-3 h-3" />
                                          {label}
                                          <span className="font-semibold">{value as number}</span>
                                        </div>
                                      )
                                    }
                                    return null
                                  })
                                ) : (
                                  <div className="text-xs text-gray-500">{t('peak_hours.no_breakdown')}</div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </div>
        </div>
        <div className="flex items-center space-x-1 gap-4 w-full justify-center">
          <span className="text-xs text-gray-500">{t('peak_hours.legend_min')}</span>
          <div className="flex items-center">
            {heatmapLevels.map((level) => (
              <div key={level.label} className={`w-5 h-5 ${level.color}`}></div>
            ))}
          </div>
          <span className="text-xs text-gray-500">{t('peak_hours.legend_max')}</span>
        </div>
      </div>
    </LockableSection>
  )
}

// const Legend = ({ color, label }: { color: string; label: string }) => (
//   <div className="flex items-center space-x-1">
//     <div className={`w-3 h-3 ${color} rounded-sm`}></div>
//     <span>{label}</span>
//   </div>
// )
