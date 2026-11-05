import { describe, it, expect } from "vitest";
import {
  ADVANCED_FEATURE_KEYS,
  ORG_PLAN_LIMIT_KEYS,
  PLAN_LIMIT_KEYS,
  type OrgAdvancedFeatureKey,
  type OrgPlanLimitKey,
} from "../../../shared/types/plan-permission";

describe("Plan Permission Types", () => {
  describe("ADVANCED_FEATURE_KEYS", () => {
    it("should contain AUDIT_LOGS key", () => {
      expect(ADVANCED_FEATURE_KEYS).toHaveProperty("AUDIT_LOGS");
      expect(ADVANCED_FEATURE_KEYS.AUDIT_LOGS).toBe("audit_logs");
    });

    it("should have AUDIT_LOGS as a valid OrgAdvancedFeatureKey type", () => {
      const key: OrgAdvancedFeatureKey = ADVANCED_FEATURE_KEYS.AUDIT_LOGS;
      expect(key).toBe("audit_logs");
    });

    it("should maintain existing advanced feature keys", () => {
      // Ensure we didn't break existing features
      expect(ADVANCED_FEATURE_KEYS.LINK_TARGETING).toBe("link_targeting");
      expect(ADVANCED_FEATURE_KEYS.AB_TESTING).toBe("ab_testing");
      expect(ADVANCED_FEATURE_KEYS.LINK_CLOAKING).toBe("link_cloaking");
      expect(ADVANCED_FEATURE_KEYS.E2EE_ENCRYPTION).toBe("e2ee_encryption");
    });
  });

  describe("ORG_PLAN_LIMIT_KEYS", () => {
    it("should contain AUDIT_LOGS_RETENTION_DAYS key", () => {
      expect(ORG_PLAN_LIMIT_KEYS).toHaveProperty("AUDIT_LOGS_RETENTION_DAYS");
      expect(ORG_PLAN_LIMIT_KEYS.AUDIT_LOGS_RETENTION_DAYS).toBe(
        "audit_logs_retention_days"
      );
    });

    it("should have AUDIT_LOGS_RETENTION_DAYS as a valid OrgPlanLimitKey type", () => {
      const key: OrgPlanLimitKey =
        ORG_PLAN_LIMIT_KEYS.AUDIT_LOGS_RETENTION_DAYS;
      expect(key).toBe("audit_logs_retention_days");
    });

    it("should maintain existing plan limit keys", () => {
      // Ensure we didn't break existing limits
      expect(ORG_PLAN_LIMIT_KEYS.MAX_MEMBERS_PER_ORG).toBe(
        "max_members_per_org"
      );
      expect(ORG_PLAN_LIMIT_KEYS.MAX_TPS_PER_ORG).toBe("max_tps_per_org");
      expect(ORG_PLAN_LIMIT_KEYS.MAX_COLLECTIONS_PER_ORG).toBe(
        "max_collections_per_org"
      );
      expect(ORG_PLAN_LIMIT_KEYS.DATA_RETENTION_DAYS).toBe(
        "data_retention_days"
      );
    });
  });

  describe("PLAN_LIMIT_KEYS combined object", () => {
    it("should include AUDIT_LOGS from ADVANCED_FEATURE_KEYS", () => {
      expect(PLAN_LIMIT_KEYS).toHaveProperty("AUDIT_LOGS");
      expect(PLAN_LIMIT_KEYS.AUDIT_LOGS).toBe("audit_logs");
    });

    it("should include AUDIT_LOGS_RETENTION_DAYS from ORG_PLAN_LIMIT_KEYS", () => {
      expect(PLAN_LIMIT_KEYS).toHaveProperty("AUDIT_LOGS_RETENTION_DAYS");
      expect(PLAN_LIMIT_KEYS.AUDIT_LOGS_RETENTION_DAYS).toBe(
        "audit_logs_retention_days"
      );
    });

    it("should be a combination of all limit key objects", () => {
      // Verify it includes keys from all sources
      expect(PLAN_LIMIT_KEYS.MAX_ORGS_PER_USER).toBe("max_orgs_per_user"); // USER_PLAN_LIMIT_KEYS
      expect(PLAN_LIMIT_KEYS.MAX_MEMBERS_PER_ORG).toBe("max_members_per_org"); // ORG_PLAN_LIMIT_KEYS
      expect(PLAN_LIMIT_KEYS.LINK_TARGETING).toBe("link_targeting"); // ADVANCED_FEATURE_KEYS
    });
  });
});
