'use client'
import { ChevronRight, Link } from 'lucide-react'
import { useRef, useState, ClipboardEvent, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { requiredUrlSchema } from '@/shared/schemas'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { getDefaultFormValues } from '@/features/touch-points/components/forms/touch-point-form.constants'
import { axiosApiInstance } from '@/shared/lib/axios'
import { metaTagsSchema } from '@/shared/schemas/touch-points'

interface PasteLinkHeaderProps {
  orgId: string
  className?: string
}

function normalizeUrl(text: string): string {
  const trimmed = text.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function extractUrls(text: string): string[] {
  const urlRegex = /(?:https?:\/\/)?[\w-]+(\.[\w-]+)+[^\s,\n]*/gi
  return (text.match(urlRegex) ?? []).map(normalizeUrl)
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => requiredUrlSchema.safeParse(line).success)
    .map((line) => requiredUrlSchema.safeParse(line).data as string)
}

const MAX_LINKS = 10

export const PasteLinkHeader = ({ orgId, className }: PasteLinkHeaderProps) => {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const { mutateAsync: createTouchPoint, isPending } = useCreateTouchPoint(orgId, { noToast: true })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(ta.value.length, ta.value.length)
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }, 0)
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    const found = extractUrls(text)
    if (found.length > 1) {
      e.preventDefault()
      setValue((prev) => {
        const existing = prev.trim()
        return existing ? `${existing}\n${found.join('\n')}` : found.join('\n')
      })
    }
  }

  const handleSubmit = async () => {
    const toCreate = parseLines(value).slice(0, MAX_LINKS)
    if (toCreate.length === 0) return
    const defaults = getDefaultFormValues()

    const total = toCreate.length
    let done = 0
    let succeeded = 0
    let failed = 0

    const toastId = 'paste-link-progress'

    const showProgress = (current: number) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0
      toast.info(
        () => (
          <div className="w-[300px]">
            <p className="text-s font-medium text-slate-700 mb-0.5">
              {t('touchpoint:touch_point_list_v2.shorten_progress_title')}
            </p>
            <p className="text-xs text-slate-400 tabular-nums mb-2">
              {t('touchpoint:touch_point_list_v2.shorten_progress_description', {
                done: current,
                total,
              })}
            </p>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ),
        {
          id: toastId,
          duration: Infinity,
        }
      )
    }

    showProgress(0)

    await Promise.allSettled(
      toCreate.map(async (url) => {
        let metaTags = defaults.meta_tags
        try {
          const res = await axiosApiInstance.get('/public/meta-tags', { params: { url } })
          const parsed = metaTagsSchema.safeParse(res.data)
          if (parsed.success) {
            metaTags = {
              ...defaults.meta_tags,
              enabled: true,
              title: parsed.data.title,
              description: parsed.data.description,
              image: parsed.data.image,
              isAutoFetched: true,
            }
          }
        } catch {}

        return createTouchPoint({ ...defaults, content_value: url, meta_tags: metaTags }).then(
          () => {
            succeeded++
            done++
            showProgress(done)
          },
          () => {
            failed++
            done++
            showProgress(done)
          }
        )
      })
    )

    setValue('')
    setOpen(false)
    toast.dismiss(toastId)

    if (failed === 0) {
      toast.success(t('touchpoint:touch_point_list_v2.shorten_success_title'), {
        description: t(
          succeeded > 1
            ? 'touchpoint:touch_point_list_v2.shorten_success_description_plural'
            : 'touchpoint:touch_point_list_v2.shorten_success_description',
          { count: succeeded }
        ),
      })
    } else if (succeeded === 0) {
      toast.error(t('touchpoint:touch_point_list_v2.shorten_error_title'), {
        description: t(
          failed > 1
            ? 'touchpoint:touch_point_list_v2.shorten_error_description_plural'
            : 'touchpoint:touch_point_list_v2.shorten_error_description',
          { count: failed }
        ),
      })
    } else {
      toast.warning(t('touchpoint:touch_point_list_v2.shorten_partial_title'), {
        description: t('touchpoint:touch_point_list_v2.shorten_partial_description', {
          succeeded,
          failed,
        }),
      })
    }
  }

  const allValidLinks = parseLines(value)
  const validLinks = allValidLinks.slice(0, MAX_LINKS)
  const validCount = validLinks.length
  const overLimit = allValidLinks.length > MAX_LINKS
  const hasContent = validCount > 0
  const placeholder = t('touchpoint:touch_point_list_v2.paste_link_placeholder')
  const shortenLabel = t('touchpoint:touch_point_list_v2.shorten', 'Shorten')

  return (
    <div ref={containerRef} className={cn('relative max-w-[436px]', className)}>
      {/* Trigger bar — always in flow to hold layout space */}
      <div
        className="bg-card border border-secondary-purple rounded-[8px] flex items-center gap-2 pl-2 pr-px h-10 cursor-text"
        onClick={handleOpen}
      >
        <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-[6px]">
          <Link className="w-5 h-5 text-secondary" />
        </div>
        <div className="w-px self-stretch bg-slate-300 shrink-0" />

        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {validCount === 0 ? (
            <span className="text-s italic text-slate-400 truncate">{placeholder}</span>
          ) : (
            <>
              {validLinks.slice(0, 2).map((url, i) => (
                <span
                  key={i}
                  className="inline-flex items-center shrink-0 max-w-[130px] bg-secondary/10 text-secondary rounded-[4px] px-1.5 py-0.5 text-xs overflow-hidden"
                >
                  <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                </span>
              ))}
              {validCount > 2 && (
                <span className="shrink-0 text-xs text-slate-400 font-medium">
                  +{validCount - 2}
                </span>
              )}
            </>
          )}
        </div>

        {!open && (
          <motion.div
            layoutId="shorten-btn"
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="shrink-0"
          >
            <LoadingButton
              isLoading={isPending}
              disabled={!hasContent}
              onClick={(e) => {
                e.stopPropagation()
                handleSubmit()
              }}
              size="sm"
              iconRight={<ChevronRight />}
              className="self-stretch h-auto rounded-[6px] mt-px mb-px ml-px"
            >
              {shortenLabel}
            </LoadingButton>
          </motion.div>
        )}
      </div>

      {/* Popover — absolute, does not affect layout */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="popover"
            initial={{ opacity: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-card border border-secondary/30 rounded-[10px] shadow-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <Link className="w-4 h-4 text-secondary shrink-0" />
              <p className="text-xs text-slate-500 flex-1">
                {t('touchpoint:touch_point_list_v2.paste_link_hint')}
              </p>
            </div>

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\|/g, '\n'))
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              onPaste={handlePaste}
              rows={3}
              placeholder={'google.com\nfacebook.com\nyoutube.com'}
              className="w-full bg-transparent text-s text-slate-700 placeholder:text-slate-300 outline-none resize-none overflow-hidden min-h-[80px] px-3 py-2.5 font-mono"
            />

            <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-100 bg-slate-50/60">
              <span className={cn('text-xs', overLimit ? 'text-semantic-warning' : 'text-slate-400')}>
                {validCount > 0
                  ? t(
                      validCount > 1
                        ? 'touchpoint:touch_point_list_v2.valid_links_count_plural'
                        : 'touchpoint:touch_point_list_v2.valid_links_count',
                      { count: validCount }
                    ) + (overLimit ? ` (max ${MAX_LINKS})` : '')
                  : t('touchpoint:touch_point_list_v2.no_valid_links')}
              </span>
              <motion.div layoutId="shorten-btn" transition={{ duration: 0.12, ease: 'easeOut' }}>
                <LoadingButton
                  isLoading={isPending}
                  disabled={!hasContent}
                  onClick={handleSubmit}
                  size="sm"
                  iconRight={<ChevronRight />}
                >
                  {shortenLabel}
                </LoadingButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
