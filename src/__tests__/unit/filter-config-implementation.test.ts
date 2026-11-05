import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createFilterConfigs,
  isValidFilterConfig,
  getFilterConfigByKey,
  isValidFilterKey,
} from '@/features/analytics/config/filter-config'

/**
 * Test suite for filter configuration implementation
 * Tests the actual implementation of filter config creation and validation
 */

describe('Filter Configuration Implementation', () => {
  let mockFetchTags: ReturnType<typeof vi.fn>
  let mockFetchTouchPoints: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetchTags = vi.fn()
    mockFetchTouchPoints = vi.fn()
  })

  describe('createFilterConfigs', () => {
    it('should create filter configs with correct structure', () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)

      expect(configs).toHaveLength(2)
      expect(configs[0].key).toBe('tag_ids')
      expect(configs[1].key).toBe('tp_ids')
    })

    it('should include correct titles and query keys', () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)

      expect(configs[0].title).toBe('Filter by Tag')
      expect(configs[0].queryKey).toBe('tag_ids')
      expect(configs[1].title).toBe('Filter by Link')
      expect(configs[1].queryKey).toBe('tp_ids')
    })

    it('should include icons for each filter config', () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)

      expect(configs[0].icon).toBeDefined()
      expect(configs[1].icon).toBeDefined()
    })

    it('should fetch tag options correctly', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Tag 1', color: '#FF0000' },
        { id: 'tag-2', name: 'Tag 2', color: '#00FF00' },
      ]
      mockFetchTags.mockResolvedValue(mockTags)
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const tagOptions = await configs[0].fetchOptions()

      expect(tagOptions).toHaveLength(2)
      expect(tagOptions[0]).toEqual({
        label: 'Tag 1',
        value: 'tag-1',
        color: '#FF0000',
      })
      expect(tagOptions[1]).toEqual({
        label: 'Tag 2',
        value: 'tag-2',
        color: '#00FF00',
      })
    })

    it('should fetch touchpoint options correctly', async () => {
      const mockTouchPoints = [
        { id: 'tp-1', name: 'Link 1' },
        { id: 'tp-2', name: 'Link 2' },
      ]
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue(mockTouchPoints)

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const tpOptions = await configs[1].fetchOptions()

      expect(tpOptions).toHaveLength(2)
      expect(tpOptions[0]).toEqual({
        label: 'Link 1',
        value: 'tp-1',
      })
    })

    it('should handle empty tag results', async () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const tagOptions = await configs[0].fetchOptions()

      expect(tagOptions).toEqual([])
    })

    it('should handle tags without color property', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Tag 1' }, // no color
        { id: 'tag-2', name: 'Tag 2', color: '#FF0000' },
      ]
      mockFetchTags.mockResolvedValue(mockTags)
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const tagOptions = await configs[0].fetchOptions()

      expect(tagOptions[0].color).toBeUndefined()
      expect(tagOptions[1].color).toBe('#FF0000')
    })
  })

  describe('isValidFilterConfig', () => {
    it('should validate a complete filter config', () => {
      mockFetchTags.mockResolvedValue([])

      const config = {
        key: 'tag_ids',
        title: 'Filter by Tag',
        queryKey: 'tag_ids',
        fetchOptions: mockFetchTags,
      }

      expect(isValidFilterConfig(config)).toBe(true)
    })

    it('should reject config missing key', () => {
      const config = {
        title: 'Filter by Tag',
        queryKey: 'tag_ids',
        fetchOptions: vi.fn(),
      }

      expect(isValidFilterConfig(config)).toBe(false)
    })

    it('should reject config missing title', () => {
      const config = {
        key: 'tag_ids',
        queryKey: 'tag_ids',
        fetchOptions: vi.fn(),
      }

      expect(isValidFilterConfig(config)).toBe(false)
    })

    it('should reject config missing queryKey', () => {
      const config = {
        key: 'tag_ids',
        title: 'Filter by Tag',
        fetchOptions: vi.fn(),
      }

      expect(isValidFilterConfig(config)).toBe(false)
    })

    it('should reject config missing fetchOptions', () => {
      const config = {
        key: 'tag_ids',
        title: 'Filter by Tag',
        queryKey: 'tag_ids',
      }

      expect(isValidFilterConfig(config)).toBe(false)
    })
  })

  describe('getFilterConfigByKey', () => {
    let configs: any[]

    beforeEach(() => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])
      configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
    })

    it('should find config by tag_ids key', () => {
      const config = getFilterConfigByKey(configs, 'tag_ids')

      expect(config).toBeDefined()
      expect(config?.key).toBe('tag_ids')
    })

    it('should find config by tp_ids key', () => {
      const config = getFilterConfigByKey(configs, 'tp_ids')

      expect(config).toBeDefined()
      expect(config?.key).toBe('tp_ids')
    })

    it('should return undefined for non-existent key', () => {
      const config = getFilterConfigByKey(configs, 'non_existent')

      expect(config).toBeUndefined()
    })

    it('should return first matching config if duplicates exist', () => {
      const duplicatedConfigs = [...configs, configs[0]]
      const config = getFilterConfigByKey(duplicatedConfigs, 'tag_ids')

      expect(config).toBe(duplicatedConfigs[0])
    })
  })

  describe('isValidFilterKey', () => {
    let configs: any[]

    beforeEach(() => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])
      configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
    })

    it('should validate tag_ids key', () => {
      expect(isValidFilterKey('tag_ids', configs)).toBe(true)
    })

    it('should validate tp_ids key', () => {
      expect(isValidFilterKey('tp_ids', configs)).toBe(true)
    })

    it('should reject non-existent key', () => {
      expect(isValidFilterKey('invalid_key', configs)).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(isValidFilterKey(123, configs)).toBe(false)
      expect(isValidFilterKey(null, configs)).toBe(false)
      expect(isValidFilterKey(undefined, configs)).toBe(false)
      expect(isValidFilterKey({}, configs)).toBe(false)
    })
  })

  describe('Filter Config Integration', () => {
    it('should create consistent configs across multiple calls', () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs1 = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const configs2 = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)

      expect(configs1).toHaveLength(configs2.length)
      expect(configs1[0].key).toBe(configs2[0].key)
      expect(configs1[1].key).toBe(configs2[1].key)
    })

    it('should allow iteration over configs', () => {
      mockFetchTags.mockResolvedValue([])
      mockFetchTouchPoints.mockResolvedValue([])

      const configs = createFilterConfigs(mockFetchTags, mockFetchTouchPoints)
      const keys = configs.map((config) => config.key)

      expect(keys).toContain('tag_ids')
      expect(keys).toContain('tp_ids')
    })
  })
})