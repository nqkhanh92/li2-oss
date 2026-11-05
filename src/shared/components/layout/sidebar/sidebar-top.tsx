'use client'

import * as React from 'react'
import { KeyIcon, NetworkIcon, PlusCircle, UsersRound } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/shared/components/ui/sidebar'
import { useRouter } from 'next/navigation'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { cn } from '@/shared/lib/cn'
import { OrganizationPopover } from './organization-popover'
export function SidebarTop() {
  const { organization, isOrgOwner } = useOrganizationStoreProvider()
  const { push } = useRouter()
  const { open, openMobile, setOpenMobile } = useSidebar()
  const { t } = useTranslation('common')

  return (
    <SidebarMenu
      className={cn(!open ? 'flex flex-col gap-[16px] mb-4' : 'flex flex-col gap-[16px]')}
    >
      <SidebarMenuItem>
        <div
          className={`
            ${!open ? 'flex items-center' : ''}
          data-[state=open]:bg-sidebar-accent relative 
          data-[state=open]:text-sidebar-accent-foreground justify-center w-full h-[60px] border-b p-4`}
        >
          <OrganizationPopover open={open}>
            {open ? (
              <button className="bg-transparent w-full text-ellipsis text-foreground text-s font-medium text-left flex items-center justify-between gap-2 hover:bg-white rounded-md px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2 min-w-12">
                  <div className="w-6 h-6 rounded-md bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] flex items-center justify-center shrink-0">
                    {organization && (
                      <span className="[&_svg]:w-4 [&_svg]:h-4 text-white">
                        {isOrgOwner ? <KeyIcon /> : <UsersRound />}
                      </span>
                    )}
                  </div>
                  <span className="truncate flex-1 min-w-12">{organization?.name}</span>
                </div>
                <svg
                  className="w-4 h-4 text-slate-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            ) : (
              <button className="w-[36px] h-[36px] p-0 bg-transparent border border-solid border-slate-400 rounded-[8px] flex items-center justify-center hover:bg-slate-50 transition-colors">
                <NetworkIcon className="w-[24px] h-[24px]" />
              </button>
            )}
          </OrganizationPopover>
        </div>
        <div className="absolute -translate-y-1/2 -right-3 z-10 hidden lg:block">
          <SidebarTrigger size="icon" />
        </div>
      </SidebarMenuItem>
      {/* <SidebarMenuItem>
        <div
          className={cn(
            `
          data-[state=open]:bg-sidebar-accent 
          data-[state=open]:text-sidebar-accent-foreground justify-center w-full px-4`,
            {
              hidden: !open,
            }
          )}
        >
          <Button
            type="button"
            onClick={() => {
              push(`/org/${organization?.id}/short-links/create`)
              setOpenMobile(false)
            }}
            iconLeft={
              <PlusCircle
                className="text-white [&>circle]:fill-slate-800 [&>circle]:stroke-slate-800"
                size={20}
              />
            }
            className="h-9 w-full bg-transparent px-4 py-[6px] text-foreground justify-start gap-[6px] text-s! font-semibold hover:bg-sidebar-primary-foreground hover:text-sidebar-primary"
          >
            {t('common:buttons.new', { field: 'link' })}
          </Button>
        </div>
      </SidebarMenuItem> */}
    </SidebarMenu>
  )
}
