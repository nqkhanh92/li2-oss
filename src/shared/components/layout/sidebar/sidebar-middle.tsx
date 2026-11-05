'use client'

import React from 'react'
import { ChevronDown, ChevronRight, Crown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/shared/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getMenuList } from '@/shared/constants/menu-list'
import { cn } from '@/shared/lib/utils'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { LoadingMask } from '../../customize/loading-mask'
import { useMemo } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/dropdown-menu'
import {
  CollapsibleContentProps,
  CollapsibleProps,
  CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible'
import {
  DropdownMenuContentProps,
  DropdownMenuProps,
  DropdownMenuTriggerProps,
} from '@radix-ui/react-dropdown-menu'
import { useEventStore } from '@/shared/stores/event-store'

type MenuItem = ReturnType<typeof getMenuList>[number]['menus'][number]

function renderIcon(icon: LucideIcon | React.ReactElement, className?: string) {
  if (React.isValidElement(icon)) return icon
  const Icon = icon as LucideIcon
  return <Icon className={className} />
}

function MenuItemRow({ menu, onNavigate }: { menu: MenuItem; onNavigate: () => void }) {
  return (
    <SidebarMenuItem className="list-none">
      <Link href={menu.href!} onClick={onNavigate}>
        <SidebarMenuButton
          isActive={menu.active}
          tooltip={menu.label}
          className="overflow-visible group/item h-auto"
        >
          {menu.icon && (
            <div className="relative overflow-visible flex justify-center">
              {renderIcon(menu.icon, cn('w-5! h-5! transition-colors'))}
              {menu.isPremium && (
                <Crown
                  className="absolute top-[-2px] -right-2 w-[9px] h-[9px] max-w-[9px] max-h-[9px] fill-none stroke-secondary-yellow"
                  size={9}
                />
              )}
            </div>
          )}
          <span className="text-s flex-1">{menu.labelRender || menu.label}</span>
          {menu.isBeta && (
            <span
              className="inline-flex items-center px-1 py-0.5 text-[8px] italic font-medium text-white rounded-[2px] leading-[10px] shrink-0"
              style={{
                background:
                  'linear-gradient(91deg, var(--color-beta-tag-from) 0%, var(--color-beta-tag-to) 99%)',
              }}
            >
              Beta
            </span>
          )}
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  )
}

export function SidebarMiddle() {
  const { setEvent } = useEventStore()

  const pathname = usePathname()
  const menuList = getMenuList(pathname)
  const { isLoadingPermission } = useOrganizationStoreProvider()
  const { open } = useSidebar()
  const MenuComponents = useMemo(() => {
    if (open) {
      return {
        Wrapper: (props: CollapsibleProps) => <Collapsible {...props} defaultOpen={true} />,
        Trigger: (props: CollapsibleTriggerProps) => <CollapsibleTrigger {...props} />,
        Content: (props: CollapsibleContentProps) => <CollapsibleContent {...props} />,
      }
    }
    return {
      Wrapper: (props: DropdownMenuProps) => (
        <DropdownMenu {...props} defaultOpen={false} modal={false} />
      ),
      Trigger: (props: DropdownMenuTriggerProps) => <DropdownMenuTrigger {...props} />,
      Content: (props: DropdownMenuContentProps) => (
        <DropdownMenuContent
          align="start"
          className={cn('bg-sidebar', props.className)}
          {...props}
        />
      ),
    }
  }, [open])

  const handleNavigate = () => setEvent('close-mobile-sidebar')

  return (
    <SidebarGroup>
      <LoadingMask loading={isLoadingPermission}>
        <div className="space-y-3">
          {menuList.map(({ groupLabel, menus, enabled: groupEnabled }, index) => {
            if (groupEnabled === false) return null
            if (menus.filter((m) => m.enabled !== false).length === 0) return null
            return (
              <div key={index} className="space-y-1">
                {groupLabel && open && (
                  <SidebarGroupLabel className="text-[10px] font-medium tracking-wide text-slate-400 h-auto uppercase">
                    {groupLabel}
                  </SidebarGroupLabel>
                )}
                <div className="space-y-0.5">
                  {menus.map((menu, menuIndex) => {
                    if (menu.enabled === false) return null

                    if (menu.type === 'group') {
                      if (!open) return null
                      const enabledChildren =
                        menu.children?.filter((c) => c.enabled !== false) ?? []
                      if (enabledChildren.length === 0) return null

                      const childrenList = (
                        <div className="space-y-0.5">
                          {enabledChildren.map((child, childIndex) => (
                            <MenuItemRow
                              key={childIndex}
                              menu={child}
                              onNavigate={handleNavigate}
                            />
                          ))}
                        </div>
                      )

                      if (menu.collapsible) {
                        return (
                          <Collapsible
                            key={menuIndex}
                            defaultOpen={menu.defaultOpen ?? false}
                            className="group/subgroup"
                          >
                            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 pt-3 pb-1 cursor-pointer">
                              <span className="text-[10px] font-medium uppercase text-slate-400 tracking-wide">
                                {menu.label}
                              </span>
                              <ChevronDown className="size-[14px] text-slate-400 transition-transform duration-200 group-data-[state=open]/subgroup:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>{childrenList}</CollapsibleContent>
                          </Collapsible>
                        )
                      }

                      return (
                        <div key={menuIndex}>
                          <div className="px-3 pt-3 pb-1">
                            <span className="text-[10px] font-medium uppercase text-slate-400 tracking-wide">
                              {menu.label}
                            </span>
                          </div>
                          {childrenList}
                        </div>
                      )
                    }

                    if (menu.type === 'divider') {
                      return (
                        <div key={menuIndex} className="px-3 pt-3 pb-1">
                          {menu.label && (
                            <span className="text-[10px] font-medium uppercase text-slate-400 tracking-wide">
                              {menu.label}
                            </span>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div key={menuIndex}>
                        {menu?.submenus && menu.submenus.length > 0 ? (
                          <MenuComponents.Wrapper
                            key={`label-${menuIndex}`}
                            asChild
                            defaultOpen={true}
                            className="group/collapsible"
                          >
                            <SidebarMenuItem className="list-none">
                              <MenuComponents.Trigger asChild>
                                <SidebarMenuButton
                                  tooltip={menu.label}
                                  isActive={menu.active}
                                  variant="default"
                                  className="group/item"
                                >
                                  {menu.icon &&
                                    renderIcon(menu.icon, cn('w-5! h-5! transition-colors'))}
                                  <span>{menu.labelRender || menu.label}</span>
                                  <ChevronRight className="ml-auto size-[14px] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                              </MenuComponents.Trigger>
                              <MenuComponents.Content>
                                <SidebarMenuSub className="px-0 mx-0">
                                  {menu.submenus?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.label}>
                                      <SidebarMenuSubButton
                                        asChild
                                        className="pl-8 py-2! font-medium text-[14px]"
                                        isActive={subItem.active}
                                      >
                                        <Link href={subItem.href} onClick={handleNavigate}>
                                          <span>{subItem.label}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </MenuComponents.Content>
                            </SidebarMenuItem>
                          </MenuComponents.Wrapper>
                        ) : (
                          <MenuItemRow menu={menu} onNavigate={handleNavigate} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </LoadingMask>
    </SidebarGroup>
  )
}
