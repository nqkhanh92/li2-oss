'use client'

/**
 * 👍/👎 on a finished assistant answer. Always visible but muted, emphasized on hover; the chosen
 * thumb stays highlighted. There is no "unset" — the backend rating is ±1 only, so a click can
 * SWITCH 👍↔👎 but never clear a rating. Dumb by design: the parent owns the rating state and the
 * best-effort POST (via ctx.submitFeedback), so this component is trivial to unit-test in isolation.
 */

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'

interface FeedbackButtonsProps {
  /** The current rating on this answer (1 = up, -1 = down), or undefined when not yet rated. */
  feedback?: 1 | -1
  /** Fired with the clicked rating. Re-clicking the active thumb is a no-op upstream (submitFeedback). */
  onRate: (rating: 1 | -1) => void
}

export function FeedbackButtons({ feedback, onRate }: FeedbackButtonsProps) {
  const { t } = useTranslation('agent-chat')

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={t('feedback.up')}
        aria-pressed={feedback === 1}
        onClick={() => onRate(1)}
        className={cn(
          'rounded p-1 text-muted-foreground opacity-60 transition hover:bg-slate-100 hover:opacity-100',
          feedback === 1 && 'text-emerald-600 opacity-100'
        )}
      >
        <ThumbsUp className={cn('h-3.5 w-3.5', feedback === 1 && 'fill-current')} />
      </button>
      <button
        type="button"
        aria-label={t('feedback.down')}
        aria-pressed={feedback === -1}
        onClick={() => onRate(-1)}
        className={cn(
          'rounded p-1 text-muted-foreground opacity-60 transition hover:bg-slate-100 hover:opacity-100',
          feedback === -1 && 'text-red-600 opacity-100'
        )}
      >
        <ThumbsDown className={cn('h-3.5 w-3.5', feedback === -1 && 'fill-current')} />
      </button>
    </div>
  )
}
