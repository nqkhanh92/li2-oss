import type { StepMetrics, FunnelReportResult } from '@/ee/features/funnels/types'

export const mockSteps: StepMetrics[] = [
  {
    step_position: 1,
    step_name: 'Homepage',
    visits: 21800,
    entries: 21800,
    proceeds: 18000,
    drop_offs: 3800,
    drop_off_rate: 17.4,
    skips: 0,
  },
  {
    step_position: 2,
    step_name: 'Products',
    visits: 18000,
    entries: 0,
    proceeds: 8800,
    drop_offs: 9200,
    drop_off_rate: 51.1,
    skips: 0,
  },
  {
    step_position: 3,
    step_name: 'Product details',
    visits: 8800,
    entries: 0,
    proceeds: 4200,
    drop_offs: 4600,
    drop_off_rate: 52.3,
    skips: 0,
  },
  {
    step_position: 4,
    step_name: 'Checkout',
    visits: 4200,
    entries: 0,
    proceeds: 0,
    drop_offs: 0,
    drop_off_rate: 0,
    skips: 0,
  },
]

export const mockReport: FunnelReportResult = {
  funnel_id: 'funnel-123',
  funnel_name: 'E-Commerce Funnel',
  period_start: '2026-01-15',
  period_end: '2026-02-14',
  total_entries: 21800,
  total_conversions: 4200,
  conversion_rate: 19.3,
  steps: mockSteps,
  has_pageviews_in_period: true,
  has_computation_results: true,
  is_computation_complete: true,
}

export const mockEmptyReport: FunnelReportResult = {
  funnel_id: 'funnel-456',
  funnel_name: 'Empty Funnel',
  period_start: '2026-01-15',
  period_end: '2026-02-14',
  total_entries: 0,
  total_conversions: 0,
  conversion_rate: 0,
  steps: [
    {
      step_position: 1,
      step_name: 'Landing',
      visits: 0,
      entries: 0,
      proceeds: 0,
      drop_offs: 0,
      drop_off_rate: 0,
      skips: 0,
    },
    {
      step_position: 2,
      step_name: 'Signup',
      visits: 0,
      entries: 0,
      proceeds: 0,
      drop_offs: 0,
      drop_off_rate: 0,
      skips: 0,
    },
  ],
  has_pageviews_in_period: false,
  has_computation_results: false,
  is_computation_complete: false,
}

/** Two-step funnel for testing single drop-off scenarios */
export const mockTwoStepSteps: StepMetrics[] = [
  {
    step_position: 1,
    step_name: 'Page A',
    visits: 500,
    entries: 500,
    proceeds: 200,
    drop_offs: 300,
    drop_off_rate: 60.0,
    skips: 0,
  },
  {
    step_position: 2,
    step_name: 'Page B',
    visits: 200,
    entries: 0,
    proceeds: 0,
    drop_offs: 0,
    drop_off_rate: 0,
    skips: 0,
  },
]

/** Steps with low drop-off rates (all green) */
export const mockLowDropOffSteps: StepMetrics[] = [
  {
    step_position: 1,
    step_name: 'Step 1',
    visits: 1000,
    entries: 1000,
    proceeds: 900,
    drop_offs: 100,
    drop_off_rate: 10.0,
    skips: 0,
  },
  {
    step_position: 2,
    step_name: 'Step 2',
    visits: 900,
    entries: 0,
    proceeds: 850,
    drop_offs: 50,
    drop_off_rate: 5.6,
    skips: 0,
  },
  {
    step_position: 3,
    step_name: 'Step 3',
    visits: 850,
    entries: 0,
    proceeds: 0,
    drop_offs: 0,
    drop_off_rate: 0,
    skips: 0,
  },
]
