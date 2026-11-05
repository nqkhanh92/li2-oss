'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Plus,
  LayoutDashboard,
  Link2,
  Globe,
  ShoppingCart,
  Zap,
  Check,
  Lock,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { ProBadge } from './pro-badge'
import { AVAILABLE_DASHBOARD_TEMPLATES, WIDGET_TEMPLATES } from '../constants/templates'
import { VIZ_BG } from '../constants/viz-colors'
import { useCreateDashboard } from '../hooks/mutations'
import { useSmartDefaultTemplate } from '../hooks/use-smart-default-template'

const ConfettiCanvas = dynamic(
  () => import('@/shared/components/ui/confetti-canvas').then((m) => m.ConfettiCanvas),
  { ssr: false }
)

interface DashboardCreateSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

/* ── Template metadata for rich previews ──────────────────────── */

const TEMPLATE_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    accent: string
    accentBg: string
  }
> = {
  blank: { icon: LayoutDashboard, accent: 'text-slate-400', accentBg: 'bg-slate-100' },
  'link-performance': { icon: Link2, accent: 'text-sky-500', accentBg: 'bg-sky-50' },
  'website-analytics': { icon: Globe, accent: 'text-emerald-500', accentBg: 'bg-emerald-50' },
  'conversion-tracking': { icon: ShoppingCart, accent: 'text-rose-500', accentBg: 'bg-rose-50' },
  engagement: { icon: Zap, accent: 'text-violet-500', accentBg: 'bg-violet-50' },
}

const CARD_INITIAL = { opacity: 0, y: 8 } as const
const CARD_ANIMATE = { opacity: 1, y: 0 } as const

const TEMPLATE_THUMBNAILS: Record<string, string> = {
  'link-performance': '/images/templates/link-performance.png',
  'website-analytics': '/images/templates/website-analytics.png',
  'conversion-tracking': '/images/templates/conversion-tracking.png',
}

/* ── Helpers ─────────────────────────────────────────────────── */

function resolveWidgets(widgetIds: string[]) {
  return widgetIds
    .map((id) => WIDGET_TEMPLATES.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => w != null)
}

/* ── Mini template preview showing widget layout ──────────────── */

function TemplatePreview({ templateId, widgetIds }: { templateId: string; widgetIds: string[] }) {
  const thumbnail = TEMPLATE_THUMBNAILS[templateId]

  if (thumbnail) {
    return (
      <Image
        src={thumbnail}
        alt=""
        width={632}
        height={424}
        className="h-full w-full object-cover"
      />
    )
  }

  if (widgetIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-slate-300">
          <Plus className="h-5 w-5" />
          <span className="text-[9px] font-medium">Blank</span>
        </div>
      </div>
    )
  }

  const widgets = resolveWidgets(widgetIds)

  return (
    <div className="grid h-full grid-cols-2 gap-1 p-1">
      {widgets.slice(0, 6).map((w) => (
        <div
          key={w.id}
          className={cn(
            'rounded-sm min-h-[10px]',
            VIZ_BG[w.config.visualization] ?? VIZ_BG.table,
            w.config.size === 'large' && 'col-span-2'
          )}
        />
      ))}
    </div>
  )
}

/* ── Widget list for hover preview ───────────────────────────── */

