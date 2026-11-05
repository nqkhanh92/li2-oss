'use client'

import {
  ChevronDown,
  Crown,
  Loader2,
  LogOut,
  MoonIcon,
  MonitorPlay,
  Settings,
  SunIcon,
  User2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipProvider } from '@/shared/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { useEffect, useRef, useState, useTransition } from 'react'
import { logout } from '@/app/actions/auth'
import { CustomDialog, DialogCustomRef } from '../../customize/custom-dialog'
import { SetPasswordFormSchema } from '@/shared/schemas/profile'
import { useUpdatePassword } from '@/features/profile/hooks/mutations'
import { z } from 'zod'
import { SetPasswordForm } from '../../../../features/profile/components/forms/set-password-form'
import { SettingDialog } from '../sidebar/settings-dialog'
import { ProfileSettingsDialog } from '@/features/profile/components/profile-settings-dialog'
import { useParams, useRouter } from 'next/navigation'
import { usePlanProvider, UserPlan } from '@/shared/providers/plan-provider'
import { PAID_PLAN_KEYS } from '@/shared/types/plan-permission'
import { Separator } from '../../ui/separator'
import { CustomAvatar } from '../sidebar/custom-avatar'
import { CustomBadge } from '../sidebar/custom-badge'
import { useTranslation } from 'react-i18next'
import { CustomSwitch } from '../../customize/custom-switch'
import { useTheme } from 'next-themes'
import { useDemoMode } from '@/shared/hooks/use-demo-mode'
import { toast } from 'sonner'

export function UserNav() {
  const { profile } = useProfileProvider()
  const { plan } = usePlanProvider()
  const { org_id }: { org_id: string } = useParams()
  const [isLoggingOut, startTransition] = useTransition()
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const handleSignOut = async () => {
    startTransition(async () => {
      await logout()
    })
  }

  const editUserRef = useRef<DialogCustomRef>(null)
  const updatePasswordRef = useRef<DialogCustomRef>(null)
  const { mutate: updateUserPassword, isPending: isUpdateUserPassword } = useUpdatePassword()

  const handleUpdateUserPassword = (values: z.infer<typeof SetPasswordFormSchema>) => {
    updateUserPassword(values, {
      onSuccess: () => {
        updatePasswordRef.current?.close()
      },
    })
  }
  const router = useRouter()

  const getPlanCrownIcon = (plan?: UserPlan) => {
    if (PAID_PLAN_KEYS.includes(plan?.plans?.plan_key as any)) {
      return (
        <Crown className="lg:hidden w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-amber-300 bg-white rounded-full [&_svg]:size-2" />
      )
    }
    return null
  }

  const { t } = useTranslation('layout')
  const { setTheme, theme } = useTheme()
  const { isDemoMode, enterDemo } = useDemoMode()

  return (
    <div className="flex flex-row lg:gap-[60px] gap-4 items-center justify-end">
      <DropdownMenu modal={false}>
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-sm leading-[20px] font-normal hover:text-background hover:bg-transparent hover:outline-hidden hover:border-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <CustomAvatar src={profile?.avatar} topDecoration={getPlanCrownIcon(plan || {})} size={32} />
                  <div className="lg:grid hidden flex-1 text-left text-xs group-hover:text-background gap-1">
                    <span className="truncate font-medium">
                      {profile?.display_name || profile?.email || 'User'}
                    </span>
                    <CustomBadge
                      plan={plan || {}}
                      startIcon={
                        PAID_PLAN_KEYS.includes(plan?.plans?.plan_key as any) ? (
                          <Crown
                            className="w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-primary"
                            size={10}
                          />
                        ) : (
                          <User2
                            className="w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-slate-600 stroke-none"
                            size={10}
                          />
                        )
                      }
                      variant={
                        PAID_PLAN_KEYS.includes(plan?.plans?.plan_key as any)
                          ? 'premium'
                          : 'default'
                      }
                      className="min-h-4 py-1 px-2"
                    />
                  </div>
                  <ChevronDown className="hidden md:block w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="lg:hidden flex items-center gap-2 text-sm leading-[20px] font-medium px-2 py-1.5">
            <div className="lg:hidden grid flex-1 text-left text-sm leading-tight">
              <span className="truncate">{profile?.display_name || profile?.email || 'User'}</span>
              <CustomBadge
                plan={plan || {}}
                startIcon={
                  ['premium', 'premium trial'].includes(plan?.plans?.name?.toLowerCase() || '') ? (
                    <Crown
                      className="w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-primary"
                      size={10}
                    />
                  ) : (
                    <User2
                      className="w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-slate-600 stroke-none"
                      size={10}
                    />
                  )
                }
                variant={
                  plan?.plans?.name?.toLowerCase() === 'premium' ||
                  plan?.plans?.name?.toLowerCase() === 'premium trial'
                    ? 'premium'
                    : 'default'
                }
              />
            </div>
          </div>
          <Separator className="lg:hidden flex" />
          {process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
            <DropdownMenuItem
              className="hover:cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
              }}
            >
              <CustomSwitch
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light')
                }}
                checked={theme === 'dark'}
                className="w-[75%] mx-auto"
                checkedColor="bg-slate-700"
                uncheckedColor="bg-amber-400"
                checkedLabel={
                  <div className="text-xs flex gap-1 items-center">
                    <MoonIcon /> Dark theme
                  </div>
                }
                uncheckedLabel={
                  <div className="text-xs flex gap-1 items-center">
                    Light theme <SunIcon />
                  </div>
                }
              />
            </DropdownMenuItem>
          )}
          {process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true' && !isDemoMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="hover:cursor-pointer"
                onClick={enterDemo}
              >
                <MonitorPlay className="w-4 h-4 mr-3 text-muted-foreground" />
                {t('header.navbar.demo')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="hover:cursor-pointer"
            onClick={() => {
              setProfileSettingsOpen(true)
            }}
          >
            <>
              <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
              {t('header.navbar.setting')}
            </>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="hover:cursor-pointer" onClick={handleSignOut}>
            {isLoggingOut ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('header.navbar.logout')}
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
                {t('header.navbar.logout')}
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomDialog
        ref={
          updatePasswordRef as React.RefObject<{
            open: () => void
            close: () => void
          }>
        }
        noFooter
        noButton
        title={t('common:buttons.update', { field: 'Password' })}
        size="md"
      >
        {({ close }) => (
          <SetPasswordForm
            onSubmit={handleUpdateUserPassword || (() => {})}
            isPending={isUpdateUserPassword}
            close={close}
          />
        )}
      </CustomDialog>

      <CustomDialog ref={editUserRef} noFooter noButton title="Settings" size="md">
        {({ close }) => (
          <>
            <SettingDialog profile={profile} />
          </>
        )}
      </CustomDialog>

      <ProfileSettingsDialog
        open={profileSettingsOpen}
        onOpenChange={setProfileSettingsOpen}
        profile={profile}
      />
    </div>
  )
}
