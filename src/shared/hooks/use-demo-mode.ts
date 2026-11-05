'use client'
import { useState, useTransition } from 'react'
import { exitDemoMode } from '@/app/actions/demo'

function getDemoSessionIdFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('demo_session_id='))
    ?.split('=')[1]
}

export function useDemoMode() {
  const [isDemoMode] = useState(() => !!getDemoSessionIdFromCookie())
  const [isPendingExit, startExitTransition] = useTransition()

  const enterDemo = () => {
    // Clear persisted org state so the demo account starts with a clean slate.
    // Full-page navigation ensures React Query doesn't fire stale requests after
    // the cookie swap that would cause 403s.
    localStorage.removeItem('organization-storage')
    window.location.href = '/api/public/demo'
  }

  const exitDemo = () => {
    startExitTransition(async () => {
      await exitDemoMode()
    })
  }

  return { isDemoMode, enterDemo, exitDemo, isPendingExit }
}
