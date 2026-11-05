import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OrgAuditLogService } from "../../../core/services/org-audit-log.service";
import { supabaseService } from "../../../infrastructure/database/supabase";
import dayjs from "dayjs";

// Mock Supabase
vi.mock("../../../infrastructure/database/supabase", () => ({
  supabaseService: {
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Mock logger
vi.mock("../../../infrastructure/logging/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

describe("OrgAuditLogService", () => {
  let service: OrgAuditLogService;
  const mockOrgId = "org-123";
  const mockUserId = "user-456";

  beforeEach(() => {
    service = new OrgAuditLogService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAuditLogs", () => {
    it("should fetch audit logs for organization with default pagination", async () => {
      const mockLogs = [
        {
          id: "log-1",
          organization_id: mockOrgId,
          user_id: mockUserId,
          module: "collection",
          action: "create",
          target_id: "coll-1",
          target_name: "Test Collection",
          created_at: new Date().toISOString(),
        },
      ];

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockLogs,
        error: null
      });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await service.getAuditLogs(mockOrgId);

      expect(result.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: "log-1",
          organization_id: mockOrgId,
          user_id: mockUserId,
          module: "collection",
          action: "create",
          target_id: "coll-1",
          target_name: "Test Collection",
        })
      ]));
      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_org_id: mockOrgId,
      }));
    });

    it("should filter by module type", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { module: "collection" });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_module: ["collection"],
      }));
    });

    it("should filter by action type", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { action: "delete" });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_action: ["delete"],
      }));
    });

    it("should filter by user_id", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { user_id: mockUserId });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_user_id: mockUserId,
      }));
    });

    it("should filter by date range", async () => {
      const startDate = "2024-01-01T00:00:00Z";
      const endDate = "2024-01-31T23:59:59Z";

      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, {
        start_date: startDate,
        end_date: endDate,
      });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_start_date: startDate,
        p_end_date: endDate,
      }));
    });

    it("should filter by target_id (resource ID)", async () => {
      const targetId = "resource-789";

      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { target_id: targetId });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_target_id: targetId,
      }));
    });

    it("should apply plan-based retention filtering (90 days for Premium)", async () => {
      const retentionDays = 90;

      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { retention_days: retentionDays });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_retention_days: retentionDays,
      }));
    });

    it("should sort by created_at DESC by default", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId);

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.any(Object));
    });

    it("should paginate correctly with limit and offset", async () => {
      const limit = 50;
      const page = 2;
      const offset = (page - 1) * limit;

      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.getAuditLogs(mockOrgId, { limit, page });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_limit: limit,
        p_offset: offset,
      }));
    });

    it("should return empty array for org with no logs", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await service.getAuditLogs("org-empty");

      expect(result.data).toEqual([]);
    });

    it("should throw error for invalid organization_id", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Invalid organization_id" },
      });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await expect(service.getAuditLogs("invalid-org")).rejects.toThrow();
    });
  });

  describe("getAuditLogById", () => {
    it("should return single log by ID", async () => {
      const mockLog = {
        id: "log-1",
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: "collection",
        action: "create",
        target_id: "coll-1",
        target_name: "Test Collection",
        target_extra: { description: "Test" },
        changes: { name: { old: null, new: "Test Collection" } },
        created_at: new Date().toISOString(),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLog, error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getAuditLogById("log-1", mockOrgId);

      expect(result).toEqual(mockLog);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "log-1");
      expect(mockQuery.eq).toHaveBeenCalledWith("organization_id", mockOrgId);
    });

    it("should return null for non-existent log", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getAuditLogById("non-existent", mockOrgId);

      expect(result).toBeNull();
    });

    it("should validate organization ownership (cannot access other org's logs)", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getAuditLogById("log-1", "different-org");

      expect(result).toBeNull();
      expect(mockQuery.eq).toHaveBeenCalledWith("organization_id", "different-org");
    });

    it("should include full target_extra and changes data", async () => {
      const mockLog = {
        id: "log-1",
        organization_id: mockOrgId,
        target_extra: { fullData: "here", nested: { value: 123 } },
        changes: {
          name: { old: "Old Name", new: "New Name" },
          description: { old: null, new: "Added description" },
        },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLog, error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getAuditLogById("log-1", mockOrgId);

      expect(result?.target_extra).toEqual({
        fullData: "here",
        nested: { value: 123 },
      });
      expect(result?.changes).toHaveProperty("name");
      expect(result?.changes).toHaveProperty("description");
    });
  });

  describe("getResourceAuditTrail", () => {
    it("should return all logs for specific resource (target_id)", async () => {
      const resourceId = "resource-123";
      const mockLogs = [
        {
          id: "log-1",
          action: "create",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "log-2",
          action: "update",
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getResourceAuditTrail(
        mockOrgId,
        resourceId
      );

      expect(result).toEqual(mockLogs);
      expect(mockQuery.eq).toHaveBeenCalledWith("target_id", resourceId);
    });

    it("should order chronologically (oldest to newest)", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      await service.getResourceAuditTrail(mockOrgId, "resource-123");

      expect(mockQuery.order).toHaveBeenCalledWith("created_at", {
        ascending: true,
      });
    });

    it("should apply retention filtering", async () => {
      const retentionDays = 30;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      await service.getResourceAuditTrail(mockOrgId, "resource-123", {
        retention_days: retentionDays,
      });

      expect(mockQuery.gte).toHaveBeenCalledWith(
        "created_at",
        expect.any(String)
      );
    });

    it("should return empty array for new resource", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabaseService.schema).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const result = await service.getResourceAuditTrail(
        mockOrgId,
        "new-resource"
      );

      expect(result).toEqual([]);
    });
  });

  describe("exportAuditLogs", () => {
    const mockLogs = [
      {
        id: "log-1",
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: "collection",
        action: "create",
        target_name: "Test Collection",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "log-2",
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: "touch_point",
        action: "update",
        target_name: "Test TP",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    it("should export to CSV format with correct headers", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockLogs, error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await service.exportAuditLogs(mockOrgId, { format: "csv" });

      expect(result).toContain("id,organization_id,user_id,module,action");
      expect(result).toContain("log-1");
      expect(result).toContain("collection");
      expect(result).toContain("create");
    });

    it("should export to JSON format as array", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockLogs, error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await service.exportAuditLogs(mockOrgId, {
        format: "json",
      });

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty("id", "log-1");
    });

    it("should apply same filters as getAuditLogs", async () => {
      const filters = {
        module: "collection" as const,
        action: "create" as const,
        start_date: "2024-01-01T00:00:00Z",
      };

      const mockRpc = vi.fn().mockResolvedValue({ data: mockLogs, error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      await service.exportAuditLogs(mockOrgId, { format: "csv", ...filters });

      expect(mockRpc).toHaveBeenCalledWith('get_audit_logs_with_users', expect.objectContaining({
        p_module: ["collection"],
        p_action: ["create"],
        p_start_date: "2024-01-01T00:00:00Z",
      }));
    });

    it("should handle empty result set gracefully", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const csvResult = await service.exportAuditLogs(mockOrgId, {
        format: "csv",
      });
      expect(csvResult).toBe(""); // Empty CSV or just headers

      const jsonResult = await service.exportAuditLogs(mockOrgId, {
        format: "json",
      });
      expect(jsonResult).toBe("[]"); // Empty JSON array
    });

    it("should format dates in human-readable format for CSV", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockLogs, error: null });

      vi.mocked(supabaseService.schema).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await service.exportAuditLogs(mockOrgId, { format: "csv" });

      // Should contain formatted date (not just ISO string)
      expect(result).toContain("2024");
    });
  });
});
