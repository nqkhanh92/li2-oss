'use client'

import { useTranslation } from 'react-i18next'

interface FormulaWidgetProps {
  total: number | null
  formula: {
    numerator: number
    denominator: number
    operator: string
  } | null
  error?: string | null
}

export function FormulaWidget({ total, formula, error }: FormulaWidgetProps) {
  const { t } = useTranslation('dashboards')

  if (error === 'DIVISION_BY_ZERO') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <span className="text-2xl font-semibold">&mdash;</span>
        <span className="text-sm">{t('widget.divisionByZero')}</span>
      </div>
    )
  }

  if (total === null || total === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="text-2xl">&mdash;</span>
      </div>
    )
  }

  const formattedTotal = Number.isInteger(total)
    ? total.toLocaleString()
    : total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-3xl font-bold tracking-tight">{formattedTotal}</span>
      {formula && (
        <span className="text-xs text-muted-foreground">
          {formula.numerator.toLocaleString()} {formula.operator} {formula.denominator.toLocaleString()}
        </span>
      )}
    </div>
  )
}
