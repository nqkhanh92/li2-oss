import React from 'react'
import { Crown } from 'lucide-react'
import { getSourceIcon } from '@/features/advanced-analytics/utils/helper'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

export const FreeTierList = ({ data }: { data: any }) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="space-y-4">
      {data?.traffic_sources?.sources?.map((source: any, index: number) => (
        <div
          key={index}
          className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                #{source?.volume_rank}
              </div>
              <div className="text-2xl">{getSourceIcon(source?.source_category)}</div>
              <div>
                <div className="font-medium text-gray-900 capitalize">
                  {source?.source_category} {t('traffic_source.free_tier.traffic_suffix')}
                </div>
                <div className="text-sm text-gray-600">
                  {source?.unique_users} {source?.unique_users !== 1 ? t('traffic_source.free_tier.users_plural') : t('traffic_source.free_tier.users_singular')} •{' '}
                  {source?.total_visits} {t('traffic_source.free_tier.visits')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{source?.source_share_pct}%</div>
              <div className="text-xs text-gray-500">{t('traffic_source.free_tier.share')}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Upgrade Teaser */}
      <div className="bg-linear-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl p-6 border border-purple-200 mt-6">
        <h5 className="text-lg font-bold text-purple-900 flex items-center mb-3">
          <Crown className="w-5 h-5 text-purple-600 mr-2" />
          {t('traffic_source.free_tier.upgrade_title')}
        </h5>
        <ul className="space-y-2 text-sm mb-4 text-purple-800">
          <li>{t('traffic_source.free_tier.feature_1')}</li>
          <li>{t('traffic_source.free_tier.feature_2')}</li>
          <li>{t('traffic_source.free_tier.feature_3')}</li>
          <li>{t('traffic_source.free_tier.feature_4')}</li>
        </ul>
        <Button
          type="button"
          className="w-full bg-linear-to-r from-purple-500 to-indigo-500 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center space-x-2"
          iconLeft={<Crown />}
        >
          <span>{t('traffic_source.free_tier.upgrade_btn')}</span>
        </Button>
      </div>
    </div>
  )
}
