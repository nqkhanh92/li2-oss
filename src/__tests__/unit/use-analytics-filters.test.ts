import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalyticsFilters } from '@/features/analytics/hooks/use-analytics-filters'

/**
 * Test suite for useAnalyticsFilters hook
 * Tests the React hook interface for filter management
 */

describe('useAnalyticsFilters Hook', () => {
  describe('Hook Initialization', () => {
    it('should initialize with empty filters by default', () => {
      const { result } = renderHook(() => useAnalyticsFilters())

      expect(result.current.filters.tag_ids).toEqual([])
      expect(result.current.filters.tp_ids).toEqual([])
    })

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({
          tag_ids: ['tag-1', 'tag-2'],
          tp_ids: ['tp-1'],
        }),
      )

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-2'])
      expect(result.current.filters.tp_ids).toEqual(['tp-1'])
    })
  })

  describe('Tag ID Operations', () => {
    it('should set tag IDs', () => {
      const { result } = renderHook(() => useAnalyticsFilters())

      act(() => {
        result.current.setTagIds(['tag-1', 'tag-2', 'tag-3'])
      })

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-2', 'tag-3'])
    })

    it('should add a tag ID', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tag_ids: ['tag-1'] }),
      )

      act(() => {
        result.current.addTagId('tag-2')
      })

      expect(result.current.filters.tag_ids).toContain('tag-1')
      expect(result.current.filters.tag_ids).toContain('tag-2')
    })

    it('should not add duplicate tag IDs', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tag_ids: ['tag-1'] }),
      )

      act(() => {
        result.current.addTagId('tag-1')
      })

      expect(result.current.filters.tag_ids).toHaveLength(1)
    })

    it('should remove a tag ID', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tag_ids: ['tag-1', 'tag-2', 'tag-3'] }),
      )

      act(() => {
        result.current.removeTagId('tag-2')
      })

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-3'])
    })
  })

  describe('Touch-Point ID Operations', () => {
    it('should set touch-point IDs', () => {
      const { result } = renderHook(() => useAnalyticsFilters())

      act(() => {
        result.current.setTpIds(['tp-1', 'tp-2'])
      })

      expect(result.current.filters.tp_ids).toEqual(['tp-1', 'tp-2'])
    })

    it('should add a touch-point ID', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tp_ids: ['tp-1'] }),
      )

      act(() => {
        result.current.addTpId('tp-2')
      })

      expect(result.current.filters.tp_ids).toContain('tp-1')
      expect(result.current.filters.tp_ids).toContain('tp-2')
    })

    it('should not add duplicate touch-point IDs', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tp_ids: ['tp-1'] }),
      )

      act(() => {
        result.current.addTpId('tp-1')
      })

      expect(result.current.filters.tp_ids).toHaveLength(1)
    })

    it('should remove a touch-point ID', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({ tp_ids: ['tp-1', 'tp-2'] }),
      )

      act(() => {
        result.current.removeTpId('tp-1')
      })

      expect(result.current.filters.tp_ids).toEqual(['tp-2'])
    })
  })

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({
          tag_ids: ['tag-1', 'tag-2'],
          tp_ids: ['tp-1'],
        }),
      )

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.filters.tag_ids).toEqual([])
      expect(result.current.filters.tp_ids).toEqual([])
    })
  })

  describe('Multiple Filter Operations', () => {
    it('should allow independent tag and touchpoint filter operations', () => {
      const { result } = renderHook(() => useAnalyticsFilters())

      act(() => {
        result.current.addTagId('tag-1')
        result.current.addTpId('tp-1')
      })

      expect(result.current.filters.tag_ids).toContain('tag-1')
      expect(result.current.filters.tp_ids).toContain('tp-1')

      act(() => {
        result.current.addTagId('tag-2')
      })

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-2'])
      expect(result.current.filters.tp_ids).toEqual(['tp-1'])
    })

    it('should maintain state across multiple operations', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({
          tag_ids: ['tag-1'],
          tp_ids: ['tp-1'],
        }),
      )

      act(() => {
        result.current.addTagId('tag-2')
        result.current.addTpId('tp-2')
        result.current.removeTagId('tag-1')
      })

      expect(result.current.filters).toMatchObject({
        tag_ids: ['tag-2'],
        tp_ids: ['tp-1', 'tp-2'],
      })
    })
  })

  describe('Hook Callback Stability', () => {
    it('should return stable callbacks', () => {
      const { result, rerender } = renderHook(() => useAnalyticsFilters())

      const callbacks = {
        setTagIds: result.current.setTagIds,
        addTagId: result.current.addTagId,
        removeTagId: result.current.removeTagId,
        setTpIds: result.current.setTpIds,
        addTpId: result.current.addTpId,
        removeTpId: result.current.removeTpId,
        clearAllFilters: result.current.clearAllFilters,
      }

      rerender()

      expect(result.current.setTagIds).toBe(callbacks.setTagIds)
      expect(result.current.addTagId).toBe(callbacks.addTagId)
      expect(result.current.removeTagId).toBe(callbacks.removeTagId)
      expect(result.current.setTpIds).toBe(callbacks.setTpIds)
      expect(result.current.addTpId).toBe(callbacks.addTpId)
      expect(result.current.removeTpId).toBe(callbacks.removeTpId)
      expect(result.current.clearAllFilters).toBe(callbacks.clearAllFilters)
    })
  })

  describe('Batch Operations', () => {
    it('should handle sequential filter changes', () => {
      const { result } = renderHook(() => useAnalyticsFilters())

      act(() => {
        result.current.setTagIds(['tag-1', 'tag-2'])
      })

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-2'])

      act(() => {
        result.current.setTpIds(['tp-1', 'tp-2', 'tp-3'])
      })

      expect(result.current.filters.tag_ids).toEqual(['tag-1', 'tag-2'])
      expect(result.current.filters.tp_ids).toEqual(['tp-1', 'tp-2', 'tp-3'])
    })

    it('should handle clearing and re-adding filters', () => {
      const { result } = renderHook(() =>
        useAnalyticsFilters({
          tag_ids: ['tag-1'],
          tp_ids: ['tp-1'],
        }),
      )

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.filters).toMatchObject({
        tag_ids: [],
        tp_ids: [],
      })

      act(() => {
        result.current.addTagId('tag-2')
        result.current.addTpId('tp-2')
      })

      expect(result.current.filters).toMatchObject({
        tag_ids: ['tag-2'],
        tp_ids: ['tp-2'],
      })
    })
  })
})