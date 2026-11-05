import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { GeoAnalytics } from '@/core/types/analytics/geo.type'

/**
 * Card "Theo vị trí" sau khi bám theo bản thiết kế gốc.
 *
 * Số trong các fixture là số ĐO ĐƯỢC trên LiHi 2026-10-26: cấp nước `parent_total` 185
 * (VN 154 = 83,2%, không rõ 31), cấp vùng `parent_total` **154** nhưng `grand_total` vẫn **185**
 * (TP.HCM 142 = 92,2% trong nước = 76,8% trên tổng; Hà Nội 12 = 7,8% / 6,5%), `coverage` 2/34.
 *
 * Mẫu số là chỗ lỗi cũ nằm, và thiết kế giải nó bằng cách in **CẢ HAI** phần trăm thay vì chọn
 * một. 76,8% không sai — nó chỉ sai khi là con số duy nhất.
 */
let language = 'vi'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: {
      get language() {
        return language
      },
    },
  }),
}))

type MockMapProps = {
  label: string
  bubbles: { code: string; count: number; pctLabel: string; totalPctLabel?: string }[]
  drillableCountries?: string[]
  onCountryClick?: (a: string) => void
  highlightedCode?: string
}

vi.mock('@/shared/components/customize/geo-world-map', () => ({
  GeoWorldMap: (props: MockMapProps) => (
    <div
      data-testid="world-map"
      data-label={props.label}
      data-drillable={(props.drillableCountries ?? []).join(',')}
      data-highlighted={props.highlightedCode ?? ''}
      data-bubbles={JSON.stringify(props.bubbles)}
      onClick={() => props.onCountryClick?.('VN')}
    />
  ),
}))
vi.mock('@/shared/components/customize/vietnam-map-chart', () => ({
  VietnamMapChart: (props: MockMapProps) => (
    <div
      data-testid="vietnam-map"
      data-label={props.label}
      data-highlighted={props.highlightedCode ?? ''}
      data-bubbles={JSON.stringify(props.bubbles)}
    />
  ),
}))

const queryCalls = vi.fn()
let payloads: Partial<Record<'country' | 'region', GeoAnalytics>> = {}
let queryState = { isLoading: false, isError: false }

vi.mock('@/features/analytics/hooks/queries', () => ({
  useGetGeoAnalytics: (orgId: string, params: Record<string, unknown>) => {
    queryCalls({ orgId, params })
    const data =
      queryState.isLoading || queryState.isError
        ? undefined
        : payloads[params.level as 'country' | 'region']
    return { data, ...queryState }
  },
}))

const { AnalyticMapChart } =
  await import('@/features/analytics/components/charts/analytic-map-chart')

const COUNTRY_LEVEL: GeoAnalytics = {
  level: 'country',
  parent: null,
  parent_total: 185,
  grand_total: 185,
  region_supported: true,
  rows: [
    { code: 'VN', name: 'Viet Nam', count: 154, pct: 83.2, lat: 14, lng: 108 },
    { code: 'US', name: 'United States', count: 12, pct: 6.5, lat: 38, lng: -97 },
  ],
  other: null,
  suppressed: { count: 0, pct: 0, units: 0 },
  unknown: { count: 31, pct: 16.8 },
  coverage: { resolved_units: 2, total_units: 246 },
  anonymity_threshold: 0,
}

const REGION_LEVEL: GeoAnalytics = {
  level: 'region',
  parent: { code: 'VN', name: 'Viet Nam' },
  parent_total: 154,
  grand_total: 185,
  region_supported: true,
  rows: [
    { code: 'VN-SG', name: 'Ho Chi Minh', count: 142, pct: 92.2, lat: 10.8, lng: 106.6 },
    { code: 'VN-HN', name: 'Ha Noi', count: 12, pct: 7.8, lat: 21, lng: 105.8 },
  ],
  other: null,
  suppressed: { count: 0, pct: 0, units: 0 },
  unknown: { count: 0, pct: 0 },
  coverage: { resolved_units: 2, total_units: 34 },
  anonymity_threshold: 0,
}

