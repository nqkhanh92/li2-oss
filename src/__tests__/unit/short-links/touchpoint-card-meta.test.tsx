import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Dòng meta dưới mỗi hàng. Thứ cần khoá: nhãn nào **không** được hiện khi nó không nói gì.
 *
 * "No space" hiện trên **70/70 hàng** của LiHi — một nhãn mọi hàng đều mang thì không phân biệt
 * được hàng nào với hàng nào. Cùng lập luận đã dùng cho badge "Live" và `ArtifactAccessBadge`
 * bỏ qua `public`.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))
vi.mock('next/link', () => ({
  default: ({ children }: any) => <>{children}</>,
}))
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ orgRouterPush: vi.fn() }),
}))
vi.mock('@/features/touch-points/hooks/use-touchpoint-actions', () => ({
  useTouchPointActions: () => ({ handleCopy: vi.fn() }),
}))
vi.mock('@/shared/lib/currency', () => ({
  useOrganizationCurrency: () => 'VND',
  useExchangeRate: () => ({ data: 1 }),
  formatCurrencyFromCents: (n: number) => String(n),
}))
vi.mock('@/features/touch-points/hooks/queries', () => ({ useGetTouchPoints: () => ({}) }))
// Menu ⋮ cần TableActionProvider của bảng; bài này chỉ xét dòng meta nên thay bằng chỗ rỗng.
vi.mock('@/shared/components/customize/table/data-table-row-action', () => ({
  DataTableRowActions: () => null,
}))

const { TouchPointCard } = await import(
  '@/features/short-links/components/short-link-list/touchpoint-card'
)

const makeRow = (overrides: Record<string, any> = {}) => ({
  original: {
    id: 'tp-1',
    organization_id: 'org-1',
    name: 'Slide workshop',
    short_url: 'https://example.com/slide-cv',
    content_type: 'ARTIFACT',
    content_value: 'https://app/a/tok',
    collections: null,
    tp_tag_links: [],
    artifact: { id: 'art-1', kind: 'slides', status: 'live', access_mode: 'public' },
    ...overrides,
  },
  getIsSelected: () => false,
  toggleSelected: vi.fn(),
})

const flags = {} as any

describe('dòng meta của hàng', () => {
  it('KHÔNG hiện "No space" khi hàng không thuộc space nào', () => {
    render(<TouchPointCard row={makeRow() as any} featureFlags={flags} />)

    expect(screen.queryByText(/no_space/)).toBeNull()
  })

  /** Bỏ nhãn thì bỏ cả biểu tượng: một cái thư mục rỗng đứng một mình không nói gì hơn. */
  it('bỏ luôn biểu tượng thư mục, không để lại một icon mồ côi', () => {
    const { container } = render(<TouchPointCard row={makeRow() as any} featureFlags={flags} />)

    expect(container.querySelector('.lucide-folder')).toBeNull()
  })

  it('VẪN hiện tên space khi hàng thật sự thuộc một space', () => {
    const row = makeRow({ collections: { id: 'col-1', name: 'Chiến dịch Tết', color: null } })
    render(<TouchPointCard row={row as any} featureFlags={flags} />)

    expect(screen.getAllByText('Chiến dịch Tết').length).toBeGreaterThan(0)
  })
})
