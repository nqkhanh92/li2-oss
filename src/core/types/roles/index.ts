import { RolePermissionScope } from '@/shared/types/role-permission'

export type TouchPointAccessContext = {
  isFullAccess: boolean
  uncategorizedAccess: RolePermissionScope.ALL | RolePermissionScope.OWN | null
  accessableCollectionIds: string[]
  accessableTouchpointIds: string[]
}
