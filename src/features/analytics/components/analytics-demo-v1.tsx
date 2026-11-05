'use client'

import { forwardRef } from 'react'
import { BarChart2, Eye, UserRound, QrCode, Link2 } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card } from '@/shared/components/animation/card-swap'

const MOCK_DAILY = [
  { date: 'Mar 1',  total: 640,  unique: 310, QR: 220, LINK: 420 },
  { date: 'Mar 3',  total: 820,  unique: 402, QR: 290, LINK: 530 },
  { date: 'Mar 5',  total: 1140, unique: 570, QR: 410, LINK: 730 },
  { date: 'Mar 7',  total: 980,  unique: 480, QR: 350, LINK: 630 },
  { date: 'Mar 9',  total: 1320, unique: 660, QR: 490, LINK: 830 },
  { date: 'Mar 11', total: 1540, unique: 780, QR: 560, LINK: 980 },
  { date: 'Mar 13', total: 1280, unique: 620, QR: 450, LINK: 830 },
  { date: 'Mar 15', total: 1680, unique: 840, QR: 610, LINK: 1070 },
  { date: 'Mar 17', total: 1920, unique: 960, QR: 700, LINK: 1220 },
  { date: 'Mar 19', total: 1740, unique: 870, QR: 630, LINK: 1110 },
  { date: 'Mar 21', total: 2060, unique: 1030, QR: 750, LINK: 1310 },
  { date: 'Mar 23', total: 2240, unique: 1120, QR: 820, LINK: 1420 },
  { date: 'Mar 25', total: 2480, unique: 1240, QR: 900, LINK: 1580 },
  { date: 'Mar 27', total: 2180, unique: 1090, QR: 790, LINK: 1390 },
]

const CHART_CONFIG = {
  total:  { label: 'Total Visits',  color: 'hsl(220 92% 62%)' },
  unique: { label: 'Unique Visits', color: 'oklch(0.6776 0.192952 45.2346)' },
}

export const AnalyticsDemoCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AnalyticsDemoCard(props, ref) {
  const totalVisits = MOCK_DAILY.reduce((s, d) => s + d.total, 0)
  const uniqueVisits = MOCK_DAILY.reduce((s, d) => s + d.unique, 0)
  const qrScans = MOCK_DAILY.reduce((s, d) => s + d.QR, 0)
  const linkClicks = MOCK_DAILY.reduce((s, d) => s + d.LINK, 0)

  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
      data-swap-card
      {...props}
    >
      <div className="flex flex-col h-full p-4 gap-3">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <BarChart2 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Link Analytics</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {[
            { icon: Eye,      label: 'Total Visits',  value: totalVisits.toLocaleString(),  accent: 'text-blue-600',   iconColor: 'text-blue-500'   },
            { icon: UserRound, label: 'Unique Visits', value: uniqueVisits.toLocaleString(), accent: 'text-orange-600', iconColor: 'text-orange-500' },
            { icon: QrCode,   label: 'QR Scans',      value: qrScans.toLocaleString(),      accent: 'text-violet-600', iconColor: 'text-violet-500' },
            { icon: Link2,    label: 'Link Clicks',   value: linkClicks.toLocaleString(),   accent: 'text-cyan-600',   iconColor: 'text-cyan-500'   },
          ].map(({ icon: Icon, label, value, accent, iconColor }) => (
            <div key={label} className="rounded-lg border bg-muted/40 px-2.5 py-2 flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                <p className={`text-sm font-bold leading-tight ${accent}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ChartContainer config={CHART_CONFIG} className="w-full h-full">
            <AreaChart data={MOCK_DAILY} margin={{ left: 0, right: 4, top: 4 }}>
              <defs>
                <linearGradient id="analyticsTotalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(220 92% 62%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220 92% 62%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="analyticsUniqueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="oklch(0.6776 0.192952 45.2346)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.6776 0.192952 45.2346)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={40}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="total"
                type="monotone"
                stroke="hsl(220 92% 62%)"
                strokeWidth={2}
                fill="url(#analyticsTotalGrad)"
              />
              <Area
                dataKey="unique"
                type="monotone"
                stroke="oklch(0.6776 0.192952 45.2346)"
                strokeWidth={2}
                fill="url(#analyticsUniqueGrad)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </div>
    </Card>
  )
})
