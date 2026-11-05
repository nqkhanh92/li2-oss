import { Globe, Map } from 'lucide-react'
import {
  City,
  Country,
  GeographicDistribution,
} from '@/core/types/analytics/geographic-distribution.type'
import React, { useRef } from 'react'
import { countryMapping } from '@/shared/constants/country-mapping'
import {
  MapChart,
  MapChartRef,
} from '@/features/advanced-analytics/components/charts/country-map-chart'
import { CityDataPanel } from '@/features/advanced-analytics/components/audience/geographic-distribution/interactive-map/city-data-panel'
import { getEngagementColor, getFlagEmoji } from '@/features/advanced-analytics/utils/helper'
import { HeaderSection } from '@/features/advanced-analytics/components/header-section'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'
type CountriesPerformanceProps = {
  data: GeographicDistribution
}

export const CountriesPerformance = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: geographicDistribution } = useAdvancedAnalytics(org_id, 'geographic-distribution', {
    period_days: timePeriod,
    tag_ids: selectedTags,
    touchpoint_ids: selectedTouchpoints,
    collection_ids: collectionIds,
  })
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null)

  const getGlobalCitiesRanking = () => {
    if (!geographicDistribution?.geographic_data?.cities) return []
    return [...geographicDistribution?.geographic_data?.cities]?.sort(
      (a, b) => a.city_rank_global - b.city_rank_global
    )
  }

  // Get cities for selected country
  const getSelectedCountryCities = () => {
    if (!selectedCountry || !geographicDistribution?.geographic_data?.cities) return []
    return [...geographicDistribution?.geographic_data?.cities]?.filter(
      (city: City) => city.country === selectedCountry
    )
  }

  const mapChartRef = useRef<MapChartRef>(null)

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <HeaderSection
          title={
            allowExtraAdvancedAnalytic ? t('geographic.countries.title') : t('geographic.countries.title')
          }
          description={t('geographic.countries.free_subtitle')}
          premiumDescription={t('geographic.countries.premium_subtitle')}
          icon={
            allowExtraAdvancedAnalytic ? (
              <Map className="w-5 h-5 text-blue-600 mr-2" />
            ) : (
              <Globe className="w-5 h-5 text-blue-600 mr-2" />
            )
          }
          showPremiumBadge={false}
          endAdornment={
            allowExtraAdvancedAnalytic ? (
              <div className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                {t('geographic.countries.map_title')}
              </div>
            ) : null
          }
          textSize="lg"
        />
      </div>

      {/* FREE TIER: List View */}
      {!allowExtraAdvancedAnalytic && (
        <div className="space-y-4">
          {geographicDistribution?.geographic_data?.countries?.map((country: Country) => {
            const engagementLevel = getEngagementColor(country?.visits_per_user || 0)

            return (
              <div
                key={country.country}
                className="rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                      #{country.rank}
                    </div>
                    <div className="text-2xl">{getFlagEmoji(country?.country || '')}</div>
                    <div>
                      <div className="font-medium text-gray-900">{country?.country || ''}</div>
                      <div className="text-sm text-gray-600">
                        {country?.unique_users || 0} {country?.unique_users !== 1 ? t('geographic.countries.user_plural') : t('geographic.countries.user_singular')} • {country?.total_visits || 0}{' '}
                        {t('geographic.countries.visits')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Engagement Badge */}
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${engagementLevel?.bg} ${engagementLevel?.text} flex items-center space-x-1`}
                    >
                      <span>{engagementLevel?.icon}</span>
                      <span>{engagementLevel?.label}</span>
                    </div>

                    {/* Visit Share */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {country?.visit_share_pct || 0}%
                      </div>
                      <div className="text-xs text-gray-500">{t('geographic.countries.share')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Map Preview Teaser */}
          <div className="relative mt-6">
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path
                    d="M10,25 Q25,10 40,25 T70,25 Q85,10 100,25"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    className="text-blue-400"
                  />
                  <circle cx="20" cy="25" r="3" fill="currentColor" className="text-blue-500" />
                  <circle cx="50" cy="15" r="2" fill="currentColor" className="text-green-500" />
                  <circle cx="80" cy="30" r="4" fill="currentColor" className="text-purple-500" />
                </svg>
              </div>

              <div className="relative z-10 text-center">
                <div className="text-3xl mb-3">🗺️</div>
                <div className="font-bold text-lg text-blue-900 mb-2">{t('geographic.countries.map_title')}</div>
                <div className="text-sm text-blue-700 mb-4">
                  {t('geographic.countries.interactive_map_desc')}
                </div>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>{t('geographic.countries.marker_countries')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>{t('geographic.countries.marker_cities')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>{t('geographic.countries.perf_data')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM TIER: Interactive Map View */}
      {allowExtraAdvancedAnalytic && (
        <div className="grid grid-cols-10 gap-4">
          {/* Interactive World Map */}
          <div className="col-span-10 lg:col-span-10">
            <MapChart
              data={geographicDistribution}
              className="w-full! max-h-[220px] lg:max-h-[370px]"
              ref={mapChartRef}
              setSelectedCountry={setSelectedCountry}
            />
          </div>
          {/* Compact Map Legend & Controls */}
          <div className="bg-background rounded-lg border overflow-hidden w-full col-span-10">
            {/* Header Bar */}
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b">
              <HeaderSection
                title={
                  <div className="flex flex-col font-normal">
                    <h5 className="font-semibold text-gray-900">{t('geographic.countries.map_title')}</h5>
                    <div className="text-xs text-gray-600">{t('geographic.countries.choropleth')}</div>
                  </div>
                }
                icon={
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Map className="w-4 h-4 text-blue-600" />
                  </div>
                }
                endAdornment={
                  <div className="flex items-center space-x-4">
                    {selectedCountry && (
                      <div className="flex items-center space-x-2 bg-background rounded-full px-3 py-1 shadow-xs">
                        <span className="text-sm">{getFlagEmoji(selectedCountry)}</span>
                        <span className="text-sm font-medium">
                          {
                            countryMapping?.find((country) => country.code === selectedCountry)
                              ?.name
                          }
                        </span>
                        <Button
                          type="button"
                          onClick={() => setSelectedCountry(null)}
                          className="text-gray-400 hover:text-red-500 ml-1"
                          title={t('geographic.countries.clear_selection')}
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {geographicDistribution?.geographic_data?.countries?.length} {t('geographic.countries.countries_label')}
                    </div>
                  </div>
                }
                textSize="base"
                showPremiumBadge={false}
              />
            </div>

            {/* Compact Content */}
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Color Scale */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    {t('geographic.countries.visit_scale')}
                  </div>
                  <div className="flex items-center space-x-1 mb-3">
                    <span className="text-xs text-gray-500">{t('geographic.countries.low')}</span>
                    <div className="flex h-3 flex-1 rounded-full overflow-hidden">
                      <div className="flex-1" style={{ backgroundColor: '#E3F2FD' }}></div>
                      <div className="flex-1" style={{ backgroundColor: '#90CAF9' }}></div>
                      <div className="flex-1" style={{ backgroundColor: '#42A5F5' }}></div>
                      <div className="flex-1" style={{ backgroundColor: '#1976D2' }}></div>
                      <div className="flex-1" style={{ backgroundColor: '#0D47A1' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{t('geographic.countries.high')}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t('geographic.countries.color_desc')}</div>
                </div>

                {/* Controls */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    {t('geographic.countries.interactions')}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <span>🖱️</span>
                      <span>{t('geographic.countries.hover')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>🖱️</span>
                      <span>{t('geographic.countries.click')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>🔍</span>
                      <span>{t('geographic.countries.zoom')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>👋</span>
                      <span>{t('geographic.countries.pan')}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    {t('geographic.countries.quick_stats')}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('geographic.countries.total_visits')}</span>
                      <span className="font-semibold text-blue-600">
                        {geographicDistribution?.geographic_data?.summary?.total_visits}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('geographic.countries.active_countries')}</span>
                      <span className="font-semibold text-green-600">
                        {geographicDistribution?.geographic_data?.summary?.total_countries}
                      </span>
                    </div>
                    {geographicDistribution?.geographic_data?.summary?.total_cities && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('geographic.countries.active_cities')}</span>
                        <span className="font-semibold text-purple-600">
                          {geographicDistribution?.geographic_data?.summary?.total_cities}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* City Data Panels */}
          <CityDataPanel
            selectedCountry={selectedCountry}
            globalCitiesRanking={getGlobalCitiesRanking()}
            selectedCountryCities={getSelectedCountryCities()}
          />
        </div>
      )}
    </div>
  )
}

export default CountriesPerformance
