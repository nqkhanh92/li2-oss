import { Crown } from "lucide-react";
import { useOrganizationStoreProvider } from "@/shared/providers/organization-store-provider";
import { useTranslation } from "react-i18next";

type HeaderSectionProps = {
  title: string | React.ReactNode;
  description?: string;
  premiumDescription?: string;
  subTitle?: string;
  icon?: React.ReactNode;
  textSize?: "md" | "base" | "lg" | "xl" | "2xl" | "3xl";
  endAdornment?: React.ReactNode;
  showPremiumBadge?: boolean;
};

export const HeaderSection = ({
  title,
  description,
  premiumDescription,
  subTitle,
  icon,
  textSize = "2xl",
  endAdornment,
  showPremiumBadge = true,
}: HeaderSectionProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { orgPlan } = useOrganizationStoreProvider();
  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics;

  return (
    <div className="flex flex-col gap-2 items-start w-full">
      <div className="flex flex-row w-full justify-between items-center">
        <div>
          <h3 className={`text-${textSize} font-bold text-gray-900 flex items-center`}>
            {icon && icon}
            {title || ""}
            {showPremiumBadge && allowExtraAdvancedAnalytic && (
              <Crown className="w-5 h-5 text-purple-500 ml-2" />
            )}
          </h3>
          <p className="text-gray-600 mt-1">
            {allowExtraAdvancedAnalytic ? premiumDescription : description || ""}
          </p>
        </div>
        {showPremiumBadge && allowExtraAdvancedAnalytic && (
          <div className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            {t('header_section.premium_badge')}
          </div>
        )}
        {endAdornment && endAdornment}
      </div>
      {subTitle && <p className="text-gray-600 mt-1">{subTitle}</p>}
    </div>
  );
};
