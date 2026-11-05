'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import Image from 'next/image'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'

type Categories = {
  system?: boolean
  security?: boolean
  analytics?: boolean
  [k: string]: boolean | undefined
}

const CATEGORY_KEYS: Array<keyof Categories> = ['system', 'security', 'analytics']

const CATEGORY_LABELS: Record<string, { title: string; description: string }> = {
  system: {
    title: 'System',
    description: 'Account, billing and transactional emails.',
  },
  security: {
    title: 'Security',
    description: 'Login alerts, password changes and security notices.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Weekly reports, insights and analytics summaries.',
  },
}

const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  if (name.length <= 2) return `${name[0]}***@${domain}`
  return `${name.slice(0, 2)}***@${domain}`
}

export const UnsubscribePreferences = ({ token }: { token: string }) => {
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [categories, setCategories] = useState<Categories>({})
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')
  const originalRef = useRef<Categories>({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/public/email-preferences/${token}`)
        if (!res.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const json = await res.json()
        const data = json?.data
        if (!cancelled && data) {
          setEmail(data.email || '')
          setCategories(data.categories || {})
          originalRef.current = data.categories || {}
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const handleSubmit = async (submitReason?: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/email-preferences/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, reason: submitReason ?? reason }),
      })
      if (res.ok) {
        originalRef.current = categories
        setSaved(true)
        setDialogOpen(false)
        setReason('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isDirty = CATEGORY_KEYS.some((k) => categories[k] !== originalRef.current[k])
  const hasUnsubscribed = CATEGORY_KEYS.some(
    (k) => originalRef.current[k] !== false && categories[k] === false
  )

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-100 px-4 py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-[480px] bg-white border border-slate-200 rounded-[8px] shadow-[0px_3px_10px_rgba(0,0,0,0.1),0px_2px_4px_rgba(0,0,0,0.08)] flex flex-col items-center gap-6 p-9">
        <Image
          src="/images/li2-logo-withtext-black.svg"
          alt="Li2.ai"
          width={120}
          height={30}
          priority
        />
        {children}
      </div>
    </div>
  )

  if (loading) {
    return (
      <Shell>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Shell>
    )
  }

  if (notFound) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700">Link invalid</p>
          <p className="text-s text-slate-500">This subscription link is invalid or has expired.</p>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <Shell>
        <div className="w-full flex flex-col gap-1 text-center">
          <p className="text-base font-semibold text-slate-700">Manage subscriptions</p>
          <p className="text-s text-slate-500">
            Choose what emails <span className="font-medium text-slate-600">{maskEmail(email)}</span> receives.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {CATEGORY_KEYS.map((key) => {
            const meta = CATEGORY_LABELS[key as string]
            const value = !!categories[key]
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-4 py-3 border border-slate-200 rounded-[8px] hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-slate-700">{meta.title}</span>
                  <span className="text-s text-slate-500">{meta.description}</span>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(v) => {
                    setSaved(false)
                    setCategories((prev) => ({ ...prev, [key]: v }))
                  }}
                />
              </div>
            )
          })}
        </div>

        {saved && !isDirty && (
          <p className="text-s text-semantic-success">Your preferences have been saved.</p>
        )}

        <Button
          className="w-full"
          disabled={!isDirty}
          onClick={() => hasUnsubscribed ? setDialogOpen(true) : handleSubmit('')}
        >
          Save preferences
        </Button>

        <p className="text-xs text-slate-400 text-center">
          You can update these preferences at any time using this link.
        </p>
      </Shell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsubscribe</DialogTitle>
            <DialogDescription>
              Let us know why you&apos;re unsubscribing — this helps us improve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g. Too many emails, not relevant to me..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmit()} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
