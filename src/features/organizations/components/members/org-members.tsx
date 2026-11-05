import { useParams, useRouter } from 'next/navigation'
import { protectedDefaultPath } from '@/shared/constants'
import { useGetOrgMembers } from '@/features/organizations/hooks/queries/org-member'
import { useLeaveOrganization } from '@/features/organizations/hooks/mutations/org-member'
import { CustomTable } from '../../../../shared/components/customize/table/custom-table'
import {
  CustomDialog,
  DialogCustomRef,
} from '../../../../shared/components/customize/custom-dialog'
import { useMemo, useRef } from 'react'
import { MemberColumn, useMemberColumns } from './table/columns'
import { InvitationForm } from '../invitations/forms/invitation-form'
import { z } from 'zod'
import { orgMemberCreateFormSchema } from '@/shared/schemas/org-members'
import { useGetOrgInvitation } from '@/features/invitations/hooks/queries'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { useInviteMember } from '@/features/invitations/hooks/mutations'
import { Separator } from '@/shared/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { LogOut } from 'lucide-react'

export const OrgMembers = () => {
  const { t } = useTranslation('setting')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { data: members, isLoading } = useGetOrgMembers(org_id)
  const { organization, hasPermission } = useOrganizationStoreProvider()
  const { profile } = useProfileProvider()
  const canManageMembers = hasPermission(ROLE_PERMISSION_KEYS.MANAGE_MEMBERS)

  const { mutate: inviteMember, isPending: isAdding } = useInviteMember(org_id)
  const { mutate: leaveOrg, isPending: isLeaving } = useLeaveOrganization(org_id)
  const { data: invitations, isLoading: isInvitationsLoading } = useGetOrgInvitation(org_id, {
    enabled: canManageMembers,
  })

  const memberColumns = useMemberColumns()

  const canLeaveOrg = useMemo(() => {
    if (!profile?.id || !members) return false
    const self = members.find((m) => m.user_id.id === profile.id)
    return !!self && organization?.user_id !== profile.id
  }, [members, profile?.id, organization?.user_id])

  const handleLeaveOrg = (onSuccess?: () => void) => {
    leaveOrg(undefined, {
      onSuccess: () => {
        onSuccess?.()
        router.push(protectedDefaultPath)
      },
    })
  }

  const allMembers = useMemo(() => {
    const ownerCount =
      members?.filter((e) => e.role_id.name === 'Owner' || e.role_id.name === 'Manager').length || 0

    const orgMembers: MemberColumn[] =
      members?.map((e) => {
        const isOwnerRole = e.role_id.name === 'Owner' || e.role_id.name === 'Manager'
        return {
          id: e.id,
          email: `${e.user_id.email}`,
          status: '',
          role: {
            id: `${e.role_id.id}`,
            name: `${e.role_id.name}`,
          },
          is_owner: organization?.user_id === e.user_id.id,
          type: 'member',
          user_id: e.user_id.id,
          isLastOwner: isOwnerRole && ownerCount === 1,
        }
      }) || []

    const invitationMembers: MemberColumn[] = canManageMembers
      ? invitations?.map((e) => ({
          id: e.id,
          email: `${e.email}`,
          status: e.status,
          role: {
            id: `${e.role_id}`,
            name: ``,
          },
          is_owner: false,
          type: 'invitation',
          user_id: undefined,
          isLastOwner: false,
        })) || []
      : []

    return [...orgMembers, ...invitationMembers]
  }, [members, invitations, organization?.user_id, canManageMembers]) satisfies MemberColumn[]

  const inviteMemberRef = useRef<DialogCustomRef>(null)
  const handleInviteMember = (values: z.infer<typeof orgMemberCreateFormSchema>) => {
    inviteMember(values, {
      onSuccess: () => {
        inviteMemberRef.current?.close?.()
      },
    })
  }
  return (
    <div className="flex flex-col gap-4">
      <span className="text-lg font-semibold text-foreground">{t('members.title')}</span>
      {canManageMembers && (
        <div className="flex gap-2">
          <InvitationForm close={() => {}} isPending={isAdding} onSubmit={handleInviteMember} />
        </div>
      )}
      <Separator />
      <span className="text-lg font-semibold text-foreground">{t('members.list_title')}</span>
      <CustomTable
        enableSpacing={false}
        className="bg-card rounded-2xl"
        columns={memberColumns}
        data={allMembers}
        rowCount={allMembers.length}
        isLoading={isLoading || isInvitationsLoading}
        enableColumnToggle={false}
        enableTableTool={false}
      />
      {canLeaveOrg && (
        <div className="flex justify-end">
          <CustomDialog
            size="xs"
            title={t('members.leave.title')}
            noFooter
            button={
              <Button variant="outline_destructive" size="sm">
                <LogOut className="w-3.5 h-3.5" />
                {t('members.leave.button')}
              </Button>
            }
          >
            {({ close }) => (
              <div>
                <p className="text-sm font-normal text-slate-600">
                  {t('members.leave.description')}
                </p>
                <div className="mt-4 flex justify-end gap-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={close}
                    className="gap-[6px] text-slate-600"
                  >
                    {t('common:buttons.cancel')}
                  </Button>
                  <LoadingButton
                    isLoading={isLeaving}
                    variant="destructive"
                    onClick={() => handleLeaveOrg(close)}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('members.leave.button')}
                  </LoadingButton>
                </div>
              </div>
            )}
          </CustomDialog>
        </div>
      )}
    </div>
  )
}
