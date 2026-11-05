import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import { SidebarMiddle } from './sidebar-middle'
import { SidebarTop } from './sidebar-top'
import { cn } from '@/shared/lib/utils'
import { SidebarBottom } from './sidebar-bottom'

export function AppSidebar({ className }: { className?: string }) {
  return (
    <Sidebar
      className={cn(
        'mt-[52px] h-[calc(100svh-52px)] border-r-0! shadow-none! bg-sidebar rounded-tl-3xl',
        className
      )}
      collapsible="icon"
    >
      {/* <SidebarHeader className="px-0 py-0 flex justify-center">
        <SidebarTop />
      </SidebarHeader> */}
      <div className="absolute -translate-y-1/2 top-6 right-2 z-10 group-data-[state=collapsed]:right-4.5 hidden lg:block">
        <SidebarTrigger size="icon" />
      </div>
      <SidebarContent className="w-full overflow-x-hidden pb-6 pt-[16px] group-data-[state=collapsed]:pt-10 px-6 group-data-[collapsible=icon]:px-3">
        <SidebarMiddle />
      </SidebarContent>
      <SidebarFooter className="px-0 py-0">
        <SidebarBottom />
      </SidebarFooter>
    </Sidebar>
  )
}
