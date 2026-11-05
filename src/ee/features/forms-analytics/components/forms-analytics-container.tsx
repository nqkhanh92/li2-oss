'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { DateRange } from 'react-day-picker'
import { useGetFormsOverview, useGetFormsDaily } from '../hooks/queries'
import { FormsOverviewRow, FormsDailyRow } from '@/core/repositories/forms-analytics.repository'
import { FormsAnalyticsView } from './forms-analytics-view'
import { FormsAnalyticsDemoV2 } from './forms-analytics-demo-v2'

const MOCK_OVERVIEW: FormsOverviewRow[] = [
  {
    form_id: 'contact-form',
    form_name: 'Contact Us',
    form_action: null,
    page_path: '/contact',
    fills: 312,
    submits: 218,
    completion_pct: 70,
    avg_time_on_form: 87,
  },
  {
    form_id: 'newsletter',
    form_name: 'Newsletter Signup',
    form_action: null,
    page_path: '/blog',
    fills: 541,
    submits: 189,
    completion_pct: 35,
    avg_time_on_form: 24,
  },
  {
    form_id: 'checkout',
    form_name: 'Checkout Form',
    form_action: null,
    page_path: '/checkout',
    fills: 204,
    submits: 41,
    completion_pct: 20,
    avg_time_on_form: 142,
  },
  {
    form_id: 'demo-request',
    form_name: 'Request a Demo',
    form_action: null,
    page_path: '/pricing',
    fills: 97,
    submits: 72,
    completion_pct: 74,
    avg_time_on_form: 63,
  },
]

const MOCK_DAILY: FormsDailyRow[] = [
  { day: 'Mar 1', fills: 42, submits: 28 },
  { day: 'Mar 5', fills: 67, submits: 45 },
  { day: 'Mar 9', fills: 53, submits: 31 },
  { day: 'Mar 13', fills: 89, submits: 61 },
  { day: 'Mar 17', fills: 74, submits: 52 },
  { day: 'Mar 21', fills: 112, submits: 78 },
  { day: 'Mar 25', fills: 95, submits: 70 },
]

const INTRO_SEEN_KEY = 'li2_forms_analytics_intro_seen'

export function FormsAnalyticsContainer({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation('forms-analytics')
  const { org_id } = useParams<{ org_id: string }>()

  const [showIntro, setShowIntro] = useState(() => {
    if (blocked) return true
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(INTRO_SEEN_KEY)
  })

  function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
  }

  const [dateRange, setDateRange] = useState<DateRange>({
    from: dayjs().subtract(30, 'days').toDate(),
    to: new Date(),
  })
  const [selectedForm, setSelectedForm] = useState<FormsOverviewRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const dateParams = {
    date_from: dayjs(dateRange.from).toISOString(),
    date_to: dayjs(dateRange.to ?? new Date()).toISOString(),
  }

  const { data: overview = [], isLoading: isLoadingOverview } = useGetFormsOverview(
    org_id,
    dateParams,
    blocked ? { enabled: false, initialData: MOCK_OVERVIEW } : {}
  )

  const { data: trendData = [], isLoading: isLoadingTrend } = useGetFormsDaily(
    org_id,
    dateParams,
    blocked ? { enabled: false, initialData: MOCK_DAILY } : {}
  )

  const { data: dailyData = [], isLoading: isLoadingDaily } = useGetFormsDaily(
    org_id,
    {
      ...dateParams,
      form_id: selectedForm?.form_id ?? undefined,
      form_name: selectedForm?.form_name ?? undefined,
      page_path: selectedForm?.page_path ?? undefined,
    },
    blocked ? { enabled: false, initialData: [] } : {}
  )

  const view = (
    <FormsAnalyticsView
      overview={overview}
      trendData={trendData}
      dailyData={dailyData}
      isLoadingOverview={isLoadingOverview}
      isLoadingTrend={isLoadingTrend}
      isLoadingDaily={isLoadingDaily}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      selectedForm={selectedForm}
      onRowClick={(row) => {
        setSelectedForm(row)
        setSheetOpen(true)
      }}
      sheetOpen={sheetOpen}
      onSheetOpenChange={setSheetOpen}
      showDetailPanel={!blocked}
    />
  )

  if (showIntro) {
    return <FormsAnalyticsDemoV2 canAccess={!blocked} onContinue={handleContinue} />
  }

  return view
}
