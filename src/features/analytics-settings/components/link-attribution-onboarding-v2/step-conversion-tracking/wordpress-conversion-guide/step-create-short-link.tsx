'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Copy, Link2, Loader2, PlusCircle, ListFilter } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { useCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { TouchPointContentType } from '@/features/touch-points/types'
import { useSlugCheck } from '@/features/touch-points/hooks'
import { slugSchema } from '@/shared/schemas/slug'
import { standardizeSlug } from '@/shared/lib/slug'
import { requiredUrlSchema } from '@/shared/schemas'
import { useGetOrgDefaultDomain } from '@/features/custom-domains/hooks/queries'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { TouchPointInList } from '@/core/types/touch-point.type'
import { axiosApiInstance } from '@/shared/lib/axios'
import { useConversionTracking } from '../context'

const schema = z.object({
  content_value: requiredUrlSchema,
  slug: slugSchema,
})

interface Props {
  org_id: string
  onComplete: (shortUrl: string | null) => void
}

type Tab = 'create' | 'existing'

const TABS = [
  { id: 'create' as Tab, icon: PlusCircle, label: 'Create New' },
  { id: 'existing' as Tab, icon: ListFilter, label: 'Use Existing' },
]

export function StepCreateShortLink({ org_id, onComplete }: Props) {
  const { normalizedSiteUrl } = useConversionTracking()
  const [tab, setTab] = useState<Tab>('create')
  const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedTp, setSelectedTp] = useState<TouchPointInList | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { content_value: normalizedSiteUrl, slug: '' },
  })

  const { slugStatus, slugStatusIcon } = useSlugCheck({ control: form.control })
  const slugValue = useWatch({ control: form.control, name: 'slug' })

  const { data: defaultDomain, isLoading: isDomainLoading } = useGetOrgDefaultDomain(org_id)
  const previewDomain =
    defaultDomain?.name?.replace(/^https?:\/\//, '') ||
    process.env.NEXT_PUBLIC_SHORT_LINK_URL?.replace(/^https?:\/\//, '') ||
    'example.com'

  const { mutate: createTouchPoint, isPending: isCreating } = useCreateTouchPoint(org_id, {
    noToast: true,
    shouldRevalidatePath: false,
  })

  const siteHostname = (() => {
    try { return normalizedSiteUrl ? new URL(normalizedSiteUrl).hostname : '' } catch { return '' }
  })()

  const { data: touchPointData, isLoading: isLoadingTps } = useGetTouchPoints(
    org_id,
    {
      filters: {},
      pagination: { pageIndex: 0, pageSize: 1000 },
      sorting: [{ id: 'created_at', desc: true }],
      search: '',
    },
    undefined
  )

  const filteredTouchPoints = (touchPointData?.data ?? []).filter((tp: TouchPointInList) => {
    try {
      return tp.content_value && new URL(tp.content_value).hostname === siteHostname
    } catch { return false }
  })

  const handleCopy = () => {
    if (!createdShortUrl) return
    navigator.clipboard.writeText(createdShortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = (values: z.infer<typeof schema>) => {
    createTouchPoint(
      {
        name: '',
        enabled: true,
        content_type: TouchPointContentType.URL,
        is_campaign_based: false,
        content_value: values.content_value,
        slug: values.slug || undefined,
        tags: [],
        variants_content: {
          QR: { enabled: false },
          NFC: { enabled: false },
          WIFI: { enabled: false },
        },
        qr_customize_options: {},
        conversion_tracking: { enabled: true },
      },
      {
        onSuccess: (data) => {
          setCreatedShortUrl(data.short_url ?? null)
        },
      }
    )
  }

  const handleContinueExisting = async () => {
    if (!selectedTp) return
    const trackingEnabled = (selectedTp.conversion_tracking as { enabled?: boolean } | null)?.enabled
    if (!trackingEnabled) {
      setIsUpdating(true)
      try {
        await axiosApiInstance.patch(
          `/organizations/${org_id}/touch-points/${selectedTp.id}`,
          { conversion_tracking: { enabled: true } },
          { headers: { 'Content-Type': 'application/json' } }
        )
      } finally {
        setIsUpdating(false)
      }
    }
    onComplete(selectedTp.short_url ?? null)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-s text-muted-foreground">
        Create a short link for your site. Share this link so Li2 can track where your conversions come from.
      </p>

      {/* Card with tab header */}
      <div className="rounded-xl border border-slate-200 bg-card overflow-hidden">
        {/* Tab header */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const selected = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  selected
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {tab === 'create' && (
            <div className="flex flex-col gap-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)}>
                  <div className="flex gap-3 items-start">
                    <FormField
                      name="content_value"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-col gap-1 space-y-0">
                          <FormLabel>Destination URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yoursite.com" {...field} />
                          </FormControl>
                          <div className="h-[1.25rem] overflow-hidden">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="slug"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <FormItem className="w-56 flex flex-col gap-1 space-y-0">
                          <FormLabel>
                            Custom Slug{' '}
                            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="my-store"
                              {...field}
                              onBlur={(e) => {
                                field.onChange(standardizeSlug(e.target.value))
                                field.onBlur()
                              }}
                              endAdornment={slugStatusIcon ?? undefined}
                            />
                          </FormControl>
                          <div className="h-[1.25rem] overflow-hidden">
                            {!fieldState.error && slugStatus === 'taken' && (
                              <FormMessage>This slug is already taken.</FormMessage>
                            )}
                            {!fieldState.error && slugStatus !== 'taken' && (
                              <FormDescription>Leave blank to auto-generate.</FormDescription>
                            )}
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>

              {/* Preview bar */}
              <div
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-3 py-2.5 transition-colors',
                  createdShortUrl
                    ? 'border-emerald-200 bg-emerald-50'
                    : slugValue && slugStatus === 'available'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                )}
              >
                <Link2
                  className={cn(
                    'w-4 h-4 shrink-0 mr-1',
                    createdShortUrl || (slugValue && slugStatus === 'available')
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  )}
                />
                {createdShortUrl ? (
                  <>
                    <span className="text-xs font-medium text-emerald-700 truncate flex-1">
                      {createdShortUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="ml-1 shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                ) : isDomainLoading ? (
                  <>
                    <div className="h-3 w-24 rounded bg-slate-200 animate-pulse shrink-0" />
                    <span className="text-xs text-slate-300">/</span>
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-500 shrink-0">{previewDomain}/</span>
                    <span
                      className={cn(
                        'text-xs truncate',
                        slugValue
                          ? slugStatus === 'available'
                            ? 'text-emerald-700'
                            : slugStatus === 'taken'
                              ? 'text-destructive'
                              : 'text-slate-700'
                          : 'text-slate-300'
                      )}
                    >
                      {slugValue || 'your-slug'}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'existing' && (
            <div className="flex flex-col gap-3">
              {isLoadingTps ? (
                <div className="flex flex-col gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : filteredTouchPoints.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <Link2 className="w-6 h-6 opacity-30" />
                  <p className="text-sm">
                    {siteHostname
                      ? `No short links found pointing to ${siteHostname}.`
                      : 'No short links found.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                  {filteredTouchPoints.map((tp: TouchPointInList) => {
                    const isSelected = selectedTp?.id === tp.id
                    return (
                      <button
                        key={tp.id}
                        type="button"
                        onClick={() => setSelectedTp(tp)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'border-primary/40 bg-primary/[0.04]'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02]'
                        )}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                            isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                          )}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-white m-auto mt-[1px]" />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium text-primary truncate">
                            {tp.short_url}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {tp.content_value}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {tab === 'create' ? (
          createdShortUrl ? (
            <Button size="sm" onClick={() => onComplete(createdShortUrl)}>
              Continue
            </Button>
          ) : (
            <Button size="sm" onClick={form.handleSubmit(handleCreate)} disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</>
              ) : (
                'Create Short Link'
              )}
            </Button>
          )
        ) : (
          <Button
            size="sm"
            onClick={handleContinueExisting}
            disabled={!selectedTp || isUpdating}
          >
            {isUpdating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Enabling tracking…</>
            ) : (
              'Continue'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
