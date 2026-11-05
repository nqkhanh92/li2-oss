'use client'

import { useState, useEffect, useCallback } from 'react'

export type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'li2:dashboards:viewMode'

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>('grid')

  // Read from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'list') setViewModeState('list')
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  return [viewMode, setViewMode]
}
