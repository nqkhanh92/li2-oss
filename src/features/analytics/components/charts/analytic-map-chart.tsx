'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { VietnamMapChart } from '@/shared/components/customize/vietnam-map-chart'
import { GeoWorldMap } from '@/shared/components/customize/geo-world-map'
import type { GeoBubble } from '@/shared/components/customize/geo-bubble-map'
import { binColorOf } from '@/shared/components/customize/geo-color-scale'
import { formatGeoCount, formatGeoPct } from '@/shared/components/customize/geo-format'
import { countryDisplayName } from '@/shared/lib/location/country-utils'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PROVINCE_BY_CODE } from '@/shared/constants/vietnam-provinces'
import { cn } from '@/shared/lib/utils'
import type { AnalyticFiltersParams } from '@/features/analytics/hooks/queries'
import { useGetGeoAnalytics } from '@/features/analytics/hooks/queries'
import type { GeoAnalyticsRow, GeoLevel } from '@/core/types/analytics/geo.type'

/** Yêu cầu chủ sản phẩm 2026-10-26: 8 dòng, không phải 7. Cũng là `limit` gửi lên server. */
const TOP_ROWS = 8
const VN_ALPHA2 = 'VN'

/**
 * Chỉ Việt Nam có bản đồ cấp tỉnh trong repo (`src/public/json/vietnam.json`), nên chỉ nó bấm
 * xuống được. Nước khác vẫn có dữ liệu cấp vùng ở server nhưng chưa vẽ được hình.
 */
const DRILLABLE = [VN_ALPHA2]

/**
 * Lưới bốn cột của bảng. Bề rộng ở `sm` trở lên lấy nguyên từ bản thiết kế (28/1fr/64/220).
 *
 * Dưới `sm` thì phải co lại: 28 + 64 + 220 cộng gap và padding ra 372px, rộng hơn cả card trên
 * màn 390px — thấy bằng mắt trên dev, bảng tràn ngang và tên tỉnh bị đẩy mất. Thanh bar cũng ẩn
 * ở cỡ đó, vì cột phần trăm chỉ còn đủ chỗ cho chính con số.
 */
const ROW_GRID =
  'grid grid-cols-[20px_minmax(0,1fr)_48px_84px] gap-2 px-1 items-center ' +
  'sm:grid-cols-[28px_minmax(0,1fr)_64px_220px] sm:gap-3 sm:px-3'

/**
 * Tên hiển thị, hai đường khác nhau cho hai cấp:
 *
 * - **Nước** → `Intl.DisplayNames`, nên tiếng Việt ra "Việt Nam"/"Hoa Kỳ" thay vì "Viet Nam"/
 *   "United States" của payload. Dùng cho cả `en` luôn: payload ghi "Viet Nam", ICU ghi "Vietnam".
 * - **Tỉnh** → `PROVINCE_BY_CODE`, vì `Intl.DisplayNames` chỉ biết cấp nước. Tên tiếng Việt ở
 *   đây là quy ước sản phẩm ("TP. Hồ Chí Minh" thay vì "Hồ Chí Minh" của `states.json`).
 *
 * Cả hai đều lùi về `row.name` của payload khi không tra được — không bao giờ hiện mã trần.
 */
const displayNameOf = (row: GeoAnalyticsRow, locale: string, level: GeoLevel) => {
  if (level === 'country') return countryDisplayName(row.code, locale) ?? row.name
  if (locale.startsWith('vi')) return PROVINCE_BY_CODE.get(row.code)?.nameVi ?? row.name
  return row.name
}

/**
 * Chip mã. Thiết kế hiện mã TRẦN (`HN`, `SG`), không phải mã đủ tiền tố — `VN-` lặp lại trên mọi
 * hàng khi đang ở trong Việt Nam thì không thêm thông tin nào.
 */
const shortCodeOf = (code: string) => (code.includes('-') ? code.split('-')[1] : code)

