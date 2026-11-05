'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useConversionTracking } from '../components/link-attribution-onboarding-v2/step-conversion-tracking/context'
import { useSaveCustomScripts } from './mutations'
import { useGetAnalyticsSettings } from './queries'
import { axiosApiInstance } from '@/shared/lib/axios'
import { composeConversionScript } from '../utils/compose-conversion-script'
import type { ConversionScriptSuggestion } from '@/infrastructure/external/claude/claude.types'
import type { CustomScript } from '@/core/types/analytics-settings.type'

export type AiSetupPhase =
  | 'idle'
  | 'scanning-site'         // server-side: finding the signup page URL
  | 'awaiting-path-input'   // couldn't auto-detect; user must type the path
  | 'conflicting-scripts'   // existing scripts on same site found; user decides
  | 'opening-tab'           // tab open, navigating to signup page
  | 'awaiting-page'         // waiting for SDK postMessage
  | 'detecting-form'        // analyzing HTML with Li2 AI
  | 'confirming'            // result ready — user reviews before saving
  | 'saving'                // persisting custom script
  | 'done'
  | 'error'

export interface AiSetupState {
  phase: AiSetupPhase
  errorMessage: string | null
  savedScriptName: string | null
  detectedSuggestion: ConversionScriptSuggestion | null
  conflictingScripts: CustomScript[]
}

interface AiSetupReadyMessage {
  type: 'li2:ai-setup-ready'
  html: string
  url: string
  scanToken: string
}

function pickBestSuggestion(suggestions: ConversionScriptSuggestion[]): ConversionScriptSuggestion | null {
  return (
    suggestions.find(s => s.event_type === 'lead' && s.trigger.type === 'form_submit') ??
    suggestions.find(s => s.event_type === 'lead') ??
    suggestions[0] ??
    null
  )
}

