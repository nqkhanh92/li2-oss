'use client'

import type { WidgetConfig, WidgetDataResult } from '../types'
import { formatLabel } from './widgets/shared'
import { KpiWidget } from './widgets/kpi-widget'
import { LineChartWidget } from './widgets/line-chart-widget'
import { BarChartWidget } from './widgets/bar-chart-widget'
import { PieChartWidget } from './widgets/pie-chart-widget'
import { TableWidget } from './widgets/table-widget'

interface WidgetRendererProps {
  config: WidgetConfig
  data: WidgetDataResult
}

export function WidgetRenderer({ config, data }: WidgetRendererProps) {
  const formatted: WidgetDataResult = {
    ...data,
    rows: data.rows.map((row) => ({ ...row, label: formatLabel(row.label) })),
  }

  switch (config.visualization) {
    case 'number':
      return <KpiWidget data={formatted} />
    case 'line':
      return <LineChartWidget data={formatted} />
    case 'bar':
      return <BarChartWidget data={formatted} />
    case 'pie':
      return <PieChartWidget data={formatted} />
    case 'table':
      return <TableWidget data={formatted} />
    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          —
        </div>
      )
  }
}