/** Element MỚI mỗi lần: `rerender` với đúng một object element thì React bỏ qua, không render lại. */
const card = () => (
  <AnalyticMapChart
    orgId="org-1"
    params={{ date_range: { from: '2026-10-01', to: '2026-10-26' } }}
  />
)
const renderCard = () => render(card())

const rows = () => screen.queryAllByTestId('geo-row')
const rowFor = (code: string) => rows().find((r) => r.getAttribute('data-code') === code)
const footRows = () => screen.queryAllByTestId('geo-foot-row')
const footFor = (kind: string) => footRows().find((r) => r.getAttribute('data-kind') === kind)
const drillIntoVietnam = () => fireEvent.click(rowFor('VN')!)
const lastParams = () => queryCalls.mock.calls.at(-1)![0].params
const bubblesOf = (testId: string) =>
  JSON.parse(screen.getByTestId(testId).getAttribute('data-bubbles')!)

beforeEach(() => {
  vi.clearAllMocks()
  language = 'vi'
  queryState = { isLoading: false, isError: false }
  payloads = { country: COUNTRY_LEVEL, region: REGION_LEVEL }
})

describe('AnalyticMapChart — HAI phần trăm mỗi hàng', () => {
  it('cấp vùng in cả 92,2% (trong nước) lẫn 76,8% (trên tổng)', () => {
    renderCard()
    drillIntoVietnam()

    const hcm = rowFor('VN-SG')!
    expect(hcm.textContent).toContain('142')
    expect(hcm.textContent).toContain('92,2%')
    // 142/185 = 76,8%. Card cũ in MỘT mình con số này và vì thế sai; nay nó là con số thứ hai,
    // đứng cạnh 92,2%, nên không còn cách nào hiểu lệch.
    expect(hcm.textContent).toContain('76,8%')
  })

  it('phần trăm lớn là pct của payload, KHÔNG phải tự chia lại', () => {
    payloads.region = {
      ...REGION_LEVEL,
      // pct cố tình lệch khỏi mọi phép chia UI có thể tự làm: 142/154 = 92,2 và 142/185 = 76,8.
      rows: [{ ...REGION_LEVEL.rows[0], pct: 55.5 }],
    }
    renderCard()
    drillIntoVietnam()
    expect(rowFor('VN-SG')!.textContent).toContain('55,5%')
    expect(rowFor('VN-SG')!.textContent).not.toContain('92,2%')
  })

  it('CẤP NƯỚC chỉ in một phần trăm — ở đó grand_total bằng parent_total', () => {
    renderCard()
    const vn = rowFor('VN')!
    expect(vn.textContent).toContain('83,2%')
    // In thêm "83,2% tổng" ngay dưới "83,2%" là lặp lại chính nó, không thêm thông tin.
    expect(vn.textContent).not.toContain('of_total_short')
  })

  it('nhãn cột phần trăm đổi theo cấp, và dùng tên nước theo locale', () => {
    renderCard()
    expect(screen.getByText('analytic:map.col_pct_of_total')).toBeTruthy()
    drillIntoVietnam()
    expect(screen.getByText(/col_pct_in_parent/).textContent).toContain('Việt Nam')
  })

  it('tiếng Việt dùng dấu phẩy thập phân', () => {
    renderCard()
    expect(rowFor('VN')!.textContent).toContain('83,2%')
    expect(screen.queryByText(/83\.2/)).toBeNull()
  })

  it('tiếng Anh dùng dấu chấm thập phân', () => {
    language = 'en'
    renderCard()
    expect(rowFor('VN')!.textContent).toContain('83.2%')
  })

  it('grand_total = 0 không làm vỡ phép chia', () => {
    payloads.region = { ...REGION_LEVEL, grand_total: 0 }
    renderCard()
    drillIntoVietnam()
    expect(rowFor('VN-SG')!.textContent).toContain('0,0%')
  })

  /**
   * Chỗ CỐ Ý lệch khỏi bản thiết kế, và lý do đến từ dữ liệu thật: ở cửa sổ 7 ngày trên LiHi mọi
   * lượt đều từ Việt Nam, nên `grand_total === parent_total` và dòng nhỏ in lại đúng con số phía
   * trên ("89,4%" rồi "89,4% tổng"). Thiết kế gắn nó vào `!isCountry`; ta gắn vào "hai mẫu số có
   * khác nhau không".
   */
  it('mẫu số TRÙNG nhau thì KHÔNG in dòng thứ hai — nó sẽ lặp lại chính nó', () => {
    payloads.region = { ...REGION_LEVEL, grand_total: 154 }
    renderCard()
    drillIntoVietnam()
    expect(rowFor('VN-SG')!.textContent).toContain('92,2%')
    expect(rowFor('VN-SG')!.textContent).not.toContain('of_total_short')
    // ...và tooltip cũng không có dòng thứ ba.
    expect(bubblesOf('vietnam-map')[0].totalPctLabel).toBeUndefined()
  })
})

