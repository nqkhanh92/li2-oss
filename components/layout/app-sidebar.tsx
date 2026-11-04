'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { isNavItemActive, navItems } from '@/components/nav-config'
import { LogoutButton, type NavbarUser } from '@/components/layout/navbar'
import { cn } from '@/lib/utils'

/**
 * Khối người dùng ở chân sidebar. Tách ra vì nó cần `useSidebar()` để biết đang thu gọn hay không,
 * mà `AppSidebar` thì render nó bên trong `Sidebar` — hook chỉ đọc được context ở trong đó.
 */
function SidebarUser({ user }: { user: NavbarUser }) {
  const { open } = useSidebar()
  const name = user.display_name || user.email

  return (
    <SidebarMenu className="w-full">
      <SidebarMenuItem className="border-t border-sidebar-border px-2 py-3">
        <div className={cn('flex items-center gap-2 min-w-0', !open && 'justify-center')}>
          <span className="w-7 h-7 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center shrink-0">
            <UserRound className="w-4 h-4 text-sidebar-foreground" aria-hidden="true" />
          </span>
          {open && (
            <span className="truncate text-s text-sidebar-foreground" title={user.email}>
              {name}
            </span>
          )}
        </div>
      </SidebarMenuItem>

      {/* Chỉ ở mobile: thanh trên ở desktop đã có nút đăng xuất, hai nút cạnh nhau là dư. */}
      <SidebarMenuItem className="md:hidden block px-2 pb-2">
        <LogoutButton className="w-full justify-start text-foreground" />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/**
 * Sidebar bên trái. Bố cục theo bản thương mại: logo/tên nằm trên thanh `Navbar` (nên sidebar đẩy
 * xuống `mt-[52px]`), menu ở giữa, người dùng + đăng xuất ở chân.
 *
 * `collapsible="icon"` để lúc thu gọn vẫn còn dải icon, giống bản gốc, chứ không trượt hẳn ra ngoài.
 */
export function AppSidebar({ user, className }: { user: NavbarUser; className?: string }) {
  const pathname = usePathname()

  return (
    <Sidebar
      className={cn(
        'mt-[52px] h-[calc(100svh-52px)] border-r-0! shadow-none! bg-sidebar rounded-tl-3xl',
        className
      )}
      collapsible="icon"
    >
      {/* Nút thu gọn nổi ở góc trên phải sidebar, như bản gốc. Ẩn dưới lg: ở khổ nhỏ sidebar là
          Sheet và đã có hamburger trên Navbar. */}
      <div className="absolute -translate-y-1/2 top-6 right-2 z-10 group-data-[state=collapsed]:right-4.5 hidden lg:block">
        <SidebarTrigger size="icon" />
      </div>

      <SidebarContent className="w-full overflow-x-hidden pb-6 pt-[16px] group-data-[state=collapsed]:pt-10 px-6 group-data-[collapsible=icon]:px-3">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.href} className="list-none">
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(item, pathname)}
                    tooltip={item.label}
                    className="overflow-visible group/item h-auto"
                  >
                    <Link href={item.href}>
                      <Icon className="w-5! h-5! transition-colors" aria-hidden="true" />
                      <span className="text-s flex-1">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-0 py-0">
        <SidebarUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
