'use client'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import worldJson from '@/public/json/countries-110m.json'
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { groupByKey } from '@/shared/lib/utils'
import { countryMapping } from '@/shared/constants/country-mapping'
import MapChartLegend from './map-chart-legend'
import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import { useTranslation } from 'react-i18next'

const COLOR_STOPS = [
  { offset: '0%', color: '#bfffb2' },
  { offset: '25%', color: '#73d895' },
  { offset: '50%', color: '#32cd32' },
  { offset: '75%', color: '#1e865d' },
  { offset: '100%', color: '#0b4d2d' },
]
const EMPTY_FILL = '#F8F9FB'

/**
 * Thang màu tính theo giá trị lớn nhất thực tế.
 *
 * Thang cũ ghim cứng `maxValue: 1000`, nên một tổ chức có 86 lượt thì MỌI quốc gia đều rơi vào
 * bậc thấp nhất và bản đồ gần như trắng. Phép chọn màu cũ còn sai đơn vị: nó so phần trăm offset
 * nhân `maxValue` (0–100 000) với `count/maxValue*100` (0–100), nên chỉ bậc `0%` khớp.
 */
const buildScale = (maxCount: number) => {
  const max = Math.max(maxCount, 1)
  const thresholds = COLOR_STOPS.map((_, index) =>
    Math.ceil((max * (index + 1)) / COLOR_STOPS.length)
  )
  return {
    max,
    thresholds,
    colorOf: (count: number) => {
      if (count <= 0) return EMPTY_FILL
      const index = thresholds.findIndex((threshold) => count <= threshold)
      return COLOR_STOPS[index === -1 ? COLOR_STOPS.length - 1 : index].color
    },
  }
}
export type MapChartRef = { zoomToCountry: (country: string) => void }
export const MapChart = React.forwardRef<
  MapChartRef,
  {
    width?: number
    height?: number
    className?: string
    data?: AnalyticByTagDataType['countries']
    /** alpha-2 của những nước bấm xuống được; nước ngoài danh sách là tĩnh */
    drillableCountries?: string[]
    onCountryClick?: (alpha2: string) => void
    /** Tự phóng tới nước nhiều lượt nhất khi dữ liệu đổi. Tắt khi breadcrumb điều khiển tầm nhìn. */
    autoZoom?: boolean
  }
>((props, ref) => {
  const { t } = useTranslation('analytic')

  const { className, data, drillableCountries, onCountryClick, autoZoom = true, ...rest } = props
  const drillable = useMemo(() => new Set(drillableCountries ?? []), [drillableCountries])
  const mappingCountry = useMemo(() => {
    return groupByKey(countryMapping ?? [], 'code')
  }, [])
  const mappingCountryByAlpha2 = useMemo(() => {
    return groupByKey(countryMapping ?? [], 'alpha2')
  }, [])
  const scale = useMemo(
    () => buildScale(data?.reduce((max, e) => Math.max(max, e.count), 0) ?? 0),
    [data]
  )
  const countriesData = useMemo(() => {
    const map = new Map<string, { name: string; visitCount: number; color: string }>()
    if (!data) return map
    data.forEach((e) => {
      map.set(e.name, { name: e.name, visitCount: e.count, color: scale.colorOf(e.count) })
    })
    return map
  }, [data, scale])
  const [position, setPosition] = useState<{
    zoom: number
    coordinates: [number, number]
  }>({
    zoom: 1,
    coordinates: [15, 55],
  })
  const zoomToCountry = (countryAlpha2: string) => {
    const countryProperties = mappingCountryByAlpha2.get(countryAlpha2)?.[0]
    if (!countryProperties?.center) return
    setPosition({
      zoom: 6,
      coordinates: [countryProperties.center[0], countryProperties.center[1]],
    })
  }
  useEffect(() => {
    if (!autoZoom || !data || data.length == 0) return
    const highestCountry = data.reduce((prev, curr) => {
      return prev.count > curr.count ? prev : curr
    })
    zoomToCountry(highestCountry.name)
  }, [data, autoZoom])

  useImperativeHandle(ref, () => ({ zoomToCountry }))
  // const handleZoomIn = () => {
  //   setPosition((prev) => ({
  //     ...prev,
  //     zoom: Math.min(prev.zoom * 1.5, 8),
  //   }));
  // };

  // const handleZoomOut = () => {
  //   setPosition((prev) => ({
  //     ...prev,
  //     zoom: Math.max(prev.zoom / 1.5, 1),
  //   }));
  // };
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string
    code: string
    alpha2: string
    visitCount: number
  } | null>(null)

  const currentValue = useMemo(() => {
    return hoveredCountry?.visitCount ?? 0
  }, [hoveredCountry])
  return (
    <div className="relative">
      {hoveredCountry && (
        <div className="w-36 px-4 py-2 min-h-12 absolute bg-card border top-0 left-0">
          <div className="text-base font-semibold text-center">{hoveredCountry.name}</div>
          <div className="text-xs text-center mx-auto">
            {t('label.total_visits')}: {currentValue}
          </div>
        </div>
      )}
      <ComposableMap className={className} projection="geoMercator">
        <ZoomableGroup
          zoom={position.zoom}
          onMoveEnd={setPosition}
          center={position.coordinates}
          disablePanning={true}
          translateExtent={[
            [0, -200],
            [900, 800],
          ]}
        >
          <Geographies geography={worldJson}>
            {({ geographies }) => {
              return (
                <>
                  {geographies.map((geo) => {
                    const countryProperties = mappingCountry.get(geo.id)?.[0]
                    const countryData = countriesData.get(countryProperties?.alpha2 ?? '')
                    const isDrillable =
                      !!countryProperties?.alpha2 && drillable.has(countryProperties.alpha2)
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => {
                          if (isDrillable) onCountryClick?.(countryProperties!.alpha2)
                        }}
                        onMouseEnter={() => {
                          setHoveredCountry({
                            name: countryProperties?.name ?? '',
                            code: countryProperties?.code ?? '',
                            alpha2: countryProperties?.alpha2 ?? '',
                            visitCount: countryData?.visitCount ?? 0,
                          })
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null)
                        }}
                        style={{
                          default: {
                            fill:
                              geo.id && hoveredCountry?.code === geo.id
                                ? '#4125B9'
                                : (countryData?.color ?? EMPTY_FILL),
                            stroke: '#607D8B',
                            strokeWidth: 0.2,
                            outline: 'none',
                            cursor: isDrillable ? 'zoom-in' : 'default',
                          },
                          hover: {
                            fill: '#4125B9',
                            stroke: '#000',
                            strokeWidth: 0.1,
                          },
                          pressed: {
                            fill: '#E42',
                            stroke: '#000',
                            strokeWidth: 0.1,
                          },
                        }}
                      ></Geography>
                    )
                  })}
                </>
              )
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      <div className="absolute bottom-0 left-0">
        <MapChartLegend
          title=""
          currentValue={currentValue}
          size="sm"
          colorStops={COLOR_STOPS}
          minValue={0}
          maxValue={scale.max}
          valueLabels={[0, ...scale.thresholds]}
        />
      </div>
      {/* <div className="absolute bottom-2 right-2 flex flex-col gap-2 p-2 rounded">
        <Button
          onClick={handleZoomIn}
          className="text-lg font-bold"
          variant={"outline-solid"}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          onClick={handleZoomOut}
          className="text-lg font-bold"
          variant={"outline-solid"}
        >
          <Minus className="w-3 h-3" />
        </Button>
      </div> */}
    </div>
  )
})

MapChart.displayName = 'MapChart'
