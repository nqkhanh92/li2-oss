'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'

export type WpStatus = 'idle' | 'checking' | 'accessible' | 'unreachable'

interface SiteUrlContextValue {
  siteUrl: string
  setSiteUrl: (url: string) => void
  wpOrigin: string
  wpStatus: WpStatus
}

const SiteUrlContext = createContext<SiteUrlContextValue | null>(null)

function parseOrigin(input: string): string | null {
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.origin
  } catch {
    return null
  }
}

async function checkWpJson(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/wp-json/`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data?.namespaces)
  } catch {
    return false
  }
}

export const SiteUrlProvider = ({ children, initialSiteUrl = '' }: { children: React.ReactNode; initialSiteUrl?: string }) => {
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl)
  const [wpOrigin, setWpOrigin] = useState('')
  const [wpStatus, setWpStatus] = useState<WpStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = siteUrl.trim()
    if (!trimmed) {
      setWpStatus('idle')
      setWpOrigin('')
      return
    }

    const origin = parseOrigin(trimmed)
    if (!origin) {
      setWpStatus('idle')
      setWpOrigin('')
      return
    }

    setWpStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const ok = await checkWpJson(origin)
      setWpStatus(ok ? 'accessible' : 'unreachable')
      setWpOrigin(ok ? origin : '')
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [siteUrl])

  return (
    <SiteUrlContext.Provider value={{ siteUrl, setSiteUrl, wpOrigin, wpStatus }}>
      {children}
    </SiteUrlContext.Provider>
  )
}

export const useSiteUrl = (): SiteUrlContextValue => {
  const ctx = useContext(SiteUrlContext)
  if (!ctx) throw new Error('useSiteUrl must be used within SiteUrlProvider')
  return ctx
}
