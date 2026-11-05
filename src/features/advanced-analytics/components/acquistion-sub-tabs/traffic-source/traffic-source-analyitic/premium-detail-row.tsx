import React from 'react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'

import {
  InteractionBreakdown,
  PremiumTierSource,
} from '@/core/types/analytics/acquisition-traffic.type'
import { HelpCircle, Monitor, Smartphone } from 'lucide-react'
import { getInteractionBreakdownForTrafficSources } from '@/features/advanced-analytics/utils/helper'
import { QualityTooltip } from '../tool-tip'
import { TableCell, TableRow } from '@/shared/components/ui/table'
import { useTranslation } from 'react-i18next'

type PremiumDetailsRowProps = {
  source: PremiumTierSource
}

export const PremiumDetailsRow = ({ source }: PremiumDetailsRowProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { orgPlan } = useOrganizationStoreProvider()
  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics

  if (!allowExtraAdvancedAnalytic || !source) {
    return <></>
  }
  return (
    <TableRow>
      <TableCell colSpan={6} className="px-4 py-0">
        <div className="bg-linear-to-r from-purple-25 to-indigo-25 rounded-lg p-4 my-2 border border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Platform Distribution */}
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">{t('traffic_source.premium_row.platform_distribution')}</h6>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-card rounded p-2 border">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{t('traffic_source.premium_row.desktop')}</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {source.platform_distribution.desktop_visits}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-background rounded p-2 border">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{t('traffic_source.premium_row.mobile')}</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {source.platform_distribution.mobile_visits}
                  </span>
                </div>
              </div>
            </div>

            {/* Interaction Breakdown */}
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">{t('traffic_source.premium_row.interaction_channels')}</h6>
              <div className="space-y-2">
                {getInteractionBreakdownForTrafficSources(source.interaction_breakdown).map(
                  (channel) => {
                    const IconComponent = channel.icon
                    return (
                      <div
                        key={channel.key}
                        className="flex items-center justify-between bg-background rounded p-2 border"
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`w-4 h-4 ${channel.color}`} />
                          <span className="text-sm">{channel.name}</span>
                        </div>
                        <span className={`font-bold ${channel.color}`}>
                          {source.interaction_breakdown[
                            channel.key as keyof InteractionBreakdown
                          ] || 0}
                        </span>
                      </div>
                    )
                  }
                )}
                {getInteractionBreakdownForTrafficSources(source.interaction_breakdown).length ===
                  0 && <div className="text-xs text-gray-500 italic">{t('traffic_source.premium_row.no_active_channels')}</div>}
              </div>
            </div>

            {/* Quality Breakdown */}
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">{t('traffic_source.premium_row.quality_analysis')}</h6>
              <div className="grid grid-cols-2 gap-2">
                <QualityTooltip
                  title={t('traffic_source.premium_row.engagement_score')}
                  description={t('traffic_source.premium_row.engagement_score_desc')}
                >
                  <div className="bg-background rounded p-2 text-center border cursor-help">
                    <div className="text-sm font-bold text-blue-600 flex items-center justify-center space-x-1">
                      <span>{source.quality_breakdown.engagement_score}</span>
                      <HelpCircle className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">{t('traffic_source.premium_row.engagement')}</div>
                  </div>
                </QualityTooltip>

                <QualityTooltip
                  title={t('traffic_source.premium_row.volume_score')}
                  description={t('traffic_source.premium_row.volume_score_desc')}
                >
                  <div className="bg-background rounded p-2 text-center border cursor-help">
                    <div className="text-sm font-bold text-purple-600 flex items-center justify-center space-x-1">
                      <span>{source.quality_breakdown.volume_score}</span>
                      <HelpCircle className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">{t('traffic_source.premium_row.volume')}</div>
                  </div>
                </QualityTooltip>

                <QualityTooltip
                  title={t('traffic_source.premium_row.reach_score')}
                  description={t('traffic_source.premium_row.reach_score_desc')}
                >
                  <div className="bg-background rounded p-2 text-center border cursor-help">
                    <div className="text-sm font-bold text-green-600 flex items-center justify-center space-x-1">
                      <span>{source.quality_breakdown.reach_score}</span>
                      <HelpCircle className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">{t('traffic_source.premium_row.reach')}</div>
                  </div>
                </QualityTooltip>

                <QualityTooltip
                  title={t('traffic_source.premium_row.consistency_score')}
                  description={t('traffic_source.premium_row.consistency_score_desc')}
                >
                  <div className="bg-background rounded p-2 text-center border cursor-help">
                    <div className="text-sm font-bold text-orange-600 flex items-center justify-center space-x-1">
                      <span>{source.quality_breakdown.consistency_score}</span>
                      <HelpCircle className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">{t('traffic_source.premium_row.consistency')}</div>
                  </div>
                </QualityTooltip>
              </div>
            </div>

            {/* Key Metrics */}
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">{t('traffic_source.premium_row.key_metrics')}</h6>
              <div className="space-y-2">
                <div className="flex justify-between bg-background rounded p-2 border">
                  <span className="text-sm text-gray-600">{t('traffic_source.premium_row.active_days')}</span>
                  <span className="font-bold text-indigo-600">{source.active_days}</span>
                </div>
                <div className="flex justify-between bg-background rounded p-2 border">
                  <span className="text-sm text-gray-600">{t('traffic_source.premium_row.countries')}</span>
                  <span className="font-bold text-orange-600">{source.countries_reached}</span>
                </div>
                <div className="flex justify-between bg-background rounded p-2 border">
                  <span className="text-sm text-gray-600">{t('traffic_source.premium_row.links')}</span>
                  <span className="font-bold text-pink-600">{source.touchpoints_accessed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
