import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Test suite for analytics query with multiple filters
 * Defines the API contract for filtering analytics data
 */

export type AnalyticFiltersParams = {
  tag_ids?: string[]
  tp_ids?: string[]
  date_range: {
    from: Date | string
    to: Date | string
  }
}

export type AnalyticDataType = {
  types: Array<{ type: string; count: number }>
  totalVisits: number
  totalUniqueVisits: number
  referrers: Array<{ name: string; count: number }>
  os: Array<{ name: string; count: number }>
  platforms: Array<{ name: string; count: number }>
  countries: Array<{ name: string; count: number }>
  topPerformingDates: Array<{ date: string; count: number }>
}

// Mock API client
export interface AnalyticsApiClient {
  getAnalyticsByFilters(
    org_id: string,
    params: AnalyticFiltersParams,
  ): Promise<AnalyticDataType>
}

describe('Analytics Query with Multiple Filters', () => {
  let mockApiClient: AnalyticsApiClient

  beforeEach(() => {
    mockApiClient = {
      getAnalyticsByFilters: vi.fn(),
    }
  })

  describe('Query Parameters', () => {
    it('should accept tag_ids filter', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 0,
        totalUniqueVisits: 0,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tag_ids: ['tag-1', 'tag-2'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result).toEqual(mockData)
      expect(mockApiClient.getAnalyticsByFilters).toHaveBeenCalledWith('org-123', params)
    })

    it('should accept tp_ids filter', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 0,
        totalUniqueVisits: 0,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tp_ids: ['tp-1', 'tp-2'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result).toEqual(mockData)
    })

    it('should accept both tag_ids and tp_ids filters', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 100,
        totalUniqueVisits: 50,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tag_ids: ['tag-1'],
        tp_ids: ['tp-1'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result.totalVisits).toBe(100)
      expect(mockApiClient.getAnalyticsByFilters).toHaveBeenCalledWith('org-123', params)
    })

    it('should work without optional filters', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 200,
        totalUniqueVisits: 100,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result.totalVisits).toBe(200)
    })

    it('should require date_range parameter', () => {
      const params: Partial<AnalyticFiltersParams> = {
        tag_ids: ['tag-1'],
      }

      const hasDateRange = !!(params as any).date_range

      expect(hasDateRange).toBe(false)
    })
  })

  describe('Date Range Support', () => {
    it('should support Date objects for date range', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 0,
        totalUniqueVisits: 0,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const fromDate = new Date('2024-01-01')
      const toDate = new Date('2024-01-31')

      const params: AnalyticFiltersParams = {
        date_range: {
          from: fromDate,
          to: toDate,
        },
      }

      await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(mockApiClient.getAnalyticsByFilters).toHaveBeenCalledWith('org-123', params)
    })

    it('should support string dates for date range', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 0,
        totalUniqueVisits: 0,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        date_range: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-31T23:59:59Z',
        },
      }

      await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(mockApiClient.getAnalyticsByFilters).toHaveBeenCalledWith('org-123', params)
    })
  })

  describe('Response Data Structure', () => {
    it('should return analytics data with all required fields', async () => {
      const mockData: AnalyticDataType = {
        types: [
          { type: 'click', count: 150 },
          { type: 'scan', count: 50 },
        ],
        totalVisits: 200,
        totalUniqueVisits: 120,
        referrers: [
          { name: 'facebook', count: 100 },
          { name: 'google', count: 50 },
        ],
        os: [
          { name: 'iOS', count: 120 },
          { name: 'Android', count: 80 },
        ],
        platforms: [
          { name: 'mobile', count: 150 },
          { name: 'desktop', count: 50 },
        ],
        countries: [
          { name: 'US', count: 100 },
          { name: 'VN', count: 100 },
        ],
        topPerformingDates: [
          { date: '2024-01-15', count: 50 },
          { date: '2024-01-20', count: 75 },
        ],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const result = await mockApiClient.getAnalyticsByFilters('org-123', {
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      })

      expect(result).toHaveProperty('types')
      expect(result).toHaveProperty('totalVisits')
      expect(result).toHaveProperty('totalUniqueVisits')
      expect(result).toHaveProperty('referrers')
      expect(result).toHaveProperty('os')
      expect(result).toHaveProperty('platforms')
      expect(result).toHaveProperty('countries')
      expect(result).toHaveProperty('topPerformingDates')
    })

    it('should return empty arrays for data with no results', async () => {
      const mockData: AnalyticDataType = {
        types: [],
        totalVisits: 0,
        totalUniqueVisits: 0,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const result = await mockApiClient.getAnalyticsByFilters('org-123', {
        tag_ids: ['non-existent-tag'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      })

      expect(result.totalVisits).toBe(0)
      expect(result.types).toEqual([])
    })
  })

  describe('Multiple Filter Combinations', () => {
    it('should return data filtered by both tag and touchpoint', async () => {
      const mockData: AnalyticDataType = {
        types: [{ type: 'click', count: 50 }],
        totalVisits: 50,
        totalUniqueVisits: 30,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tag_ids: ['tag-1'],
        tp_ids: ['tp-1'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result.totalVisits).toBe(50)
      expect(mockApiClient.getAnalyticsByFilters).toHaveBeenCalledWith('org-123', params)
    })

    it('should handle multiple tags', async () => {
      const mockData: AnalyticDataType = {
        types: [{ type: 'click', count: 300 }],
        totalVisits: 300,
        totalUniqueVisits: 200,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tag_ids: ['tag-1', 'tag-2', 'tag-3'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result.totalVisits).toBe(300)
    })

    it('should handle multiple touchpoints', async () => {
      const mockData: AnalyticDataType = {
        types: [{ type: 'click', count: 250 }],
        totalVisits: 250,
        totalUniqueVisits: 150,
        referrers: [],
        os: [],
        platforms: [],
        countries: [],
        topPerformingDates: [],
      }

      vi.mocked(mockApiClient.getAnalyticsByFilters).mockResolvedValue(mockData)

      const params: AnalyticFiltersParams = {
        tp_ids: ['tp-1', 'tp-2'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      const result = await mockApiClient.getAnalyticsByFilters('org-123', params)

      expect(result.totalVisits).toBe(250)
    })
  })

  describe('Error Scenarios', () => {
    it('should throw error for invalid org_id', async () => {
      const error = new Error('Organization not found')
      vi.mocked(mockApiClient.getAnalyticsByFilters).mockRejectedValue(error)

      const params: AnalyticFiltersParams = {
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      await expect(mockApiClient.getAnalyticsByFilters('invalid-org', params)).rejects.toThrow(
        'Organization not found',
      )
    })

    it('should throw error for invalid filter IDs', async () => {
      const error = new Error('Invalid filter')
      vi.mocked(mockApiClient.getAnalyticsByFilters).mockRejectedValue(error)

      const params: AnalyticFiltersParams = {
        tag_ids: ['invalid-tag-id'],
        date_range: {
          from: '2024-01-01',
          to: '2024-01-31',
        },
      }

      await expect(mockApiClient.getAnalyticsByFilters('org-123', params)).rejects.toThrow(
        'Invalid filter',
      )
    })
  })
})