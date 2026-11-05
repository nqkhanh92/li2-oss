'use client'

import { setUser, addLogContext, logCustomEvent } from '@/infrastructure/logging/open-observe/rum'
import type { User } from '@openobserve/browser-core'
import { isOpenObserveEnabled } from '@/infrastructure/logging/open-observe/config'

export const useOpenObserve = () => {
  const isEnabled = isOpenObserveEnabled()

  const trackUser = (user: User) => {
    if (isEnabled) {
      setUser(user)
    }
  }

  const addContext = (key: string, value: any) => {
    if (isEnabled) {
      addLogContext(key, value)
    }
  }

  const trackEvent = (eventName: string, context?: Record<string, any>) => {
    if (isEnabled) {
      logCustomEvent(eventName, context)
    }
  }

  return {
    isEnabled,
    trackUser,
    addContext,
    trackEvent
  }
}