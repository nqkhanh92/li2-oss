import {
  noScopePermissionKeys,
  ROLE_PERMISSION_KEYS,
  RolePermission,
  RolePermissionKey,
  RolePermissionScope,
} from "@/shared/types/role-permission";
import { hasPermission } from "./check-permission";

export interface Policy {
  evaluate(context?: {
    org_id?: string;
    permissions: RolePermission[];
  }): boolean;
}

export class PermissionPolicy implements Policy {
  private permissionKey: RolePermissionKey;
  private requiredScope?: RolePermissionScope;

  constructor(
    permissionKey: RolePermissionKey,
    requiredScope?: RolePermissionScope
  ) {
    this.permissionKey = permissionKey;
    this.requiredScope = requiredScope;
  }

  evaluate(context?: { permissions?: RolePermission[] }): boolean {
    if (!context?.permissions || context.permissions.length === 0) return false;
    return hasPermission(
      context.permissions,
      this.permissionKey,
      this.requiredScope
    );
  }
}

export const policies = Object.entries(ROLE_PERMISSION_KEYS).reduce(
  (acc, [_, value]: [string, RolePermissionKey]) => {
    acc[value] = {
      [RolePermissionScope.OWN]: new PermissionPolicy(
        value,
        RolePermissionScope.OWN
      ),
      [RolePermissionScope.ALL]: new PermissionPolicy(
        value,
        RolePermissionScope.ALL
      ),
    };
    return acc;
  },
  {} as Record<RolePermissionKey, Record<RolePermissionScope, PermissionPolicy>>
);

export const nonScopePolicies = noScopePermissionKeys.reduce((acc, value) => {
  acc[value] = new PermissionPolicy(value);
  return acc;
}, {} as Record<RolePermissionKey, PermissionPolicy>);
