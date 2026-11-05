import { Globe, MapPin } from 'lucide-react'
import { Channel } from '@/features/advanced-analytics/constants'
import { formatChannelBreakdown, getFlagEmoji } from '@/features/advanced-analytics/utils/helper'
import { countryMapping } from '@/shared/constants/country-mapping'
import { City } from '@/core/types/analytics/geographic-distribution.type'
import { useTranslation } from 'react-i18next'

type CityDataPanelProps = {
  selectedCountry: string | null
  globalCitiesRanking: City[] | null
  selectedCountryCities: City[]
}

export const CityDataPanel = ({
  selectedCountry,
  globalCitiesRanking,
  selectedCountryCities,
}: CityDataPanelProps) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full col-span-10">
      {/* Left Panel: Global City Rankings */}
      <div className="bg-background rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-gray-900 flex items-center">
            <Globe className="w-5 h-5 text-blue-600 mr-2" />
            {t('geographic.city_panel.title')}
          </h5>
          <div className="text-xs text-gray-500">{globalCitiesRanking?.length} {t('geographic.city_panel.cities_total')}</div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {globalCitiesRanking?.map((city) => {
            const activeChannels = formatChannelBreakdown(city.interaction_breakdown)

            return (
              <div
                key={`global-${city.country}-${city.city}`}
                className="rounded-lg p-4 border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer bg-slate-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">
                      #{city.city_rank_global}
                    </div>
                    <div className="text-lg">{getFlagEmoji(city.country)}</div>
                    <div>
                      <div className="font-medium text-gray-900">{city.city}</div>
                      <div className="text-xs text-gray-500">
                        {countryMapping.find((country) => country.code === city.country)?.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">{t('geographic.city_panel.total_visits')}</div>
                    <div className="font-semibold text-blue-600">{city.total_visits}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t('geographic.city_panel.unique_users')}</div>
                    <div className="font-semibold text-green-600">{city.unique_users}</div>
                  </div>
                </div>

                {activeChannels && activeChannels.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-600 mb-1">{t('geographic.city_panel.interaction_breakdown')}</div>
                    <div className="flex items-center space-x-2">
                      {activeChannels?.map((channel: Channel) => (
                        <div key={channel.key} className="flex items-center space-x-1 text-xs">
                          <span>
                            <channel.icon className="w-4 h-4" />
                          </span>
                          <span className="font-medium">
                            {
                              city.interaction_breakdown[
                                channel.key as keyof typeof city.interaction_breakdown
                              ]
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {globalCitiesRanking?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div>{t('geographic.city_panel.no_city_data')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Selected Country Cities */}
      <div className="bg-background rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 text-green-600 mr-2" />
            {selectedCountry
              ? t('geographic.city_panel.cities_in', { country: countryMapping?.find((country) => country.alpha2 === selectedCountry)?.name })
              : t('geographic.city_panel.select_country')}
          </h5>
          <div className="text-xs text-gray-500">
            {selectedCountry ? `${selectedCountryCities?.length} ${t('geographic.city_panel.cities_label')}` : t('geographic.city_panel.click_map')}
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectedCountry ? (
            selectedCountryCities?.length > 0 ? (
              selectedCountryCities
                .sort((a, b) => a.city_rank_in_country - b.city_rank_in_country)
                .map((city) => {
                  const activeChannels = formatChannelBreakdown(city.interaction_breakdown)

                  return (
                    <div
                      key={`country-${city.country}-${city.city}`}
                      className="bg-linear-to-r from-green-50 to-white rounded-lg p-4 border border-green-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full font-bold text-xs">
                            #{city.city_rank_in_country}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{city.city}</div>
                            <div className="text-xs text-gray-500">
                              {t('geographic.city_panel.rank', { n: city.city_rank_global })} {t('geographic.city_panel.globally')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">{t('geographic.city_panel.total_visits')}</div>
                          <div className="font-semibold text-blue-600">{city?.total_visits}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('geographic.city_panel.unique_users')}</div>
                          <div className="font-semibold text-green-600">{city?.unique_users}</div>
                        </div>
                      </div>

                      {activeChannels && activeChannels.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-600 mb-1">{t('geographic.city_panel.interaction_breakdown')}</div>
                          <div className="flex items-center space-x-2">
                            {activeChannels.map((channel: Channel) => (
                              <div
                                key={channel.key}
                                className="flex items-center space-x-1 text-xs"
                              >
                                <span>
                                  <channel.icon className="w-4 h-4" />
                                </span>
                                <span className="font-medium">
                                  {
                                    city?.interaction_breakdown[
                                      channel.key as keyof typeof city.interaction_breakdown
                                    ]
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div>{t('geographic.city_panel.no_cities_for', { country: selectedCountry })}</div>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-3">🗺️</div>
              <div className="font-medium mb-1">{t('geographic.city_panel.select_country')}</div>
              <div className="text-sm">
                {t('geographic.city_panel.select_country_hint')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
