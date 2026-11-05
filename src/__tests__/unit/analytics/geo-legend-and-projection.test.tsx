import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { geoEqualEarth, geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

import { GEO_BINS } from '@/shared/components/customize/geo-color-scale'
import { GeoStepLegend } from '@/shared/components/customize/geo-step-legend'
import { GEO_WORLD_VIEW } from '@/shared/components/customize/geo-world-map'
import { VN_MAP_VIEW } from '@/shared/components/customize/vietnam-map-chart'
import worldJson from '@/public/json/countries-110m.json'
import vietnamJson from '@/public/json/vietnam.json'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'vi' } }),
}))

describe('chú giải 5 ô RỜI, nhãn cố định', () => {
  it('LUÔN đủ năm ô, không phụ thuộc dữ liệu', () => {
    // Bản phân vị cũ vẽ 2 ô khi chỉ có 2 tỉnh có lượt, nên người xem không biết thang đầy đủ
    // trông thế nào. Chú giải nay không nhận dữ liệu nào cả — nó không thể co lại.
    render(<GeoStepLegend />)
    expect(screen.getAllByTestId('geo-legend-step')).toHaveLength(5)
  })

  it('in đúng năm nhãn của bản thiết kế', () => {
    const { container } = render(<GeoStepLegend />)
    for (const bin of GEO_BINS) {
      expect(container.textContent).toContain(bin.label)
    }
    expect(container.textContent).toContain('1–2')
    expect(container.textContent).toContain('41+')
  })

  it('KHÔNG dùng gradient — chú giải trước nữa là một thanh linearGradient', () => {
    const { container } = render(<GeoStepLegend />)
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelectorAll('[fill^="url(#"]')).toHaveLength(0)
  })

  it('mỗi ô mang đúng màu bin của nó, theo thứ tự nhạt → đậm', () => {
    const { container } = render(<GeoStepLegend />)
    const colors = [...container.querySelectorAll('[data-testid="geo-legend-step"]')].map(
      (el) => (el as HTMLElement).style.backgroundColor
    )
    const toRgb = (hex: string) => {
      const n = hex.replace('#', '')
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
      return `rgb(${r}, ${g}, ${b})`
    }
    expect(colors).toEqual(GEO_BINS.map((bin) => toRgb(bin.color)))
  })
})

/**
 * Bản đồ thế giới cũ bọc `ZoomableGroup` + `translateExtent` và tự phóng tới nước nhiều lượt nhất,
 * nên US/Brazil rơi ra ngoài khung mà không có dấu hiệu gì. Hai bộ test dưới ghim điều kiện hình
 * học của CẢ HAI bản đồ: ở khung đã chốt, toàn bộ địa lý phải nằm TRONG viewBox.
 */
const boundsOf = (projection: any, geo: any) => geoPath(projection).bounds(geo)

describe('khung bản đồ thế giới', () => {
  const world = worldJson as any
  const land = feature(world, world.objects.countries) as any

  const projection = () =>
    geoEqualEarth()
      .scale(GEO_WORLD_VIEW.scale)
      .translate([GEO_WORLD_VIEW.width / 2, GEO_WORLD_VIEW.height / 2])

  it('cả thế giới nằm trong viewBox, không cắt đầu nào', () => {
    const [[x0, y0], [x1, y1]] = boundsOf(projection(), land)
    expect(x0).toBeGreaterThanOrEqual(0)
    expect(y0).toBeGreaterThanOrEqual(0)
    expect(x1).toBeLessThanOrEqual(GEO_WORLD_VIEW.width)
    expect(y1).toBeLessThanOrEqual(GEO_WORLD_VIEW.height)
  })

  it('cụ thể: US, Brazil và New Zealand đều hiện', () => {
    const path = geoPath(projection())
    // 840 = US, 076 = Brazil, 554 = New Zealand. Hai nước đầu bị khung khoá vùng châu Á của bản
    // cũ đẩy ra khỏi màn hình; nước thứ ba nằm ở rìa đông.
    for (const id of ['840', '076', '554']) {
      const geo = land.features.find((f: any) => f.id === id)
      expect(geo, `không tìm thấy nước ${id} trong tệp bản đồ`).toBeTruthy()
      const [[x0, y0], [x1, y1]] = path.bounds(geo)
      expect(x0).toBeGreaterThanOrEqual(0)
      expect(x1).toBeLessThanOrEqual(GEO_WORLD_VIEW.width)
      expect(y0).toBeGreaterThanOrEqual(0)
      expect(y1).toBeLessThanOrEqual(GEO_WORLD_VIEW.height)
    }
  })

  it('scale mặc định của d3 thì KHÔNG vừa — đó là lý do phải ghim 147', () => {
    const [[x0], [x1]] = boundsOf(
      geoEqualEarth().translate([GEO_WORLD_VIEW.width / 2, GEO_WORLD_VIEW.height / 2]),
      land
    )
    expect(x0).toBeLessThan(0)
    expect(x1).toBeGreaterThan(GEO_WORLD_VIEW.width)
  })
})

