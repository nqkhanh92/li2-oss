'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useAddHostname } from '../../../hooks/mutations'

const VERIFY_TIMEOUT_MS = 10_000

interface Props {
  org_id: string
  publishableKey: string
  allowedHostnames: string[]
  siteUrl: string                    // controlled by parent — already entered in the URL field
  onVerifyComplete?: () => void
  onMissingSiteUrl?: () => void      // called when user clicks Verify with no URL
}

type Status = 'idle' | 'waiting' | 'success' | 'timeout' | 'wrong_key' | 'empty_key' | 'invalid_url' | 'missing_url'

export const VerifyButton = ({
  org_id,
  publishableKey,
  allowedHostnames,
  siteUrl,
  onVerifyComplete,
  onMissingSiteUrl,
}: Props) => {
  const { t } = useTranslation('analytics_settings')
  const addHostname = useAddHostname(org_id, true)
  const [status, setStatus] = useState<Status>('idle')
  const [detectedKey, setDetectedKey] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const childWindowRef = useRef<Window | null>(null)
  const sdkReadyRef = useRef(false)

  const isWaiting = status === 'waiting'

  // Reset non-waiting status when siteUrl changes
  useEffect(() => {
    if (status !== 'waiting') setStatus('idle')
  }, [siteUrl])

  const cleanup = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (listenerRef.current) { window.removeEventListener('message', listenerRef.current); listenerRef.current = null }
  }

  useEffect(() => cleanup, [])

  const handleNotInstalled = () => {
    cleanup()
    childWindowRef.current?.close()
    childWindowRef.current = null
    setStatus((s) => (s === 'waiting' ? 'timeout' : s))
  }

  const startListening = () => {
    cleanup()
    sdkReadyRef.current = false

    const handler = (e: MessageEvent) => {
      if (!e.data?.sdkInstalled) return
      sdkReadyRef.current = true
      cleanup()
      childWindowRef.current?.close()
      childWindowRef.current = null

      const received = e.data.publishableKey as string | undefined
      if (!received) {
        setStatus('empty_key')
      } else if (received !== publishableKey) {
        setDetectedKey(received)
        setStatus('wrong_key')
      } else {
        setStatus('success')
        onVerifyComplete?.()
      }
    }

    listenerRef.current = handler
    window.addEventListener('message', handler)

    intervalRef.current = setInterval(() => {
      if (childWindowRef.current?.closed && !sdkReadyRef.current) {
        handleNotInstalled()
      }
    }, 300)

    timeoutRef.current = setTimeout(() => {
      if (!sdkReadyRef.current) handleNotInstalled()
    }, VERIFY_TIMEOUT_MS)
  }

  const handleVerify = async () => {
    if (isWaiting) return

    const trimmed = siteUrl.trim()
    if (!trimmed) {
      setStatus('missing_url')
      onMissingSiteUrl?.()
      return
    }

    let url: URL
    try {
      url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    } catch {
      setStatus('invalid_url')
      return
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      setStatus('invalid_url')
      return
    }

    const hostname = url.hostname
    if (hostname && allowedHostnames.length > 0 && !allowedHostnames.includes(hostname)) {
      try { await addHostname.mutateAsync(hostname) } catch {}
    }

    url.searchParams.set('li2_debug', 'true')
    childWindowRef.current = window.open(url.toString(), '_blank', 'width=480,height=640,resizable=yes')
    setStatus('waiting')
    startListening()
  }

  return (
    <div className="flex flex-col gap-2">
      <LoadingButton
        variant="outline"
        onClick={handleVerify}
        disabled={isWaiting}
        isLoading={isWaiting || addHostname.isPending}
        className="w-fit gap-2"
      >
        {t('onboarding.verify.btn')}
      </LoadingButton>

      {status === 'missing_url' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.missing_url')}
        </p>
      )}
      {status === 'waiting' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {t('onboarding.verify.waiting')}
        </p>
      )}
      {status === 'success' && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.success')}
        </p>
      )}
      {status === 'timeout' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.timeout')}
        </p>
      )}
      {status === 'invalid_url' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.invalid_url')}
        </p>
      )}
      {status === 'wrong_key' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.wrong_key', { key: detectedKey.slice(0, 20) })}
        </p>
      )}
      {status === 'empty_key' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.empty_key')}
        </p>
      )}
      {!siteUrl.trim() && status === 'idle' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('onboarding.verify.hint')}
        </p>
      )}
    </div>
  )
}
