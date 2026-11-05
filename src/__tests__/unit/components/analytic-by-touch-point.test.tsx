// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

/**
 * `AnalyticByTouchPoint` ra đời cho route `/short-links/[touch_point_id]` nên nó đọc `useParams()`.
 * Trang chi tiết artifact KHÔNG có param đó — touch point nằm trong DTO — nên nếu khối này vẫn đọc
 * param thì `tp_ids` sẽ là `['']` và biểu đồ hiện dữ liệu của cả org thay vì của artifact đang mở.
 */
const params: { org_id: string; touch_point_id?: string } = { org_id: 'org-123' }
vi.mock('next/navigation', () => ({
  useParams: () => params,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/org/org-123/artifacts/artifact-1',
}))

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

// Khối này nhúng lịch, bộ lọc và sáu biểu đồ; bài kiểm chỉ hỏi "tp_ids gửi đi là của ai".
vi.mock('@/shared/components/customize/date-range-picker', () => ({
  DateRangePicker: () => <div />,
}))
vi.mock('@/features/analytics/components/filters/bot-filter-toggle', () => ({
  BotFilterToggle: () => <div />,
}))
vi.mock('@/features/analytics/components/sections/analytic-overview', () => ({
  AnalyticOverview: () => <div />,
}))
vi.mock('@/features/analytics/components/sections/interaction-channels', () => ({
  InteractionChannels: () => <div />,
}))

const getAnalytics = vi.fn()
vi.mock('@/features/analytics/hooks/queries', () => ({
  useGetAnalyticsByFilters: (...args: unknown[]) => {
    getAnalytics(...args)
    return { data: undefined, isLoading: false }
  },
}))

vi.mock('@/features/analytics/hooks/use-analytics-filters', () => ({
  useAnalyticsFilters: () => ({
    filters: { tag_ids: [], tp_ids: [], exclude_bot: false },
    setTagIds: vi.fn(),
    setTpIds: vi.fn(),
    setExcludeBot: vi.fn(),
  }),
}))

// Các biểu đồ nặng (map, pie, bar) không phải thứ bài này kiểm.
vi.mock('@/features/analytics/components/charts/analytic-pie-chart', () => ({
  AnalyticPieChart: () => <div />,
}))
vi.mock('@/features/analytics/components/charts/analytic-map-chart', () => ({
  AnalyticMapChart: () => <div />,
}))
vi.mock('@/features/analytics/components/charts/analytic-bar-chart', () => ({
  AnalyticBarChart: () => <div />,
}))
vi.mock('@/features/analytics/components/tables/destination-table', () => ({
  DestinationTable: ({ tp_id }: { tp_id: string }) => (
    <div data-testid="destination" data-tp={tp_id} />
  ),
}))

import { AnalyticByTouchPoint } from '@/features/analytics/components/sections/analytic-by-touch-point'

const tpIdsSent = () =>
  (getAnalytics.mock.calls.at(-1)?.[1] as { tp_ids: string[] } | undefined)?.tp_ids

beforeEach(() => {
  getAnalytics.mockClear()
  delete params.touch_point_id
})

describe('AnalyticByTouchPoint', () => {
  it('có prop touchPointId thì tp_ids dùng prop, không đọc useParams', () => {
    params.touch_point_id = 'tp-tu-param'
    render(<AnalyticByTouchPoint touchPointId="tp-tu-prop" />)
    expect(tpIdsSent()).toEqual(['tp-tu-prop'])
  })

  it('không có prop thì vẫn đọc useParams như trước', () => {
    params.touch_point_id = 'tp-tu-param'
    render(<AnalyticByTouchPoint />)
    expect(tpIdsSent()).toEqual(['tp-tu-param'])
  })
})
