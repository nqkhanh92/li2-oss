'use client'

import React, { useMemo, useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { FunnelStage } from '../types'
import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { cn } from '@/shared/lib/utils'
import { ChevronRightPixel } from '@/shared/components/icons/chevron-right-pixel'

interface ConversionFunnelChartProps {
  data: FunnelStage[]
  conversionRates: {
    clicksToLeads: number
    leadsToSales: number
    overall: number
  }
  isLoading?: boolean
  title?: string
  description?: string

  selectedStage: string | null
  setSelectedStage: (stageName: string | null) => void
}

// Color scheme matching Figma design (cyan → blue → indigo)
const FUNNEL_COLORS = [
  {
    // Visits - Cyan
    main: '#3aaae3',
    ghost: 'rgba(58, 170, 227, 0.25)',
    bg: '#ecfeff',
  },
  {
    // Leads - Blue
    main: '#3762d0',
    ghost: 'rgba(55, 98, 208, 0.25)',
    bg: '#eff6ff',
  },
  {
    // Sales - Indigo
    main: '#150f5a',
    ghost: 'rgba(21, 15, 90, 0.25)',
    bg: '#eef2ff',
  },
]

interface FunnelSegmentData {
  name: string
  value: number
  percentage: number
  heightPercent: number
}

interface FunnelSegmentShapeProps {
  /** Height of the current segment (0-100) */
  currentHeight: number
  /** Height of the next segment (0-100), used for the curve transition */
  nextHeight: number
  /** Whether this is the last segment (no curve needed) */
  isLast: boolean
  /** Fill color for the shape */
  color: string
  /** Ghost/shadow color */
  ghostColor: string
}

/**
 * SVG funnel segment shape that fits within a card
 * Creates a shape with flat top on left, curved transition to next height on right
 */
function FunnelSegmentShape({
  currentHeight,
  nextHeight,
  isLast,
  color,
  ghostColor,
}: FunnelSegmentShapeProps) {
  const width = 360
  const height = 160
  const ghostThickness = 12 // Visual thickness of ghost layer

  // Calculate Y positions (bottom-aligned, so higher percentage = lower Y value)
  const currentTop = height * (1 - currentHeight / 100)
  const nextTop = isLast ? currentTop : height * (1 - nextHeight / 100)
  const bottom = height

  // S-curve X positions (based on sample SVG proportions)
  const curveLeftX = 107
  const curveRightX = 253
  const curveMidX = 180

  // S-curve control points (calculated once, reused)
  const cp1x = 226
  const cp1y = nextTop
  const cp2x = 200
  const cp2y = nextTop + (currentTop - nextTop) * 0.18
  const midY = nextTop + (currentTop - nextTop) * 0.5
  const cp3x = 160
  const cp3y = currentTop + (nextTop - currentTop) * 0.06
  const cp4x = 134
  const cp4y = currentTop

  // Main filled shape path (closed)
  const mainPath = isLast
    ? `M 0,${currentTop} H ${width} V ${bottom} H 0 Z`
    : `
        M ${curveLeftX},${currentTop}
        H 0
        V ${bottom}
        H ${width}
        V ${nextTop}
        H ${curveRightX}
        C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curveMidX},${midY}
        C ${cp3x},${cp3y} ${cp4x},${cp4y} ${curveLeftX},${currentTop}
        Z
      `.trim()

  // Top edge path (open) - for stroking the ghost layer
  // SVG stroke follows path normals, giving uniform visual thickness on curves
  const topEdgePath = isLast
    ? `M 0,${currentTop} H ${width}`
    : `
        M 0,${currentTop}
        H ${curveLeftX}
        C ${cp4x},${cp4y} ${cp3x},${cp3y} ${curveMidX},${midY}
        C ${cp2x},${cp2y} ${cp1x},${cp1y} ${curveRightX},${nextTop}
        H ${width}
      `.trim()

  // Unique ID for clipPath (needed when multiple instances render)
  const clipId = `funnel-clip-${currentHeight}-${nextHeight}`

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute bottom-0 left-0 right-0 overflow-visible"
    >
      <defs>
        {/* Clip to card bounds - prevents stroke from overflowing at edges */}
        <clipPath id={clipId}>
          <rect x={0} y={-ghostThickness * 2} width={width} height={height + ghostThickness * 2} />
        </clipPath>
      </defs>

      {/* Ghost layer - stroke the top edge for mathematically correct uniform thickness
          strokeWidth = 2× desired thickness (half extends above, half below)
          The main shape covers the inner half, leaving only the outer ghost visible */}
      <path
        d={topEdgePath}
        fill="none"
        stroke={ghostColor}
        strokeWidth={ghostThickness * 2}
        strokeLinecap="square"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />
      {/* Main shape covers the inner portion of the stroke */}
      <path d={mainPath} fill={color} />
    </svg>
  )
}

