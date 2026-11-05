import { cn } from "@/shared/lib/cn";

type CurrentUsageProps = {
  limit: number;
  usage: number;
  title: string;
  titleAfter?: string;
  label?: string;
  icon?: React.ReactNode;
  isShowCounter?: boolean;
  className?: string;
};

export const DisplayCurrentUsage = ({
  limit,
  usage,
  title,
  titleAfter,
  label = "",
  icon,
  isShowCounter = true,
  className = "",
}: CurrentUsageProps) => {
  return (
    <div className="flex justify-between items-center text-sm font-medium text-slate-700">
      <span className={cn("flex items-center gap-2", className)}>
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="">{title}</span>{" "}
        {titleAfter && <span className="">{titleAfter}</span>}
      </span>
      {isShowCounter && (
        <span className="text-slate-500 text-sm font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
          {usage}{label} / {limit}
        </span>
      )}
    </div>
  );
};
