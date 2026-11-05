import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TagService } from '@/core/services/tag.service'
import { TagRepository } from '@/core/repositories/tag.repository'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'

// Mock dependencies
vi.mock('@/core/repositories/tag.repository')
vi.mock('@/shared/lib/plan/plans')
vi.mock('@/shared/lib/permission/permissions')
vi.mock('@/core/services/org-audit-log.service')
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('TagService', () => {
  let service: TagService
  let repo: TagRepository
  const mockOrgId = 'org-123'
  const mockUserId = 'user-456'
  const mockTpId = 'tp-789'

  beforeEach(() => {
    repo = new TagRepository() as any
    service = new TagService(repo)
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(ensureOrgPlan).mockResolvedValue(true as any)
    vi.mocked(ensurePolicy).mockResolvedValue(true as any)
  })

  describe('bulkCreateOrLinkTags', () => {
    it('should link existing tags by name and create only truly new tags', async () => {
      const tagNames = ['existing-tag', 'new-tag', '550e8400-e29b-41d4-a716-446655440000'] // name, name, UUID
      
      const mockFoundTags = [
        { id: 'tag-id-1', name: 'existing-tag', organization_id: mockOrgId }
      ]

      // Mock findByNames
      vi.spyOn(service, 'findByNames').mockResolvedValue({ data: mockFoundTags, count: 1 } as any)

      // Mock bulkCreateTags
      const mockCreatedTags = [{ id: 'tag-id-2', name: 'new-tag' }]
      vi.spyOn(service, 'bulkCreateTags').mockResolvedValue(mockCreatedTags as any)

      // Mock repo.bulkLinkTags
      vi.mocked(repo.bulkLinkTags).mockResolvedValue({} as any)

      await service.bulkCreateOrLinkTags(mockOrgId, mockTpId, mockUserId, tagNames)

      // Verify findByNames was called with the correct names
      expect(service.findByNames).toHaveBeenCalledWith(mockOrgId, ['existing-tag', 'new-tag'])

      // Verify bulkCreateTags was called only with truly new tag
      expect(service.bulkCreateTags).toHaveBeenCalledWith(mockOrgId, mockUserId, ['new-tag'])

      // Verify repo.bulkLinkTags was called with all IDs (existing, found, and newly created)
      const expectedIdsToLink = expect.arrayContaining([
        '550e8400-e29b-41d4-a716-446655440000', // original UUID
        'tag-id-1', // found by name
        'tag-id-2'  // created
      ])
      expect(repo.bulkLinkTags).toHaveBeenCalledWith(mockTpId, expectedIdsToLink)
    })

    it('should not create any tags if all names already exist', async () => {
      const tagNames = ['existing-1', 'existing-2']
      
      const mockFoundTags = [
        { id: 'id-1', name: 'existing-1' },
        { id: 'id-2', name: 'existing-2' }
      ]

      vi.spyOn(service, 'findByNames').mockResolvedValue({ data: mockFoundTags, count: 2 } as any)
      vi.spyOn(service, 'bulkCreateTags')
      vi.mocked(repo.bulkLinkTags).mockResolvedValue({} as any)

      await service.bulkCreateOrLinkTags(mockOrgId, mockTpId, mockUserId, tagNames)

      expect(service.bulkCreateTags).not.toHaveBeenCalled()
      expect(repo.bulkLinkTags).toHaveBeenCalledWith(mockTpId, expect.arrayContaining(['id-1', 'id-2']))
    })
  })

  describe('replaceTpTags', () => {
    it('should link existing tags and create new ones then call setTagsForTp', async () => {
      const tagNames = ['existing-tag', 'new-tag']
      
      const mockFoundTags = [{ id: 'tag-id-1', name: 'existing-tag' }]

      vi.spyOn(service, 'findByNames').mockResolvedValue({ data: mockFoundTags, count: 1 } as any)
      vi.spyOn(service, 'bulkCreateTags').mockResolvedValue([{ id: 'tag-id-2', name: 'new-tag' }] as any)
      vi.mocked(repo.setTagsForTp).mockResolvedValue(true)

      await service.replaceTpTags(mockOrgId, mockTpId, mockUserId, tagNames)

      expect(service.bulkCreateTags).toHaveBeenCalledWith(mockOrgId, mockUserId, ['new-tag'])
      expect(repo.setTagsForTp).toHaveBeenCalledWith(mockTpId, expect.arrayContaining(['tag-id-1', 'tag-id-2']))
    })
  })
})