export function ConversionFunnelChart({
  data,
  conversionRates,
  isLoading = false,
  title,
  description,
  selectedStage,
  setSelectedStage,
}: ConversionFunnelChartProps) {
  const { t } = useTranslation('conversions')

  const [stageTooltip, setStageTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    content: React.ReactNode
  }>({ visible: false, x: 0, y: 0, content: null })
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chartData = useMemo(() => {
    const maxValue = Math.max(...data.map((d) => d.value), 1)
    const firstValue = data[0]?.value || 1

    return data.map((stage) => {
      const percentage = Number(((stage.value / firstValue) * 100).toFixed(1))
      const attributedValue =
        stage.directValue !== undefined ? stage.value - stage.directValue : stage.value

      const directValue = stage.directValue ?? 0
      const rawAttributed = (attributedValue / maxValue) * 90
      const rawDirect = (directValue / maxValue) * 90
      const rawTotal = rawAttributed + rawDirect

      // Floor the total, then split attributed/direct proportionally
      const heightPercent = stage.value === 0 ? 10 : Math.max(20, 10 + rawTotal)
      const attributedHeightPercent = rawTotal > 0
        ? (rawAttributed / rawTotal) * heightPercent
        : 0

      return {
        ...stage,
        directValue: stage.directValue,
        percentage,
        heightPercent,
        attributedHeightPercent,
      }
    })
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const hasData = chartData.some((stage) => stage.value > 0)

  // Format large numbers
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  return (
    <Card className="w-full">
      <style jsx global>{`
        @keyframes funnelFlowIn {
          0% {
            opacity: 0;
            transform: scaleX(0.8);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      <CardHeader>
        <CardTitle>{title || t('funnel.title', 'Conversion Funnel')}</CardTitle>
        <CardDescription>
          {description ||
            t('funnel.description', 'Track your conversion journey from clicks to sales')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-0">
        {hasData ? (
          <>
            {/* Metrics Cards with Embedded Funnel Shapes */}
            <div className="flex">
              {chartData.map((stage, index) => {
                const colors = FUNNEL_COLORS[index] || FUNNEL_COLORS[0]
                const isLast = index === chartData.length - 1
                const isFirst = index === 0
                const nextStage = chartData[index + 1]

                const tooltipContent =
                  stage.directValue !== undefined ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{
                              background: `linear-gradient(to right, ${colors.main} 50%, ${colors.ghost} 50%)`,
                            }}
                          />
                          <span className="text-slate-400">{t('funnel.total', 'Total')}</span>
                        </div>
                        <span className="font-medium tabular-nums">{formatValue(stage.value)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: colors.main }}
                          />
                          <span className="text-slate-400">
                            {t('funnel.attributed', 'Attributed')}
                          </span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {formatValue(stage.value - stage.directValue)}
                          <span className="text-slate-400 ml-1">
                            (
                            {stage.value > 0
                              ? (((stage.value - stage.directValue) / stage.value) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: colors.ghost }}
                          />
                          <span className="text-slate-400">{t('funnel.direct', 'Direct')}</span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {formatValue(stage.directValue)}
                          <span className="text-slate-400 ml-1">
                            (
                            {stage.value > 0
                              ? ((stage.directValue / stage.value) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : isFirst ? (
                    t('funnel.percentage.baseline', 'Baseline (100%)')
                  ) : (
                    t('funnel.percentage.ofVisits', '{{percentage}}% of total visits', {
                      percentage: stage.percentage,
                    })
                  )

                return (
                    <div
                      key={stage.name}
                      style={{ animation: `fadeIn 0.4s ease-out ${index * 0.1}s both` }}
                      className={cn(
                        'flex-1 flex flex-col relative gap-7 cursor-pointer hover:opacity-95!',
                        selectedStage !== null && selectedStage !== stage.name && 'opacity-30!',
                        !isFirst && 'border-l border-slate-300'
                      )}
                      onClick={() => {
                        if (selectedStage === stage.name) {
                          setSelectedStage(null)
                        } else {
                          setSelectedStage(stage.name)
                        }
                      }}
                      onMouseMove={(e) => {
                        const x = e.clientX
                        const y = e.clientY
                        if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
                        setStageTooltip((prev) => ({ ...prev, visible: false }))
                        tooltipTimer.current = setTimeout(() => {
                          setStageTooltip({ visible: true, x, y, content: tooltipContent })
                        }, 300)
                      }}
                      onMouseLeave={() => {
                        if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
                        setStageTooltip((prev) => ({ ...prev, visible: false }))
                      }}
                    >
                      {/* Metrics content */}
                      <div className="flex items-center gap-2 p-6 z-10">
                        <div className="flex-1 flex flex-col gap-2">
                          {/* Label with color indicator */}
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: colors.main }}
                            />
                            <span className="text-sm text-slate-500">{stage.name}</span>
                            {isFirst && (
                              <CustomToolTip
                                content={t(
                                  'funnel.visits.botExcludedTooltip',
                                  'Bot traffic is excluded'
                                )}
                                side="top"
                              >
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                              </CustomToolTip>
                            )}
                          </div>
                          {/* Value and Percentage */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-[30px] font-medium text-slate-700 leading-7">
                              {formatValue(stage.value)}
                            </span>
                            <span className="text-sm font-medium" style={{ color: colors.main }}>
                              {stage.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Chevron Arrow */}
                        {!isLast && (
                          <div className="flex flex-col items-center text-slate-400">
                            <ChevronRightPixel className="h-9 w-9" color="currentcolor" />
                          </div>
                        )}
                      </div>

                      {/* Funnel Shape embedded in card */}
                      <div className="relative h-40 overflow-visible">
                        <FunnelSegmentShape
                          currentHeight={stage.heightPercent}
                          nextHeight={nextStage?.heightPercent ?? stage.heightPercent}
                          isLast={isLast}
                          color={colors.ghost}
                          ghostColor="transparent"
                        />
                        <FunnelSegmentShape
                          currentHeight={stage.attributedHeightPercent}
                          nextHeight={
                            nextStage?.attributedHeightPercent ?? stage.attributedHeightPercent
                          }
                          isLast={isLast}
                          color={colors.main}
                          ghostColor="transparent"
                        />
                      </div>
                    </div>
                )
              })}

              {/* Cursor-following stage tooltip */}
              {stageTooltip.visible && (
                <div
                  className="fixed z-50 pointer-events-none rounded-[8px] bg-popover text-popover-foreground border px-4 py-3 max-w-[320px] shadow-md"
                  style={{ left: stageTooltip.x + 12, top: stageTooltip.y + 12 }}
                >
                  <p className="text-sm text-slate-700 leading-relaxed">{stageTooltip.content}</p>
                </div>
              )}
            </div>

            {/* Conversion Rates Section - Enhanced Design */}
            <div className="pb-6 px-6">
              {/* Horizontal scrollable formula on mobile, centered on desktop */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex items-center justify-center gap-3 min-w-max py-2">
                  {/* Visits → Leads */}
                  <CustomToolTip
                    content={t(
                      'funnel.rates.visitsToLeadsTooltip',
                      'Percentage of visits that became leads'
                    )}
                    side="top"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 cursor-help transition-all duration-200',
                        'hover:shadow-md hover:-translate-y-0.5',
                        selectedStage !== null &&
                          selectedStage !== chartData[0]?.name &&
                          selectedStage !== chartData[1]?.name &&
                          'opacity-40'
                      )}
                      style={{ backgroundColor: FUNNEL_COLORS[1].bg }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                          {t('funnel.visits', 'Visits')} → {t('funnel.leads', 'Leads')}
                        </span>
                        <span
                          className="text-xl font-bold tabular-nums"
                          style={{ color: FUNNEL_COLORS[1].main }}
                        >
                          {conversionRates.clicksToLeads.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CustomToolTip>

                  {/* Multiplication symbol */}
                  <span className="text-2xl font-medium text-slate-400 select-none">×</span>

                  {/* Leads → Sales */}
                  <CustomToolTip
                    content={t(
                      'funnel.rates.leadsToSalesTooltip',
                      'Percentage of leads that became sales'
                    )}
                    side="top"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 cursor-help transition-all duration-200',
                        'hover:shadow-md hover:-translate-y-0.5',
                        selectedStage !== null &&
                          selectedStage !== chartData[1]?.name &&
                          selectedStage !== chartData[2]?.name &&
                          'opacity-40'
                      )}
                      style={{ backgroundColor: FUNNEL_COLORS[2].bg }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                          {t('funnel.leads', 'Leads')} → {t('funnel.sales', 'Sales')}
                        </span>
                        <span
                          className="text-xl font-bold tabular-nums"
                          style={{ color: FUNNEL_COLORS[2].main }}
                        >
                          {conversionRates.leadsToSales.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CustomToolTip>

                  {/* Equals symbol */}
                  <span className="text-2xl font-medium text-slate-400 select-none">=</span>

                  {/* End-to-end: Visits → Sales (Highlighted) */}
                  <CustomToolTip
                    content={t(
                      'funnel.rates.overallTooltip',
                      'End-to-end conversion: {{v2l}}% × {{l2s}}% = {{overall}}%',
                      {
                        v2l: conversionRates.clicksToLeads.toFixed(1),
                        l2s: conversionRates.leadsToSales.toFixed(1),
                        overall: conversionRates.overall.toFixed(1),
                      }
                    )}
                    side="top"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-5 py-2.5 cursor-help transition-all duration-200',
                        'hover:shadow-lg hover:-translate-y-0.5',
                        'ring-2 ring-indigo-300/50 ring-offset-2'
                      )}
                      style={{ backgroundColor: FUNNEL_COLORS[2].main }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-white/70 font-medium">
                          {t('funnel.overall', 'Overall')}
                        </span>
                        <span className="text-xl font-bold text-white tabular-nums">
                          {conversionRates.overall.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CustomToolTip>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            {t('funnel.noData', 'No conversion data available for the selected filters')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
