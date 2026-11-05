import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { useGetOrgRoles } from '@/features/organizations/hooks/queries/org-roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useUpdateOrgMember } from '@/features/organizations/hooks/mutations/org-member'
import { useParams } from 'next/navigation'
import {
  useDeleteInvitation,
  useResendInvitation,
  useUpdateInvitation,
} from '@/features/invitations/hooks/mutations'
import { Separator } from '@/shared/components/ui/separator'
import { useDeleteOrgMember } from '@/features/organizations/hooks/mutations/org-member'
import { ConfirmButton } from '@/shared/components/customize/confirm-button'
import { CrownIcon, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { authStore } from '@/shared/stores/profile-store'

type RoleCellProps = {
  role_id: string
  id: string
  type: string
  user_id?: string
  isLastOwner?: boolean
  isOrgCreator?: boolean
}

export const RoleCell = ({
  role_id,
  id,
  type,
  user_id,
  isLastOwner,
  isOrgCreator,
}: RoleCellProps) => {
  const { t } = useTranslation('setting')
  const { org_id } = useParams<{ org_id: string }>()
  const { data: roles, isLoading } = useGetOrgRoles(org_id)
  const { mutate: updateMember, isPending } = useUpdateOrgMember(org_id, id)
  const currentUserId = authStore.getState().profile?.id

  // Map backend role names to UI display names and filter out hidden roles
  const mappedRoles = roles
    ?.filter((role) => role.name !== 'Viewer') // Temporarily hidden
    ?.map((role) => {
      if (role.name === 'Editor') {
        return { ...role, name: 'Member' }
      }
      if (role.name === 'Manager') {
        return { ...role, name: 'Owner' }
      }
      return role
    })

  // Check if this is the current user's own role (prevent self-change)
  const isCurrentUser = user_id && currentUserId && user_id === currentUserId
  // Disable dropdown if: current user OR last owner in org
  const isDisabled = isCurrentUser || isLastOwner || isOrgCreator
  const { mutate: updateInvitation, isPending: isUpdatingInvitation } = useUpdateInvitation(org_id)
  const { mutate: deleteInvitation, isPending: isDeletingInvitation } = useDeleteInvitation(org_id)
  const { mutate: deleteMember, isPending: isDeletingMember } = useDeleteOrgMember(org_id)
  const handleUpdateRole = (value: string) => {
    if (type === 'invitation') {
      updateInvitation({ id, data: { role_id: value } })
    } else if (type === 'member') {
      updateMember({ role_id: value })
    }
  }
  const { mutate: resendInvitation, isPending: isResending } = useResendInvitation(org_id)
  const handleResend = () => {
    if (type === 'invitation') {
      resendInvitation(id)
    }
  }
  const handleDeleteMember = () => {
    if (type === 'invitation') {
      deleteInvitation(id, {
        onSuccess: () => {},
      })
    } else if (type === 'member') {
      deleteMember(id, {
        onSuccess: () => {},
      })
    }
  }
  // Get current role name for display when disabled
  const currentRole = mappedRoles?.find((r) => r.id === role_id)
  const currentRoleDisplayName = currentRole ? currentRole.name : ''

  // If disabled, just show the role name without dropdown
  if (isDisabled) {
    return (
      <span className="text-slate-700 flex gap-1 items-center h-9">
        {currentRoleDisplayName} {isOrgCreator && <CrownIcon className="w-4 h-4" />}
      </span>
    )
  }
  return (
    <LoadingMask loading={isLoading || isPending || isUpdatingInvitation}>
      <Select
        value={role_id}
        onValueChange={(value) => {
          const skipValues = ['', 'resend', 'delete']
          if (skipValues.includes(value)) return
          handleUpdateRole(value)
        }}
        defaultValue={role_id}
      >
        <SelectTrigger className="rounded-[8px] px-0 py-1 h-9 gap-1 border-none outline-hidden shadow-none bg-transparent w-[100px]">
          <SelectValue placeholder={t('members.actions.select_role')} />
        </SelectTrigger>
        <SelectContent>
          {mappedRoles
            ?.filter((role) => !role?.is_owner_role)
            ?.map((role) => (
              <SelectItem key={role.id} value={role.id} className="text-slate-700 rounded-[8px]">
                {role.name}
              </SelectItem>
            ))}
          <Separator />
          {type === 'invitation' && (
            <LoadingButton
              key="resend"
              value="resend"
              onClick={handleResend}
              isLoading={isResending}
              className="flex text-sm h-auto text-slate-700 font-normal bg-transparent items-center justify-start rounded-[8px] px-2 py-1.5 gap-1 w-full hover:bg-accent hover:text-accent-foreground"
            >
              {t('members.actions.resend_invite')}
            </LoadingButton>
          )}
          <ConfirmButton
            title={t('members.actions.delete_description')}
            onConfirm={() => {
              handleDeleteMember()
            }}
            className="flex text-sm h-auto text-slate-700 font-normal bg-transparent items-center justify-start rounded-[8px] px-2 py-1.5 gap-1 w-full hover:bg-accent hover:text-accent-foreground"
          >
            {isDeletingMember || isDeletingInvitation ? (
              <Loader2 className="animate-spin" />
            ) : (
              t('members.actions.remove')
            )}
          </ConfirmButton>
        </SelectContent>
      </Select>
    </LoadingMask>
  )
}
