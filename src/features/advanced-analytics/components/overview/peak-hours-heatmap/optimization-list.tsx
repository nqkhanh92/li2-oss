import { COLOR_CLASSES } from '../../../constants';
import { Target } from 'lucide-react';
import { getColorClasses } from '../../../utils/helper';
import { useTranslation } from 'react-i18next';

type Props = {
  data: {
    title: string;
    description: string;
    color: keyof typeof COLOR_CLASSES;
  }[];
};

export const OptimizationList = ({ data }: Props) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="bg-linear-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
      <h5 className="font-medium text-purple-900 mb-3 flex items-center">
        <Target className="w-4 h-4 mr-2" />
        {t('peak_hours.optimization_title')}
      </h5>
      <div className="space-y-3 text-sm">
        {data.map((rec, index) => {
          const colorClasses = getColorClasses(rec.color);
          return (
            <div key={index} className="flex items-start space-x-2">
              <div className={`w-2 h-2 ${colorClasses.bg} rounded-full mt-2 shrink-0`}></div>
              <div>
                <div className={`font-medium ${colorClasses.text}`}>{rec.title}</div>
                <div className={colorClasses.desc}>{rec.description}</div>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="text-gray-500 text-center py-4">
            {t('peak_hours.no_recommendations')}
          </div>
        )}
      </div>
    </div>
  );
};