describe('AnalyticMapChart — tên nước theo locale', () => {
  /**
   * Tôi từng kết luận "repo không có bảng tên nước tiếng Việt nên không sửa được". Sai —
   * `Intl.DisplayNames` có sẵn trong nền tảng và phủ cả 246 mã.
   *
   * Ghim theo MÃ chứ không ghim 20 chuỗi ICU: tên trong ICU đổi giữa các bản, và một test đòi
   * đúng 20 chuỗi là tự tạo việc bảo trì cho người sau. `VN` là mã duy nhất đáng ghim cứng.
   */
  it('hàng cấp nước hiện "Việt Nam", không phải "Viet Nam" của payload', () => {
    renderCard()
    expect(rowFor('VN')!.textContent).toContain('Việt Nam')
    expect(rowFor('VN')!.textContent).not.toContain('Viet Nam')
  })

  it('tiếng Anh cũng đi qua Intl, không lấy thẳng payload', () => {
    language = 'en'
    renderCard()
    // Payload ghi "Viet Nam" (có dấu cách), ICU ghi "Vietnam".
    expect(rowFor('VN')!.textContent).toContain('Vietnam')
    expect(rowFor('VN')!.textContent).not.toContain('Viet Nam')
  })

  it('breadcrumb, tóm tắt và tooltip đều dùng cùng một tên', () => {
    renderCard()
    drillIntoVietnam()
    expect(screen.getByText('Việt Nam')).toBeTruthy() // breadcrumb
    expect(screen.getByText(/map.summary_region_provinces/).textContent).toContain('Việt Nam')
    expect(bubblesOf('vietnam-map')[0].pctLabel).toContain('Việt Nam')
  })

  it('TÊN TỈNH không đi qua Intl — nó chỉ biết cấp nước', () => {
    renderCard()
    drillIntoVietnam()
    // `Intl.DisplayNames.of('VN-SG')` NÉM RangeError; tỉnh phải đi đường PROVINCE_BY_CODE.
    expect(rowFor('VN-SG')!.textContent).toContain('TP. Hồ Chí Minh')
    expect(rowFor('VN-HN')!.textContent).toContain('Hà Nội')
  })

  it('mã nước lạ thì lùi về tên của payload, không hiện mã trần', () => {
    payloads.country = {
      ...COUNTRY_LEVEL,
      rows: [{ code: 'XX', name: 'Nước nào đó', count: 5, pct: 2.7, lat: null, lng: null }],
    }
    renderCard()
    // ICU trả lại chính chuỗi 'XX' cho mã không có trong bảng — đó không phải một cái tên.
    expect(rowFor('XX')!.textContent).toContain('Nước nào đó')
  })
})

