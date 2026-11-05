import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSION_KEYS,
  noScopePermissionKeys,
  type RolePermissionKey,
} from "../../../shared/types/role-permission";

describe("Role Permission Types", () => {
  describe("ROLE_PERMISSION_KEYS", () => {
    it("should contain VIEW_AUDIT_LOGS key", () => {
      expect(ROLE_PERMISSION_KEYS).toHaveProperty("VIEW_AUDIT_LOGS");
      expect(ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS).toBe("view_audit_logs");
    });

    it("should contain EXPORT_AUDIT_LOGS key", () => {
      expect(ROLE_PERMISSION_KEYS).toHaveProperty("EXPORT_AUDIT_LOGS");
      expect(ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS).toBe("export_audit_logs");
    });

    it("should have VIEW_AUDIT_LOGS as a valid RolePermissionKey type", () => {
      const key: RolePermissionKey = ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS;
      expect(key).toBe("view_audit_logs");
    });

    it("should have EXPORT_AUDIT_LOGS as a valid RolePermissionKey type", () => {
      const key: RolePermissionKey = ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS;
      expect(key).toBe("export_audit_logs");
    });

    it("should maintain existing permission keys", () => {
      // Ensure we didn't break existing permissions
      expect(ROLE_PERMISSION_KEYS.VIEW_DASHBOARD).toBe("view_dashboard");
      expect(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS).toBe("view_analytics");
      expect(ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS).toBe("view_collections");
      expect(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION).toBe(
        "manage_organization"
      );
    });
  });

  describe("noScopePermissionKeys array", () => {
    it("should include VIEW_AUDIT_LOGS in noScopePermissionKeys", () => {
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS
      );
    });

    it("should include EXPORT_AUDIT_LOGS in noScopePermissionKeys", () => {
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS
      );
    });

    it("should maintain existing no-scope permissions", () => {
      // Ensure existing permissions are still there
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.VIEW_DASHBOARD
      );
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.VIEW_ANALYTICS
      );
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION
      );
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS
      );
      expect(noScopePermissionKeys).toContain(
        ROLE_PERMISSION_KEYS.ADD_COLLECTION
      );
    });

    it("should not include scope-based permissions in noScopePermissionKeys", () => {
      // Scope-based permissions (OWN/ALL distinction) should NOT be in this array
      expect(noScopePermissionKeys).not.toContain(
        ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT
      );
      expect(noScopePermissionKeys).not.toContain(
        ROLE_PERMISSION_KEYS.DELETE_TOUCH_POINT
      );
      expect(noScopePermissionKeys).not.toContain(
        ROLE_PERMISSION_KEYS.EDIT_COLLECTION
      );
      expect(noScopePermissionKeys).not.toContain(
        ROLE_PERMISSION_KEYS.DELETE_COLLECTION
      );
    });

    it("should have unique values (no duplicates)", () => {
      const uniqueSet = new Set(noScopePermissionKeys);
      expect(uniqueSet.size).toBe(noScopePermissionKeys.length);
    });
  });

  describe("Permission categorization", () => {
    it("should categorize audit log permissions correctly", () => {
      // Both audit log permissions should be boolean-only (no OWN/ALL scope)
      // This means viewing and exporting are organization-wide capabilities
      const auditLogPermissions = [
        ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS,
        ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS,
      ];

      auditLogPermissions.forEach((permission) => {
        expect(noScopePermissionKeys).toContain(permission);
      });
    });
  });
});