describe('khung bản đồ Việt Nam', () => {
  const vn = vietnamJson as any
  const land = feature(vn, vn.objects[Object.keys(vn.objects)[0]]) as any

  const projection = () =>
    geoMercator()
      .scale(VN_MAP_VIEW.scale)
      .center(VN_MAP_VIEW.center)
      .translate([VN_MAP_VIEW.width / 2, VN_MAP_VIEW.height / 2])

  it('cả nước nằm trong viewBox, KỂ CẢ Trường Sa ở rìa đông', () => {
    const [[x0, y0], [x1, y1]] = boundsOf(projection(), land)
    expect(x0).toBeGreaterThanOrEqual(0)
    expect(y0).toBeGreaterThanOrEqual(0)
    expect(x1).toBeLessThanOrEqual(VN_MAP_VIEW.width)
    expect(y1).toBeLessThanOrEqual(VN_MAP_VIEW.height)
  })

  it('tâm lấy ở đất liền thì CẮT — đó là lý do tâm lệch sang đông', () => {
    // 106,5 là tâm đất liền, dùng ở bản trước. Với cùng khung 420×560 nó đẩy Trường Sa ra ngoài.
    const [[,], [x1]] = boundsOf(
      geoMercator()
        .scale(VN_MAP_VIEW.scale)
        .center([106.5, 16.2])
        .translate([VN_MAP_VIEW.width / 2, VN_MAP_VIEW.height / 2]),
      land
    )
    expect(x1).toBeGreaterThan(VN_MAP_VIEW.width)
  })

  it('Trường Sa thật sự nằm trong khung, không chỉ "bounds tổng vừa"', () => {
    const path = geoPath(projection())
    // Một polygon có kinh độ > 114°E chắc chắn thuộc Trường Sa; đất liền không vươn tới đó.
    const spratly = land.features.find((f: any) => {
      const [[minLng], [maxLng]] = [[Math.min(...flatLng(f))], [Math.max(...flatLng(f))]]
      return maxLng > 114 && minLng > 110
    })
    expect(spratly, 'không tìm thấy polygon nào ở phía đông 114°E').toBeTruthy()
    const [[x0, y0], [x1, y1]] = path.bounds(spratly)
    expect(x0).toBeGreaterThanOrEqual(0)
    expect(y0).toBeGreaterThanOrEqual(0)
    expect(x1).toBeLessThanOrEqual(VN_MAP_VIEW.width)
    expect(y1).toBeLessThanOrEqual(VN_MAP_VIEW.height)
  })
})

/** Mọi kinh độ trong một feature, bất kể lồng bao nhiêu tầng mảng. */
function flatLng(feature: any): number[] {
  const out: number[] = []
  const walk = (node: any) => {
    if (typeof node?.[0] === 'number' && typeof node?.[1] === 'number') {
      out.push(node[0])
      return
    }
    if (Array.isArray(node)) node.forEach(walk)
  }
  walk(feature.geometry?.coordinates)
  return out
}
