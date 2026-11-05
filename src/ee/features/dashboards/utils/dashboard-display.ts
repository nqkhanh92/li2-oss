import { Lock, Users, Globe } from 'lucide-react'

/** Accent Tailwind class based on the primary widget data source */
export function getDominantAccent(widgets: { config: unknown }[]): string {
  if (widgets.length === 0) return 'bg-slate-300'
  const first = (widgets[0].config as { data_source?: string }).data_source
  switch (first) {
    case 'visits': return 'bg-sky-400'
    case 'pageviews': return 'bg-emerald-400'
    case 'events': return 'bg-amber-400'
    case 'interactions': return 'bg-violet-400'
    case 'conversions': return 'bg-rose-400'
    default: return 'bg-slate-400'
  }
}

/** Icon component per access mode */
export const ACCESS_ICON = {
  only_me: Lock,
  restricted: Users,
  everyone: Globe,
} as const

/** Translated label for access mode — eliminates nested ternaries in card/row */
export function getAccessModeLabel(
  mode: string,
  t: (key: string, opts?: { defaultValue: string }) => string,
): string {
  switch (mode) {
    case 'only_me': return t('card.onlyMe', { defaultValue: 'Only me' })
    case 'restricted': return t('card.restricted', { defaultValue: 'Restricted' })
    default: return t('card.everyone', { defaultValue: 'Everyone' })
  }
}
