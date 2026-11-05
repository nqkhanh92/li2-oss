'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SidebarItemKey } from './short-link-form.constants'

export type FocusableFieldName = 'content_value'

type GoToTabOptions = {
  /** Field name to focus once the destination tab is mounted. */
  focusField?: FocusableFieldName
}

interface ShortLinkFormNavigation {
  /** Switch the active sidebar tab. Optionally queue a field to focus on the new tab. */
  goToTab: (tab: SidebarItemKey, opts?: GoToTabOptions) => void
  /** Field name pending focus (consumed by the tab that owns the field). */
  pendingFocus: FocusableFieldName | null
  /** Tab consumer calls this after focusing to clear the queued request. */
  consumeFocus: () => void
}

const ShortLinkFormNavigationContext = createContext<ShortLinkFormNavigation | null>(null)

interface ProviderProps {
  children: ReactNode
  setSelectedTab: (tab: SidebarItemKey) => void
}

export const ShortLinkFormNavigationProvider = ({ children, setSelectedTab }: ProviderProps) => {
  const [pendingFocus, setPendingFocus] = useState<FocusableFieldName | null>(null)

  const goToTab = useCallback(
    (tab: SidebarItemKey, opts?: GoToTabOptions) => {
      setSelectedTab(tab)
      if (opts?.focusField) setPendingFocus(opts.focusField)
    },
    [setSelectedTab]
  )

  const consumeFocus = useCallback(() => setPendingFocus(null), [])

  const value = useMemo<ShortLinkFormNavigation>(
    () => ({ goToTab, pendingFocus, consumeFocus }),
    [goToTab, pendingFocus, consumeFocus]
  )

  return (
    <ShortLinkFormNavigationContext.Provider value={value}>
      {children}
    </ShortLinkFormNavigationContext.Provider>
  )
}

export const useShortLinkFormNavigation = (): ShortLinkFormNavigation => {
  const ctx = useContext(ShortLinkFormNavigationContext)
  if (!ctx) {
    throw new Error(
      'useShortLinkFormNavigation must be used inside <ShortLinkFormNavigationProvider>'
    )
  }
  return ctx
}
