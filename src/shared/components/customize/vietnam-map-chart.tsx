'use client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GeoBubbleMap, type GeoBubble } from './geo-bubble-map'

/**
 * Khung đo chứ không đoán: `fitExtent` trên chính `vietnam.json` vào hộp 420×560 (chừa 8px) cho
 * scale 1563,5 — làm tròn 1560 — và tâm tương đương [109,55 · 15,34]. Kiểm lại: biên chạy
 * 8…411 ngang và 47…513 dọc, nằm trọn trong khung.
 *
 * Tâm lệch hẳn sang đông so với đất liền (106,5) là CỐ Ý: Trường Sa kéo tới 116,95°E, và nhãn
 * bản đồ trong bản thiết kế nói rõ "gồm Hoàng Sa và Trường Sa". Lấy tâm ở đất liền thì phải hạ
 * scale xuống mới không cắt, và khi đó đất liền bé đi vô ích.
 */
export const VN_MAP_VIEW = {
  width: 420,
  height: 560,
  scale: 1560,
  center: [109.55, 15.34] as [number, number],
}

/**
 * Bản đồ 34 tỉnh: nền trung tính + bong bóng tại `lat`/`lng` của payload.
 *
 * Nền KHÔNG còn tô theo số lượt, nên component này không cần tra `PROVINCE_BY_CODE` nữa — nó chỉ
 * vẽ hình đất nước rồi chấm bong bóng. Việc nhận dạng vùng đã làm hết ở server, và bỏ được lớp
 * tra cứu ở đây nghĩa là bớt một chỗ hai đường tính có thể lệch nhau.
 *
 * Tệp `vietnam.json` giữ nguyên: nó đã mang mã ISO thật sau `scripts/vietnam-map-to-iso.mjs` và
 * **đã có Hoàng Sa (23 polygon, Đà Nẵng) cùng Trường Sa (152 polygon, Khánh Hòa)** — đúng cái
 * nhãn bản đồ trong bản thiết kế đòi.
 */
export const VietnamMapChart = ({
  className,
  label,
  bubbles,
  highlightedCode,
  onHoverCode,
}: {
  className?: string
  label: string
  bubbles: GeoBubble[]
  highlightedCode?: string
  onHoverCode?: (code: string | undefined) => void
}) => {
  const { t } = useTranslation('analytic')

  // Tải khi render, không nằm trong bundle chung: topojson tỉnh nặng 352 KB (116 KB gzip)
  // so với 108 KB của bản đồ thế giới, mà phần lớn người dùng không mở tới mục này.
  const [topology, setTopology] = useState<object>()
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let alive = true
    import('@/public/json/vietnam.json')
      .then((mod) => {
        if (alive) setTopology((mod.default ?? mod) as object)
      })
      .catch(() => {
        if (alive) setLoadFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loadFailed || !topology) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-[#E4E8EC] bg-[#F7F9FA] text-sm text-slate-400">
        {t(loadFailed ? 'map.province_load_failed' : 'map.province_loading')}
      </div>
    )
  }

  return (
    <GeoBubbleMap
      className={className}
      geography={topology}
      projection="geoMercator"
      width={VN_MAP_VIEW.width}
      height={VN_MAP_VIEW.height}
      projectionConfig={{ scale: VN_MAP_VIEW.scale, center: VN_MAP_VIEW.center }}
      label={label}
      bubbles={bubbles}
      highlightedCode={highlightedCode}
      onHoverCode={onHoverCode}
    />
  )
}
