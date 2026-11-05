import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

import { GeoWorldMap } from '@/shared/components/customize/geo-world-map'
import { VietnamMapChart } from '@/shared/components/customize/vietnam-map-chart'
import { GEO_LAND_FILL, binColorOf } from '@/shared/components/customize/geo-color-scale'
import type { GeoBubble } from '@/shared/components/customize/geo-bubble-map'

/**
 * `analytic-map-chart.test.tsx` mock cả hai bản đồ để kiểm logic bảng, nên nếu không có file này
 * thì **không test nào render component bản đồ thật** — một lỗi runtime trong đó sẽ đi thẳng lên
 * LiHi mà bộ test vẫn xanh.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'vi' } }),
}))

const COUNTRY_BUBBLES: GeoBubble[] = [
  {
    code: 'VN',
    name: 'Việt Nam',
    count: 154,
    lat: 14.058324,
    lng: 108.277199,
    pctLabel: '154 truy cập · 83,2% tổng',
  },
  {
    code: 'US',
    name: 'Hoa Kỳ',
    count: 12,
    lat: 37.09024,
    lng: -95.712891,
    pctLabel: '12 truy cập · 6,5% tổng',
  },
]

const PROVINCE_BUBBLES: GeoBubble[] = [
  {
    code: 'VN-SG',
    name: 'TP. Hồ Chí Minh',
    count: 142,
    lat: 10.7763897,
    lng: 106.7011391,
    pctLabel: '142 truy cập · 92,2% trong Việt Nam',
    totalPctLabel: '76,8% tổng truy cập',
  },
  {
    code: 'VN-HN',
    name: 'Hà Nội',
    count: 12,
    lat: 21.0283334,
    lng: 105.854041,
    pctLabel: '12 truy cập · 7,8% trong Việt Nam',
    totalPctLabel: '6,5% tổng truy cập',
  },
]

const bubbles = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="geo-bubble"]')] as SVGCircleElement[]

const landFills = (container: HTMLElement) =>
  new Set(
    [...container.querySelectorAll('path')].map(
      (p) => p.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1] ?? ''
    )
  )

describe('GeoWorldMap — nền trung tính + bong bóng', () => {
  it('vẽ đúng một bong bóng cho mỗi hàng có toạ độ', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    expect(bubbles(container)).toHaveLength(2)
    expect(bubbles(container).map((c) => c.getAttribute('data-code'))).toEqual(['VN', 'US'])
  })

  it('NỀN trung tính: mọi path đất dùng đúng một màu, không tô theo số lượt', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(100)
    // Choropleth cũ cho ra nhiều màu nền khác nhau; nay phải đúng một.
    expect(landFills(container)).toEqual(new Set([GEO_LAND_FILL]))
  })

  it('bong bóng mang màu BIN của số lượt, không phải màu phân vị', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    const [vn, us] = bubbles(container)
    expect(vn.getAttribute('fill')).toBe(binColorOf(154)) // 41+ → #17592B
    expect(us.getAttribute('fill')).toBe(binColorOf(12)) // 6–15 → #64B261
    expect(vn.getAttribute('fill')).not.toBe(us.getAttribute('fill'))
  })

  it('bán kính theo căn bậc hai: nhiều lượt hơn thì to hơn, nhưng không to gấp 12 lần', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    const [vn, us] = bubbles(container).map((c) => Number(c.getAttribute('r')))
    expect(vn).toBeGreaterThan(us)
    expect(vn / us).toBeLessThan(3)
  })

  it('hàng KHÔNG có toạ độ thì không vẽ bong bóng — không bịa vị trí', () => {
    const { container } = render(
      <GeoWorldMap
        label="L"
        bubbles={[
          ...COUNTRY_BUBBLES,
          { code: 'ZZ', name: '?', count: 9, lat: null, lng: null, pctLabel: '' },
        ]}
      />
    )
    expect(bubbles(container)).toHaveLength(2)
  })

  it('hàng 0 lượt không vẽ bong bóng — bin bắt đầu từ 1', () => {
    const { container } = render(
      <GeoWorldMap
        label="L"
        bubbles={[{ code: 'KR', name: 'Hàn Quốc', count: 0, lat: 36, lng: 128, pctLabel: '' }]}
      />
    )
    expect(bubbles(container)).toHaveLength(0)
  })

  it('viewBox đúng khung đã ghim, và KHÔNG có nhóm zoom/pan nào bọc ngoài', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 800 420')
    const transforms = [...container.querySelectorAll('g')].map((g) => g.getAttribute('transform'))
    expect(transforms.filter((t) => t?.includes('scale'))).toHaveLength(0)
  })

  it('nhãn bản đồ và chú giải 5 ô đều có mặt', () => {
    render(<GeoWorldMap label="BẢN ĐỒ THẾ GIỚI · Equal Earth" bubbles={COUNTRY_BUBBLES} />)
    expect(screen.getByText('BẢN ĐỒ THẾ GIỚI · Equal Earth')).toBeTruthy()
    expect(screen.getAllByTestId('geo-legend-step')).toHaveLength(5)
  })

  it('chỉ gọi onCountryClick cho nước nằm trong drillableCountries', () => {
    const onCountryClick = vi.fn()
    const { container } = render(
      <GeoWorldMap
        label="L"
        bubbles={COUNTRY_BUBBLES}
        drillableCountries={['VN']}
        onCountryClick={onCountryClick}
      />
    )
    bubbles(container).forEach((c) => fireEvent.click(c))
    expect(onCountryClick.mock.calls.every(([code]) => code === 'VN')).toBe(true)
    expect(onCountryClick).toHaveBeenCalledWith('VN')
    expect(onCountryClick).toHaveBeenCalledTimes(1)
  })

  it('bong bóng đang được trỏ có viền đậm hơn', () => {
    const { container, rerender } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    expect(bubbles(container)[0].getAttribute('stroke-width')).toBe('2')

    rerender(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} highlightedCode="VN" />)
    expect(bubbles(container)[0].getAttribute('stroke-width')).toBe('3')
    expect(bubbles(container)[0].getAttribute('stroke')).toBe('#1A1D21')
    expect(bubbles(container)[1].getAttribute('stroke-width')).toBe('2')
  })

  it('trỏ vào bong bóng thì báo mã lên trên và hiện tooltip ba dòng', () => {
    const onHoverCode = vi.fn()
    const { container } = render(
      <GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} onHoverCode={onHoverCode} />
    )
    fireEvent.mouseEnter(bubbles(container)[0])
    expect(onHoverCode).toHaveBeenCalledWith('VN')
    expect(screen.getByText('Việt Nam')).toBeTruthy()
    expect(screen.getByText('154 truy cập · 83,2% tổng')).toBeTruthy()

    fireEvent.mouseLeave(bubbles(container)[0])
    expect(onHoverCode).toHaveBeenLastCalledWith(undefined)
    expect(screen.queryByText('154 truy cập · 83,2% tổng')).toBeNull()
  })

  it('cấp nước KHÔNG có dòng thứ ba — ở đó grand_total bằng parent_total', () => {
    const { container } = render(<GeoWorldMap label="L" bubbles={COUNTRY_BUBBLES} />)
    fireEvent.mouseEnter(bubbles(container)[0])
    // Khẳng định tooltip CÓ mặt trước đã. Thiếu dòng này thì test xanh kể cả khi hover hỏng hoàn
    // toàn và chẳng có tooltip nào — đã xảy ra thật ở bản đầu của file này.
    expect(screen.getByText('Việt Nam')).toBeTruthy()
    expect(screen.queryByText(/tổng truy cập/)).toBeNull()
  })
})

describe('VietnamMapChart — nền trung tính + bong bóng', () => {
  it('tải topojson tỉnh rồi vẽ bong bóng, nền một màu', async () => {
    const { container } = render(<VietnamMapChart label="VN" bubbles={PROVINCE_BUBBLES} />)
    // Trước khi topojson về thì phải nói đang tải, không để một khung trắng không giải thích được.
    expect(screen.getByText('map.province_loading')).toBeTruthy()

    await waitFor(() => expect(container.querySelectorAll('path').length).toBeGreaterThan(100))
    expect(landFills(container)).toEqual(new Set([GEO_LAND_FILL]))
    expect(bubbles(container)).toHaveLength(2)
  })

  it('TP.HCM và Hà Nội rơi vào hai bin khác nhau', async () => {
    const { container } = render(<VietnamMapChart label="VN" bubbles={PROVINCE_BUBBLES} />)
    await waitFor(() => expect(bubbles(container)).toHaveLength(2))
    const [hcm, hn] = bubbles(container)
    expect(hcm.getAttribute('fill')).toBe('#17592B') // 142 → 41+
    expect(hn.getAttribute('fill')).toBe('#64B261') // 12 → 6–15
  })

  it('tooltip cấp vùng có ĐỦ BA dòng, gồm tỷ lệ trên tổng', async () => {
    const { container } = render(<VietnamMapChart label="VN" bubbles={PROVINCE_BUBBLES} />)
    await waitFor(() => expect(bubbles(container)).toHaveLength(2))
    fireEvent.mouseEnter(bubbles(container)[0])
    expect(screen.getByText('TP. Hồ Chí Minh')).toBeTruthy()
    expect(screen.getByText('142 truy cập · 92,2% trong Việt Nam')).toBeTruthy()
    // Dòng này là chỗ con số 76,8% của card cũ được trả về đúng vai: không phải con số duy nhất,
    // mà là con số thứ hai bên cạnh 92,2%.
    expect(screen.getByText('76,8% tổng truy cập')).toBeTruthy()
  })

  it('bong bóng nằm TRONG khung vẽ, không trôi ra ngoài', async () => {
    const { container } = render(<VietnamMapChart label="VN" bubbles={PROVINCE_BUBBLES} />)
    await waitFor(() => expect(bubbles(container)).toHaveLength(2))
    // `Marker` của react-simple-maps đặt toạ độ qua transform của <g> cha.
    for (const circle of bubbles(container)) {
      const tf = circle.parentElement!.getAttribute('transform')!
      const [x, y] = tf.match(/-?[\d.]+/g)!.map(Number)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(420)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(560)
    }
  })
})