export const AnalyticMapChart = ({
  orgId,
  params,
}: {
  orgId: string
  params: AnalyticFiltersParams
}) => {
  const { t, i18n } = useTranslation(['analytic', 'common'])
  const locale = i18n.language

  /** Mức đang xem: undefined = cả thế giới, 'VN' = đã đi vào Việt Nam */
  const [drilled, setDrilled] = useState<string>()
  const [highlighted, setHighlighted] = useState<string>()

  const { data, isLoading, isError } = useGetGeoAnalytics(orgId, {
    ...params,
    level: drilled ? 'region' : 'country',
    country: drilled,
    limit: TOP_ROWS,
  })

  // Đổi bộ lọc hoặc khoảng ngày mà nước đang xem không còn lượt nào thì mức vùng trơ ra một bản
  // đồ trắng không giải thích được; lùi về thế giới.
  useEffect(() => {
    if (drilled && data?.level === 'region' && data.parent_total === 0) setDrilled(undefined)
  }, [drilled, data])

  useEffect(() => {
    setHighlighted(undefined)
  }, [drilled])

  const inRegion = data?.level === 'region'
  /**
   * Một chỗ duy nhất quyết tên nước đang xem, rồi chảy vào breadcrumb, dòng tóm tắt, nhãn cột
   * và tooltip. Trước đây nó lấy thẳng `parent.name` của payload nên giao diện tiếng Việt vẫn
   * hiện "Viet Nam" ở cả bốn nơi.
   */
  const parentName = data?.parent
    ? (countryDisplayName(data.parent.code, locale) ?? data.parent.name)
    : (drilled ?? '')

  /**
   * Phần trăm thứ hai chỉ có nghĩa khi hai mẫu số KHÁC nhau.
   *
   * Thiết kế gốc gắn nó vào `!isCountry`, nhưng trên dữ liệu thật của LiHi ở cửa sổ 7 ngày thì
   * mọi lượt đều từ Việt Nam, `grand_total === parent_total`, và dòng nhỏ in lại đúng con số
   * phía trên: "89,4%" rồi "89,4% tổng". Thấy bằng mắt trên dev. Đó là nhiễu chứ không phải
   * thông tin — hai con số chỉ đáng in khi chúng nói hai điều khác nhau.
   */
  const showTotalPct = inRegion && !!data && data.grand_total !== data.parent_total

  /**
   * HAI phần trăm mỗi hàng, theo bản thiết kế.
   *
   * `pct` là tỷ lệ trong phạm vi đang xem (`parent_total`), `totalPct` là tỷ lệ trên toàn bộ
   * (`grand_total`). Card cũ chỉ in một con số và chọn nhầm mẫu số; thiết kế giải bằng cách in
   * CẢ HAI, nên 92,2% và 76,8% không còn chọi nhau — chúng trả lời hai câu khác nhau.
   *
   * Vẫn KHÔNG có phép chia nào ở đây: `pct` do server tính, `totalPct` tính từ `grand_total` mà
   * server cũng đã gửi kèm.
   */
  const rows = useMemo(
    () =>
      (data?.rows ?? []).map((row, index) => ({
        ...row,
        rank: index + 1,
        name: displayNameOf(row, locale, data?.level ?? 'country'),
        shortCode: shortCodeOf(row.code),
        totalPct: data && data.grand_total > 0 ? (row.count / data.grand_total) * 100 : 0,
      })),
    [data, locale]
  )
  const max = rows[0]?.count ?? 1

  const pctLabelOf = (pct: number) =>
    inRegion
      ? t('analytic:map.pct_in_parent', { pct: formatGeoPct(pct, locale), parent: parentName })
      : t('analytic:map.pct_of_total', { pct: formatGeoPct(pct, locale) })

  const bubbles: GeoBubble[] = rows.map((row) => ({
    code: row.code,
    name: row.name,
    count: row.count,
    lat: row.lat,
    lng: row.lng,
    pctLabel: `${formatGeoCount(row.count, locale)} ${t('common:text.visit').toLowerCase()} · ${pctLabelOf(row.pct)}`,
    totalPctLabel: showTotalPct
      ? t('analytic:map.pct_of_all_visits', { pct: formatGeoPct(row.totalPct, locale) })
      : undefined,
  }))

  const columnName = !inRegion
    ? t('common:text.country')
    : data?.parent?.code === VN_ALPHA2
      ? t('common:text.province')
      : t('analytic:map.region_column')

  const columnPct = inRegion
    ? t('analytic:map.col_pct_in_parent', { parent: parentName })
    : t('analytic:map.col_pct_of_total')

  const mapLabel = inRegion
    ? data?.parent?.code === VN_ALPHA2
      ? t('analytic:map.label_vietnam')
      : t('analytic:map.label_region', { country: parentName })
    : t('analytic:map.label_world')

  /**
   * Dòng tóm tắt: nơi `coverage` thuộc về. Thiết kế đặt nó thành MỘT CÂU dưới tiêu đề chứ không
   * phải một khối số riêng, vì nó là ngữ cảnh để đọc bảng, không phải một chỉ số.
   */
  const summary = (() => {
    if (!data) return ''
    const total = formatGeoCount(data.parent_total, locale)
    if (!inRegion) {
      const top = rows[0]
      return top
        ? t('analytic:map.summary_country', {
            total,
            name: top.name,
            pct: formatGeoPct(top.pct, locale),
          })
        : t('analytic:map.summary_country_empty', { total })
    }
    return t(
      data.parent?.code === VN_ALPHA2
        ? 'analytic:map.summary_region_provinces'
        : 'analytic:map.summary_region_units',
      {
        total,
        country: parentName,
        resolved: data.coverage.resolved_units,
        units: data.coverage.total_units,
      }
    )
  })()

  /**
   * MỘT hàng chân bảng, nhãn đổi theo ngữ cảnh — thay cho ba hàng riêng của bản trước.
   *
   * Gộp được vì ngưỡng ẩn danh nay mặc định 0 ở cả hai cấp, nên `suppressed` luôn rỗng ở đường đi
   * bình thường. Nhưng đường đó **không bị xoá**: nếu ai gọi endpoint với ngưỡng khác 0 thì ô
   * `suppressed` vẫn có hàng riêng của nó, vì "ẩn vì quá ít lượt" và "ngoài top" là hai câu trả
   * lời khác nhau và trộn chúng là làm mất đúng cái phân biệt ấy.
   */
  const footRows = (() => {
    if (!data) return []
    const out: { key: string; name: string; count: number; hint?: string }[] = []
    if (inRegion && data.other && data.other.count > 0) {
      out.push({
        key: 'other',
        name: t(
          data.parent?.code === VN_ALPHA2
            ? 'analytic:map.foot_other_provinces'
            : 'analytic:map.foot_other_regions',
          { count: data.other.units }
        ),
        count: data.other.count,
      })
    }
    if (data.suppressed.count > 0) {
      out.push({
        key: 'suppressed',
        name: t('analytic:map.foot_suppressed', { threshold: data.anonymity_threshold }),
        count: data.suppressed.count,
        hint: t('analytic:map.foot_suppressed_hint', { count: data.suppressed.units }),
      })
    }
    if (data.unknown.count > 0) {
      out.push({
        key: 'unknown',
        name: t('analytic:map.foot_unknown'),
        count: data.unknown.count,
      })
    }
    return out
  })()

  if (isLoading) return <Skeleton className="h-[460px] w-full" />

  if (isError || !data) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
        {t('analytic:map.load_failed')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex min-h-6 flex-wrap items-center gap-2 text-sm">
          {inRegion ? (
            <>
              <button
                type="button"
                onClick={() => setDrilled(undefined)}
                className="text-primary underline underline-offset-4"
              >
                {t('analytic:map.world')}
              </button>
              <span className="text-slate-400">›</span>
              <span className="font-semibold">{parentName}</span>
            </>
          ) : (
            <span className="font-semibold">{t('analytic:map.world')}</span>
          )}
        </div>
        <p className="text-sm text-[#5B6470]">{summary}</p>
      </header>

      {data.parent_total === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
          {t('analytic:map.empty')}
        </div>
      ) : inRegion && !data.region_supported ? (
        // Nước không có bảng đơn vị cấp 1 trong `states.json`. Hiện một bảng rỗng ở đây là nói
        // dối: trông như "không có lượt nào", trong khi `parent_total` vẫn > 0.
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 rounded-xl border border-[#E4E8EC] bg-[#F7F9FA] p-8 text-center text-sm text-slate-500">
          <span className="font-medium text-[#3A414A]">
            {t('analytic:map.region_unsupported', { country: parentName })}
          </span>
          <span className="max-w-[320px] text-[13px] text-[#5B6470]">
            {t('analytic:map.region_unsupported_total', {
              total: formatGeoCount(data.parent_total, locale),
            })}
          </span>
        </div>
      ) : (
        // `grid-cols-1` dưới `xl`, KHÔNG phải `grid-cols-12` với con `col-span-12`: 12 cột kèm
        // `gap-8` có 11 khoảng cách 32px = 352px CỐ ĐỊNH, rộng hơn vùng nội dung 310px của card
        // trên màn 390px, nên lưới tràn ngang dù mọi con đều vừa. Đo được trên dev.
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="xl:col-span-5">
            {inRegion ? (
              <VietnamMapChart
                className="w-full! max-h-[260px] lg:max-h-[420px]"
                label={mapLabel}
                bubbles={bubbles}
                highlightedCode={highlighted}
                onHoverCode={setHighlighted}
              />
            ) : (
              <GeoWorldMap
                className="w-full! max-h-[240px] lg:max-h-[340px]"
                label={mapLabel}
                bubbles={bubbles}
                drillableCountries={DRILLABLE.filter((code) =>
                  rows.some((row) => row.code === code)
                )}
                onCountryClick={setDrilled}
                highlightedCode={highlighted}
                onHoverCode={setHighlighted}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col xl:col-span-7">
            <div
              className={cn(
                ROW_GRID,
                'border-b border-[#E4E8EC] pb-2.5 text-[13px] text-[#5B6470]'
              )}
            >
              <span>#</span>
              <span>{columnName}</span>
              <span className="text-right">{t('common:text.visit')}</span>
              <span>{columnPct}</span>
            </div>

            {rows.map((row) => {
              const canDrill = !inRegion && DRILLABLE.includes(row.code)
              const active = highlighted === row.code
              return (
                <button
                  key={row.code}
                  type="button"
                  data-testid="geo-row"
                  data-code={row.code}
                  onMouseEnter={() => setHighlighted(row.code)}
                  onMouseLeave={() => setHighlighted(undefined)}
                  onClick={canDrill ? () => setDrilled(row.code) : undefined}
                  // Không drill được KHÁC không có dữ liệu: card cũ tô xám mọi nước không phải
                  // Việt Nam (`muted={!canDrill}`) nên US 12 lượt trông như bị disable.
                  className={cn(
                    ROW_GRID,
                    'min-h-[46px] w-full border-b border-[#EEF1F4] text-left',
                    canDrill && 'cursor-zoom-in',
                    active && 'bg-[#F4F6F8]'
                  )}
                >
                  <span className="text-[13px] text-[#6B7480]">{row.rank}</span>
                  <span className="flex min-w-0 items-center gap-2 text-[15px] font-medium">
                    <span className="rounded bg-[#EEF1F4] px-[5px] py-0.5 text-[11px] font-semibold text-[#4A525C]">
                      {row.shortCode}
                    </span>
                    <span className="truncate">{row.name}</span>
                  </span>
                  <span className="text-right text-[15px] font-semibold tabular-nums">
                    {formatGeoCount(row.count, locale)}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="hidden h-2 flex-1 overflow-hidden rounded-full bg-[#EEF1F4] sm:block">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(row.count / Math.max(max, 1)) * 100}%`,
                          backgroundColor: binColorOf(row.count),
                        }}
                      />
                    </span>
                    <span className="w-full text-right text-[13px] tabular-nums sm:w-[92px]">
                      <span className="font-semibold">{formatGeoPct(row.pct, locale)}</span>
                      {/* Phần trăm thứ hai chỉ có nghĩa khi đang ở TRONG một nước; ở cấp nước thì
                          `grand_total === parent_total` nên nó sẽ lặp lại đúng con số phía trên. */}
                      {showTotalPct && (
                        <span className="block text-[11px] font-normal text-[#6B7480]">
                          {t('analytic:map.of_total_short', {
                            pct: formatGeoPct(row.totalPct, locale),
                          })}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}

            {footRows.map((foot) => (
              <div
                key={foot.key}
                data-testid="geo-foot-row"
                data-kind={foot.key}
                className={cn(
                  ROW_GRID,
                  'min-h-[44px] border-b border-[#EEF1F4] text-sm text-[#5B6470]'
                )}
              >
                <span />
                <span className="italic">{foot.name}</span>
                <span className="text-right tabular-nums">
                  {formatGeoCount(foot.count, locale)}
                </span>
                <span className="text-xs">{foot.hint ?? ''}</span>
              </div>
            ))}

            {!inRegion && rows.some((row) => DRILLABLE.includes(row.code)) && (
              <p className="px-3 pt-3 text-xs text-primary">{t('analytic:map.drill_hint')}</p>
            )}
          </div>
        </div>
      )}

      {/* Ghi công bắt buộc: Natural Earth cho hình bản đồ, DB-IP (CC BY 4.0) cho dữ liệu vị trí IP.
          Nhãn worldview nói rõ bản đồ đang vẽ theo cách nhìn nào — tệp Việt Nam có Hoàng Sa và
          Trường Sa, và điều đó phải nói ra chứ không để người xem tự đoán. */}
      <footer className="flex flex-wrap justify-between gap-4 border-t border-[#EEF1F4] pt-3 text-xs text-[#5B6470]">
        <span>
          {t('analytic:map.footer_map')}{' '}
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            Natural Earth
          </a>{' '}
          {t('analytic:map.footer_worldview')} {t('analytic:map.footer_geoip')}{' '}
          <a
            href="https://db-ip.com"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            DB-IP
          </a>{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            CC BY 4.0
          </a>
        </span>
        <span>{t('analytic:map.footer_codes')}</span>
      </footer>
    </div>
  )
}
