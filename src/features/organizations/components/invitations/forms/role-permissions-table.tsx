'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  ROLE_PERMISSION_KEYS,
  RolePermissionScope,
  type RolePermission,
  type Role,
} from '@/shared/types/role-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

const HIDDEN_MODULES: string[] = [
  'asset',
  'campaign',
  ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION,
  ROLE_PERMISSION_KEYS.VIEW_MEMBERS,
  ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION,
  // view_analytics stays: it also gates Analytics and Real-time Clicks, which remain visible
  ...(disabledFeatures.BEHAVIOR_ANALYTICS ? ['event_rule', 'funnel'] : []),
]

type RolePermissionsTableProps = {
  roles: Role[] | undefined
  selectedRoleId: string
}

const isHiddenPermission = (permissionKey: string) =>
  HIDDEN_MODULES.some((module) => permissionKey.includes(module))

const PERMISSION_GROUPS = [
  {
    key: 'view',
    permissions: Object.values(ROLE_PERMISSION_KEYS).filter(
      (k) => k.startsWith('view_') && !isHiddenPermission(k)
    ),
  },
  {
    key: 'add',
    permissions: Object.values(ROLE_PERMISSION_KEYS).filter(
      (k) => k.startsWith('add_') && !isHiddenPermission(k)
    ),
  },
  {
    key: 'edit',
    permissions: Object.values(ROLE_PERMISSION_KEYS).filter(
      (k) => k.startsWith('edit_') && !isHiddenPermission(k)
    ),
  },
  {
    key: 'delete',
    permissions: Object.values(ROLE_PERMISSION_KEYS).filter(
      (k) => k.startsWith('delete_') && !isHiddenPermission(k)
    ),
  },
  {
    key: 'other',
    permissions: Object.values(ROLE_PERMISSION_KEYS).filter(
      (k) =>
        !k.startsWith('view_') &&
        !k.startsWith('add_') &&
        !k.startsWith('edit_') &&
        !k.startsWith('delete_') &&
        !isHiddenPermission(k)
    ),
  },
]

export const RolePermissionsTable = ({ roles, selectedRoleId }: RolePermissionsTableProps) => {
  const { t } = useTranslation('setting')

  const mappedRoles = roles
    ?.filter((role) => role.name !== 'Viewer')
    ?.map((role) => {
      if (role.name === 'Editor') {
        return { ...role, name: 'Member' }
      }
      if (role.name === 'Manager') {
        return { ...role, name: 'Owner' }
      }
      return role
    })

  return (
    <Collapsible className="border rounded-lg overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 [&[data-state=open]>svg]:rotate-180">
        {t('role_permissions.title')}
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-600" />
            <span>{t('role_permissions.scope.all')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-yellow-500" />
            <span>{t('role_permissions.scope.own')}</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-slate-300" />
            <span>{t('role_permissions.scope.none')}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.key} className="border rounded-md overflow-hidden shrink-0">
              <div className="bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                {t(`role_permissions.groups.${group.key}`)}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">
                      {t('role_permissions.table.permission')}
                    </TableHead>
                    {mappedRoles
                      ?.filter((role) => !role?.is_owner_role)
                      ?.map((role) => (
                        <TableHead
                          key={role.id}
                          className={cn(
                            'text-center text-xs w-[80px]',
                            selectedRoleId === role.id && 'bg-blue-50 text-blue-700 font-semibold'
                          )}
                        >
                          {role.name}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.permissions.map((permissionKey) => (
                    <TableRow key={permissionKey}>
                      <TableCell className="text-xs text-slate-600 py-1">
                        {t(`role_permissions.permissions.${permissionKey}`)}
                      </TableCell>
                      {mappedRoles
                        ?.filter((role) => !role?.is_owner_role)
                        ?.map((role) => {
                          const permission = role.permissions?.find(
                            (p: RolePermission) => p.permission_key === permissionKey
                          )
                          return (
                            <TableCell
                              key={role.id}
                              className={cn(
                                'text-center py-1',
                                selectedRoleId === role.id && 'bg-blue-50'
                              )}
                            >
                              {permission ? (
                                permission.scope === RolePermissionScope.ALL ||
                                permission.scope === null ? (
                                  <Check className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <Check className="h-4 w-4 text-yellow-500 mx-auto" />
                                )
                              ) : (
                                <X className="h-4 w-4 text-slate-300 mx-auto" />
                              )}
                            </TableCell>
                          )
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