function TemplateWidgetList({ widgetIds }: { widgetIds: string[] }) {
  const { t } = useTranslation('dashboards')

  if (widgetIds.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('create.blankHoverDescription', {
          defaultValue: 'Start empty and add widgets one by one.',
        })}
      </p>
    )
  }

  const widgets = resolveWidgets(widgetIds)

  return (
    <div>
      <p className="text-xs font-medium text-slate-700 mb-2">
        {t('create.includesLabel', { defaultValue: 'Includes:' })}
      </p>
      <ul className="space-y-1">
        {widgets.map((w) => (
          <li key={w.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-slate-300 shrink-0" />
            {t(`templates.widgets.${w.id}.name`)}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────── */

export function DashboardCreateSheet({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: DashboardCreateSheetProps = {}) {
  const { t } = useTranslation('dashboards')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const rawSetOpen = controlledOnOpenChange ?? setInternalOpen
  const [name, setName] = useState('')
  const [isAutoFilled, setIsAutoFilled] = useState(false)
  const smartDefault = useSmartDefaultTemplate(open ? org_id : undefined)
  const [selectedTemplate, setSelectedTemplate] = useState(smartDefault)
  const [hasUserSelected, setHasUserSelected] = useState(false)
  const [createdDashboardId, setCreatedDashboardId] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const isPro = useOrganizationStore(
    (s) => !!s.orgPlan?.advanced_features_allowed?.includes(ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS)
  )
  const selectedTmpl = AVAILABLE_DASHBOARD_TEMPLATES.find((t) => t.id === selectedTemplate)
  const isProTemplateBlocked = !!selectedTmpl?.pro_only && !isPro

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const setOpen = (next: boolean) => {
    if (!next) {
      setName('')
      setIsAutoFilled(false)
      setHasUserSelected(false)
      setCreatedDashboardId(null)
    }
    rawSetOpen(next)
  }

  const autoFillName = (templateId: string) => {
    const templateName = templateId === 'blank' ? '' : t(`templates.dashboards.${templateId}.name`)
    setName(templateName)
    setIsAutoFilled(templateName !== '')
  }

  useEffect(() => {
    if (!hasUserSelected) {
      setSelectedTemplate(smartDefault)
      autoFillName(smartDefault)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is a stable lookup fn
  }, [smartDefault, hasUserSelected])

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id)
    setHasUserSelected(true)
    if (name === '' || isAutoFilled) {
      autoFillName(id)
    }
  }

  const createDashboard = useCreateDashboard(org_id)

  const handleCreate = () => {
    if (!name.trim()) return
    createDashboard.mutate(
      {
        name: name.trim(),
        template_id: selectedTemplate === 'blank' ? undefined : selectedTemplate,
      },
      {
        onSuccess: (data) => {
          setCreatedDashboardId(data.id)
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            setOpen(false)
            setCreatedDashboardId(null)
            router.push(`/org/${org_id}/dashboards/${data.id}`)
          }, 1500)
        },
      }
    )
  }

  return (
    <>
      {!hideTrigger && (
        <Button size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          {t('list.newDashboard', { defaultValue: 'New Dashboard' })}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {t('create.title', { defaultValue: 'Create Dashboard' })}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('create.subtitle', {
                  defaultValue:
                    'Pick a template to get started quickly, or begin with a blank canvas.',
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700">
                {t('create.nameLabel', { defaultValue: 'Dashboard name' })}
              </label>
              <Input
                className="mt-1.5"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setIsAutoFilled(false)
                }}
                placeholder={t('create.namePlaceholder', { defaultValue: 'My Dashboard' })}
                maxLength={256}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) handleCreate()
                }}
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 pt-4">
            <label className="text-sm font-medium text-slate-700">
              {t('create.templateLabel', { defaultValue: 'Template' })}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {AVAILABLE_DASHBOARD_TEMPLATES.map((tmpl, index) => {
                const meta = TEMPLATE_META[tmpl.id] ?? TEMPLATE_META.blank
                const Icon = meta.icon
                const isSelected = selectedTemplate === tmpl.id

                return (
                  <HoverCard key={tmpl.id} openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <motion.button
                        initial={CARD_INITIAL}
                        animate={CARD_ANIMATE}
                        transition={{
                          delay: index * 0.05,
                          duration: 0.25,
                          ease: 'easeOut',
                        }}
                        onClick={() => handleSelectTemplate(tmpl.id)}
                        className={cn(
                          'relative flex flex-col rounded-xl border text-left transition-all duration-200 overflow-hidden',
                          isSelected
                            ? 'border-primary ring-1 ring-primary/20 shadow-md scale-[1.02] bg-primary/5'
                            : cn(
                                'border-slate-200 hover:border-slate-300 hover:shadow-sm',
                                selectedTemplate &&
                                  selectedTemplate !== tmpl.id &&
                                  'opacity-75 hover:opacity-100'
                              )
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        <div
                          className={cn(
                            'h-24 border-b border-slate-100',
                            tmpl.id === 'blank' ? 'bg-slate-50' : meta.accentBg + '/30'
                          )}
                        >
                          <TemplatePreview templateId={tmpl.id} widgetIds={tmpl.widget_ids} />
                        </div>

                        <div className="p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'flex items-center justify-center w-6 h-6 rounded-md',
                                meta.accentBg
                              )}
                            >
                              <Icon className={cn('h-3.5 w-3.5', meta.accent)} />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {t(`templates.dashboards.${tmpl.id}.name`, { defaultValue: tmpl.id })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {tmpl.widget_ids.length === 0
                              ? t('create.blankDescription', { defaultValue: 'Start from scratch' })
                              : t(`templates.dashboards.${tmpl.id}.description`, {
                                  defaultValue: `${tmpl.widget_ids.length} widgets`,
                                })}
                          </p>
                          {tmpl.pro_only && <ProBadge className="mt-0.5 self-start" />}
                        </div>
                      </motion.button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="right"
                      align="start"
                      sideOffset={8}
                      className="w-56 p-3"
                    >
                      <TemplateWidgetList widgetIds={tmpl.widget_ids} />
                    </HoverCardContent>
                  </HoverCard>
                )
              })}
            </div>

            {isProTemplateBlocked && (
              <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/50 px-4 py-3 mt-3">
                <Lock className="h-4 w-4 text-violet-500 shrink-0" />
                <p className="text-sm text-violet-700 flex-1">
                  {t('create.proRequired', {
                    defaultValue: 'This template requires a Pro plan to use.',
                  })}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-violet-600 border-violet-300 hover:bg-violet-100 shrink-0"
                  asChild
                >
                  <a href="https://li2.ai/vi/support" target="_blank" rel="noopener noreferrer">
                    {t('create.upgradeCta', { defaultValue: 'Upgrade' })}
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common:actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleCreate}
                    disabled={!name.trim() || createDashboard.isPending || isProTemplateBlocked}
                    iconLeft={<Plus className="h-4 w-4" />}
                  >
                    {createDashboard.isPending
                      ? t('create.creating', { defaultValue: 'Creating...' })
                      : t('create.submit', { defaultValue: 'Create Dashboard' })}
                  </Button>
                </span>
              </TooltipTrigger>
              {isProTemplateBlocked && (
                <TooltipContent>
                  {t('create.proRequiredTooltip', {
                    defaultValue: 'Upgrade to Pro to use this template',
                  })}
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {createdDashboardId && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 rounded-lg">
              <ConfettiCanvas bursts={5} perBurst={8} interval={150} />
              <div
                className="relative flex flex-col items-center gap-4 text-center"
                style={{ zIndex: 1 }}
              >
                <div
                  className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100"
                  style={{
                    animation: 'check-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                  }}
                >
                  <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={1.5} />
                </div>
                <p
                  className="text-lg font-semibold text-foreground"
                  style={{ animation: 'fade-up 0.4s 0.2s both' }}
                >
                  {t('create.successMessage', { defaultValue: 'Dashboard created!' })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
