import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * `StatCardsRow` — bốn số của một khách, hai bộ, một cờ.
 *
 * ★ VÌ SAO FILE NÀY TỒN TẠI. Chủ sản phẩm chốt 2026-11-01: thông tin thương mại **ẩn, không xoá**.
 * Bản đầu của agent đã *xoá* logic tiền khỏi component; nó được lấy lại từ git và bọc trong
 * `disabledFeatures.CONVERSIONS`.
 *
 * ⚠️ Và đây là chỗ phải có test, không phải chỗ nên có: trên LiHi
 * `NEXT_PUBLIC_DISABLE_CONVERSIONS=true`, nên **nhánh thương mại không bao giờ chạy ở đó**. Không
 * có test thì nó vỡ im lặng — và chỉ lộ ra vào đúng ngày ai đó đổi env để bán hàng, tức ngày tệ
 * nhất để phát hiện. `tsc` không bắt được: mọi biến vẫn đúng kiểu, chỉ là không ai gọi tới.
 */

const flags = { CONVERSIONS: true }

vi.mock('@/shared/constants/disabled-features', () => ({
  get disabledFeatures() {
    return flags
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}))

const { StatCardsRow } = await import(
  '@/features/customers/components/customer-detail-v2/stat-cards'
)

const customer = {
  id: 'c1',
  total_revenue_usd: 123400,
  total_revenue_vnd: 0,
  sale_count: 7,
  visit_count: 42,
} as never

const views = [
  { open_count: 3, last_viewed_at: '2026-10-20T10:00:00Z' },
  { open_count: 2, last_viewed_at: '2026-10-25T10:00:00Z' },
] as never

const metrics = { timeToSale: 0, timeToLead: 90 } as never

const renderRow = () =>
  render(
    <StatCardsRow
      customer={customer}
      views={views}
      metrics={metrics}
      defaultCurrency="USD"
      usdToVndRate={25000}
    />
  )

beforeEach(() => {
  flags.CONVERSIONS = true
})

describe('CONVERSIONS tắt (LiHi hôm nay) → bộ NỘI DUNG', () => {
  it('hiện bốn số về nội dung', () => {
    renderRow()

    expect(screen.getByText('Nội dung đã mở')).toBeDefined()
    expect(screen.getByText('Tổng lượt mở')).toBeDefined()
    expect(screen.getByText('Lần mở gần nhất')).toBeDefined()
    expect(screen.getByText('Lượt truy cập')).toBeDefined()
  })

  /**
   * ⭐ Vế quan trọng hơn: KHÔNG được lọt số tiền nào. Để `$0.00` ở đầu trang là nói sai về mục
   * đích sản phẩm — chính là lý do đổi bộ thẻ.
   */
  it('⭐ KHÔNG hiện thẻ thương mại nào', () => {
    renderRow()

    expect(screen.queryByText('Lifetime Value')).toBeNull()
    expect(screen.queryByText('Total Sales')).toBeNull()
    expect(screen.queryByText('Time to Sale')).toBeNull()
    expect(screen.queryByText('Time to Lead')).toBeNull()
  })

  it('đếm đúng: 2 nội dung, 5 lượt mở, 42 lượt truy cập', () => {
    renderRow()

    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
  })
})

describe('⭐ CONVERSIONS bật → bộ THƯƠNG MẠI trở lại', () => {
  /**
   * Đây là ca mà "ẩn, không xoá" hứa hẹn. Nếu test này đỏ thì lời hứa đó không có thật, và cách
   * duy nhất để biết là đọc git history.
   */
  it('⭐ hiện lại đủ bốn thẻ cũ', () => {
    flags.CONVERSIONS = false
    renderRow()

    expect(screen.getByText('Lifetime Value')).toBeDefined()
    expect(screen.getByText('Total Sales')).toBeDefined()
    expect(screen.getByText('Time to Sale')).toBeDefined()
    expect(screen.getByText('Time to Lead')).toBeDefined()
  })

  it('⭐ và KHÔNG hiện bộ nội dung — hai bộ loại trừ nhau, không cộng thành tám thẻ', () => {
    flags.CONVERSIONS = false
    renderRow()

    expect(screen.queryByText('Nội dung đã mở')).toBeNull()
    expect(screen.queryByText('Tổng lượt mở')).toBeNull()
  })

  /**
   * Phép tính tiền là phần dễ vỡ nhất khi code nằm trong nhánh không ai chạy: `1234.00` USD từ
   * `total_revenue_usd = 123400` cents. Một lần đổi `formatCurrencyFromCents` mà quên nhánh này
   * thì không gì báo.
   */
  it('quy đổi tiền vẫn đúng sau khi code bị di chuyển vào nhánh cờ', () => {
    flags.CONVERSIONS = false
    renderRow()

    expect(screen.getByText(/1,234/)).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
  })

  it('timeToSale = 0 đọc thành "Same day", không thành "0 days"', () => {
    flags.CONVERSIONS = false
    renderRow()

    expect(screen.getByText('Same day')).toBeDefined()
  })

  it('timeToLead 90 phút đọc thành giờ, không thành "90 min"', () => {
    flags.CONVERSIONS = false
    renderRow()

    expect(screen.getByText('2 hrs')).toBeDefined()
  })
})
