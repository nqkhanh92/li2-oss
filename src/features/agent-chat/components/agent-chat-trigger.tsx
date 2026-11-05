'use client'

/**
 * Top-bar button that opens the agent chat panel. Flips the shared open-state in the provider.
 * Always rendered (Kei) — an org without the AI_CHAT plan gets a friendly upsell inside the panel
 * (the mint 403 path), not a hidden button.
 *
 * Labeled pill (not a bare icon) so its purpose reads at a glance. The gradient is the app's
 * existing "AI/premium" signature — same stops as the org-avatar badge and the sidebar
 * "Get Started" icon (see menu-list.tsx) — reused here instead of introducing a new accent.
 */

import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAgentChatContext } from '@/shared/providers/agent-chat-provider'

export function AgentChatTrigger({ className }: { className?: string }) {
  const { t } = useTranslation('agent-chat')
  const { isOpen, setIsOpen } = useAgentChatContext()

  return (
    <Button
      variant="none"
      size="sm"
      iconLeft={
        <Sparkles
          className={cn(
            'transition-colors duration-200',
            isOpen ? 'text-slate-900' : 'text-[#D6A4AF] group-hover:text-slate-900'
          )}
        />
      }
      aria-label={t('title')}
      aria-pressed={isOpen}
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'group relative whitespace-nowrap rounded-full border px-3 text-white transition-colors duration-200 sm:px-4',
        isOpen
          ? 'border-transparent bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] text-slate-900'
          : 'border-white/15 bg-white/[0.06] hover:border-transparent hover:bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] hover:text-slate-900',
        className
      )}
    >
      <span className="hidden sm:inline">{t('trigger')}</span>
    </Button>
  )
}
