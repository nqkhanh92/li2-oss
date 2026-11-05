'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouter } from 'next/navigation'
import { axiosApiInstance } from '@/shared/lib/axios'
import { Button } from '@/shared/components/ui/button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { ExternalLink, Loader2, AlertCircle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

type Step = 'method' | 'tag-config'
type TagStatus =
  | { kind: 'idle' }
  | { kind: 'opening' }
  | { kind: 'waiting'; secondsLeft: number }
  | { kind: 'tab_closed' }
  | { kind: 'error'; message: string }
  | { kind: 'success' }

const TIMEOUT_SECONDS = 15

interface CreateEventRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEventRuleDialog({ open, onOpenChange }: CreateEventRuleDialogProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('event-rules')
  const router = useRouter()

  const [step, setStep] = useState<Step>('method')
  const [siteUrl, setSiteUrl] = useState('')
  const [status, setStatus] = useState<TagStatus>({ kind: 'idle' })

  const tabRef = useRef<Window | null>(null)
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer when waiting
  useEffect(() => {
    if (status.kind !== 'waiting') return
    countdownRef.current = setInterval(() => {
      setStatus((prev) => {
        if (prev.kind !== 'waiting') return prev
        return { kind: 'waiting', secondsLeft: prev.secondsLeft - 1 }
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [status.kind])

  const cleanup = () => {
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current)
      messageHandlerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  const normalizeUrl = (raw: string): string => {
    if (/^https?:\/\//i.test(raw)) return raw
    if (/^localhost(:\d+)?(\/|$)/.test(raw) || /^127\.0\.0\.1/.test(raw)) return `http://${raw}`
    return `https://${raw}`
  }

  const handleMethodSelect = (method: string) => {
    if (method === 'manual') {
      onOpenChange(false)
      router.push(`/org/${org_id}/event-rules/new`)
    } else {
      setStep('tag-config')
    }
  }

  const handleOpenTag = async () => {
    if (!siteUrl || status.kind === 'opening' || status.kind === 'waiting') return

    let url: URL
    try {
      url = new URL(normalizeUrl(siteUrl))
    } catch {
      setStatus({ kind: 'error', message: t('dialog.invalidUrl') })
      return
    }

    setStatus({ kind: 'opening' })

    try {
      const { data } = await axiosApiInstance.post(`/organizations/${org_id}/toolbar-session`)
      const token = data.data.token

      url.searchParams.set('li2_tagger', 'true')
      url.searchParams.set('li2_session', token)

      const newTab = window.open(url.toString(), '_blank')
      if (!newTab) {
        setStatus({ kind: 'error', message: t('dialog.popupBlocked') })
        return
      }

      tabRef.current = newTab
      setStatus({ kind: 'waiting', secondsLeft: TIMEOUT_SECONDS })

      // Detect if user manually closes the tab
      pollRef.current = setInterval(() => {
        if (newTab.closed) {
          cleanup()
          tabRef.current = null
          setStatus({ kind: 'tab_closed' })
        }
      }, 500)

      // Listen for SDK confirmation
      const handler = (e: MessageEvent) => {
        if (e.data?.sdkInstalled) {
          cleanup()
          tabRef.current = null
          setStatus({ kind: 'success' })
          setTimeout(() => handleClose(), 800)
        }
      }
      messageHandlerRef.current = handler
      window.addEventListener('message', handler)

      // Hard timeout
      timeoutRef.current = setTimeout(() => {
        cleanup()
        if (!newTab.closed) newTab.close()
        tabRef.current = null
        setStatus({
          kind: 'error',
          message: t('dialog.sdkNotDetected'),
        })
      }, TIMEOUT_SECONDS * 1000)
    } catch {
      setStatus({ kind: 'error', message: t('dialog.sessionFailed') })
    }
  }

  const handleCancel = () => {
    cleanup()
    if (tabRef.current && !tabRef.current.closed) tabRef.current.close()
    tabRef.current = null
    setStatus({ kind: 'idle' })
  }

  const handleClose = () => {
    cleanup()
    if (tabRef.current && !tabRef.current.closed) tabRef.current.close()
    tabRef.current = null
    setStep('method')
    setStatus({ kind: 'idle' })
    setSiteUrl('')
    onOpenChange(false)
  }

  const isbusy = status.kind === 'opening' || status.kind === 'waiting'

  return (
    <CustomDialogV2
      open={open}
      onOpenChange={handleClose}
      size="sm"
      title={step === 'method' ? t('dialog.title') : t('dialog.tagTitle')}
      description={step === 'method' ? t('dialog.chooseMethod') : t('dialog.enterSiteUrl')}
    >
      <div className="flex flex-col gap-6 py-2">
        {step === 'method' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => handleMethodSelect('tag')}
              className="flex flex-col items-start gap-4 p-6 rounded-lg border border-slate-200 bg-background hover:border-primary transition-colors text-left focus:outline-none"
            >
              <div className="w-12 h-12 rounded-[6px] border border-slate-700 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/images/event-rule-visual-tagger.png"
                  alt=""
                  className="w-[82%] h-[82%] object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('dialog.visualTagger')}
                </span>
                <p className="text-xs text-slate-500 leading-4">{t('dialog.visualTaggerDesc')}</p>
              </div>
            </button>
            <button
              onClick={() => handleMethodSelect('manual')}
              className="flex flex-col items-start gap-4 p-6 rounded-lg border border-slate-200 bg-background hover:border-primary transition-colors text-left focus:outline-none"
            >
              <div className="w-12 h-12 rounded-[6px] border border-slate-700 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/images/event-rule-manual-setup.png"
                  alt=""
                  className="w-[85%] h-[85%] object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('dialog.manualSetup')}
                </span>
                <p className="text-xs text-slate-500 leading-4">{t('dialog.manualSetupDesc')}</p>
              </div>
            </button>
          </div>
        )}

        {step === 'tag-config' && (
          <div className="space-y-5">
            {/* Site URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('dialog.siteUrl')}</Label>
              <Input
                value={siteUrl}
                onChange={(e) => {
                  setSiteUrl(e.target.value)
                  if (status.kind === 'error') setStatus({ kind: 'idle' })
                }}
                placeholder={t('dialog.siteUrlPlaceholder')}
                className="font-mono text-xs"
                disabled={isbusy}
              />
            </div>

            {/* Status banners */}
            {status.kind === 'waiting' && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium text-foreground">{t('dialog.waitingForSdk')}</p>
                  <p>{t('dialog.waitingDesc', { seconds: status.secondsLeft })}</p>
                </div>
              </div>
            )}

            {status.kind === 'tab_closed' && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium">{t('dialog.tabClosed')}</p>
                  <p>{t('dialog.tabClosedDesc')}</p>
                </div>
              </div>
            )}

            {status.kind === 'error' && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{status.message}</span>
              </div>
            )}

            {status.kind === 'success' && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-success/10 text-success text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{t('dialog.sdkDetected')}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button
                variant="secondary"
                iconLeft={<ArrowLeft />}
                onClick={
                  isbusy
                    ? handleCancel
                    : () => {
                        setStep('method')
                        setStatus({ kind: 'idle' })
                      }
                }
                disabled={status.kind === 'success'}
              >
                {isbusy ? t('dialog.cancel') : t('dialog.back')}
              </Button>
              <Button
                onClick={handleOpenTag}
                disabled={!siteUrl || isbusy || status.kind === 'success'}
                className="gap-1.5"
              >
                {status.kind === 'opening' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('dialog.opening')}
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    {t('dialog.openAndTag')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CustomDialogV2>
  )
}
