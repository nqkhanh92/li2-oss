'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useDetectFramework, type DetectedFramework } from './hooks/use-detect-framework'

export type ConversionEnvironment = 'wordpress' | 'api' | 'manual'

const normalizeUrl = (url: string): string => {
  if (!url) return ''
  const trimmed = url.trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

interface ConversionTrackingContextValue {
  siteUrl: string
  setSiteUrl: (url: string) => void
  normalizedSiteUrl: string
  selectedEnv: ConversionEnvironment | null
  setSelectedEnv: (env: ConversionEnvironment) => void
  framework: DetectedFramework
  isDetecting: boolean
}

const ConversionTrackingContext = createContext<ConversionTrackingContextValue | null>(null)

export function ConversionTrackingProvider({ children }: { children: ReactNode }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [selectedEnv, setSelectedEnv] = useState<ConversionEnvironment | null>(null)
  const { framework, isDetecting } = useDetectFramework(siteUrl)
  const normalizedSiteUrl = normalizeUrl(siteUrl)

  return (
    <ConversionTrackingContext.Provider
      value={{ siteUrl, setSiteUrl, normalizedSiteUrl, selectedEnv, setSelectedEnv, framework, isDetecting }}
    >
      {children}
    </ConversionTrackingContext.Provider>
  )
}

export function useConversionTracking() {
  const ctx = useContext(ConversionTrackingContext)
  if (!ctx) throw new Error('useConversionTracking must be used inside ConversionTrackingProvider')
  return ctx
}
