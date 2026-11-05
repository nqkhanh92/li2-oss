'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Link2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import type { LinkJourneyTouchPoint } from '../types'

interface LinkSelectorProps {
  touchPoints: LinkJourneyTouchPoint[]
  selectedId: string | null
  onSelect: (tpId: string) => void
  isLoading?: boolean
}

export function LinkSelector({ touchPoints, selectedId, onSelect, isLoading }: LinkSelectorProps) {
  const { t } = useTranslation('link-journey')
  const [open, setOpen] = useState(false)
  const selected = touchPoints.find((tp) => tp.id === selectedId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-[360px] justify-between font-normal',
            !selected && 'text-muted-foreground'
          )}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Link2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selected ? selected.name : t('linkSelector.placeholder')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('linkSelector.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col gap-1 px-2 py-1">
                <span className="text-sm text-muted-foreground">{t('linkSelector.noResults')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('linkSelector.noResultsDesc')}
                </span>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {touchPoints.map((tp) => (
                <CommandItem
                  key={tp.id}
                  value={`${tp.name} ${tp.short_url} ${tp.destination_url}`}
                  onSelect={() => {
                    onSelect(tp.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5 shrink-0',
                      selectedId === tp.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate font-medium">{tp.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {tp.short_url} → {tp.destination_url}
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {tp.pageview_count.toLocaleString()} {t('linkSelector.views')}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
