'use client'
import worldJson from '@/public/json/countries-110m.json'
import { GeoBubbleMap, type GeoBubble } from './geo-bubble-map'

/**
 * Khung vẽ: Equal Earth ở `scale: 147`, và **không có `ZoomableGroup`**.
 *
 * Bản đồ cũ (`map-chart.tsx`) bọc `ZoomableGroup` với `translateExtent=[[0,-200],[900,800]]` rồi
 * tự phóng tới nước nhiều lượt nhất, nên khi lưu lượng dồn về Việt Nam thì khung khoá quanh châu Á
 * và **US/Brazil nằm ngoài màn hình, im lặng** — người xem không thấy mình có khách ở đó.
 *
 * Số 147 là đo chứ không phải đoán: ở scale mặc định 177,158 của d3 thì đường biên bản đồ chạy từ
 * x = −71 đến x = 871 trên viewBox rộng 800, tức cắt cả hai đầu. 147 cho 10…790 theo chiều ngang
 * và 18…404 theo chiều dọc với `height = 420` — cả thế giới nằm trong khung.
 */
export const GEO_WORLD_VIEW = { width: 800, height: 420, scale: 147 }

export const GeoWorldMap = ({
  className,
  label,
  bubbles,
  drillableCountries,
  onCountryClick,
  highlightedCode,
  onHoverCode,
}: {
  className?: string
  label: string
  bubbles: GeoBubble[]
  /** alpha-2 của những nước bấm xuống được */
  drillableCountries?: string[]
  onCountryClick?: (alpha2: string) => void
  highlightedCode?: string
  onHoverCode?: (code: string | undefined) => void
}) => (
  <GeoBubbleMap
    className={className}
    geography={worldJson as object}
    projection="geoEqualEarth"
    width={GEO_WORLD_VIEW.width}
    height={GEO_WORLD_VIEW.height}
    projectionConfig={{ scale: GEO_WORLD_VIEW.scale }}
    label={label}
    bubbles={bubbles}
    highlightedCode={highlightedCode}
    onHoverCode={onHoverCode}
    onSelectCode={(code) => {
      if (drillableCountries?.includes(code)) onCountryClick?.(code)
    }}
  />
)
