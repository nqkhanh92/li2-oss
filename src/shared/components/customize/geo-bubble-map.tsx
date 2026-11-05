'use client'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { useRef, useState } from 'react'

import { GEO_LAND_FILL, GEO_LAND_STROKE, binColorOf, bubbleDiameter } from './geo-color-scale'
import { GeoStepLegend } from './geo-step-legend'

const ACTIVE_STROKE = '#1A1D21'

export type GeoBubble = {
  code: string
  name: string
  count: number
  lat: number | null
  lng: number | null
  /** Dòng thứ hai của tooltip, đã format sẵn ở nơi gọi (vd "92,2% trong Việt Nam") */
  pctLabel: string
  /** Dòng thứ ba, xám. Rỗng thì không vẽ dòng đó. */
  totalPctLabel?: string
}

/**
 * Bản đồ NỀN TRUNG TÍNH + BONG BÓNG, theo bản thiết kế gốc.
 *
 * Khác hẳn bản trước, vốn tô kín từng vùng theo số lượt (choropleth). Hai lý do thiết kế bỏ cách
 * đó, và cả hai đều đo được trên dữ liệu thật:
 *
 * 1. **32/34 tỉnh xám.** Choropleth buộc mọi vùng phải mang một màu, kể cả vùng không có lượt nào,
 *    nên bản đồ Việt Nam là một mảng xám với hai đốm. Bong bóng chỉ vẽ nơi CÓ dữ liệu.
 * 2. **Diện tích vùng không liên quan tới lưu lượng.** Tô kín làm một tỉnh rộng trông quan trọng
 *    hơn một thành phố nhỏ đông khách. Bong bóng tách hẳn hai thứ đó.
 *
 * Vùng không có `lat`/`lng` thì KHÔNG vẽ bong bóng — không bịa toạ độ. Bảng bên cạnh vẫn liệt kê
 * đủ, nên dữ liệu không biến mất, chỉ là không chấm được lên hình.
 */
export const GeoBubbleMap = ({
  className,
  geography,
  projection,
  projectionConfig,
  width,
  height,
  label,
  bubbles,
  highlightedCode,
  onHoverCode,
  onSelectCode,
}: {
  className?: string
  geography: object
  projection: string
  projectionConfig?: Record<string, unknown>
  width: number
  height: number
  /** Dòng chữ nhỏ góc trên trái, nói rõ đang xem bản đồ gì */
  label: string
  bubbles: GeoBubble[]
  highlightedCode?: string
  onHoverCode?: (code: string | undefined) => void
  onSelectCode?: (code: string) => void
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  // Vị trí tooltip tính bằng % của khung, lấy từ hình chữ nhật THẬT của bong bóng thay vì chiếu
  // lại toạ độ bằng tay — projection đã làm việc đó một lần rồi, làm lần hai là chỗ để lệch.
  const [tip, setTip] = useState<{ bubble: GeoBubble; x: number; y: number } | null>(null)

  const max = bubbles.reduce((m, b) => Math.max(m, b.count), 0)
  const plotted = bubbles.filter((b) => b.lat != null && b.lng != null && b.count > 0)

  const showTip = (bubble: GeoBubble, target: SVGElement) => {
    const a = target.getBoundingClientRect()
    const b = wrapRef.current?.getBoundingClientRect()
    // Khung chưa có kích thước (chưa layout xong) thì đặt tooltip giữa khung thay vì BỎ QUA.
    // Bản đầu `return` ở đây, và hệ quả là hover im lặng không làm gì — một test của chính tôi
    // xanh rỗng vì thế: nó kiểm "không có dòng thứ ba" trong khi chẳng có tooltip nào cả.
    const pct = (near: number, size: number, start: number) =>
      size > 0 ? ((near - start) / size) * 100 : 50
    setTip({
      bubble,
      x: pct(a.left + a.width / 2, b?.width ?? 0, b?.left ?? 0),
      y: pct(a.top + a.height / 2, b?.height ?? 0, b?.top ?? 0),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden rounded-xl border border-[#E4E8EC] bg-[#F7F9FA]"
      >
        <div className="pointer-events-none absolute inset-x-3 top-2.5 z-10 text-[11px] tracking-[0.02em] text-[#5B6470]">
          {label}
        </div>

        <ComposableMap
          className={className}
          projection={projection}
          width={width}
          height={height}
          projectionConfig={projectionConfig}
        >
          <Geographies geography={geography}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: GEO_LAND_FILL,
                      stroke: GEO_LAND_STROKE,
                      strokeWidth: 0.3,
                      outline: 'none',
                    },
                    // Nền không tương tác: mọi thao tác thuộc về bong bóng. Lặp lại `default` chứ
                    // không bỏ trống, vì react-simple-maps mặc định đổi màu khi hover.
                    hover: {
                      fill: GEO_LAND_FILL,
                      stroke: GEO_LAND_STROKE,
                      strokeWidth: 0.3,
                      outline: 'none',
                    },
                    pressed: {
                      fill: GEO_LAND_FILL,
                      stroke: GEO_LAND_STROKE,
                      strokeWidth: 0.3,
                      outline: 'none',
                    },
                  }}
                />
              ))
            }
          </Geographies>

          {plotted.map((bubble) => {
            const active = highlightedCode === bubble.code
            const d = bubbleDiameter(bubble.count, max)
            return (
              <Marker key={bubble.code} coordinates={[bubble.lng as number, bubble.lat as number]}>
                <circle
                  data-testid="geo-bubble"
                  data-code={bubble.code}
                  r={d / 2}
                  fill={binColorOf(bubble.count)}
                  stroke={active ? ACTIVE_STROKE : '#FFFFFF'}
                  strokeWidth={active ? 3 : 2}
                  opacity={0.92}
                  style={{ cursor: onSelectCode ? 'pointer' : 'default' }}
                  role="button"
                  aria-label={`${bubble.name}, ${bubble.count}`}
                  onMouseEnter={(event) => {
                    onHoverCode?.(bubble.code)
                    showTip(bubble, event.currentTarget)
                  }}
                  onMouseLeave={() => {
                    onHoverCode?.(undefined)
                    setTip(null)
                  }}
                  onClick={() => onSelectCode?.(bubble.code)}
                />
              </Marker>
            )
          })}
        </ComposableMap>

        {tip && (
          <div
            className="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg bg-[#1A1D21] px-3 py-2 text-xs leading-normal text-white"
            style={{
              left: `${tip.x}%`,
              top: `${tip.y}%`,
              // Bong bóng ở nửa phải thì tooltip lật sang trái, nếu không nó tràn khỏi khung.
              transform:
                tip.x > 60 ? 'translate(calc(-100% - 20px), -50%)' : 'translate(20px, -50%)',
            }}
          >
            <div className="font-semibold">{tip.bubble.name}</div>
            <div>{tip.bubble.pctLabel}</div>
            {tip.bubble.totalPctLabel && (
              <div className="text-[#C4CBD2]">{tip.bubble.totalPctLabel}</div>
            )}
          </div>
        )}
      </div>

      <GeoStepLegend />
    </div>
  )
}
