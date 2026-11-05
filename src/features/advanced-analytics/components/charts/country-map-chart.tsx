'use client'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import React, { useImperativeHandle, useMemo, useState } from 'react'
import { groupByKey } from '@/shared/lib/utils'
import { countryMapping } from '@/shared/constants/country-mapping'
import {
  Country,
  GeographicDistribution,
} from '@/core/types/analytics/geographic-distribution.type'
import { getChoroplethColor, getFlagEmoji } from '../../utils/helper'
import MapChartLegend from './map-chart-legend'
import { Button } from '@/shared/components/ui/button'
import { Minus, Plus } from 'lucide-react'
// import worldJson from '@/public/json/countries-110m-v2.json';
import { countryWithCode as worldJs } from '@/features/advanced-analytics/data/country-with-code.js'

type ChartConfig = {
  colorStops: { offset: string; color: string }[]
  minValue: number
  maxValue: number
  valueLabels: number[]
}
const config: ChartConfig = {
  colorStops: [
    { offset: '0%', color: '#bfffb2' },
    { offset: '20%', color: '#73d895' },
    { offset: '40%', color: '#32cd32' },
    { offset: '60%', color: '#1e865d' },
    { offset: '80%', color: '#0b4d2d' },
    { offset: '100%', color: '#0b4d2d' },
  ],
  minValue: 0,
  maxValue: 1000,
  valueLabels: [0, 200, 400, 600, 800, 1000],
}
export type MapChartRef = { zoomToCountry: (country: string) => void }
export const MapChart = React.forwardRef<
  MapChartRef,
  {
    width?: number
    height?: number
    className?: string
    data?: GeographicDistribution
    setSelectedCountry?: (countryCode: string | null) => void
  }
>((props, ref) => {
  const { className, data, setSelectedCountry } = props
  const mappingCountryByAlpha2 = useMemo(() => {
    return groupByKey(countryMapping ?? [], 'alpha2')
  }, [])
  const [position, setPosition] = useState<{
    zoom: number
    coordinates: [number, number]
  }>({
    zoom: 2,
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
  useImperativeHandle(ref, () => ({ zoomToCountry }))

  const [hoveredCountry, setHoveredCountry] = React.useState<Country | null>(null)
  // Handle mouse events for tooltip
  const handleMouseEnter = (geo: any) => {
    const countryData = data?.geographic_data?.countries?.find(
      (c: Country) => c.country === geo.properties.countryCode
    )
    if (countryData) {
      setHoveredCountry(countryData)
    }
  }

  const handleMouseLeave = () => {
    setHoveredCountry(null)
  }

  const handleCountryClick = (countryCode: string | null) => {
    const countryData = data?.geographic_data?.countries?.find((c) => c.country === countryCode)
    if (countryData && setSelectedCountry) {
      setSelectedCountry(countryCode)
    }
  }

  const handleZoomIn = () => {
    setPosition((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 8),
    }))
  }

  const handleZoomOut = () => {
    setPosition((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.5, 1),
    }))
  }
  return (
    <div className="relative">
      {hoveredCountry && (
        <div
          className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-50"
          style={{
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)',
            maxWidth: '250px',
          }}
        >
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getFlagEmoji(hoveredCountry.country)}</span>
            <span className="font-bold">
              {countryMapping.find((country) => country.alpha2 === hoveredCountry.country)?.name}
            </span>
          </div>
          <div className="text-sm">
            <div>
              Total Visits:{' '}
              <span className="font-semibold text-blue-300">{hoveredCountry.total_visits}</span>
            </div>
            <div>
              Unique Users:{' '}
              <span className="font-semibold text-green-300">{hoveredCountry.unique_users}</span>
            </div>
            <div>
              Visits/User:{' '}
              <span className="font-semibold text-yellow-300">
                {hoveredCountry.visits_per_user}
              </span>
            </div>
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
          <Geographies geography={worldJs}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = geo.properties.countryCode ?? ''
                const countryData =
                  data?.geographic_data?.countries?.find(
                    (country: Country) => country.country === countryCode
                  ) ?? null

                // Special handling for Vietnam debugging
                // if (countryCode === "VN") {
                //   console.log("Processing Vietnam:", {
                //     countryCode,
                //     countryName,
                //     countryData,
                //     baseColor: getChoroplethColor(countryCode, data),
                //   });
                // }
                const baseColor = getChoroplethColor(countryCode ?? '', data)
                const hoverColor = countryData ? '#1565C0' : '#EEEEEE'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={baseColor}
                    stroke={countryData ? '#0D47A1' : '#E0E0E0'}
                    strokeWidth={countryData ? 1 : 0.2}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'all 0.2s ease-in-out',
                      },
                      hover: {
                        outline: 'none',
                        fill: hoverColor,
                        strokeWidth: countryData ? 1 : 0.2,
                        cursor: countryData ? 'pointer' : 'default',
                        stroke: '#607D8B',
                      },
                      pressed: {
                        outline: 'none',
                        fill: '#0D47A1',
                        stroke: '#000',
                        strokeWidth: 0.1,
                      },
                    }}
                    onMouseEnter={() => handleMouseEnter(geo)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleCountryClick(countryCode)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {/* <div className="absolute bottom-0 left-0">
        <MapChartLegend
          title=""
          currentValue={
            data?.geographic_data.countries.reduce(
              (total, country) => total + country.total_visits,
              0
            ) ?? 0
          }
          size="sm"
          colorStops={config.colorStops}
          minValue={config.minValue}
          maxValue={config.maxValue}
          valueLabels={config.valueLabels}
        />
      </div> */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-2 p-2 rounded">
        <Button
          onClick={handleZoomIn}
          className="text-lg font-bold"
          type="button"
          variant={'outline'}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          onClick={handleZoomOut}
          type="button"
          className="text-lg font-bold"
          variant={'outline'}
        >
          <Minus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
})
