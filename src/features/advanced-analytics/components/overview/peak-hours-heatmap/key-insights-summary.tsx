import { HeatmapDaum } from '@/core/types/analytics/peak-heatmap.type';
import {
  getPeakHour,
  getBusinessHoursStats,
  getQuietHoursStats,
  formatHour,
} from '../../../utils/calculation';
import { useTranslation } from 'react-i18next';

type Props = {
  heatmap_data: HeatmapDaum[];
};

export const KeyInsightsSummary = ({ heatmap_data }: Props) => {
  const { t } = useTranslation('advanced_analytics')
  const peakData = getPeakHour(heatmap_data);
  const { total: businessTotal, percentage: businessPercentage } =
    getBusinessHoursStats(heatmap_data);
  const { avg: quietAvg } = getQuietHoursStats(heatmap_data);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Peak Hour */}
      <Card
        bg="from-orange-50 to-red-50"
        border="border-orange-200"
        title={t('peak_hours.peak_hour')}
        value={`${peakData.day_name} ${formatHour(peakData.hour_of_day)}`}
        subtitle={t('peak_hours.interactions', { count: peakData.interactions })}
        icon="🔥"
      />

      {/* Business Hours */}
      <Card
        bg="from-blue-50 to-indigo-50"
        border="border-blue-200"
        title={t('peak_hours.business_hours')}
        value={t('peak_hours.interactions', { count: businessTotal })}
        subtitle={t('peak_hours.pct_of_total', { pct: businessPercentage })}
        icon="📈"
      />

      {/* Quiet Hours */}
      <Card
        bg="bg-slate-50"
        border="border-gray-200"
        title={t('peak_hours.quiet_hours')}
        value={t('peak_hours.avg_per_hour', { avg: quietAvg })}
        subtitle={t('peak_hours.quiet_period')}
        icon="😴"
      />
    </div>
  );
};

const Card = ({ bg, border, title, value, subtitle, icon }: any) => (
  <div className={`bg-linear-to-r ${bg} rounded-lg p-4 border ${border}`}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-lg font-bold text-gray-700">{value}</div>
        <div className="text-xs text-gray-600">{subtitle}</div>
      </div>
      <div className="text-gray-500">{icon}</div>
    </div>
  </div>
);
