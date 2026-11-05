'use client'

/**
 * Track 2 — the approval CARD. Rendered because a STRUCTURED `approval_request` SSE event told us
 * to (never parsed out of the model's prose). This is the payoff of slice-1: destination, slug,
 * name, MASKED password, expiry, and UTM shown for human review before the write executes.
 *
 * ⚠️ Security (B-note): `link.password`, when present, is ALWAYS the literal '***' — li2-ai masks
 * it before it leaves the server. This component renders `link.password` verbatim and NEVER
 * attempts to unmask; the browser never receives the plaintext. The card also does not decide the
 * write — turn 2 sends only `proposal_id`, and li2-ai executes from its own Redis proposal.
 */

import { Check, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardFooter } from '@/shared/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import type { ApprovalLink, ApprovalState, ApprovalStatus } from '../types'

interface ApprovalCardProps {
  approval: ApprovalState
  onDecide: (proposalId: string, decision: 'approve' | 'reject') => void
  /** True while ANY turn is streaming — disables Approve/Reject on a still-pending card so a
   * click during another in-flight turn can't silently no-op in the provider. */
  disabled?: boolean
}

export function ApprovalCard({ approval, onDecide, disabled = false }: ApprovalCardProps) {
  const { t } = useTranslation('agent-chat')
  const { action, render, status, decision, proposalId } = approval
  const busy = status === 'approving' || status === 'rejecting'
  // Any post-decision state hides the buttons: in-flight (busy), resolved, or failed.
  const acted = status === 'resolved' || status === 'failed' || busy

  return (
    <Card className="my-2 w-full overflow-hidden">
      <CardContent className="space-y-3 p-4">
        {/* The already-resolved confirmation sentence — shown verbatim (not templated). */}
        <p className="text-sm font-medium leading-snug text-slate-800">{render}</p>

        <div className="space-y-3">
          {action.links.map((link, i) => (
            <LinkRow key={i} link={link} showIndex={action.links.length > 1} index={i + 1} />
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-2 p-4 pt-0">
        {acted ? (
          <DecisionBadge status={status} decision={decision} t={t} />
        ) : (
          <>
            <Button
              size="sm"
              variant="default"
              iconLeft={<Check />}
              onClick={() => onDecide(proposalId, 'approve')}
              disabled={busy || disabled}
            >
              {t('approve')}
            </Button>
            <Button
              size="sm"
              variant="outline_destructive"
              iconLeft={<X />}
              onClick={() => onDecide(proposalId, 'reject')}
              disabled={busy || disabled}
            >
              {t('reject')}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

function DecisionBadge({
  status,
  decision,
  t,
}: {
  status: ApprovalStatus
  decision: 'approve' | 'reject' | null
  t: (k: string) => string
}) {
  if (status === 'approving' || status === 'rejecting')
    return <span className="text-sm text-muted-foreground">{t('deciding')}</span>
  // The decision turn errored — neutral badge, never a green "approved" for a write that failed.
  if (status === 'failed')
    return <span className="text-sm font-medium text-muted-foreground">{t('actionFailed')}</span>
  if (decision === 'approve')
    return <span className="text-sm font-medium text-primary">{t('approved')}</span>
  return <span className="text-sm font-medium text-destructive">{t('rejected')}</span>
}

/** One link's fields. Only present fields render — no empty rows. */
function LinkRow({
  link,
  showIndex,
  index,
}: {
  link: ApprovalLink
  showIndex: boolean
  index: number
}) {
  const { t } = useTranslation('agent-chat')
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm">
      {showIndex && <div className="mb-1 text-xs font-semibold text-slate-500">#{index}</div>}
      <Field label={t('field.destination')} value={link.destination} mono />
      {link.slug && <Field label={t('field.slug')} value={link.slug} mono />}
      {link.name && <Field label={t('field.name')} value={link.name} />}
      {link.password && (
        <Field
          label={t('field.password')}
          value={link.password}
          mono
          hint={t('passwordMaskedHint')}
        />
      )}
      {link.expires_at && <Field label={t('field.expires')} value={link.expires_at} mono />}
      {link.utm &&
        Object.entries(link.utm).map(([k, v]) => (
          <Field key={k} label={`${t('field.utm')} ${k.replace(/^utm_/, '')}`} value={v} mono />
        ))}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  hint,
}: {
  label: string
  value: string
  mono?: boolean
  /** Explanatory copy only — e.g. why the password is masked. Never a reveal/unmask control. */
  hint?: string
}) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span
        className={`min-w-0 break-all text-slate-800 ${mono ? 'font-mono text-xs' : 'text-sm'}`}
      >
        {value}
      </span>
      {hint && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            {/* type="button" so it never submits a form; no onClick — it only surfaces the
             * tooltip on hover/focus and can NEVER unmask or reveal the password (B-note). */}
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={hint}
                className="inline-flex shrink-0 items-center text-slate-400 hover:text-slate-500"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
