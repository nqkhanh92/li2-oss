'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import {
  Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList,
} from '@/shared/components/ui/command'
import { useGetOrgMembersForDashboard } from '../hooks/queries'
import { useTransferOwnership } from '../hooks/mutations'
import type { DashboardAccessMode } from '../types'

interface TransferOwnershipDialogProps {
  orgId: string
  dashboardId: string
  ownerId: string
  accessMode?: DashboardAccessMode | null
}

export function TransferOwnershipDialog({ orgId, dashboardId, ownerId, accessMode }: TransferOwnershipDialogProps) {
  const { t } = useTranslation('dashboards')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const { data: orgMembers } = useGetOrgMembersForDashboard(orgId, dashboardId)
  const transfer = useTransferOwnership(orgId, dashboardId)

  const handleConfirm = () => {
    if (!selectedUserId) return
    const losesAccess = accessMode === 'only_me'
    transfer.mutate(
      { newOwnerId: selectedUserId, losesAccess },
      {
        onSuccess: () => {
          setOpen(false)
          setSelectedUserId(null)
          if (losesAccess) {
            // Navigate FIRST so the detail page unmounts before any cache
            // invalidation could trigger a 403 refetch on the active observer.
            router.replace(`/org/${orgId}/dashboards`)
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
          onClick={(e) => { e.preventDefault(); setOpen(true) }}
        >
          {t('access.transferOwnership', { defaultValue: 'Transfer Ownership' })}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('access.transferTitle', { defaultValue: 'Transfer Ownership' })}</DialogTitle>
          <DialogDescription>
            {accessMode === 'only_me'
              ? t('access.transferDescriptionPrivate', {
                  defaultValue:
                    'This dashboard is private. After transferring, you will lose access to it.',
                })
              : t('access.transferDescription', {
                  defaultValue: 'The new owner will have full control. You will become an Editor.',
                })}
          </DialogDescription>
        </DialogHeader>

        <Command>
          <CommandInput placeholder={t('access.searchPlaceholder', { defaultValue: 'Search by name or email...' })} />
          <CommandList className="max-h-48">
            <CommandEmpty>{t('access.noResults', { defaultValue: 'No members found' })}</CommandEmpty>
            <CommandGroup>
              {(orgMembers ?? []).filter((m) => m.user_id?.id !== ownerId).map((member) => {
                const userId = member.user_id?.id
                const email = member.user_id?.email
                if (!userId || !email) return null
                return (
                  <CommandItem
                    key={userId}
                    value={email}
                    onSelect={() => { setSelectedUserId(userId); setSelectedLabel(email) }}
                    className={selectedUserId === userId ? 'bg-slate-100' : ''}
                  >
                    {email}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {selectedUserId && (
          <p className="text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(t as any)('access.transferTo', {
              defaultValue: 'Transfer to: {{name}}',
              name: selectedLabel,
            })}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common:cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUserId || transfer.isPending}
          >
            {t('access.confirmTransfer', { defaultValue: 'Transfer' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
