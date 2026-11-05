import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock dependencies before imports
vi.mock('../../../shared/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('../../../shared/lib/permission/permissions', () => ({
  ensurePolicy: vi.fn(),
  ensureOrgMember: vi.fn(),
}))

vi.mock('../../../shared/lib/plan/plans', () => ({
  ensureOrgPlan: vi.fn(),
  getOrganizationPlan: vi.fn(),
}))

vi.mock('../../../core/services/org-audit-log.service', () => ({
  orgAuditLogService: {
    getAuditLogs: vi.fn(),
    getAuditLogById: vi.fn(),
    exportAuditLogs: vi.fn(),
  },
}))

import { GET as getAuditLogs } from '../../../app/api/organizations/[org_id]/audit-logs/route'
import { GET as getAuditLogById } from '../../../app/api/organizations/[org_id]/audit-logs/[log_id]/route'
import { GET as exportAuditLogs } from '../../../app/api/organizations/[org_id]/audit-logs/export/route'
import { getSession } from '../../../shared/lib/auth/session'
import { ensurePolicy } from '../../../shared/lib/permission/permissions'
import { ensureOrgPlan, getOrganizationPlan } from '../../../shared/lib/plan/plans'
import { orgAuditLogService } from '../../../core/services/org-audit-log.service'
import { ADVANCED_FEATURE_KEYS } from '../../../shared/types/plan-permission'
import { ForbiddenError } from '../../../infrastructure/response/errors/domain.errors'

// Helper to create mock request
const createMockRequest = (urlString: string) => {
  const url = new URL(urlString)
  return { nextUrl: url } as any
}

