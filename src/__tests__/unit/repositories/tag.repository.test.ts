import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TagRepository } from '@/core/repositories/tag.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// Mock Supabase
vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('TagRepository', () => {
  let repository: TagRepository
  const mockOrgId = 'org-123'
  const mockTagId = 'tag-789'
  const mockTpId = 'tp-456'

  beforeEach(() => {
    repository = new TagRepository()
    vi.clearAllMocks()
  })

  describe('findAllWithModifier', () => {
    it('should fetch all tags with count and tp_tag_links', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Tag 1',
          color: '#FF0000',
          tp_tag_links: [{ count: 5 }],
        },
        {
          id: 'tag-2',
          name: 'Tag 2',
          color: '#00FF00',
          tp_tag_links: [{ count: 3 }],
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({
            data: mockTags,
            error: null,
            count: 2,
          })
        ),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      const result = await repository.findAllWithModifier((q) =>
        q.eq('organization_id', mockOrgId)
      )

      expect(result.data).toEqual(mockTags)
      expect(result.count).toBe(2)
      expect(mockQuery.select).toHaveBeenCalledWith('*, tp_tag_links(count), profiles(id, email, avatar)', {
        count: 'exact',
      })
    })

    it('should apply modifier function to query', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await repository.findAllWithModifier((q) => q.eq('organization_id', mockOrgId))

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', mockOrgId)
    })

    it('should throw error on database error', async () => {
      const mockError = new Error('Database error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
          count: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await expect(
        repository.findAllWithModifier((q) => q.eq('organization_id', mockOrgId))
      ).rejects.toThrow()
    })
  })

  describe('findOneById', () => {
    it('should fetch single tag with profile info', async () => {
      const mockTag = {
        id: mockTagId,
        name: 'Test Tag',
        color: '#FF0000',
        profiles: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTag,
          error: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      const result = await repository.findOneById(mockTagId, (q) =>
        q.eq('organization_id', mockOrgId)
      )

      expect(result).toEqual(mockTag)
      expect(mockQuery.select).toHaveBeenCalledWith('*, profiles ( id, name, email, avatar )')
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockTagId)
    })

    it('should apply modifier function', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await repository.findOneById(mockTagId, (q) => q.eq('organization_id', mockOrgId))

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', mockOrgId)
    })

    it('should throw error on database error', async () => {
      const mockError = new Error('Tag not found')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await expect(
        repository.findOneById(mockTagId, (q) => q.eq('organization_id', mockOrgId))
      ).rejects.toThrow()
    })
  })

  describe('updateAndGetOne', () => {
    it('should update tag and return updated data', async () => {
      const updateData = { name: 'Updated Tag', color: '#0000FF' }
      const updatedTag = {
        id: mockTagId,
        ...updateData,
        organization_id: mockOrgId,
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedTag,
          error: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      const result = await repository.updateAndGetOne(mockTagId, updateData, (q) =>
        q.eq('organization_id', mockOrgId)
      )

      expect(result).toEqual(updatedTag)
      expect(mockQuery.update).toHaveBeenCalledWith(updateData)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockTagId)
      expect(mockQuery.select).toHaveBeenCalledWith('*')
    })

    it('should apply modifier function', async () => {
      const updateData = { name: 'Updated Tag' }
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await repository.updateAndGetOne(mockTagId, updateData, (q) =>
        q.eq('organization_id', mockOrgId)
      )

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', mockOrgId)
    })

    it('should throw error on database error', async () => {
      const mockError = new Error('Update failed')
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await expect(
        repository.updateAndGetOne(mockTagId, { name: 'Test' }, (q) =>
          q.eq('organization_id', mockOrgId)
        )
      ).rejects.toThrow()
    })
  })

  describe('bulkLinkTags', () => {
    it('should link multiple tags to touchpoint', async () => {
      const tagIds = ['tag-1', 'tag-2', 'tag-3']
      const mockInsertData = tagIds.map((tagId) => ({
        tag_id: tagId,
        tp_id: mockTpId,
      }))

      const mockQuery = {
        insert: vi.fn().mockResolvedValue({
          data: mockInsertData,
          error: null,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      const result = await repository.bulkLinkTags(mockTpId, tagIds)

      expect(result).toEqual(mockInsertData)
      expect(supabaseService.from).toHaveBeenCalledWith('tp_tag_links')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        tagIds.map((tagId) => ({
          tag_id: tagId,
          tp_id: mockTpId,
        }))
      )
    })

    it('should throw error on database error', async () => {
      const mockError = new Error('Insert failed')
      const mockQuery = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }

      vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

      await expect(repository.bulkLinkTags(mockTpId, ['tag-1'])).rejects.toThrow()
    })
  })

  describe('setTagsForTp', () => {
    it('should replace touchpoint tags using RPC', async () => {
      const tagIds = ['tag-1', 'tag-2']

      vi.mocked(supabaseService.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any)

      const result = await repository.setTagsForTp(mockTpId, tagIds)

      expect(result).toBe(true)
      expect(supabaseService.rpc).toHaveBeenCalledWith('update_tp_tag_links', {
        input_tp_id: mockTpId,
        input_tag_ids: tagIds,
      })
    })

    it('should throw error on RPC error', async () => {
      const mockError = new Error('RPC failed')

      vi.mocked(supabaseService.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any)

      await expect(repository.setTagsForTp(mockTpId, ['tag-1'])).rejects.toThrow()
    })
  })

  describe('Base Repository Methods', () => {
    describe('create', () => {
      it('should create a new tag', async () => {
        const createData = {
          name: 'New Tag',
          color: '#FF0000',
          organization_id: mockOrgId,
          user_id: 'user-123',
        }
        const createdTag = { id: mockTagId, ...createData }

        const mockQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          returns: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: createdTag,
            error: null,
          }),
        }

        vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

        const result = await repository.create(createData as any)

        expect(result).toEqual(createdTag)
        expect(mockQuery.insert).toHaveBeenCalledWith(createData)
      })
    })

    describe('bulkCreate', () => {
      it('should create multiple tags', async () => {
        const createData = [
          { name: 'Tag 1', color: '#FF0000', organization_id: mockOrgId },
          { name: 'Tag 2', color: '#00FF00', organization_id: mockOrgId },
        ]
        const createdTags = createData.map((data, i) => ({ id: `tag-${i}`, ...data }))

        const mockQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          returns: vi.fn().mockResolvedValue({
            data: createdTags,
            error: null,
          }),
        }

        vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

        const result = await repository.bulkCreate(createData as any)

        expect(result).toEqual(createdTags)
        expect(mockQuery.insert).toHaveBeenCalledWith(createData)
      })
    })

    describe('bulkDelete', () => {
      it('should delete multiple tags and return count', async () => {
        const tagIds = ['tag-1', 'tag-2', 'tag-3']

        const mockQuery = {
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
            count: 3,
          }),
        }

        vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

        const result = await repository.bulkDelete(tagIds, (q: PostgrestFilterBuilder<any, any, any>) =>
          q.eq('organization_id', mockOrgId)
        )

        expect(result).toBe(3)
        expect(mockQuery.delete).toHaveBeenCalledWith({ count: 'exact' })
        expect(mockQuery.in).toHaveBeenCalledWith('id', tagIds)
      })
    })

    describe('deleteAndGet', () => {
      it('should delete tag and return deleted data', async () => {
        const deletedTag = {
          id: mockTagId,
          name: 'Deleted Tag',
          color: '#FF0000',
          organization_id: mockOrgId,
        }

        const mockQuery = {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          returns: vi.fn().mockResolvedValue({
            data: deletedTag,
            error: null,
          }),
        }

        vi.mocked(supabaseService.from).mockReturnValue(mockQuery as any)

        const result = await repository.deleteAndGet(mockTagId, (q) =>
          q.eq('organization_id', mockOrgId)
        )

        expect(result).toEqual(deletedTag)
        expect(mockQuery.delete).toHaveBeenCalled()
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockTagId)
        expect(mockQuery.select).toHaveBeenCalledWith('*')
      })
    })
  })
})
