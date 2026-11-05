'use client'

import { useState } from 'react'
import { HeatmapDemoV2 } from './heatmap-demo-v2'
import { HeatmapPage } from './heatmap-page'

const INTRO_SEEN_KEY = 'li2_heatmap_intro_seen'

export function HeatmapContainer({ blocked = false }: { blocked?: boolean }) {
  const [showIntro, setShowIntro] = useState(() => {
    if (blocked) return true
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(INTRO_SEEN_KEY)
  })

  function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
  }

  if (showIntro) return <HeatmapDemoV2 canAccess={!blocked} onContinue={handleContinue} />
  return <HeatmapPage />
}
