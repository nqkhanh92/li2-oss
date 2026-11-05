'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { ROLE_PERMISSION_KEYS, RolePermissionKey } from '@/shared/types/role-permission'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface PermissionsSelectorProps {
  selectedPermissions: RolePermissionKey[]
  onChange: (permissions: RolePermissionKey[]) => void
}

// Define role templates based on common patterns
const ROLE_TEMPLATES = {
  viewer: {
    name: 'Viewer',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_DASHBOARD,
      ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS,
      ROLE_PERMISSION_KEYS.VIEW_TAGS,
      ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS,
      ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
      ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
    ] as RolePermissionKey[],
  },
  member: {
    name: 'Member',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_DASHBOARD,
      ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS,
      ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.VIEW_TAGS,
      ROLE_PERMISSION_KEYS.ADD_TAG,
      ROLE_PERMISSION_KEYS.EDIT_TAG,
      ROLE_PERMISSION_KEYS.DELETE_TAG,
      ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS,
      ROLE_PERMISSION_KEYS.ADD_INTEGRATION,
      ROLE_PERMISSION_KEYS.EDIT_INTEGRATION,
      ROLE_PERMISSION_KEYS.DELETE_INTEGRATION,
      ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
      ROLE_PERMISSION_KEYS.ADD_COLLECTION,
      ROLE_PERMISSION_KEYS.EDIT_COLLECTION,
      ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
      ROLE_PERMISSION_KEYS.ADD_UTM_TEMPLATE,
      ROLE_PERMISSION_KEYS.EDIT_UTM_TEMPLATE,
    ] as RolePermissionKey[],
  },
  owner: {
    name: 'Owner',
    permissions: Object.values(ROLE_PERMISSION_KEYS) as RolePermissionKey[],
  },
}

// Group permissions by category
const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    permissions: [ROLE_PERMISSION_KEYS.VIEW_DASHBOARD],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
      ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS,
      ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS,
    ],
  },
  {
    key: 'touch_points',
    label: 'Touch Points',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS,
      ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT,
      ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT,
    ],
  },
  {
    key: 'tags',
    label: 'Tags',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_TAGS,
      ROLE_PERMISSION_KEYS.ADD_TAG,
      ROLE_PERMISSION_KEYS.EDIT_TAG,
      ROLE_PERMISSION_KEYS.DELETE_TAG,
    ],
  },
  {
    key: 'integrations',
    label: 'Integrations',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS,
      ROLE_PERMISSION_KEYS.ADD_INTEGRATION,
      ROLE_PERMISSION_KEYS.EDIT_INTEGRATION,
      ROLE_PERMISSION_KEYS.DELETE_INTEGRATION,
    ],
  },
  {
    key: 'collections',
    label: 'Collections',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
      ROLE_PERMISSION_KEYS.ADD_COLLECTION,
      ROLE_PERMISSION_KEYS.EDIT_COLLECTION,
      ROLE_PERMISSION_KEYS.DELETE_COLLECTION,
      ROLE_PERMISSION_KEYS.MANAGE_COLLECTION_MEMBERS,
    ],
  },
  {
    key: 'utm_templates',
    label: 'UTM Templates',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
      ROLE_PERMISSION_KEYS.ADD_UTM_TEMPLATE,
      ROLE_PERMISSION_KEYS.EDIT_UTM_TEMPLATE,
      ROLE_PERMISSION_KEYS.DELETE_UTM_TEMPLATE,
    ],
  },
  {
    key: 'organization',
    label: 'Organization',
    permissions: [
      ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION,
      ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION,
      ROLE_PERMISSION_KEYS.VIEW_MEMBERS,
      ROLE_PERMISSION_KEYS.MANAGE_MEMBERS,
    ],
  },
]

export function PermissionsSelector({ selectedPermissions, onChange }: PermissionsSelectorProps) {
  const { t } = useTranslation(['api_keys'])
  const [roleTemplate, setRoleTemplate] = useState<string>('custom')

  // Update role template when permissions change externally
  useEffect(() => {
    const matchesViewer = ROLE_TEMPLATES.viewer.permissions.every((p) =>
      selectedPermissions.includes(p)
    )
    const matchesMember = ROLE_TEMPLATES.member.permissions.every((p) =>
      selectedPermissions.includes(p)
    )
    const matchesOwner = ROLE_TEMPLATES.owner.permissions.every((p) =>
      selectedPermissions.includes(p)
    )

    if (matchesOwner && selectedPermissions.length === ROLE_TEMPLATES.owner.permissions.length) {
      setRoleTemplate('owner')
    } else if (
      matchesMember &&
      selectedPermissions.length === ROLE_TEMPLATES.member.permissions.length
    ) {
      setRoleTemplate('member')
    } else if (
      matchesViewer &&
      selectedPermissions.length === ROLE_TEMPLATES.viewer.permissions.length
    ) {
      setRoleTemplate('viewer')
    } else {
      setRoleTemplate('custom')
    }
  }, [selectedPermissions])

  const handleRoleTemplateChange = (template: string) => {
    setRoleTemplate(template)
    if (template !== 'custom') {
      onChange(ROLE_TEMPLATES[template as keyof typeof ROLE_TEMPLATES].permissions)
    }
  }

  const handlePermissionToggle = (permission: RolePermissionKey) => {
    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter((p) => p !== permission)
      : [...selectedPermissions, permission]
    onChange(newPermissions)
  }

  const isGroupFullySelected = (groupPermissions: RolePermissionKey[]) => {
    return groupPermissions.every((p) => selectedPermissions.includes(p))
  }

  const isGroupPartiallySelected = (groupPermissions: RolePermissionKey[]) => {
    return (
      groupPermissions.some((p) => selectedPermissions.includes(p)) &&
      !isGroupFullySelected(groupPermissions)
    )
  }

  const handleGroupToggle = (groupPermissions: RolePermissionKey[]) => {
    const isFullySelected = isGroupFullySelected(groupPermissions)
    if (isFullySelected) {
      onChange(selectedPermissions.filter((p) => !groupPermissions.includes(p)))
    } else {
      const newPermissions = [...selectedPermissions]
      groupPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p)
        }
      })
      onChange(newPermissions)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('common:quick_select_role')}</Label>
        <Select value={roleTemplate} onValueChange={handleRoleTemplateChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">{t('api_keys:create_dialog.preset_custom')}</SelectItem>
            <SelectItem value="viewer">
              {t('common:role_viewer')} - {t('api_keys:create_dialog.preset_read_only_desc')}
            </SelectItem>
            <SelectItem value="member">
              {t('common:role_member')} - {t('api_keys:create_dialog.preset_standard_desc')}
            </SelectItem>
            <SelectItem value="owner">
              {t('common:role_owner')} - {t('api_keys:create_dialog.preset_full_desc')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`group-${group.key}`}
                checked={isGroupFullySelected(group.permissions)}
                onCheckedChange={() => handleGroupToggle(group.permissions)}
                className={cn(
                  isGroupPartiallySelected(group.permissions) && 'data-[state=checked]:bg-blue-400'
                )}
              />
              <Label
                htmlFor={`group-${group.key}`}
                className="font-semibold text-sm cursor-pointer"
              >
                {group.label}
              </Label>
            </div>
            <div className="ml-6 space-y-2">
              {group.permissions.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => handlePermissionToggle(permission)}
                  />
                  <Label htmlFor={permission} className="text-sm cursor-pointer font-normal">
                    {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        {t('api_keys:detail_dialog.permissions_count', { count: selectedPermissions.length })}
      </div>
    </div>
  )
}
