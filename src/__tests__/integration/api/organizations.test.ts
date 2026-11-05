import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('../../../shared/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('../../../core/services/organization.service', () => ({
  organizationService: {
    createOrganization: vi.fn(),
    getUserOrgs: vi.fn(),
  },
}))

vi.mock('../../../infrastructure/logging/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}))

import { GET, POST } from '../../../app/api/organizations/route'
import { getSession } from '../../../shared/lib/auth/session'
import { organizationService } from '../../../core/services/organization.service'
import { PlanError } from '../../../infrastructure/response/errors/domain.errors'

const mockUserId = 'user-abc-123'

const createGetRequest = () =>
  ({
    url: 'http://localhost:3000/api/organizations',
    nextUrl: new URL('http://localhost:3000/api/organizations'),
    cookies: { get: vi.fn().mockReturnValue(undefined) },
    headers: { get: vi.fn().mockReturnValue(null) },
  }) as any

const createPostRequest = (body: unknown) =>
  ({
    url: 'http://localhost:3000/api/organizations',
    nextUrl: new URL('http://localhost:3000/api/organizations'),
    cookies: { get: vi.fn().mockReturnValue(undefined) },
    headers: { get: vi.fn().mockReturnValue(null) },
    json: vi.fn().mockResolvedValue(body),
  }) as any

describe('Organizations API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({
      id: mockUserId,
      sub: mockUserId,
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/organizations', () => {
    const mockOrg = {
      id: 'org-uuid-123',
      name: 'Test Org',
      org_slug: 'test-org',
      user_id: mockUserId,
      created_at: '2026-05-19T00:00:00Z',
    }

    it('should create organization and return 201', async () => {
      vi.mocked(organizationService.createOrganization).mockResolvedValue(mockOrg as any)

      const request = createPostRequest({ name: 'Test Org', org_slug: 'test-org' })
      const response = await POST(request, { params: {} } as any)

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.data).toMatchObject({ id: 'org-uuid-123', org_slug: 'test-org' })
    })

    it('should call createOrganization with userId from context and validated data', async () => {
      vi.mocked(organizationService.createOrganization).mockResolvedValue(mockOrg as any)

      const request = createPostRequest({ name: 'Test Org', org_slug: 'test-org' })
      await POST(request, { params: {} } as any)

      expect(organizationService.createOrganization).toHaveBeenCalledWith(mockUserId, {
        name: 'Test Org',
        org_slug: 'test-org',
      })
    })

    it('should return 401 when no session', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createPostRequest({ name: 'Test Org', org_slug: 'test-org' })
      const response = await POST(request, { params: {} } as any)

      expect(response.status).toBe(401)
      expect(organizationService.createOrganization).not.toHaveBeenCalled()
    })

    it('should return 403 with PLAN_ERROR code when plan limit exceeded', async () => {
      vi.mocked(organizationService.createOrganization).mockRejectedValue(new PlanError())

      const request = createPostRequest({ name: 'Test Org', org_slug: 'test-org' })
      const response = await POST(request, { params: {} } as any)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.i18nMessage?.key).toContain('plan_error')
    })

    it('should return 500 for invalid slug format (Zod parse error)', async () => {
      const request = createPostRequest({ name: 'Test', org_slug: 'INVALID SLUG!!!' })
      const response = await POST(request, { params: {} } as any)

      expect(response.status).toBe(500)
      expect(organizationService.createOrganization).not.toHaveBeenCalled()
    })

    it('should return 500 for missing required fields', async () => {
      const request = createPostRequest({})
      const response = await POST(request, { params: {} } as any)

      expect(response.status).toBe(500)
      expect(organizationService.createOrganization).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations with 200', async () => {
      const mockOrgs = [{ id: 'org-1', name: 'Org One' }, { id: 'org-2', name: 'Org Two' }]
      vi.mocked(organizationService.getUserOrgs).mockResolvedValue(mockOrgs as any)

      const request = createGetRequest()
      const response = await GET(request, { params: {} } as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual(mockOrgs)
    })

    it('should call getUserOrgs with userId from context', async () => {
      vi.mocked(organizationService.getUserOrgs).mockResolvedValue([] as any)

      const request = createGetRequest()
      await GET(request, { params: {} } as any)

      expect(organizationService.getUserOrgs).toHaveBeenCalledWith(mockUserId)
    })

    it('should return 401 when no session', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createGetRequest()
      const response = await GET(request, { params: {} } as any)

      expect(response.status).toBe(401)
      expect(organizationService.getUserOrgs).not.toHaveBeenCalled()
    })
  })
})