describe('Audit Logs API Routes', () => {
  const mockOrgId = 'org-123'
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
  const mockLogId = 'log-789'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful auth
    vi.mocked(getSession).mockResolvedValue({
      sub: mockUserId,
      exp: Date.now() + 3600000,
    } as any)

    // Default successful permission and plan checks
    vi.mocked(ensurePolicy).mockResolvedValue(undefined)
    vi.mocked(ensureOrgPlan).mockResolvedValue(undefined)
    vi.mocked(getOrganizationPlan).mockResolvedValue({
      audit_logs_retention_days: 30,
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/organizations/[org_id]/audit-logs', () => {
    const mockAuditLogs = [
      {
        id: 'log-1',
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: 'collection',
        action: 'create',
        target_id: 'coll-1',
        target_name: 'Test Collection',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'log-2',
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: 'collection_member',
        action: 'add',
        target_id: 'user-789',
        target_name: 'John Doe',
        created_at: '2024-01-02T00:00:00Z',
      },
    ]

    it('should return audit logs with pagination', async () => {
      vi.mocked(orgAuditLogService.getAuditLogs).mockResolvedValue({
        data: mockAuditLogs,
        count: 2,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs?page=1&limit=20`
      )
      const response = await getAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual(mockAuditLogs)
      expect(body.rowCount).toBe(2)
    })

    it('should check VIEW_AUDIT_LOGS permission', async () => {
      vi.mocked(orgAuditLogService.getAuditLogs).mockResolvedValue({
        data: [],
        count: 0,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      await getAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(ensurePolicy).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ permissionKey: 'view_audit_logs' })
      )
    })

    it('should check AUDIT_LOGS plan access', async () => {
      vi.mocked(orgAuditLogService.getAuditLogs).mockResolvedValue({
        data: [],
        count: 0,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      await getAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(ensureOrgPlan).toHaveBeenCalledWith(mockOrgId, ADVANCED_FEATURE_KEYS.AUDIT_LOGS)
    })

    it('should enforce retention days from plan', async () => {
      vi.mocked(getOrganizationPlan).mockResolvedValue({
        audit_logs_retention_days: 90,
      } as any)

      vi.mocked(orgAuditLogService.getAuditLogs).mockResolvedValue({
        data: [],
        count: 0,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      await getAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(orgAuditLogService.getAuditLogs).toHaveBeenCalledWith(mockOrgId, {
        page: 1,
        limit: 50,
        retention_days: 90,
      })
    })

    it('should apply query filters', async () => {
      vi.mocked(orgAuditLogService.getAuditLogs).mockResolvedValue({
        data: [],
        count: 0,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs?module=collection&action=create&user_id=${mockUserId}`
      )
      await getAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(orgAuditLogService.getAuditLogs).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          module: 'collection',
          action: 'create',
          user_id: mockUserId,
        })
      )
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      const response = await getAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(401)
    })

    it('should return 403 when permission check fails', async () => {
      vi.mocked(ensurePolicy).mockRejectedValue(
        new ForbiddenError('Permission denied')
      )

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      const response = await getAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(403)
    })

    it('should return 403 when plan check fails', async () => {
      vi.mocked(ensureOrgPlan).mockRejectedValue(
        new ForbiddenError('Premium plan required')
      )

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs`
      )
      const response = await getAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(403)
    })

    it('should handle invalid query parameters', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs?limit=invalid`
      )
      const response = await getAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      // Zod validation error should return 400 or 500
      expect([400, 500]).toContain(response.status)
    })
  })

  describe('GET /api/organizations/[org_id]/audit-logs/[log_id]', () => {
    const mockAuditLog = {
      id: mockLogId,
      organization_id: mockOrgId,
      user_id: mockUserId,
      module: 'collection',
      action: 'update',
      target_id: 'coll-1',
      target_name: 'Updated Collection',
      changes: {
        name: { old: 'Old Name', new: 'New Name' },
      },
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
    }

    it('should return a single audit log by ID', async () => {
      vi.mocked(orgAuditLogService.getAuditLogById).mockResolvedValue(mockAuditLog)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/${mockLogId}`
      )
      const response = await getAuditLogById(request, {
        params: { org_id: mockOrgId, log_id: mockLogId },
      } as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual(mockAuditLog)
    })

    it('should check permissions and plan access', async () => {
      vi.mocked(orgAuditLogService.getAuditLogById).mockResolvedValue(mockAuditLog)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/${mockLogId}`
      )
      await getAuditLogById(request, {
        params: { org_id: mockOrgId, log_id: mockLogId },
      } as any)

      expect(ensurePolicy).toHaveBeenCalled()
      expect(ensureOrgPlan).toHaveBeenCalled()
    })

    it('should return 404 when log not found', async () => {
      vi.mocked(orgAuditLogService.getAuditLogById).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/${mockLogId}`
      )
      const response = await getAuditLogById(request, {
        params: { org_id: mockOrgId, log_id: mockLogId },
      } as any)

      expect(response.status).toBe(404)
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/${mockLogId}`
      )
      const response = await getAuditLogById(request, {
        params: { org_id: mockOrgId, log_id: mockLogId },
      } as any)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/organizations/[org_id]/audit-logs/export', () => {
    const mockCSV = `id,organization_id,user_id,module,action,target_id,target_name,target_table,created_at
"log-1","org-123","user-456","collection","create","coll-1","Test Collection","collections","2024-01-01T00:00:00Z"`

    const mockJSON = JSON.stringify([
      {
        id: 'log-1',
        organization_id: mockOrgId,
        user_id: mockUserId,
        module: 'collection',
        action: 'create',
      },
    ])

    it('should export audit logs as CSV', async () => {
      vi.mocked(orgAuditLogService.exportAuditLogs).mockResolvedValue(mockCSV)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export?format=csv`
      )
      const response = await exportAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('.csv')

      const text = await response.text()
      expect(text).toContain('id,organization_id')
    })

    it('should export audit logs as JSON', async () => {
      vi.mocked(orgAuditLogService.exportAuditLogs).mockResolvedValue(mockJSON)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export?format=json`
      )
      const response = await exportAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('.json')
    })

    it('should check EXPORT_AUDIT_LOGS permission', async () => {
      vi.mocked(orgAuditLogService.exportAuditLogs).mockResolvedValue(mockCSV)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export`
      )
      await exportAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(ensurePolicy).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ permissionKey: 'export_audit_logs' })
      )
    })

    it('should apply filters to export', async () => {
      vi.mocked(orgAuditLogService.exportAuditLogs).mockResolvedValue(mockJSON)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export?format=json&module=collection&start_date=2024-01-01T00:00:00Z`
      )
      await exportAuditLogs(request, { params: { org_id: mockOrgId } } as any)

      expect(orgAuditLogService.exportAuditLogs).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          format: 'json',
          module: 'collection',
          start_date: '2024-01-01T00:00:00Z',
        })
      )
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export`
      )
      const response = await exportAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(401)
    })

    it('should return 403 when permission check fails', async () => {
      vi.mocked(ensurePolicy).mockRejectedValue(
        new ForbiddenError('Export permission required')
      )

      const request = createMockRequest(
        `http://localhost:3000/api/organizations/${mockOrgId}/audit-logs/export`
      )
      const response = await exportAuditLogs(request, {
        params: { org_id: mockOrgId },
      } as any)

      expect(response.status).toBe(403)
    })
  })
})
