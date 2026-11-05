import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider';

export const MasterResetBtn = () => {
  const { handleMasterReset } = useAdvancedAnalyticsProvider();
  return (
    <button
      onClick={handleMasterReset}
      className="ml-4 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 flex items-center space-x-1"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Reset All</span>
    </button>
  );
};
