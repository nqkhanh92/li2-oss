'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Plus, Users, Trash2, Crown, LogOut } from 'lucide-react'
import { useGetCollectionMembers } from '../../hooks/queries'
import {
  useUpdateCollectionMemberRole,
  useRemoveCollectionMember,
  useLeaveCollection,
} from '../../hooks/mutations'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { AddMemberDialog } from './add-member-dialog'
import { toast } from 'sonner'
import { CollectionRole } from '@/shared/types/collection.types'
import { getRoleLabel } from '../../constants/collections'

interface CollectionMembersProps {
  collectionId: string
  orgId: string
}

export const CollectionMembers = ({ collectionId, orgId }: CollectionMembersProps) => {
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
      // Success toast is handled by global React Query handler
    } catch (error) {
      console.error('Failed to update member role:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMutation.mutateAsync(memberId)
      // Success toast is handled by global React Query handler
    } catch (error) {
      console.error('Failed to remove member:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  const handleLeaveCollection = async () => {
    try {
      await leaveMutation.mutateAsync()
      // Success toast is handled by global React Query handler
      router.push(`/org/${orgId}/spaces`)
    } catch (error) {
      console.error('Failed to leave collection:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'editor':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('collection:members.title')}</CardTitle>
          <CardDescription>{t('collection:members.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('collection:members.title')}</CardTitle>
              <CardDescription>{t('collection:members.description')}</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('collection:members.add_button')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {t('collection:members.empty_title')}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {t('collection:members.empty_description')}
            </p>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('collection:members.add_first')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('collection:members.title')}</CardTitle>
            <CardDescription>
              {members.length}{' '}
              {members.length === 1 ? t('common:module.member') : t('common:module.members')}{' '}
              {t('collection:members.with_access')}
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('collection:members.add_button')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common:label.member', 'Member')}</TableHead>
                <TableHead>{t('common:form.fields.email')}</TableHead>
                <TableHead>{t('collection:members.role')}</TableHead>
                <TableHead className="w-[100px]">{t('common:actions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.name || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {member.profile?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {member.profile?.email || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' && (
                        <Crown className="w-3 h-3 text-purple-600" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${getRoleBadgeColor(member.role)}`}
                      >
                        {getRoleLabel(member.role as CollectionRole)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* {member.role !== 'owner' && (
                        <> */}
                          <Select
                            defaultValue={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(member.user_id, value as CollectionRole)
                            }
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={CollectionRole.OWNER}>
                                {getRoleLabel(CollectionRole.OWNER)}
                              </SelectItem>
                              <SelectItem value={CollectionRole.EDITOR}>
                                {getRoleLabel(CollectionRole.EDITOR)}
                              </SelectItem>
                              <SelectItem value={CollectionRole.VIEWER}>
                                {getRoleLabel(CollectionRole.VIEWER)}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {member.user_id === currentUserId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={handleLeaveCollection}
                              disabled={leaveMutation.isPending}
                              title={t('collection:members.leave_button', 'Leave')}
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={removeMutation.isPending}
                              title={t('common:actions.remove', 'Remove')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        {/* </>
                      )} */}
                      {/* {member.role === 'owner' && (
                        <span className="text-xs text-muted-foreground">
                          {t('collection:roles.owner.label')}
                        </span>
                      )} */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        collectionId={collectionId}
        orgId={orgId}
      />
    </Card>
  )
}
