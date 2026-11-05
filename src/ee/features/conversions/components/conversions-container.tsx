'use client'

import { useState } from 'react'
import { ConversionsDemoV2 } from './conversions-demo-v2'
import { ConversionsView } from './conversions-view'

const INTRO_SEEN_KEY = 'li2_conversions_intro_seen'

export function ConversionsContainer({ blocked = false }: { blocked?: boolean }) {
  const [showIntro, setShowIntro] = useState(() => {
    if (blocked) return true
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(INTRO_SEEN_KEY)
  })

  function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
  }

  if (showIntro) return <ConversionsDemoV2 canAccess={!blocked} onContinue={handleContinue} />
  return <ConversionsView />
}
