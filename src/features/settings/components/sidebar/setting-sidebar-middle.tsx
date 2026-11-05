'use client'

import { cn } from '@/shared/lib/utils'
import { getProfileMenuList } from './menu-list'
import { Button } from '@/shared/components/ui/button'
import { Crown } from 'lucide-react'

interface MenuItem {
  label: string
  href: string
  submenus?: SubMenuItem[]
}

interface SubMenuItem {
  label: string
  href: string
  isPremium?: boolean
}

interface MenuItemProps {
  menu: SubMenuItem
  isActive: boolean
  onClick: () => void
  className?: string
}

export const MenuItem = ({ menu, isActive, onClick, className }: MenuItemProps) => {
  return (
    <div key={menu.label}>
      <div className={cn('text-slate-600 hover:text-primary h-9', className)}>
        <Button
          variant={'outline'}
          className={cn(
            'text-sm text-slate-600 bg-transparent border-none hover:text-primary hover:bg-background h-9 w-full justify-start ',
            isActive ? 'text-primary bg-white' : ''
          )}
          type="button"
          onClick={() => onClick()}
        >
          {menu.label && (
            <div className="relative">
              <span>{menu.label}</span>
              {menu.isPremium && (
                <Crown
                  className="absolute top-[calc(20%-6px)] -right-[calc(15%-6px)] w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-neutral-900 stroke-neutral-900"
                  size={12}
                />
              )}
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SettingSidebarMiddle({
  onTabSelect,
  selectedTab,
  hash,
}: {
  onTabSelect?: (tab: string) => void
  selectedTab: string
  hash: string
}) {
  const menuList = getProfileMenuList(selectedTab)
  const handleClick = (tabValue: string) => {
    if (onTabSelect) {
      onTabSelect(tabValue)
      if (selectedTab === tabValue) {
        const container = document.getElementById('setting-section')
        container?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }
  return (
    <div className="relative h-svh bg-transparent">
      {menuList.map(({ menus }, index) => (
        <div key={index} className="space-y-1">
          {menus.map((menu) => (
            <div className="list-none py-2">
              <div
                onClick={() => handleClick(menu.href)}
                className={cn(
                  `w-full text-sm text-slate-500 font-medium px-4 py-[6px] leading-[20px] h-9 hover:text-slate-500 
                    hover:bg-transparent data-[active=true]:bg-transparent data-[active=true]:text-slate-500 cursor-pointer`
                )}
              >
                <span>{menu.label}</span>
              </div>
              <div className="border-0 gap-0 py-0 mx-3.5">
                {menu.submenus
                  .filter((e) => e.hidden !== true)
                  ?.map((subItem) => {
                    return (
                      <MenuItem
                        key={subItem.label}
                        menu={subItem}
                        isActive={subItem.href.includes(hash)}
                        onClick={() => handleClick(subItem.href)}
                        className=""
                      />
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
