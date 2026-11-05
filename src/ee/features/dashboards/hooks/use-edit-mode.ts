'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import type { LayoutItem, Layout } from 'react-grid-layout'
import { GRID_ITEM_CONSTRAINTS } from '../types'
import type { DashboardWidget, GridPosition } from '../types'

interface EditLockAcquireResult {
  acquired: boolean
  holder?: { email: string } | null
}

interface EditLockHeartbeatResult {
  renewed: boolean
  holder?: { email: string } | null
}

const HEARTBEAT_INTERVAL = 30_000 // 30 seconds
const DEBOUNCE_DELAY = 500 // ms

/** Convert LayoutItem[] to the API payload shape */
function layoutToPositions(layout: LayoutItem[]) {
  return {
    positions: layout.map((item) => ({
      widget_id: item.i,
      position: { x: item.x, y: item.y, w: item.w, h: item.h },
    })),
  }
}

/** Add per-item resize constraints to a LayoutItem */
function withConstraints(item: LayoutItem): LayoutItem {
  return { ...item, ...GRID_ITEM_CONSTRAINTS }
}

export function useEditMode(
  orgId: string,
  dashboardId: string,
  widgets: DashboardWidget[],
) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localLayout, setLocalLayout] = useState<LayoutItem[]>([])
  const [lockConflict, setLockConflict] = useState<{ email: string } | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingLayoutRef = useRef<LayoutItem[] | null>(null)
  const isEditingRef = useRef(false) // for beforeunload sync access

  // Single setter to keep state and ref in sync
  const setEditing = useCallback((value: boolean) => {
    setIsEditing(value)
    isEditingRef.current = value
  }, [])

  const queryClient = useQueryClient()

  // ── Lock API helpers ──

  const lockAction = useCallback(async (action: string) => {
    const { data } = await axiosApiInstance.post(
      `/organizations/${orgId}/dashboards/${dashboardId}/edit-lock`,
      { action }
    )
    return data.data
  }, [orgId, dashboardId])

  // ── Save layout (direct axios — bypasses useUpdateLayout to avoid query invalidation) ──
  // TanStack Query v5: mutate-level onSuccess runs IN ADDITION to hook-level onSuccess,
  // not instead of. So we can't use useUpdateLayout here — its onSuccess would invalidate
  // the dashboard query and reset unsaved local layout state.

  const saveLayout = useCallback(async (layout: LayoutItem[]) => {
    await axiosApiInstance.put(
      `/organizations/${orgId}/dashboards/${dashboardId}/layout`,
      layoutToPositions(layout)
    )
  }, [orgId, dashboardId])

  // ── Flush pending save ──

  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const pending = pendingLayoutRef.current
    if (pending) {
      pendingLayoutRef.current = null
      // Fire-and-forget — exitEditMode will re-sync from server after
      saveLayout(pending).catch(() => {})
    }
  }, [saveLayout])

  // ── Debounced save ──

  const scheduleSave = useCallback((layout: LayoutItem[]) => {
    pendingLayoutRef.current = layout
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const toSave = pendingLayoutRef.current
      if (toSave) {
        pendingLayoutRef.current = null
        saveLayout(toSave).catch(() => {})
      }
    }, DEBOUNCE_DELAY)
  }, [saveLayout])

  // ── Enter edit mode ──

  const enterEditMode = useCallback(async () => {
    try {
      const result: EditLockAcquireResult = await lockAction('acquire')
      if (!result.acquired) {
        setLockConflict(result.holder ?? null)
        return false
      }
      // Initialize local layout from current widgets (with constraints)
      const initial: LayoutItem[] = widgets.map((w) => {
        const pos = w.position as unknown as GridPosition
        return withConstraints({ i: w.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h })
      })
      setLocalLayout(initial)
      setEditing(true)
      setLockConflict(null)
      setSessionExpired(false)
      return true
    } catch {
      return false
    }
  }, [lockAction, widgets, setEditing])

  // ── Exit edit mode ──

  const exitEditMode = useCallback(async () => {
    setIsSaving(true)
    flushSave()
    try {
      await lockAction('release')
    } catch {
      // Best effort — TTL will clean up
    }
    // Re-sync from server BEFORE switching off edit mode
    // This prevents the snap-back: serverLayout updates with new positions
    // before we switch from localLayout → serverLayout
    await queryClient.invalidateQueries({
      queryKey: ['organizations', orgId, 'dashboards', dashboardId],
    })
    setEditing(false)
    setIsSaving(false)
  }, [flushSave, lockAction, queryClient, orgId, dashboardId, setEditing])

  // ── Layout change handlers (called by ReactGridLayout) ──
  // EventCallback signature (react-grid-layout v2):
  //   (layout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null,
  //    placeholder: LayoutItem | null, event: Event, element: HTMLElement | null) => void

  const handleDragStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null,
      newItem: LayoutItem | null,
      _placeholder: LayoutItem | null,
      _event: Event,
      _element: HTMLElement | null,
    ) => {
      if (!newItem) return
      setLocalLayout((prev) => {
        const next = prev.map((item) =>
          item.i === newItem.i ? { ...item, x: newItem.x, y: newItem.y } : item
        )
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  const handleResizeStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null,
      newItem: LayoutItem | null,
      _placeholder: LayoutItem | null,
      _event: Event,
      _element: HTMLElement | null,
    ) => {
      if (!newItem) return
      setLocalLayout((prev) => {
        const next = prev.map((item) =>
          item.i === newItem.i
            ? { ...item, x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h }
            : item
        )
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  // ── Heartbeat ──

  useEffect(() => {
    if (!isEditing) return
    const id = setInterval(async () => {
      try {
        const result: EditLockHeartbeatResult = await lockAction('heartbeat')
        if (!result.renewed) {
          setSessionExpired(true)
          setEditing(false)
          clearInterval(id)
        }
      } catch {
        // Network error — don't immediately exit, TTL provides grace period
      }
    }, HEARTBEAT_INTERVAL)
    return () => clearInterval(id)
  }, [isEditing, lockAction, setEditing])

  // ── Cleanup on unmount / navigation ──

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEditingRef.current) {
        // Best-effort lock release via sendBeacon
        const url = `/api/organizations/${orgId}/dashboards/${dashboardId}/edit-lock`
        navigator.sendBeacon(url, JSON.stringify({ action: 'release' }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Component unmount cleanup
      if (isEditingRef.current) {
        flushSave()
        // Fire-and-forget lock release
        lockAction('release').catch(() => {})
        isEditingRef.current = false
      }
    }
  }, [orgId, dashboardId, flushSave, lockAction])

  return {
    isEditing,
    isSaving,
    localLayout,
    lockConflict,
    sessionExpired,
    enterEditMode,
    exitEditMode,
    handleDragStop,
    handleResizeStop,
    dismissLockConflict: () => setLockConflict(null),
    dismissSessionExpired: () => setSessionExpired(false),
  }
}
