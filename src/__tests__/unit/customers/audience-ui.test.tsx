// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const customersVi = require('../../../../public/lang/vi/customers.json')

/**
 * Giao diện của "ai đã xem nội dung của tôi". Ba thứ được ghim ở đây, cả ba đều là quyết định của
 * chủ sản phẩm chứ không phải chi tiết kỹ thuật:
 *
 * 1. **Không còn cột doanh thu.** Ẩn, không xoá khỏi DB. Nếu nó bò về thì bảng lại nói rằng Li2
 *    bán hàng, trong khi mọi cột thương mại trên dữ liệu thật đều rỗng.
 * 2. **Khách ẩn danh hiện tên + avatar sinh từ `fp`**, không phải một chuỗi uuid trần.
 * 3. **Timeline hiện được sự kiện mở nội dung.** Trước đây hai khách thật duy nhất có timeline
 *    trống dù họ đã mở nội dung thật.
 */
function translate(key: string, fallbackOrParams?: unknown, maybeParams?: unknown) {
  const path = key.replace(/^customers:/, '')
  const value = path.split('.').reduce<unknown>((o, k) => (o as never)?.[k], customersVi)
  const params = (typeof fallbackOrParams === 'object' ? fallbackOrParams : maybeParams) as
    | Record<string, unknown>
    | undefined
  const text =
    typeof value === 'string'
      ? value
      : typeof fallbackOrParams === 'string'
        ? fallbackOrParams
        : path
  if (!params) return text
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? ''))
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'vi', changeLanguage: vi.fn() } }),
}))
vi.mock('i18next', () => ({ t: translate, default: { t: translate } }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-a' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import { createAudienceColumns } from '@/features/customers/components/columns'
import { JourneyTimelineCard } from '@/features/customers/components/customer-detail-v2/journey-timeline'
import { anonymousDeviceName, anonymousIdentity } from '@/shared/lib/anonymous-identity'
import type { AudienceMember } from '@/features/customers/types'
import type { CustomerJourney } from '@/features/customers/hooks/queries'

const FP = '52454703-0214-4195-a4ea-78ea7d21343f'

const deviceMember: AudienceMember = {
  id: `device:${FP}`,
  kind: 'device',
  fp: FP,
  email: null,
  name: null,
  external_id: null,
  display_name: anonymousDeviceName(FP),
  content_count: 2,
  open_count: 5,
  last_seen_at: '2026-10-21T10:00:00Z',
  first_seen_at: '2026-10-19T10:00:00Z',
  country: 'VN',
  touch_points: { id: 'tp-1', name: 'Artifact flow', short_url: 'https://lihi/x' },
  visit_count: 3,
}

const identifiedMember: AudienceMember = {
  ...deviceMember,
  id: 'profile-1',
  kind: 'identified',
  fp: null,
  email: 'khanh.qn@gmail.com',
  display_name: 'khanh.qn@gmail.com',
  country: null,
}

const columns = createAudienceColumns()
const columnIds = columns.map((column) => column.id ?? (column as any).accessorKey)

/** Gọi trực tiếp hàm `cell` của một cột — rẻ hơn dựng cả bảng, và chốt đúng thứ cần chốt. */
const renderCell = (id: string, member: AudienceMember) => {
  const column = columns.find((c) => (c.id ?? (c as any).accessorKey) === id)
  expect(column, `không có cột ${id}`).toBeTruthy()
  return render(<>{(column!.cell as any)({ row: { original: member } })}</>)
}

describe('Bảng khán giả — cột doanh thu đã bị ẩn', () => {
  it('không còn cột nào về tiền', () => {
    for (const id of columnIds) {
      expect(String(id)).not.toMatch(/revenue|lifetime|sale/i)
    }
  })

  it('có cột số nội dung đã xem và lần xem gần nhất', () => {
    expect(columnIds).toContain('content_count')
    expect(columnIds).toContain('last_seen_at')
  })
})

describe('Bảng khán giả — khách ẩn danh', () => {
  it('hiện tên sinh từ fp, không phải uuid trần', () => {
    renderCell('customer', deviceMember)

    expect(screen.getByText(anonymousDeviceName(FP))).toBeTruthy()
    expect(screen.queryByText(FP)).toBeNull()
  })

  it('hiện avatar SVG sinh từ cùng fp đó', () => {
    const { container } = renderCell('customer', deviceMember)
    const svg = container.querySelector('svg[role="img"]')

    expect(svg).toBeTruthy()
    expect(svg!.getAttribute('aria-label')).toBe(anonymousIdentity(FP).name)
    // Màu nền là màu deterministic của `fp` này, không phải một màu mặc định.
    expect(container.querySelector('svg rect')!.getAttribute('fill')).toBe(
      anonymousIdentity(FP).avatar.background
    )
  })

  it('dán nhãn "Thiết bị", không nói "người"', () => {
    // Fingerprint đổi khi xoá cookie hay đổi máy, nên gọi hàng này là một người là nói sai số.
    renderCell('customer', deviceMember)
    expect(screen.getByText(customersVi.columns.device_badge)).toBeTruthy()
  })

  it('khách có email thì hiện email, không có nhãn thiết bị', () => {
    renderCell('customer', identifiedMember)

    expect(screen.getByText('khanh.qn@gmail.com')).toBeTruthy()
    expect(screen.queryByText(customersVi.columns.device_badge)).toBeNull()
  })

  it('cột nội dung hiện số nội dung và tổng lượt mở', () => {
    renderCell('content_count', deviceMember)

    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText(/5 lượt mở/)).toBeTruthy()
  })
})

describe('Journey timeline — sự kiện mở nội dung', () => {
  const journey: CustomerJourney = {
    timeline: [
      {
        type: 'artifact_view',
        date: '2026-10-06T14:35:06.928Z',
        touchPoint: null,
        data: {
          artifactId: 'artifact-1',
          artifactName: 'Tính năng LiHi 2026-10-22',
          openCount: 4,
          lastViewedAt: '2026-10-10T15:42:48.508Z',
        },
      },
    ],
    metrics: { timeToLead: null, timeToSale: null, totalEvents: 1 },
    firstVisit: null,
  }

  it('hiện node với tên nội dung và số lần mở', () => {
    render(<JourneyTimelineCard journey={journey} isLoading={false} />)

    expect(screen.getByText(customersVi.detail.journey.artifact_view)).toBeTruthy()
    expect(screen.getByText('Tính năng LiHi 2026-10-22')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('không vẽ 4 node giả cho 4 lần mở — `artifact_views` không giữ từng lần', () => {
    render(<JourneyTimelineCard journey={journey} isLoading={false} />)
    expect(screen.getAllByText(customersVi.detail.journey.artifact_view)).toHaveLength(1)
  })

  it('timeline rỗng vẫn nói rõ là rỗng', () => {
    render(
      <JourneyTimelineCard
        journey={{ timeline: [], metrics: journey.metrics, firstVisit: null }}
        isLoading={false}
      />
    )
    expect(screen.getByText(customersVi.detail.journey.empty)).toBeTruthy()
  })
})