describe('AnalyticMapChart — bong bóng và nhãn bản đồ', () => {
  it('bong bóng mang lat/lng của payload, không bịa toạ độ', () => {
    renderCard()
    const bubbles = bubblesOf('world-map')
    expect(bubbles).toHaveLength(2)
    expect(bubbles[0]).toMatchObject({ code: 'VN', count: 154, lat: 14, lng: 108 })
  })

  it('tooltip cấp vùng có dòng thứ ba (tỷ lệ trên tổng), cấp nước thì không', () => {
    renderCard()
    expect(bubblesOf('world-map')[0].totalPctLabel).toBeUndefined()

    drillIntoVietnam()
    const hcm = bubblesOf('vietnam-map')[0]
    expect(hcm.pctLabel).toContain('pct_in_parent')
    expect(hcm.totalPctLabel).toContain('76,8%')
  })

  it('nhãn bản đồ nói rõ đang xem gì', () => {
    renderCard()
    expect(screen.getByTestId('world-map').getAttribute('data-label')).toBe(
      'analytic:map.label_world'
    )
    drillIntoVietnam()
    expect(screen.getByTestId('vietnam-map').getAttribute('data-label')).toBe(
      'analytic:map.label_vietnam'
    )
  })
})

describe('AnalyticMapChart — hàng chân bảng', () => {
  it('cấp nước: hàng "không xác định" cho unknown', () => {
    renderCard()
    expect(footFor('unknown')!.textContent).toContain('31')
    expect(footFor('other')).toBeFalsy()
  })

  it('cấp vùng: hàng "N tỉnh khác" cho other, dùng units chứ không phải count', () => {
    payloads.region = { ...REGION_LEVEL, other: { count: 7, pct: 4.5, units: 3 } }
    renderCard()
    drillIntoVietnam()
    const other = footFor('other')!
    expect(other.textContent).toContain('"count":3') // 3 TỈNH
    expect(other.textContent).toContain('7') // 7 LƯỢT
  })

  it('suppressed vẫn có hàng RIÊNG nếu ai gọi với ngưỡng khác 0', () => {
    payloads.region = {
      ...REGION_LEVEL,
      rows: [REGION_LEVEL.rows[0]],
      other: { count: 7, pct: 4.5, units: 3 },
      suppressed: { count: 12, pct: 7.8, units: 1 },
      unknown: { count: 2, pct: 1.3 },
      anonymity_threshold: 20,
    }
    renderCard()
    drillIntoVietnam()

    // Ba ô trả lời ba câu khác nhau; gộp chúng là làm mất đúng cái phân biệt đó.
    expect(footRows()).toHaveLength(3)
    expect(footFor('suppressed')!.textContent).toContain('"threshold":20')
    expect(footFor('suppressed')!.textContent).toContain('"count":1') // 1 nơi bị ẩn
    expect(footFor('suppressed')!.textContent).toContain('12') // 12 lượt
    expect(footFor('other')).toBeTruthy()
    expect(footFor('unknown')).toBeTruthy()
  })

  it('ô nào bằng 0 thì không hiện hàng trống', () => {
    renderCard()
    drillIntoVietnam()
    expect(footRows()).toHaveLength(0)
  })

  it('ngưỡng KHÔNG áp cho unknown — một lượt ZZ vẫn hiện là một lượt', () => {
    payloads.region = { ...REGION_LEVEL, unknown: { count: 1, pct: 0.6 }, anonymity_threshold: 20 }
    renderCard()
    drillIntoVietnam()
    expect(footFor('unknown')!.textContent).toContain('1')
    expect(footFor('suppressed')).toBeFalsy()
  })
})

