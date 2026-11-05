'use client'

import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/shared/components/ui/sidebar'
import { Loader2, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { useTransition } from 'react'
import { logout } from '@/app/actions/auth'
import { UserSidebar } from './user-sidebar'

export function SidebarBottom() {
  const { open } = useSidebar()

  const { t } = useTranslation('layout')
  const [isLoggingOut, startTransition] = useTransition()
  const handleSignOut = async () => {
    startTransition(async () => {
      await logout()
    })
  }
  return (
    <SidebarMenu className="text-primary-foreground w-full">
      <UserSidebar />
      <SidebarMenuItem className="md:hidden block px-2 py-1">
        <Button
          type="button"
          onClick={handleSignOut}
          className="w-full text-foreground"
          variant={'outline'}
          size={'sm'}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {open && t('header.navbar.logout')}
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 text-muted-foreground" />
              {open && t('header.navbar.logout')}
            </>
          )}
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
