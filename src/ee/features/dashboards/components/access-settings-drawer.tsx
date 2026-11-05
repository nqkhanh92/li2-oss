'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Shield } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/shared/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useGetDashboardMembers } from '../hooks/queries'
import { useUpdateAccess } from '../hooks/mutations'
import { MemberList } from './member-list'
import { MemberInviteSearch } from './member-invite-search'
import type { DashboardAccessMode } from '../types'

interface AccessSettingsDrawerProps {
  orgId: string
  dashboardId: string
  currentMode: DashboardAccessMode
  currentDefaultRole: 'viewer' | 'editor'
  ownerId: string
}

export function AccessSettingsDrawer({
  orgId, dashboardId, currentMode, currentDefaultRole, ownerId,
}: AccessSettingsDrawerProps) {
  const { t } = useTranslation('dashboards')
  const [open, setOpen] = useState(false)

  const { confirm } = useConfirmDialog()
  const updateAccess = useUpdateAccess(orgId, dashboardId)
  const { data: members, isLoading: membersLoading } = useGetDashboardMembers(
    open ? orgId : undefined,
    open ? dashboardId : undefined
  )

  const getConfirmationDescription = (from: DashboardAccessMode, to: DashboardAccessMode): string | null => {
    if (to === 'only_me' && from === 'restricted') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (t as any)('access.confirmRevokeMembers', {
        count: members?.length ?? 0,
        defaultValue: 'This will revoke access for {{count}} members.',
      }) as string
    }
    if (to === 'only_me' && from === 'everyone') {
      return t('access.confirmRevokeAll', { defaultValue: 'This will revoke access for all org members.' })
    }
    if (to === 'restricted' && from === 'everyone') {
      return t('access.confirmSwitchRestricted', { defaultValue: 'Switching to Restricted will revoke access for all members not explicitly invited.' })
    }
    return null
  }

  const handleModeChange = async (newMode: string) => {
    const mode = newMode as DashboardAccessMode
    const description = getConfirmationDescription(currentMode, mode)
    if (description) {
      const ok = await confirm({
        title: t('access.confirmTitle', { defaultValue: 'Change access mode' }),
        description,
      })
      if (!ok) return
    }
    updateAccess.mutate({ access_mode: mode, default_role: currentDefaultRole })
  }

  const handleDefaultRoleChange = (role: string) => {
    updateAccess.mutate({ access_mode: currentMode, default_role: role as 'viewer' | 'editor' })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="h-9 w-9" title={t('access.settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle>{t('access.title', { defaultValue: 'Access Settings' })}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6">
          {/* Data access notice */}
          <div className="flex gap-3 rounded-xl bg-amber-50/60 border border-amber-200/40 px-3.5 py-3">
            <Shield className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <p className="text-xs leading-relaxed text-amber-800/80">
              {t('access.dataNotice', {
                defaultValue: "Members with access can see all data shown by this dashboard's widgets, including data they may not otherwise access via their role permissions.",
              })}
            </p>
          </div>

          {/* Access mode selector */}
          <div>
            <label className="text-sm font-medium text-stone-700">
              {t('access.modeLabel', { defaultValue: 'Who can access' })}
            </label>
            <Select
              value={currentMode}
              onValueChange={handleModeChange}
              disabled={currentMode === 'restricted' && membersLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="only_me">
                  {t('access.modes.only_me', { defaultValue: 'Only Me' })}
                </SelectItem>
                <SelectItem value="restricted">
                  {t('access.modes.restricted', { defaultValue: 'Specific Members' })}
                </SelectItem>
                <SelectItem value="everyone">
                  {t('access.modes.everyone', { defaultValue: 'Everyone in Org' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default role (Restricted + Everyone modes) */}
          {currentMode !== 'only_me' && (
            <div>
              <label className="text-sm font-medium text-stone-700">
                {currentMode === 'everyone'
                  ? t('access.everyoneRole', { defaultValue: "Everyone's Role" })
                  : t('access.defaultRole', { defaultValue: 'Default Role for New Members' })}
              </label>
              <Select value={currentDefaultRole} onValueChange={handleDefaultRoleChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    {t('access.roles.viewer', { defaultValue: 'Viewer' })}
                  </SelectItem>
                  <SelectItem value="editor">
                    {t('access.roles.editor', { defaultValue: 'Editor' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Everyone mode info */}
          {currentMode === 'everyone' && (
            <p className="text-xs text-stone-500">
              {t('access.everyoneInfo', {
                defaultValue: 'All org members have access. New members auto-get access.',
              })}
            </p>
          )}

          {/* Member management (Restricted mode only) */}
          {currentMode === 'restricted' && (
            <>
              <MemberInviteSearch
                orgId={orgId}
                dashboardId={dashboardId}
                defaultRole={currentDefaultRole}
                existingMemberIds={(members ?? []).map((m) => m.user_id)}
                ownerId={ownerId}
              />
              <MemberList
                orgId={orgId}
                dashboardId={dashboardId}
                members={members ?? []}
                ownerId={ownerId}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
