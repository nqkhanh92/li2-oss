'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useDeleteDashboard, useTogglePin } from './mutations'
import type { DashboardWithWidgets } from '../types'
import type { ViewMode } from './use-view-mode'

interface UseDashboardShortcutsOptions {
  items: DashboardWithWidgets[]
  orgId: string
  viewMode: ViewMode
  onCreateNew: () => void
  onFocusSearch: () => void
  gridRef: React.RefObject<HTMLDivElement | null>
}

const GRID_BREAKPOINTS = { md: 768, lg: 1024 } as const
const GRID_COLS = { sm: 1, md: 2, lg: 3 } as const

function isInputActive(): boolean {
  const el = document.activeElement
  if (!el || el === document.body) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((el as HTMLElement).isContentEditable) return true
  // Any other focused interactive element (button, link, Radix trigger) — don't hijack
  if (tag === 'button' || tag === 'a') return true
  if (el.getAttribute('role') === 'option' || el.getAttribute('role') === 'menuitem') return true
  return false
}

function isDialogOpen(): boolean {
  return !!document.querySelector('[role="dialog"]')
}

export function useDashboardShortcuts({
  items,
  orgId,
  viewMode,
  onCreateNew,
  onFocusSearch,
  gridRef,
}: UseDashboardShortcutsOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const colsRef = useRef(3)
  const router = useRouter()
  const deleteDashboard = useDeleteDashboard(orgId)
  const togglePin = useTogglePin(orgId)
  const { confirm } = useConfirmDialog()

  // Track column count via ResizeObserver
  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    const updateCols = () => {
      const w = el.clientWidth
      if (viewMode === 'list') {
        colsRef.current = 1
      } else if (w >= GRID_BREAKPOINTS.lg) {
        colsRef.current = GRID_COLS.lg
      } else if (w >= GRID_BREAKPOINTS.md) {
        colsRef.current = GRID_COLS.md
      } else {
        colsRef.current = GRID_COLS.sm
      }
    }

    updateCols()
    const observer = new ResizeObserver(updateCols)
    observer.observe(el)
    return () => observer.disconnect()
  }, [gridRef, viewMode])

  // Bounds-check focus when items change (search/tab switch or background refetch)
  useEffect(() => {
    setFocusedIndex((prev) => {
      if (prev === null) return null
      return prev < items.length ? prev : null
    })
  }, [items])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isDialogOpen()) return
    if (isInputActive()) {
      // Only allow Escape when in input
      if (e.key === 'Escape') {
        ;(document.activeElement as HTMLElement)?.blur()
        e.preventDefault()
      }
      return
    }

    const count = items.length
    if (count === 0 && e.key !== '/' && e.key !== 'n') return

    const cols = colsRef.current

    switch (e.key) {
      case '/': {
        e.preventDefault()
        onFocusSearch()
        break
      }
      case 'n': {
        e.preventDefault()
        onCreateNew()
        break
      }
      case 'ArrowDown': {
        e.preventDefault()
        if (focusedIndex === null) {
          setFocusedIndex(0)
        } else {
          setFocusedIndex((prev) => {
            const next = (prev ?? 0) + cols
            return next >= count ? (prev ?? 0) % cols : next
          })
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (focusedIndex === null) {
          setFocusedIndex(count - 1)
        } else {
          setFocusedIndex((prev) => {
            const next = (prev ?? 0) - cols
            return next < 0 ? count - 1 - ((count - 1 - ((prev ?? 0) % cols)) % cols) : next
          })
        }
        break
      }
      case 'ArrowRight': {
        if (cols === 1) break
        e.preventDefault()
        setFocusedIndex((prev) => (prev === null ? 0 : (prev + 1) % count))
        break
      }
      case 'ArrowLeft': {
        if (cols === 1) break
        e.preventDefault()
        setFocusedIndex((prev) => (prev === null ? count - 1 : (prev - 1 + count) % count))
        break
      }
      case 'Enter': {
        if (focusedIndex !== null && items[focusedIndex]) {
          e.preventDefault()
          router.push(`/org/${orgId}/dashboards/${items[focusedIndex].id}`)
        }
        break
      }
      case 'Escape': {
        if (focusedIndex !== null) {
          e.preventDefault()
          setFocusedIndex(null)
        }
        break
      }
      case 'p': {
        if (focusedIndex !== null && items[focusedIndex]) {
          e.preventDefault()
          togglePin.mutate(items[focusedIndex].id)
        }
        break
      }
      case 'Delete':
      case 'Backspace': {
        if (focusedIndex !== null && items[focusedIndex]) {
          e.preventDefault()
          const dashboard = items[focusedIndex]
          confirm({
            title: 'Delete dashboard',
            description: `Are you sure you want to delete "${dashboard.name}"? This action cannot be undone.`,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
          }).then((ok) => {
            setTimeout(() => document.body.style.removeProperty('pointer-events'), 0)
            if (ok) deleteDashboard.mutate(dashboard.id)
          })
        }
        break
      }
    }
  }, [items, focusedIndex, onFocusSearch, onCreateNew, router, orgId, deleteDashboard, togglePin, confirm])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Clear focus on click anywhere
  useEffect(() => {
    const handleClick = () => setFocusedIndex(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  return { focusedIndex }
}
