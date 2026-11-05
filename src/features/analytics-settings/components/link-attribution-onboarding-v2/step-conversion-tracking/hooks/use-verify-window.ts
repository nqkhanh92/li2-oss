'use client'

import { useState, useRef, useEffect } from 'react'

const POLL_INTERVAL_MS = 300

function buildVerifyUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(normalized)
  url.searchParams.set('li2_debug', 'true')
  return url.toString()
}

interface UseVerifyWindowOptions<T> {
  /** Return the typed payload if the message matches, null otherwise. */
  filterMessage: (data: unknown) => T | null
  /** Called once when a matching message is received and the child is closed. */
  onSuccess: (data: T) => void
  /** Called when the child closes (manually or via timeout) without a matching message. */
  onClose: () => void
  /** Auto-close the child and call onClose after this many ms. Omit to disable. */
  timeoutMs?: number
}

/**
 * Manages a popup window used for SDK/plugin verification.
 *
 * Opens a child window at a given URL and listens for a postMessage from it.
 * On success it closes the child automatically.
 * On timeout (or manual close) it calls onClose so the caller can react.
 */
export function useVerifyWindow<T>({
  filterMessage,
  onSuccess,
  onClose,
  timeoutMs,
}: UseVerifyWindowOptions<T>) {
  const [isWaiting, setIsWaiting] = useState(false)

  const childRef = useRef<Window | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const receivedRef = useRef(false)

  // Keep callbacks in refs so the interval/timeout closures are never stale.
  const onSuccessRef = useRef(onSuccess)
  const onCloseRef = useRef(onClose)
  const filterRef = useRef(filterMessage)
  onSuccessRef.current = onSuccess
  onCloseRef.current = onClose
  filterRef.current = filterMessage

  const cleanup = () => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current)
      listenerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Cleanup on unmount.
  useEffect(() => cleanup, [])

  const handleClose = () => {
    cleanup()
    childRef.current?.close()
    childRef.current = null
    setIsWaiting(false)
    onCloseRef.current()
  }

  const open = (url: string) => {
    setIsWaiting(true)
    cleanup()
    receivedRef.current = false

    const child = window.open(buildVerifyUrl(url), '_blank', 'width=960,height=700,resizable=yes')
    if (!child) {
      setIsWaiting(false)
      return
    }
    childRef.current = child

    const handler = (e: MessageEvent) => {
      const data = filterRef.current(e.data)
      if (data === null) return
      receivedRef.current = true
      cleanup()
      childRef.current?.close()
      childRef.current = null
      setIsWaiting(false)
      onSuccessRef.current(data)
    }
    listenerRef.current = handler
    window.addEventListener('message', handler)

    // Detect manual close by the user.
    intervalRef.current = setInterval(() => {
      if (childRef.current?.closed && !receivedRef.current) handleClose()
    }, POLL_INTERVAL_MS)

    if (timeoutMs) {
      timeoutRef.current = setTimeout(() => {
        if (!receivedRef.current) handleClose()
      }, timeoutMs)
    }
  }

  return { open, isWaiting }
}
