'use client'

import { useTranslation } from 'react-i18next'
import { Trash2, Crown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { useUpdateDashboardMemberRole, useRemoveDashboardMember } from '../hooks/mutations'
import { useGetOrgMembersForDashboard } from '../hooks/queries'
import type { DashboardMember } from '../types'

interface MemberListProps {
  orgId: string
  dashboardId: string
  members: DashboardMember[]
  ownerId: string
}

export function MemberList({ orgId, dashboardId, members, ownerId }: MemberListProps) {
  const { t } = useTranslation('dashboards')
  const updateRole = useUpdateDashboardMemberRole(orgId, dashboardId)
  const removeMember = useRemoveDashboardMember(orgId, dashboardId)
  const { data: orgMembers } = useGetOrgMembersForDashboard(orgId, dashboardId)
  const ownerProfile = orgMembers?.find((m) => m.user_id?.id === ownerId)?.user_id
  const ownerName = ownerProfile?.name || ownerProfile?.email || ownerId

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-stone-700">
        {t('access.members', { defaultValue: 'Members' })}
      </p>
      <div className="flex flex-col gap-0.5">
        {/* Owner row (always shown, not removable) */}
        <div className="flex items-center justify-between rounded-lg bg-stone-50/80 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-stone-700 truncate">{ownerName}</span>
          </div>
          <span className="text-xs text-stone-400 shrink-0">
            {t('access.roles.owner', { defaultValue: 'Owner' })}
          </span>
        </div>

        {/* Member rows */}
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-50/80">
            <div className="min-w-0">
              <p className="text-sm text-stone-700 truncate">{member.profile.name || member.profile.email}</p>
              {member.profile.name && (
                <p className="text-xs text-stone-400 truncate">{member.profile.email}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Select
                value={member.role}
                onValueChange={(role: string) =>
                  updateRole.mutate({ memberId: member.id, role: role as 'viewer' | 'editor' })
                }
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t('access.roles.viewer', { defaultValue: 'Viewer' })}</SelectItem>
                  <SelectItem value="editor">{t('access.roles.editor', { defaultValue: 'Editor' })}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-stone-400 hover:text-red-500"
                onClick={() => removeMember.mutate(member.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
