'use client'

import { useState, useCallback, useEffect } from 'react'

interface UseBulkSelectionReturn {
  selectedIds: Set<string>
  isSelecting: boolean
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clearAll: () => void
  isSelected: (id: string) => boolean
}

export function useBulkSelection(resetKey?: string): UseBulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelecting = selectedIds.size > 0

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  // Clear selection when search/tab changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [resetKey])

  return { selectedIds, isSelecting, toggle, selectAll, clearAll, isSelected }
}
