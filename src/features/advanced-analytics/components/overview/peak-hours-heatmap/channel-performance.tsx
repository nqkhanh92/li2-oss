import { useTranslation } from 'react-i18next';

type Props = {
  data: {
    key: string;
    name: string;
    icon: any;
    color: string;
    hasActivity: boolean;
    activeTimeRange: string | null;
  }[];
};

export const ChannelPerformance = ({ data }: Props) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="rounded-lg p-4 border border-gray-200">
      <h5 className="font-medium text-gray-900 mb-3">
        {t('peak_hours.channel_performance_title')}
      </h5>
      <div className="space-y-3">
        {data.map((channel) => {
          if (channel.key === "nfc_taps" || channel.key === "wifi_accesses") return;
          const Icon = channel.icon;
          return (
            <div key={channel.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${channel.color}`} />
                <span className="text-sm text-gray-700">{channel.name}</span>
              </div>
              <div
                className={`text-sm ${
                  channel.hasActivity
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                }`}
              >
                {channel.hasActivity
                  ? t('peak_hours.most_active', { range: channel.activeTimeRange })
                  : t('peak_hours.no_activity')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
