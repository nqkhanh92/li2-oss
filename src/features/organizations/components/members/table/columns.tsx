'use client'

import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { Badge } from '@/shared/components/ui/badge'
import { ColumnDef } from '@tanstack/react-table'
import { RoleCell } from './role-cell'
import { InvitationStatus } from '@/core/types/invitation.type'
import { useTranslation } from 'react-i18next'

export type MemberColumn = {
  id: string
  email: string
  status: string
  role: {
    id: string
    name: string
  }
  is_owner: boolean
  type: 'member' | 'invitation'
  user_id?: string
  isLastOwner?: boolean
}

const MemberStatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation('setting')

  const mappingMemberStatus = {
    [InvitationStatus.ACCEPTED]: <Badge variant="success">{t('members.status.member')}</Badge>,
    [InvitationStatus.INVITED]: (
      <Badge
        variant="warning"
        className="text-xs text-slate-600 italic font-normal py-1 border-none shadow-none px-2"
      >
        {t('members.status.invited')}
      </Badge>
    ),
    [InvitationStatus.DECLINED]: (
      <Badge variant="destructive">{t('members.status.rejected')}</Badge>
    ),
  }

  return mappingMemberStatus[status as InvitationStatus] || null
}

const createMemberColumns = (
  t: (key: string) => string,
): ColumnDef<MemberColumn>[] => [
  {
    accessorKey: 'user_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('members.table.email')} />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      return <div>{row.original.email}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('members.table.status')} />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      return <MemberStatusBadge status={row.original.status} />
    },
  },
  {
    accessorKey: 'role_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('members.table.role')} />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <RoleCell
          role_id={row.original.role.id}
          id={row.original.id}
          type={row.original.type}
          user_id={row.original.user_id}
          isOrgCreator={row.original.is_owner}
          isLastOwner={row.original.isLastOwner}
        />
      )
    },
  },
]

export const useMemberColumns = () => {
  const { t } = useTranslation('setting')
  return createMemberColumns(t)
}
