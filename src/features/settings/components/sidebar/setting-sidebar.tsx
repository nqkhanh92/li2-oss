import { cn } from "@/shared/lib/utils";
import { SettingSidebarMiddle } from "./setting-sidebar-middle";

export function SettingSidebar({
  className,
  onTabSelect,
  selectedTab,
  hash,
}: {
  className?: string;
  onTabSelect?: (tab: string) => void;
  selectedTab: string;
  hash: string;
}) {
  return (
    <div
      className={cn(
        `pt-[52px] border-r-0! shadow-none! flex h-full flex-col 
        group-data-[variant=floating]:rounded-lg 
        group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm rounded-none bg-transparent ml-0 fixed w-fit`,
        className
      )}
    >
      <SettingSidebarMiddle
        onTabSelect={onTabSelect}
        selectedTab={selectedTab}
        hash={hash}
      />
    </div>
  );
}
