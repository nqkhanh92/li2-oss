'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import {
  DIMMED_SIDEBAR_ITEMS,
  SIDEBAR_GROUPS,
  SIDEBAR_ITEM_ICONS,
  SIDEBAR_ITEM_LABELS,
  type SidebarGroup,
  type SidebarItemKey,
} from './short-link-form.constants'

interface ShortLinkSidebarProps {
  selected: SidebarItemKey
  onSelect: (key: SidebarItemKey) => void
  groups?: SidebarGroup[]
  collapsed?: boolean
}

export const ShortLinkSidebar = ({
  selected,
  onSelect,
  groups = SIDEBAR_GROUPS,
}: ShortLinkSidebarProps) => {
  const { t } = useTranslation(['touchpoint'])

  const allItems = groups.flatMap((g) => g.items)

  return (
    <>
      {/* ── Mobile / tablet: wrapping icon-on-top boxes ── */}
      <div className="flex xl:hidden flex-wrap gap-2 bg-card rounded-xl border border-border p-3">
        {allItems.map((key) => {
          const Icon = SIDEBAR_ITEM_ICONS[key]
          const isActive = selected === key
          const isDimmed = DIMMED_SIDEBAR_ITEMS.includes(key)
          return (
            <button
              key={key}
              type="button"
              disabled={isDimmed}
              onClick={() => !isDimmed && onSelect(key)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-colors w-[72px]',
                isDimmed
                  ? 'bg-card text-slate-400 border-border opacity-50 cursor-not-allowed'
                  : isActive
                    ? 'bg-primary/5 text-primary border-primary/20 font-medium'
                    : 'bg-card text-slate-600 border-border hover:bg-slate-50'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  isDimmed ? 'text-slate-300' : isActive ? 'text-primary' : 'text-slate-400'
                )}
              />
              <span className="text-[10px] leading-tight text-center line-clamp-2">
                {t(SIDEBAR_ITEM_LABELS[key])}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Desktop: vertical list inside a card ── */}
      <div className="hidden xl:block bg-card rounded-xl border border-border p-2">
        <div className="flex flex-col w-full">
          {groups.map((group, groupIdx) => (
            <div key={group.key}>
              {group.label && (
                <p className="px-4 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {group.label}
                </p>
              )}
              {groupIdx > 0 && !group.label && <div className="mx-4 my-2 border-t border-border" />}
              <div className="flex flex-col gap-0.5">
                {group.items.map((key) => {
                  const Icon = SIDEBAR_ITEM_ICONS[key]
                  const isActive = selected === key
                  const isDimmed = DIMMED_SIDEBAR_ITEMS.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isDimmed}
                      onClick={() => !isDimmed && onSelect(key)}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-left transition-colors w-full',
                        isDimmed
                          ? 'text-slate-400 opacity-50 cursor-not-allowed'
                          : isActive
                            ? 'text-primary bg-primary/5 font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-[18px] h-[18px] shrink-0',
                          isDimmed ? 'text-slate-300' : isActive ? 'text-primary' : 'text-slate-400'
                        )}
                      />
                      <span className="truncate">{t(SIDEBAR_ITEM_LABELS[key])}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
