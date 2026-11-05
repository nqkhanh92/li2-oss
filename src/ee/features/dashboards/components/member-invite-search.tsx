'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList,
} from '@/shared/components/ui/command'
import { useGetOrgMembersForDashboard } from '../hooks/queries'
import { useAddDashboardMember } from '../hooks/mutations'

interface MemberInviteSearchProps {
  orgId: string
  dashboardId: string
  defaultRole: 'viewer' | 'editor'
  existingMemberIds: string[]
  ownerId: string
}

export function MemberInviteSearch({
  orgId, dashboardId, defaultRole, existingMemberIds, ownerId,
}: MemberInviteSearchProps) {
  const { t } = useTranslation('dashboards')
  const [open, setOpen] = useState(false)
  const { data: orgMembers } = useGetOrgMembersForDashboard(orgId, dashboardId)
  const addMember = useAddDashboardMember(orgId, dashboardId)

  const available = (orgMembers ?? []).filter((m) => {
    const uid = m.user_id?.id ?? ''
    return uid !== ownerId && !existingMemberIds.includes(uid)
  })

  const handleSelect = (userId: string) => {
    addMember.mutate({ user_id: userId, role: defaultRole }, {
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" iconLeft={<UserPlus className="h-4 w-4" />}>
          {t('access.addMember', { defaultValue: 'Add Member' })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('access.searchPlaceholder', { defaultValue: 'Search by name or email...' })} />
          <CommandList>
            <CommandEmpty>{t('access.noResults', { defaultValue: 'No members found' })}</CommandEmpty>
            <CommandGroup>
              {available.map((member) => {
                const userId = member.user_id?.id
                const email = member.user_id?.email
                if (!userId || !email) return null
                return (
                  <CommandItem
                    key={userId}
                    value={email}
                    onSelect={() => handleSelect(userId)}
                  >
                    <span className="truncate">{email}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
