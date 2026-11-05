'use client'

import { useState } from 'react'
import { FunnelDemoV2 } from './funnel-demo-v2'
import { FunnelsList } from './funnels-list'

const INTRO_SEEN_KEY = 'li2_funnel_intro_seen'

export function FunnelContainer({ blocked = false }: { blocked?: boolean }) {
  const [showIntro, setShowIntro] = useState(() => {
    if (blocked) return true
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(INTRO_SEEN_KEY)
  })

  function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
  }

  if (showIntro) return <FunnelDemoV2 canAccess={!blocked} onContinue={handleContinue} />
  return <FunnelsList />
}
