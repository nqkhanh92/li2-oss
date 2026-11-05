"use client";

import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CongratIcon } from "../../icons/congrat-icon";

interface PlanStatusMessageProps {
  plan?: {
    plans?: { name?: string };
    expires_at?: string;
  };
}

export const PlanStatusMessage = ({ plan }: PlanStatusMessageProps) => {
  const { t } = useTranslation(["layout"]);

  if (!plan?.expires_at) {
    return (
      // <div className="font-semibold lg:text-[15px] text-xs leading-4 gap-2 lg:leading-[22px] justify-start items-center lg:flex flex-1">
      //   {plan?.plans?.name?.toLowerCase() === "free"
      //     ? t("header.title.free_plan")
      //     : t("header.title.without_expire_date")}
      // </div>
      null
    );
  }
  const planName =
    plan?.plans?.name
      ?.toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "";

  const expiryDate = new Date(plan.expires_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (planName.toLowerCase() == "premium") {
    return null;
  }

  return (
    // <div className="font-medium lg:text-[15px] text-xs leading-4 gap-2 lg:leading-[22px] justify-start items-center flex text-secondary flex-row">
    //   <CongratIcon className="lg:w-5 lg:h-5 w-3 h-3 lg:min-w-5 lg:min-h-5 min-w-3 min-h-3 fill-guest-secondary-default" />
    //   <span className="text-ellipsis lg:max-h-11 max-h-8 overflow-hidden">
    //     {(() => {
    //       const planNameLower = plan?.plans?.name?.toLowerCase();
    //       if (planNameLower === "free") {
    //         return t("header.title.free_plan", { field: planName });
    //       }
    //       if (planNameLower?.includes("trial")) {
    //         return t("header.title.with_expire_date_trial", {
    //           field: planName,
    //         });
    //       }
    //       return t("header.title.with_expire_date", { field: planName });
    //     })()}
    //     {expiryDate}
    //   </span>
    // </div>
    null
  );
};