export function useAiSetup(org_id: string) {
  const { normalizedSiteUrl } = useConversionTracking()
  const { mutateAsync: saveCustomScripts } = useSaveCustomScripts(org_id)
  const { data: settings } = useGetAnalyticsSettings(org_id)

  const [phase, setPhase] = useState<AiSetupPhase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedScriptName, setSavedScriptName] = useState<string | null>(null)
  const [detectedSuggestion, setDetectedSuggestion] = useState<ConversionScriptSuggestion | null>(null)
  const [conflictingScripts, setConflictingScripts] = useState<CustomScript[]>([])

  const openedTabRef = useRef<Window | null>(null)
  const scanTokenRef = useRef<string>('')
  const customerOriginRef = useRef<string>('')
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const tabPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const globalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTargetUrlRef = useRef<string>('')

  const cleanup = useCallback(() => {
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current)
      messageHandlerRef.current = null
    }
    if (tabPollRef.current) {
      clearInterval(tabPollRef.current)
      tabPollRef.current = null
    }
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current)
      globalTimeoutRef.current = null
    }
  }, [])

  const toError = useCallback((msg: string) => {
    cleanup()
    setPhase('error')
    setErrorMessage(msg)
  }, [cleanup])

  /** Signal the opened tab then close it after a short delay so the overlay can show done state. */
  const signalAndCloseTab = useCallback((signal: 'complete' | 'error') => {
    try {
      openedTabRef.current?.postMessage(
        { type: signal === 'complete' ? 'li2:ai-setup-complete' : 'li2:ai-setup-error' },
        customerOriginRef.current
      )
    } catch { /* ignore */ }
    setTimeout(() => {
      if (openedTabRef.current && !openedTabRef.current.closed) {
        try { openedTabRef.current.close() } catch { /* ignore */ }
      }
      openedTabRef.current = null
    }, 2_500)
  }, [])

  const runAnalysis = useCallback(async (html: string, pageUrl: string) => {
    try {
      const { data } = await axiosApiInstance.post<{
        data: { suggestions: ConversionScriptSuggestion[]; credits_remaining: number }
      }>(`/organizations/${org_id}/smart-setup/analyze-page-html`, {
        html,
        url: pageUrl,
        locale: 'en',
      })

      const suggestions = data.data?.suggestions ?? []
      const best = pickBestSuggestion(suggestions)

      if (!best) {
        signalAndCloseTab('error')
        toError('No registration form detected on this page. Navigate to your actual signup page and try again, or use the manual guide below.')
        return
      }

      // Analysis complete — signal tab to close, let user confirm before saving
      signalAndCloseTab('complete')
      setDetectedSuggestion(best)
      setPhase('confirming')
    } catch (err: unknown) {
      signalAndCloseTab('error')
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toError(msg ?? 'Something went wrong. Please try again.')
    }
  }, [org_id, signalAndCloseTab, toError])

  const confirmSave = useCallback(async () => {
    if (!detectedSuggestion) return
    setPhase('saving')
    try {
      const script = composeConversionScript(
        { event_type: detectedSuggestion.event_type, event_name: detectedSuggestion.event_name, trigger: detectedSuggestion.trigger },
        detectedSuggestion.suggested_params
      )
      const existingScripts = settings?.custom_scripts ?? []
      await saveCustomScripts([
        ...existingScripts,
        {
          id: crypto.randomUUID(),
          name: detectedSuggestion.name,
          description: detectedSuggestion.description ?? '',
          script,
          site_url: normalizedSiteUrl,
        },
      ])
      setSavedScriptName(detectedSuggestion.name)
      setPhase('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toError(msg ?? 'Failed to save script. Please try again.')
    }
  }, [detectedSuggestion, settings?.custom_scripts, saveCustomScripts, normalizedSiteUrl, toError])

  /**
   * Navigate an already-open tab to the target URL with AI scan params,
   * then wire up the postMessage listener and timers.
   */
  const setupTabListeners = useCallback((tab: Window, targetUrl: string) => {
    const scanToken = crypto.randomUUID()
    scanTokenRef.current = scanToken

    let customerOrigin: string
    try {
      customerOrigin = new URL(targetUrl).origin
    } catch {
      tab.close()
      toError('Invalid URL. Please check and try again.')
      return
    }
    customerOriginRef.current = customerOrigin

    const sep = targetUrl.includes('?') ? '&' : '?'
    const tabUrl = `${targetUrl}${sep}li2_ai_setup=1&li2_scan_token=${encodeURIComponent(scanToken)}&li2_app_origin=${encodeURIComponent(window.location.origin)}`

    console.log('[Li2 AI Setup] targetUrl:', targetUrl)
    console.log('[Li2 AI Setup] tabUrl:', tabUrl)
    // Navigate the blank tab to the correct URL with params
    tab.location.href = tabUrl
    console.log('[Li2 AI Setup] tab.location.href set')

    const handler = (event: MessageEvent) => {
      if (event.origin !== customerOriginRef.current) return
      if (event.source !== openedTabRef.current) return
      const msg = event.data as AiSetupReadyMessage
      if (msg?.type !== 'li2:ai-setup-ready') return
      if (msg.scanToken !== scanTokenRef.current) return

      try {
        openedTabRef.current?.postMessage({ type: 'li2:ai-setup-ack' }, customerOriginRef.current)
      } catch { /* ignore */ }

      // Clear listeners/intervals but keep openedTabRef so we can signal tab later
      cleanup()
      setPhase('detecting-form')
      runAnalysis(msg.html, msg.url)
    }
    messageHandlerRef.current = handler
    window.addEventListener('message', handler)

    setPhase('opening-tab')
    setTimeout(() => setPhase(p => p === 'opening-tab' ? 'awaiting-page' : p), 1_500)

    tabPollRef.current = setInterval(() => {
      if (openedTabRef.current?.closed) {
        toError('The tab was closed before we could scan the page. Please try again.')
      }
    }, 2_000)

    globalTimeoutRef.current = setTimeout(() => {
      toError('Timed out waiting for your page to respond. Make sure the Li2 analytics script is installed on your site.')
    }, 60_000)
  }, [cleanup, toError, runAnalysis])

  /**
   * Step 1: scan the site first (no tab yet), then open the tab only after we
   * have the confirmed signup-page URL. The scan is fast enough that the browser
   * still honours window.open as part of the original click gesture.
   */
  const start = useCallback(async () => {
    if (!normalizedSiteUrl) {
      toError('Please enter your site URL in the previous step first.')
      return
    }

    setPhase('scanning-site')
    setErrorMessage(null)

    try {
      const { data } = await axiosApiInstance.post<{
        data: { found: true; url: string } | { found: false }
      }>(`/organizations/${org_id}/smart-setup/scan-for-signup-page`, {
        site_url: normalizedSiteUrl,
      })

      const result = data.data
      if (result.found) {
        const existing = settings?.custom_scripts ?? []
        const conflicts = existing.filter(s => s.site_url === normalizedSiteUrl)
        if (conflicts.length > 0) {
          pendingTargetUrlRef.current = result.url
          setConflictingScripts(conflicts)
          setPhase('conflicting-scripts')
        } else {
          const tab = window.open('', '_blank')
          if (!tab) {
            toError('Popup blocked. Please allow popups for this site and try again.')
            return
          }
          openedTabRef.current = tab
          setupTabListeners(tab, result.url)
        }
      } else {
        setPhase('awaiting-path-input')
      }
    } catch {
      setPhase('awaiting-path-input')
    }
  }, [normalizedSiteUrl, org_id, settings?.custom_scripts, setupTabListeners, toError])

  // Step 2 (manual fallback): user provides a path or full URL — also synchronous
  const submitManualPath = useCallback((input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    let targetUrl: string
    try {
      const parsed = new URL(trimmed)
      targetUrl = normalizedSiteUrl.replace(/\/$/, '') + parsed.pathname + parsed.search + parsed.hash
    } catch {
      targetUrl = normalizedSiteUrl.replace(/\/$/, '') + (trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
    }

    const tab = window.open('', '_blank')
    if (!tab) {
      toError('Popup blocked. Please allow popups for this site and try again.')
      return
    }
    openedTabRef.current = tab
    setupTabListeners(tab, targetUrl)
  }, [normalizedSiteUrl, setupTabListeners, toError])

  /** Called from the conflict-resolution UI. Opens the blank tab first (user gesture), then deletes, then scans. */
  const proceedWithConflicts = useCallback(async (idsToDelete: string[]) => {
    const targetUrl = pendingTargetUrlRef.current
    if (!targetUrl) return

    // Open blank tab immediately — must stay within the user-gesture frame
    const tab = window.open('', '_blank')
    if (!tab) {
      toError('Popup blocked. Please allow popups for this site and try again.')
      return
    }
    openedTabRef.current = tab
    setConflictingScripts([])

    if (idsToDelete.length > 0) {
      try {
        const existing = settings?.custom_scripts ?? []
        await saveCustomScripts(existing.filter(s => !idsToDelete.includes(s.id)))
      } catch { /* non-fatal — proceed anyway */ }
    }

    setupTabListeners(tab, targetUrl)
  }, [settings?.custom_scripts, saveCustomScripts, setupTabListeners, toError])

  const reset = useCallback(() => {
    cleanup()
    if (openedTabRef.current && !openedTabRef.current.closed) {
      try { openedTabRef.current.close() } catch { /* ignore */ }
    }
    openedTabRef.current = null
    pendingTargetUrlRef.current = ''
    setPhase('idle')
    setErrorMessage(null)
    setSavedScriptName(null)
    setDetectedSuggestion(null)
    setConflictingScripts([])
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return {
    state: { phase, errorMessage, savedScriptName, detectedSuggestion, conflictingScripts } satisfies AiSetupState,
    start,
    submitManualPath,
    confirmSave,
    proceedWithConflicts,
    reset,
  }
}
