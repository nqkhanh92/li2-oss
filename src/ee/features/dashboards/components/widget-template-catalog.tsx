'use client'

import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { AVAILABLE_WIDGET_TEMPLATES } from '../constants/templates'
import { AVAILABLE_DATA_SOURCES } from '../constants/data-source-config'
import { CHART_COLORS } from './widgets/shared'
import type { DataSource, Visualization, WidgetTemplate } from '../types'

interface WidgetTemplateCatalogProps {
  hasPageviews: boolean
  isPending: boolean
  onSelect: (template: WidgetTemplate) => void
}

/* ── Compact preview thumbnails ─────────────────────────────── */

function NumberPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-xl font-bold tabular-nums text-stone-600">1,234</span>
    </div>
  )
}

function LinePreview() {
  return (
    <svg viewBox="0 0 80 32" className="h-full w-full px-2" fill="none">
      <path d="M4 24 L14 18 L24 21 L34 10 L44 14 L54 6 L64 9 L76 4" stroke={CHART_COLORS[0]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 24 L14 18 L24 21 L34 10 L44 14 L54 6 L64 9 L76 4 L76 32 L4 32 Z" fill={CHART_COLORS[0]} opacity="0.08" />
    </svg>
  )
}

function BarPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-3">
      <div className="flex items-center gap-1.5"><div className="h-1 w-6 rounded-full bg-stone-200 shrink-0" /><div className="h-2.5 rounded-full w-[75%]" style={{ backgroundColor: CHART_COLORS[0], opacity: 0.8 }} /></div>
      <div className="flex items-center gap-1.5"><div className="h-1 w-6 rounded-full bg-stone-200 shrink-0" /><div className="h-2.5 rounded-full w-[55%]" style={{ backgroundColor: CHART_COLORS[1], opacity: 0.7 }} /></div>
      <div className="flex items-center gap-1.5"><div className="h-1 w-6 rounded-full bg-stone-200 shrink-0" /><div className="h-2.5 rounded-full w-[35%]" style={{ backgroundColor: CHART_COLORS[2], opacity: 0.6 }} /></div>
    </div>
  )
}

function PiePreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-8 w-8">
        <circle cx="18" cy="18" r="13" fill="none" stroke={CHART_COLORS[1]} strokeWidth="5" strokeDasharray="49 82" strokeDashoffset="0" />
        <circle cx="18" cy="18" r="13" fill="none" stroke={CHART_COLORS[0]} strokeWidth="5" strokeDasharray="30 82" strokeDashoffset="-49" />
        <circle cx="18" cy="18" r="13" fill="none" stroke={CHART_COLORS[2]} strokeWidth="5" strokeDasharray="15 82" strokeDashoffset="-79" />
      </svg>
    </div>
  )
}

function TablePreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-1 px-3">
      <div className="flex items-center justify-between pb-1 border-b border-stone-200/60">
        <div className="h-1 w-8 rounded-full bg-stone-300" />
        <div className="h-1 w-4 rounded-full bg-stone-300" />
      </div>
      <div className="flex items-center justify-between"><div className="h-1 w-10 rounded-full bg-stone-200" /><div className="h-1 w-5 rounded-full bg-stone-200" /></div>
      <div className="flex items-center justify-between"><div className="h-1 w-7 rounded-full bg-stone-200" /><div className="h-1 w-3 rounded-full bg-stone-200" /></div>
      <div className="flex items-center justify-between"><div className="h-1 w-12 rounded-full bg-stone-200" /><div className="h-1 w-4 rounded-full bg-stone-200" /></div>
    </div>
  )
}

export const VIZ_PREVIEW: Record<Visualization, () => JSX.Element> = {
  number: NumberPreview,
  line: LinePreview,
  bar: BarPreview,
  pie: PiePreview,
  table: TablePreview,
}

export function WidgetTemplateCatalog({
  hasPageviews, isPending, onSelect,
}: WidgetTemplateCatalogProps) {
  const { t } = useTranslation('dashboards')

  const DOMAIN_LABELS: Record<DataSource, string> = {
    visits: t('view.linksGroup', { defaultValue: 'Links' }),
    pageviews: t('view.websiteGroup', { defaultValue: 'Website' }),
    events: t('templates.domainEvents', { defaultValue: 'Events' }),
    interactions: t('templates.domainInteractions', { defaultValue: 'Interactions' }),
    conversions: t('templates.domainConversions', { defaultValue: 'Conversions' }),
  }

  return (
    <div className="flex flex-col gap-5">
      {AVAILABLE_DATA_SOURCES.map((source) => {
        const templates = AVAILABLE_WIDGET_TEMPLATES.filter((tmpl) => tmpl.data_source === source)
        if (templates.length === 0) return null
        return (
          <div key={source}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {DOMAIN_LABELS[source]}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((tmpl) => {
                const isLocked = tmpl.pro_only && !hasPageviews
                const Preview = VIZ_PREVIEW[tmpl.config.visualization] ?? VIZ_PREVIEW.number

                return (
                  <button
                    key={tmpl.id}
                    onClick={() => onSelect(tmpl)}
                    disabled={isPending || isLocked}
                    className={`group relative flex flex-col rounded-xl border overflow-hidden text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                      isLocked
                        ? 'border-stone-200/60 bg-stone-50/50 opacity-50 cursor-not-allowed'
                        : 'border-stone-200/80 bg-white hover:shadow-md hover:shadow-stone-200/60 hover:border-stone-300/80 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Preview thumbnail */}
                    <div className="h-12 bg-stone-50/80 group-hover:bg-stone-100/60 transition-colors">
                      <Preview />
                    </div>
                    {/* Label */}
                    <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                      <p className="text-[11px] font-medium text-stone-600 group-hover:text-stone-800 transition-colors truncate leading-tight">
                        {t(`templates.widgets.${tmpl.id}.name`, { defaultValue: tmpl.id })}
                      </p>
                      {isLocked && (
                        <Lock className="h-3 w-3 shrink-0 text-stone-400" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
