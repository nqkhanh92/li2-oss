import { Crown, Megaphone, Calendar, Clock, Monitor, Smartphone, MapPin } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { CampaignPerformancePremiumTierData } from '@/core/types/analytics/campaign-performance.type'
import { getPerformanceTierStyle, getSourceIcon } from '@/features/advanced-analytics/utils/helper'
import { SourceCategory } from '@/core/types/analytics/acquisition-traffic.type'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'

type AdvancedCampaignTableProps = {
  data: CampaignPerformancePremiumTierData
}

const AdvancedCampaignTable = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { timePeriod, selectedTags, selectedTouchpoints, spaceId, selectedSpaceIds } =
    useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-campaign-performance', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  if (!data || !data?.campaign_performance?.source_medium_combinations) return <></>

  const toggleCampaignExpansion = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
    }
    setExpandedCampaigns(newExpanded)
  }
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set())
  return (
    <div className="bg-card rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-linear-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <Megaphone className="w-5 h-5 text-purple-600 mr-2" />
          {t('campaign_performance.advanced_table.title')}
          <Crown className="w-4 h-4 text-purple-500 ml-2" />
        </h4>
        <p className="text-sm text-gray-600 mt-1">{t('campaign_performance.advanced_table.subtitle')}</p>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_campaign')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_visits')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_users')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_performance')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_share')}
              </TableHead>
              <TableHead className="text-center py-3 px-4 font-medium text-gray-700">
                {t('campaign_performance.advanced_table.col_details')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {data.campaign_performance.campaigns.map((campaign, index) => {
              const performanceStyle = getPerformanceTierStyle(campaign.performance_tier || '')
              const isExpanded = expandedCampaigns.has(campaign.utm_campaign + index)
              const campaignId = campaign.utm_campaign + index

              return (
                <React.Fragment key={campaignId}>
                  <TableRow
                    className={`cursor-pointer ${isExpanded ? 'bg-slate-200' : ''}`}
                    onClick={() => toggleCampaignExpansion(campaignId)}
                  >
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-linear-to-br from-orange-500 to-red-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                          #{campaign.volume_rank}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center">
                            <span className="text-lg mr-2">
                              {getSourceIcon(campaign.utm_source as SourceCategory)}
                            </span>
                            {campaign.utm_campaign}
                          </div>
                          <div className="text-xs text-gray-500">
                            {campaign.utm_source} / {campaign.utm_medium}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="font-bold text-lg text-orange-600">
                        {campaign.total_visits}
                      </div>
                      <div className="text-xs text-gray-500">{campaign.visits_per_user}{t('campaign_performance.advanced_table.per_user')}</div>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="font-bold text-blue-600">{campaign.unique_users}</div>
                      <div className="text-xs text-gray-500">
                        {campaign.repeat_user_rate}{t('campaign_performance.advanced_table.repeat_suffix')}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${performanceStyle.bg} ${performanceStyle.text}`}
                      >
                        {campaign.performance_score}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="font-bold text-gray-900">{campaign.campaign_share_pct}%</div>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center">
                      <button className="text-gray-400 hover:text-purple-600 transition-colors">
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>

                  {/* Expandable Campaign Details */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-0">
                        <div className="bg-linear-to-r from-orange-25 to-red-25 rounded-lg p-4 my-2 border border-orange-100">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Time Patterns */}
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                {t('campaign_performance.advanced_table.time_patterns')}
                              </h6>
                              <div className="space-y-2">
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {t('campaign_performance.advanced_table.weekdays')}
                                  </span>
                                  <span className="font-bold text-blue-600">
                                    {campaign?.time_patterns?.weekday_visits}
                                  </span>
                                </div>
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {t('campaign_performance.advanced_table.bus_hours')}
                                  </span>
                                  <span className="font-bold text-green-600">
                                    {campaign?.time_patterns?.business_hours_pct}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Platform Distribution */}
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                {t('campaign_performance.advanced_table.platform_split')}
                              </h6>
                              <div className="space-y-2">
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <Monitor className="w-4 h-4 mr-1" />
                                    {t('campaign_performance.advanced_table.desktop')}
                                  </span>
                                  <span className="font-bold text-blue-600">
                                    {campaign?.platform_distribution?.desktop_visits}
                                  </span>
                                </div>
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <Smartphone className="w-4 h-4 mr-1" />
                                    {t('campaign_performance.advanced_table.mobile')}
                                  </span>
                                  <span className="font-bold text-green-600">
                                    {campaign?.platform_distribution?.mobile_visits}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Performance Breakdown */}
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                {t('campaign_performance.advanced_table.performance_scores')}
                              </h6>
                              <div className="grid grid-cols-2 gap-1">
                                <div className="bg-background rounded p-2 text-center border">
                                  <div className="text-sm font-bold text-blue-600">
                                    {campaign?.performance_breakdown?.engagement_score}
                                  </div>
                                  <div className="text-xs text-gray-500">{t('campaign_performance.advanced_table.engage')}</div>
                                </div>
                                <div className="bg-background rounded p-2 text-center border">
                                  <div className="text-sm font-bold text-purple-600">
                                    {campaign?.performance_breakdown?.volume_score}
                                  </div>
                                  <div className="text-xs text-gray-500">{t('campaign_performance.advanced_table.volume')}</div>
                                </div>
                              </div>
                            </div>

                            {/* Key Metrics */}
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                {t('campaign_performance.advanced_table.key_metrics')}
                              </h6>
                              <div className="space-y-2">
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {t('campaign_performance.advanced_table.countries')}
                                  </span>
                                  <span className="font-bold text-orange-600">
                                    {campaign.countries_reached}
                                  </span>
                                </div>
                                <div className="flex justify-between bg-background rounded p-2 border">
                                  <span className="text-sm text-gray-600">{t('campaign_performance.advanced_table.active_days')}</span>
                                  <span className="font-bold text-indigo-600">
                                    {campaign.active_days}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default AdvancedCampaignTable