describe('AnalyticMapChart — dòng tóm tắt', () => {
  it('cấp nước nói tổng lượt và nước dẫn đầu', () => {
    renderCard()
    const s = screen.getByText(/map.summary_country /).textContent!
    expect(s).toContain('185')
    expect(s).toContain('Việt Nam')
    expect(s).toContain('83,2%')
  })

  it('cấp vùng nói tổng của nước và coverage — đây là chỗ coverage thuộc về', () => {
    renderCard()
    drillIntoVietnam()
    const s = screen.getByText(/map.summary_region_provinces/).textContent!
    expect(s).toContain('154')
    expect(s).toContain('"resolved":2')
    expect(s).toContain('"units":34')
  })

  /**
   * `coverage.resolved_units` ĐẾM CẢ vùng bị ẩn hoặc ngoài top, nên có thể lớn hơn `rows.length`.
   * Test này tồn tại để người sau không "sửa" nó thành `rows.length`.
   */
  it('coverage đếm cả vùng không hiện, nên 2/34 với một hàng là đúng', () => {
    payloads.region = {
      ...REGION_LEVEL,
      rows: [REGION_LEVEL.rows[0]],
      suppressed: { count: 12, pct: 7.8, units: 1 },
      anonymity_threshold: 20,
    }
    renderCard()
    drillIntoVietnam()
    expect(rows()).toHaveLength(1)
    expect(screen.getByText(/map.summary_region_provinces/).textContent).toContain('"resolved":2')
  })
})

describe('AnalyticMapChart — drill và breadcrumb', () => {
  it('mặc định ở cấp nước: hỏi server level=country, limit=8', () => {
    renderCard()
    expect(screen.getByTestId('world-map')).toBeTruthy()
    expect(lastParams()).toMatchObject({ level: 'country', country: undefined, limit: 8 })
  })

  it('bấm hàng Việt Nam thì hỏi level=region&country=VN và đổi sang bản đồ tỉnh', () => {
    renderCard()
    drillIntoVietnam()
    expect(lastParams()).toMatchObject({ level: 'region', country: 'VN' })
    expect(screen.getByTestId('vietnam-map')).toBeTruthy()
    expect(screen.queryByTestId('world-map')).toBeNull()
  })

  it('bấm bong bóng Việt Nam trên bản đồ cũng đi xuống được', () => {
    renderCard()
    fireEvent.click(screen.getByTestId('world-map'))
    expect(screen.getByTestId('vietnam-map')).toBeTruthy()
  })

  it('bấm breadcrumb thì lùi về thế giới', () => {
    renderCard()
    drillIntoVietnam()
    fireEvent.click(screen.getByRole('button', { name: 'analytic:map.world' }))
    expect(screen.getByTestId('world-map')).toBeTruthy()
  })

  it('chỉ Việt Nam bấm xuống được, và chỉ khi nó có mặt trong payload', () => {
    const view = renderCard()
    expect(screen.getByTestId('world-map').getAttribute('data-drillable')).toBe('VN')

    payloads.country = {
      ...COUNTRY_LEVEL,
      rows: [{ code: 'KR', name: 'Korea', count: 4, pct: 2.2, lat: 36, lng: 128 }],
    }
    view.rerender(card())
    expect(screen.getByTestId('world-map').getAttribute('data-drillable')).toBe('')
    expect(screen.queryByText(/map.drill_hint/)).toBeNull()
  })

  it('nước không drill được KHÔNG bị tô xám như disabled', () => {
    renderCard()
    const us = rowFor('US')!
    // Lỗi cũ: `muted={!canDrill}` + `text-slate-400` cho mọi nước ngoài Việt Nam.
    expect(us.className).not.toContain('text-slate-400')
    expect(us.className).not.toContain('cursor-zoom-in')
    expect(us.textContent).toContain('6,5%')
    expect(rowFor('VN')!.className).toContain('cursor-zoom-in')
  })

  it('chip mã hiện mã TRẦN khi đã ở trong một nước', () => {
    renderCard()
    expect(rowFor('VN')!.textContent).toContain('VN')
    drillIntoVietnam()
    // `VN-` lặp trên mọi hàng khi đã ở trong Việt Nam thì không thêm thông tin nào.
    expect(rowFor('VN-SG')!.textContent).toContain('SG')
    expect(rowFor('VN-SG')!.textContent).not.toContain('VN-SG')
  })

  it('số thứ hạng chạy từ 1', () => {
    renderCard()
    expect(rowFor('VN')!.textContent).toMatch(/^1/)
    expect(rowFor('US')!.textContent).toMatch(/^2/)
  })

  it('đang ở cấp vùng mà nước đó không còn lượt nào thì tự lùi ra thế giới', () => {
    const view = renderCard()
    drillIntoVietnam()
    expect(screen.getByTestId('vietnam-map')).toBeTruthy()

    payloads.region = {
      ...REGION_LEVEL,
      parent_total: 0,
      rows: [],
      coverage: { resolved_units: 0, total_units: 34 },
    }
    view.rerender(card())
    expect(screen.queryByTestId('vietnam-map')).toBeNull()
    expect(screen.getByTestId('world-map')).toBeTruthy()
  })

  it('trỏ vào một hàng tỉnh thì truyền mã ISO xuống bản đồ', () => {
    renderCard()
    drillIntoVietnam()
    const hcm = rowFor('VN-SG')!
    fireEvent.mouseEnter(hcm)
    expect(screen.getByTestId('vietnam-map').getAttribute('data-highlighted')).toBe('VN-SG')
    fireEvent.mouseLeave(hcm)
    expect(screen.getByTestId('vietnam-map').getAttribute('data-highlighted')).toBe('')
  })
})

