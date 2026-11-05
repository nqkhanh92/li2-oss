'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useGetOrgMembers } from '@/features/organizations/hooks/queries/org-member'
import { useGetCollectionMembers } from '../../hooks/queries'
import { useAddCollectionMember } from '../../hooks/mutations'
import { toast } from 'sonner'
import { Search, Users, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { CollectionRole } from '@/shared/types/collection.types'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  orgId: string
}

interface MemberSelection {
  userId: string
  role: CollectionRole
}

export const AddMemberDialog = ({
  open,
  onOpenChange,
  collectionId,
  orgId,
}: AddMemberDialogProps) => {
  const { t } = useTranslation(['collection', 'common'])
  const [search, setSearch] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Map<string, CollectionRole>>(new Map())

  // Fetch organization members
  const { data: orgMembers = [], isLoading: isLoadingOrgMembers } = useGetOrgMembers(orgId)

  // Fetch current collection members
  const { data: collectionMembersResponse } = useGetCollectionMembers(orgId, collectionId)
  const collectionMembers = collectionMembersResponse?.data || []

  const addMutation = useAddCollectionMember(orgId, collectionId)

  // Get IDs of users already in collection
  const existingMemberIds = new Set(collectionMembers.map((m) => m.user_id))

  // Filter org members who are not yet in the collection
  const availableMembers = orgMembers.filter((member) => {
    const userId = typeof member.user_id === 'string' ? member.user_id : member.user_id.id
    const matchesSearch =
      !search ||
      member.user_id.name?.toLowerCase().includes(search.toLowerCase()) ||
      member.user_id.email?.toLowerCase().includes(search.toLowerCase())

    return !existingMemberIds.has(userId) && matchesSearch
  })

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(userId)) {
        newMap.delete(userId)
      } else {
        newMap.set(userId, CollectionRole.VIEWER) // Default role
      }
      return newMap
    })
  }

  const handleRoleChange = (userId: string, role: CollectionRole) => {
    setSelectedMembers((prev) => {
      const newMap = new Map(prev)
      newMap.set(userId, role)
      return newMap
    })
  }

  const handleAdd = async () => {
    if (selectedMembers.size === 0) {
      toast.error(t('collection:members.select_at_least_one'))
      return
    }

    try {
      // Add members one by one (could be optimized with bulk add if needed)
      for (const [userId, role] of selectedMembers.entries()) {
        await addMutation.mutateAsync({ user_id: userId, role })
      }

      // Success toast is handled by global React Query handler
      setSelectedMembers(new Map())
      setSearch('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add members:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  const getRoleBadgeColor = (role: CollectionRole) => {
    switch (role) {
      case CollectionRole.OWNER:
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case CollectionRole.EDITOR:
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case CollectionRole.VIEWER:
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <CustomDialogV2
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t('collection:members.add_dialog_title')}
      description={t('collection:members.add_dialog_description')}
    >
      <div className="space-y-4 pt-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('collection:members.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected count */}
        {selectedMembers.size > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedMembers.size}{' '}
            {selectedMembers.size === 1 ? t('common:module.member') : t('common:module.members')}{' '}
            {t('common:text.selected')}
          </div>
        )}

        {/* Members List */}
        <ScrollArea className="h-[400px] border rounded-md">
          {isLoadingOrgMembers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? t('collection:members.no_results')
                  : t('collection:members.all_added')}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {availableMembers.map((member) => {
                const userId =
                  typeof member.user_id === 'string' ? member.user_id : member.user_id.id
                const isSelected = selectedMembers.has(userId)
                const selectedRole = selectedMembers.get(userId)

                return (
                  <div
                    key={userId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-accent border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMember(userId)}
                      className="w-4 h-4 rounded border-gray-300"
                    />

                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {member.user_id.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.user_id.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.user_id.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Role selector */}
                    {isSelected && (
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          handleRoleChange(userId, value as CollectionRole)
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CollectionRole.VIEWER}>
                            {t('collection:roles.viewer.label')}
                          </SelectItem>
                          <SelectItem value={CollectionRole.EDITOR}>
                            {t('collection:roles.editor.label')}
                          </SelectItem>
                          <SelectItem value={CollectionRole.OWNER}>
                            {t('collection:roles.owner.label')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedMembers.size === 0 || addMutation.isPending}
          >
            {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common:buttons.add')} {selectedMembers.size > 0 && `(${selectedMembers.size})`}
          </Button>
        </div>
      </div>
    </CustomDialogV2>
  )
}
