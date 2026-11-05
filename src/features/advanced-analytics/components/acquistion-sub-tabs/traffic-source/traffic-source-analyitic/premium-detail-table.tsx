import React, { useState } from 'react'
import { Crown, Target } from 'lucide-react'
import {
  PremiumTierAcquisitionsTrafficSrc,
  SourceCategory,
} from '@/core/types/analytics/acquisition-traffic.type'
import { getQualityTierStyle, getSourceIcon } from '@/features/advanced-analytics/utils/helper'
import { PremiumDetailsRow } from './premium-detail-row'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'

type Props = {
  data: PremiumTierAcquisitionsTrafficSrc
}

export const PremiumTierTable = ({ data }: Props) => {
  const { t } = useTranslation('advanced_analytics')
  const [expandedRows, setExpandedRows] = useState(new Set<string>())

  // Toggle row expansion
  const toggleRowExpansion = (sourceCategory: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(sourceCategory)) {
      newExpandedRows.delete(sourceCategory)
    } else {
      newExpandedRows.add(sourceCategory)
    }
    setExpandedRows(newExpandedRows)
  }

  return (
    <div className="bg-card rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-linear-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <Target className="w-5 h-5 text-purple-600 mr-2" />
          {t('traffic_source.analytic.table_title')}
          <Crown className="w-4 h-4 text-purple-500 ml-2" />
        </h4>
        <p className="text-sm text-gray-600 mt-1">{t('traffic_source.analytic.table_subtitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="">
            <TableRow>
              <TableHead className="text-left py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_source')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_visits')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_users')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_quality')}
              </TableHead>
              <TableHead className="text-right py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_share')}
              </TableHead>
              <TableHead className="text-center py-3 px-4 font-medium text-gray-700">
                {t('traffic_source.analytic.col_details')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {(data as PremiumTierAcquisitionsTrafficSrc)?.traffic_sources?.sources?.map(
              (source, index) => {
                const qualityStyle = getQualityTierStyle(source.quality_tier || '')
                const isExpanded = expandedRows.has(source.source_category + index)
                return (
                  <React.Fragment key={index}>
                    <TableRow
                      className={`cursor-pointer ${isExpanded ? 'bg-slate-300' : ''}`}
                      onClick={() => toggleRowExpansion(source.source_category + index)}
                    >
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                            #{source.volume_rank}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 capitalize flex items-center">
                              <span className="text-lg mr-2">
                                {getSourceIcon(source.source_category as SourceCategory)}
                              </span>
                              {source.source_category}
                            </div>
                            <div className="text-xs text-gray-500">
                              {source.original_referrer || ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-right">
                        <div className="font-bold text-lg text-purple-600">
                          {source.total_visits}
                        </div>
                        <div className="text-xs text-gray-500">{source.visits_per_user}{t('traffic_source.analytic.per_user')}</div>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-right">
                        <div className="font-bold text-blue-600">{source.unique_users}</div>
                        <div className="text-xs text-gray-500">
                          {source.repeat_user_rate}{t('traffic_source.analytic.repeat_suffix')}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${qualityStyle.bg} ${qualityStyle.text}`}
                        >
                          {source.quality_score}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-right font-bold text-gray-900">
                        {source.source_share_pct}%
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
                    {isExpanded && <PremiumDetailsRow source={source} />}
                  </React.Fragment>
                )
              }
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