describe('AnalyticMapChart — trạng thái rìa và ghi công', () => {
  it('region_supported=false thì nói ra, KHÔNG hiện bảng rỗng', () => {
    payloads.region = {
      ...REGION_LEVEL,
      parent: { code: 'VA', name: 'Holy See' },
      region_supported: false,
      rows: [],
      parent_total: 9,
      unknown: { count: 9, pct: 100 },
      coverage: { resolved_units: 0, total_units: 0 },
    }
    renderCard()
    drillIntoVietnam()

    expect(screen.getByText(/map.region_unsupported /)).toBeTruthy()
    // Bảng rỗng ở đây trông như "không có lượt nào", trong khi vẫn có 9 lượt.
    expect(rows()).toHaveLength(0)
    expect(screen.getByText(/map.region_unsupported_total/).textContent).toContain('9')
  })

  it('không lượt nào thì nói "chưa có lượt", không vẽ bảng', () => {
    payloads.country = {
      ...COUNTRY_LEVEL,
      parent_total: 0,
      grand_total: 0,
      rows: [],
      unknown: { count: 0, pct: 0 },
      coverage: { resolved_units: 0, total_units: 246 },
    }
    renderCard()
    expect(screen.getByText('analytic:map.empty')).toBeTruthy()
    expect(rows()).toHaveLength(0)
  })

  it('ghi công ĐỦ BA nguồn: Natural Earth, DB-IP và CC BY 4.0', () => {
    renderCard()
    // Natural Earth là nguồn HÌNH bản đồ, DB-IP là nguồn DỮ LIỆU vị trí IP — hai thứ khác nhau,
    // và trước lượt này chỉ có DB-IP được ghi.
    expect(screen.getByRole('link', { name: 'Natural Earth' }).getAttribute('href')).toContain(
      'naturalearthdata.com'
    )
    expect(screen.getByRole('link', { name: 'DB-IP' }).getAttribute('href')).toContain('db-ip.com')
    expect(screen.getByRole('link', { name: 'CC BY 4.0' }).getAttribute('href')).toContain(
      'creativecommons.org/licenses/by/4.0'
    )
    expect(screen.getByText(/map.footer_worldview/)).toBeTruthy()
    expect(screen.getByText('analytic:map.footer_codes')).toBeTruthy()
  })

  it('lỗi tải thì nói ra, không hiện bảng rỗng', () => {
    queryState = { isLoading: false, isError: true }
    renderCard()
    expect(screen.getByText('analytic:map.load_failed')).toBeTruthy()
    expect(rows()).toHaveLength(0)
  })
})
