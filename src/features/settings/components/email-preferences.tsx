'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Switch } from '@/shared/components/ui/switch'

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
    description: 'Reports, insights and analytics summaries.',
  },
}

export const EmailPreferences = () => {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string>('')
  const [categories, setCategories] = useState<Categories>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/user/email-preferences')
        if (!res.ok) {
          if (!cancelled) setError('Unable to load preferences')
          return
        }
        const json = await res.json()
        const data = json?.data
        if (!cancelled && data) {
          setCategories(data.categories || {})
          setToken(data.unsubscribe_token || '')
        }
      } catch {
        if (!cancelled) setError('Unable to load preferences')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = async (key: string, value: boolean) => {
    if (!token) return
    const previous = categories
    const next = { ...categories, [key]: value }
    setCategories(next)
    setSavingKey(key)
    setSavedKey(null)
    try {
      const res = await fetch(`/api/public/email-preferences/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: next }),
      })
      if (res.ok) {
        setSavedKey(key)
        setTimeout(() => {
          setSavedKey((prev) => (prev === key ? null : prev))
        }, 1500)
      } else {
        setCategories(previous)
      }
    } catch {
      setCategories(previous)
    } finally {
      setSavingKey((prev) => (prev === key ? null : prev))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-s text-semantic-error">{error}</p>
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {CATEGORY_KEYS.map((key) => {
        const meta = CATEGORY_LABELS[key as string]
        const value = !!categories[key]
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-4 p-4 border border-slate-200 rounded-lg"
          >
            <div className="flex flex-col">
              <span className="text-base font-medium text-foreground">{meta.title}</span>
              <span className="text-s text-muted-foreground">{meta.description}</span>
            </div>
            <div className="flex items-center gap-2">
              {savingKey === key && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {savedKey === key && savingKey !== key && (
                <Check className="w-4 h-4 text-success" />
              )}
              <Switch
                checked={value}
                onCheckedChange={(v) => handleToggle(key as string, v)}
                disabled={savingKey === key || !token}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
