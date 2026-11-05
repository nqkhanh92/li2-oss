'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Plus, Users, MoreVertical, Trash2, LogOut, Crown, ChevronDown } from 'lucide-react'
import { useGetCollectionMembers } from '../../hooks/queries'
import {
  useUpdateCollectionMemberRole,
  useRemoveCollectionMember,
  useLeaveCollection,
} from '../../hooks/mutations'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'
import { AddMemberDialog } from '../collection-detail/add-member-dialog'
import { CollectionRole } from '@/shared/types/collection.types'
import { getRoleLabel } from '../../constants/collections'
import { Typography } from '@/shared/components/ui/typography'

interface CollectionMembersV2Props {
  collectionId: string
  orgId: string
}

export const CollectionMembersV2 = ({ collectionId, orgId }: CollectionMembersV2Props) => {
  const { t } = useTranslation(['collection', 'common'])
  const router = useRouter()
  const { profile } = useProfileProvider()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: response, isLoading } = useGetCollectionMembers(orgId, collectionId)
  const updateRoleMutation = useUpdateCollectionMemberRole(orgId, collectionId)
  const removeMutation = useRemoveCollectionMember(orgId, collectionId)
  const leaveMutation = useLeaveCollection(orgId, collectionId)

  const members = response?.data || []
  const currentUserId = profile?.id

  const handleRoleChange = async (memberId: string, role: CollectionRole) => {
    try {
      await updateRoleMutation.mutateAsync({ member_id: memberId, data: { role } })
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMutation.mutateAsync(memberId)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleLeaveCollection = async () => {
    try {
      await leaveMutation.mutateAsync()
      router.push(`/org/${orgId}/spaces`)
    } catch (error) {
      console.error('Failed to leave collection:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-200',
      'bg-blue-200',
      'bg-green-200',
      'bg-yellow-200',
      'bg-pink-200',
      'bg-indigo-200',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 p-6 pt-10">
        <div className="mb-6">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 p-6 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Typography component="h2" size={'l'} weight={'semibold'} className="text-foreground p-0!">
          {t('collection:members.title')}
        </Typography>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#000D27] hover:bg-[#000D27]/90"
          iconLeft={<Plus className="w-4 h-4" />}
        >
          {t('collection:members.add_button')}
        </Button>
      </div>

      {/* Content */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <Users className="w-16 h-16 text-slate-400 mb-2" />
          <h3 className="text-base font-medium text-foreground mb-1">
            {t('collection:members.empty_title')}
          </h3>
          <p className="text-xs text-slate-500 mb-4">{t('collection:members.empty_description')}</p>
          <Button
            variant="outline"
            onClick={() => setIsAddDialogOpen(true)}
            className="border-slate-200"
            iconLeft={<Plus className="w-4 h-4" />}
          >
            {t('collection:members.add_first')}
          </Button>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader className="border-t-0">
              <TableRow className="bg-background hover:bg-slate-50 border-0 border-b border-slate-200">
                <TableHead className="text-slate-600 font-medium">
                  {t('common:label.member', { defaultValue: 'Member' })}
                </TableHead>
                <TableHead className="text-slate-600 font-medium">
                  {t('common:form.fields.email', { defaultValue: 'Email' })}
                </TableHead>
                <TableHead className="text-slate-600 font-medium">
                  {t('collection:members.role', { defaultValue: 'Role' })}
                </TableHead>
                <TableHead className="text-right text-slate-600 font-medium">
                  {t('common:actions.actions', { defaultValue: 'Actions' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.user_id}
                  className="hover:bg-slate-50 border-0 border-b border-slate-200"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CustomAvatar
                        src={member.profile?.avatar}
                        name={member.profile?.name}
                        email={member.profile?.email}
                        size={32}
                      />
                      <span className="font-medium text-foreground">
                        {member.profile?.name || member.profile?.email || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${member.profile?.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {member.profile?.email || '-'}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' ? (
                        <div className="flex items-center gap-1 text-slate-700">
                          <span>{getRoleLabel(member.role as CollectionRole)}</span>
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 text-slate-700 hover:text-slate-900">
                              <span>{getRoleLabel(member.role as CollectionRole)}</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, CollectionRole.OWNER)}
                            >
                              {getRoleLabel(CollectionRole.OWNER)}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(member.user_id, CollectionRole.EDITOR)
                              }
                            >
                              {getRoleLabel(CollectionRole.EDITOR)}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(member.user_id, CollectionRole.VIEWER)
                              }
                            >
                              {getRoleLabel(CollectionRole.VIEWER)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreVertical className="w-4.5 h-4.5 text-slate-700" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.user_id === currentUserId ? (
                          <DropdownMenuItem
                            onClick={handleLeaveCollection}
                            className="text-semantic-error focus:text-semantic-error"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t('collection:members.leave_button')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-semantic-error focus:text-semantic-error"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common:buttons.remove', { defaultValue: 'Remove' })}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination placeholder */}
          <div className="flex items-center justify-end gap-4 p-4 border-t border-slate-200 text-sm text-slate-500">
            <span>Row per page</span>
            <span>10</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        collectionId={collectionId}
        orgId={orgId}
      />
    </div>
  )
}
