'use client'

import { useEffect, useRef, useState } from 'react'

export type DetectedFramework = 'wordpress' | 'unknown' | null

interface State {
  framework: DetectedFramework
  isDetecting: boolean
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
}

async function detectWordPress(url: string): Promise<DetectedFramework> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const normalized = normalizeUrl(url)
    const endpoint = `${normalized.replace(/\/$/, '')}/wp-json/`
    const res = await fetch(endpoint, { signal: controller.signal })
    if (!res.ok) return 'unknown'
    const json = await res.json()
    if (Array.isArray(json?.namespaces)) return 'wordpress'
    return 'unknown'
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timeout)
  }
}

export function useDetectFramework(url: string): State {
  const [state, setState] = useState<State>({ framework: null, isDetecting: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = url.trim()
    if (!trimmed) {
      setState({ framework: null, isDetecting: false })
      return
    }

    setState((prev) => ({ ...prev, isDetecting: true }))

    timerRef.current = setTimeout(async () => {
      const framework = await detectWordPress(trimmed)
      setState({ framework, isDetecting: false })
    }, 600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url])

  return state
}
