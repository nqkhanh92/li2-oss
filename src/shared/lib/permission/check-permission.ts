import {
  noScopePermissionKeys,
  RolePermission,
  RolePermissionKey,
  RolePermissionScope,
} from '@/shared/types/role-permission'

export function hasPermission(
  userPermissions: RolePermission[],
  permissionKey: RolePermissionKey,
  requiredScope?: RolePermissionScope
): boolean {
  const permission = userPermissions.find((p) => p.permission_key === permissionKey)

  if (!permission) return false

  // If no specific scope is required, any scope is fine
  if (!requiredScope || noScopePermissionKeys.includes(permissionKey)) return true

  // ORGANIZATION scope users can access both org-wide and self data
  if (permission.scope === RolePermissionScope.ALL) return true

  // SELF scope users can only access data if required scope is also SELF
  return permission.scope === requiredScope
}
