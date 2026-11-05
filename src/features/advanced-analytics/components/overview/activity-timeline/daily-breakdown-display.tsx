import { DailyData } from "@/core/types/analytics/daily-trend.type";
import { useOrganizationStoreProvider } from "@/shared/providers/organization-store-provider";
import { Crown, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type DailyBreakdownDisplayProps = {
  daily_data: DailyData[];
};

// Helper function to format the date string
const getFormattedDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const PremiumDayRow = ({
  day,
  maxInteractions,
  isLastDay,
}: {
  day: DailyData;
  maxInteractions: number;
  isLastDay: boolean;
}) => {
  const { t } = useTranslation('advanced_analytics')

  // Premium: Advanced contextual insights
  const getAdvancedInsight = () => {
    if (
      day.total_interactions === maxInteractions &&
      day.total_interactions > 0
    ) {
      return { text: t('daily_breakdown.insight_peak'), color: "text-orange-600" };
    }
    if (day.total_interactions > 0 && isLastDay) {
      return { text: t('daily_breakdown.insight_recent'), color: "text-green-600" };
    }
    if (
      day.moving_avg_3day > day.total_interactions &&
      day.total_interactions > 0
    ) {
      return { text: t('daily_breakdown.insight_below_avg'), color: "text-yellow-600" };
    }
    if (day.total_interactions > 0) {
      return { text: t('daily_breakdown.insight_active'), color: "text-blue-600" };
    }
    if (day.total_interactions === 0) {
      return { text: t('daily_breakdown.insight_no_activity'), color: "text-gray-400" };
    }
    return { text: "", color: "text-gray-400" };
  };

  const insight = getAdvancedInsight();

  // Determine progress bar width and style
  const widthPercentage =
    maxInteractions > 0 ? (day.total_interactions / maxInteractions) * 100 : 0;
  const progressBarWidth = Math.max(widthPercentage, 8);
  const progressBarClasses =
    day.total_interactions === maxInteractions
      ? "bg-linear-to-r from-orange-400 to-orange-500"
      : day.total_interactions > 0
      ? "bg-linear-to-r from-blue-400 to-blue-500"
      : "bg-gray-300";

  // Determine daily growth display
  const growthClasses =
    day.daily_growth_pct !== null &&
    day.daily_growth_pct !== undefined &&
    day.daily_growth_pct > 0
      ? "text-green-600"
      : day.daily_growth_pct !== null &&
        day.daily_growth_pct !== undefined &&
        day.daily_growth_pct < 0
      ? "text-red-600"
      : "text-gray-400";
  const GrowthIcon =
    day.daily_growth_pct !== null &&
    day.daily_growth_pct !== undefined &&
    day.daily_growth_pct > 0
      ? TrendingUp
      : TrendingDown;

  return (
    <div
      key={day.date}
      className="flex items-center space-x-4 py-2 rounded-lg transition-colors"
    >
      {/* Date */}
      <div className="w-20 text-sm font-medium text-gray-700">
        {getFormattedDate(day.date)}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="flex-1 rounded-full h-3 relative overflow-hidden">
        {day.total_interactions > 0 && (
          <div
            className={`h-3 rounded-full transition-all duration-500 ${progressBarClasses}`}
            style={{ width: `${progressBarWidth}%` }}
          />
        )}
        {/* Moving average indicator */}
        {day.moving_avg_3day > 0 && (
          <div
            className="absolute top-0 h-3 w-0.5 bg-yellow-500 opacity-70"
            style={{
              left: `${Math.max(
                (day.moving_avg_3day / maxInteractions) * 100,
                2
              )}%`,
            }}
            title={`3-day average: ${day.moving_avg_3day}`}
          />
        )}
      </div>

      {/* Detailed Metrics */}
      <div className="w-24 text-right space-y-1">
        <div className="text-sm font-bold text-gray-900">
          {day.total_interactions}{" "}
          {t('daily_breakdown.interaction', { count: day.total_interactions })}
        </div>
        {day.unique_users > 0 && (
          <div className="text-xs text-green-600">
            {day.unique_users} {t('daily_breakdown.person', { count: day.unique_users })}
          </div>
        )}
        {day.moving_avg_3day > 0 && (
          <div className="text-xs text-yellow-600">
            {t('daily_breakdown.three_day_avg', { value: day.moving_avg_3day })}
          </div>
        )}
      </div>

      {/* Advanced Insights */}
      <div className={`w-40 text-xs ${insight.color}`}>{insight.text}</div>

      {/* Growth Analysis */}
      <div className="w-16 text-right">
        {day.daily_growth_pct !== null && day.daily_growth_pct !== 0 ? (
          <div
            className={`text-xs font-medium flex items-center justify-end space-x-1 ${growthClasses}`}
          >
            <GrowthIcon className="w-3 h-3" />
            <span>
              {day.daily_growth_pct !== null &&
              day.daily_growth_pct !== undefined &&
              day.daily_growth_pct > 0
                ? day.daily_growth_pct
                : Math.abs(day.daily_growth_pct || 0)}
              %
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-400">—</div>
        )}
      </div>
    </div>
  );
};

const FreeDayRow = ({
  day,
  maxInteractions,
}: {
  day: DailyData;
  maxInteractions: number;
}) => {
  const { t } = useTranslation('advanced_analytics')
  const widthPercentage =
    maxInteractions > 0 ? (day.total_interactions / maxInteractions) * 100 : 0;
  const progressBarWidth = Math.max(widthPercentage, 8);

  return (
    <div
      key={day.date}
      className="flex items-center space-x-4 py-2 rounded-lg transition-colors"
    >
      {/* Date */}
      <div className="w-20 text-sm font-medium text-gray-700">
        {getFormattedDate(day.date)}
      </div>

      {/* Simple Progress Bar */}
      <div className="flex-1 rounded-full h-3 relative overflow-hidden">
        {day.total_interactions > 0 && (
          <div
            className="h-3 rounded-full transition-all duration-500 bg-linear-to-r from-blue-400 to-blue-500"
            style={{ width: `${progressBarWidth}%` }}
          />
        )}
      </div>

      {/* Basic Metrics */}
      <div className="w-24 text-right">
        <div className="text-sm font-bold text-gray-900">
          {day.total_interactions}{" "}
          {t('daily_breakdown.interaction', { count: day.total_interactions })}
        </div>
      </div>

      {/* Locked Premium Features */}
      <div className="w-40 text-xs text-gray-400 flex items-center space-x-1">
        <Crown className="w-3 h-3 text-purple-400" />
        <span>{t('daily_breakdown.insights_locked')}</span>
      </div>
      <div className="w-16 text-right text-xs text-gray-400">
        <Crown className="w-3 h-3 text-purple-400" />
      </div>
    </div>
  );
};

/**
 * Renders the teaser for locked, older days in the free tier.
 */
const FreeTierTeaser = ({ older_data }: { older_data: DailyData[] }) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-linear-to-t from-white via-white/80 to-transparent z-10"></div>
      <div className="space-y-2 opacity-30">
        {older_data.map((day) => (
          <div key={day.date} className="flex items-center space-x-4 py-1">
            <div className="w-20 text-xs text-gray-400">
              {new Date(day.date).toLocaleDateString("en", {
                weekday: "short",
                day: "numeric",
              })}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
            <div className="w-24 text-xs text-gray-400">{t('daily_breakdown.locked')}</div>
            <div className="w-40 text-xs text-gray-400">{t('daily_breakdown.premium_only')}</div>
            <div className="w-16"></div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4" />
            <span className="font-medium">
              {t('daily_breakdown.upgrade_full_timeline')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DailyBreakdownDisplay = ({
  daily_data,
}: DailyBreakdownDisplayProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { orgPlan } = useOrganizationStoreProvider();
  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics;

  const maxInteractions = useMemo(
    () => Math.max(...daily_data.map((d) => d.total_interactions)),
    [daily_data]
  );

  // --- PREMIUM TIER: Full Timeline with Advanced Features ---
  if (allowExtraAdvancedAnalytic) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          {t('daily_breakdown.title')}
        </h3>
        {daily_data.map((day: DailyData, index: number) => (
          <PremiumDayRow
            key={day.date}
            day={day}
            maxInteractions={maxInteractions}
            isLastDay={index === daily_data.length - 1}
          />
        ))}
      </div>
    );
  }

  // --- FREE TIER: Limited Timeline (Last 3 days only) ---
  const recentDays = daily_data.slice(-3);
  const olderDays = daily_data.slice(0, -3);

  // Recalculate max for the recent days only, as per the free tier logic
  const maxInteractionsFree = useMemo(
    () => Math.max(...recentDays.map((d) => d.total_interactions)),
    [recentDays]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">
        Daily Interactions Breakdown
      </h3>
      {recentDays.map((day: DailyData) => (
        <FreeDayRow
          key={day.date}
          day={day}
          maxInteractions={maxInteractionsFree}
        />
      ))}
      {olderDays.length > 0 && <FreeTierTeaser older_data={olderDays} />}
    </div>
  );
};
