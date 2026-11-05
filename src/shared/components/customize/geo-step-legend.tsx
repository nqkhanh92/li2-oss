'use client'
import { useTranslation } from 'react-i18next'

import { GEO_BINS } from './geo-color-scale'

/**
 * Chú giải 5 ô RỜI, nhãn CỐ ĐỊNH.
 *
 * Không nhận `scale` nữa: bin là tuyệt đối nên chú giải không phụ thuộc dữ liệu, và việc nó luôn
 * hiện đủ 5 ô chính là điều bản thiết kế đòi. Bản trước vẽ 2 ô khi chỉ có 2 tỉnh có lượt, nên
 * người xem không có cách nào biết thang màu đầy đủ trông thế nào.
 */
export const GeoStepLegend = () => {
  const { t } = useTranslation('analytic')

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#4A525C]">
      <span className="mr-1">{t('map.legend_prefix')}</span>
      {GEO_BINS.map((bin) => (
        <span key={bin.color} className="inline-flex items-center gap-1 pr-1.5">
          <span
            data-testid="geo-legend-step"
            className="inline-block size-3.5 shrink-0 rounded"
            style={{ backgroundColor: bin.color }}
          />
          <span className="tabular-nums">{bin.label}</span>
        </span>
      ))}
    </div>
  )
}
