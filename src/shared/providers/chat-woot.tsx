'use client'
import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/use-mobile'
import { useLocaleStore } from '../stores/locale.store'
import { disabledFeatures } from '../constants/disabled-features'

export const ChatWoot = () => {
  const [isDragging, setIsDragging] = useState(false)

  const locale = useLocaleStore((state) => state.locale)
  const [isChatwootReady, setIsChatwootReady] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (disabledFeatures.SUPPORT_CHAT) return
    if (process.env.NODE_ENV == 'development') return
    if (isMobile === undefined || isMobile) return

    const BASE_URL = 'https://chatwoot.li2.ai'
    const script = document.createElement('script')
    script.src = `${BASE_URL}/packs/js/sdk.js`
    script.async = true
    script.onload = () => {
      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken: 'Wc3rv3cDBjEenHWoDz6W2d8t',
          baseUrl: BASE_URL,
        })

        // Wait for the bubble to be rendered and Chatwoot to be ready
        setTimeout(() => {
          makeBubbleDraggable()
          setIsChatwootReady(true)
        }, 2000)
      }
    }
    document.head.appendChild(script)

    return () => {
      document?.head?.removeChild(script)
    }
  }, [isMobile])

  // Update locale when it changes after Chatwoot is initialized
  useEffect(() => {
    if (isChatwootReady && locale && window.$chatwoot) {
      window.$chatwoot.setLocale(locale)
    }
  }, [locale, isChatwootReady])

  const makeBubbleDraggable = () => {
    const bubble = document.querySelector('.woot-widget-bubble') as HTMLElement
    if (!bubble) {
      console.warn('Chatwoot bubble not found')
      return
    }

    let isDragging = false
    let hasMoved = false
    // Bubble position, tracked as left/top so it can move freely on both axes (bottom/right
    // from Chatwoot's own CSS are cleared once we take over positioning).
    let startLeft = 0
    let startTop = 0
    let startClientX = 0
    let startClientY = 0

    const dragStart = (e: MouseEvent | TouchEvent) => {
      if (!(e.target === bubble || bubble.contains(e.target as Node))) return

      const point = e.type === 'touchstart' ? (e as TouchEvent).touches[0] : (e as MouseEvent)
      const rect = bubble.getBoundingClientRect()

      startLeft = rect.left
      startTop = rect.top
      startClientX = point.clientX
      startClientY = point.clientY

      isDragging = true
      hasMoved = false
      bubble.style.cursor = 'move'
      bubble.style.transition = 'none'
    }

    const dragEnd = () => {
      if (isDragging) {
        isDragging = false
        bubble.style.cursor = 'move'
        bubble.style.transition = 'transform 0.2s, box-shadow 0.2s'
      }
    }

    const drag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const point = e.type === 'touchmove' ? (e as TouchEvent).touches[0] : (e as MouseEvent)
      const deltaX = point.clientX - startClientX
      const deltaY = point.clientY - startClientY

      // Check if moved more than 5px (either axis) to prevent accidental drags
      if (Math.hypot(deltaX, deltaY) > 5) {
        hasMoved = true
      }

      const rect = bubble.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      const nextLeft = Math.max(0, Math.min(startLeft + deltaX, maxX))
      const nextTop = Math.max(0, Math.min(startTop + deltaY, maxY))

      // Apply position on both axes
      bubble.style.right = 'auto'
      bubble.style.bottom = 'auto'
      bubble.style.left = nextLeft + 'px'
      bubble.style.top = nextTop + 'px'
    }

    const preventClick = (e: Event) => {
      if (hasMoved) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        hasMoved = false
      }
    }

    // Set initial cursor
    bubble.style.cursor = 'move'

    // Mouse events
    bubble.addEventListener('mousedown', dragStart as EventListener)
    document.addEventListener('mouseup', dragEnd)
    document.addEventListener('mousemove', drag as EventListener)

    // Touch events for mobile
    bubble.addEventListener('touchstart', dragStart as EventListener, { passive: false })
    document.addEventListener('touchend', dragEnd)
    document.addEventListener('touchmove', drag as EventListener, { passive: false })

    // Prevent click event when dragging
    bubble.addEventListener('click', preventClick, true)

    // Cleanup function
    return () => {
      bubble.removeEventListener('mousedown', dragStart as EventListener)
      document.removeEventListener('mouseup', dragEnd)
      document.removeEventListener('mousemove', drag as EventListener)
      bubble.removeEventListener('touchstart', dragStart as EventListener)
      document.removeEventListener('touchend', dragEnd)
      document.removeEventListener('touchmove', drag as EventListener)
      bubble.removeEventListener('click', preventClick, true)
    }
  }

  const applyMobileStyles = () => {
    const bubble = document.querySelector('.woot-widget-bubble') as HTMLElement
    if (bubble) {
      // Use CSS transform scale to proportionally scale down the bubble and all its children
      bubble.style.transform = 'scale(0.67)' // 40/60 = 0.67 (assuming original size is ~60px)
      bubble.style.transformOrigin = 'bottom right'
    }
  }

  useEffect(() => {
    if (disabledFeatures.SUPPORT_CHAT) return
    const timeOut = setTimeout(() => {
      if (isMobile) {
        applyMobileStyles()
      }
    }, 1000)
    return () => clearTimeout(timeOut)
  }, [isMobile])

  return null
}

// TypeScript declaration for window.chatwootSDK
declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot?: {
      toggle: (state: 'open' | 'close') => void
      setUser: (id: string, user: { email: string; name: string }) => void
      setLocale: (locale: string) => void
    }
  }
}
