'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface SpaceFilterProps {
  spaces: Array<{ id: string; name: string; color?: string | null }>
  selectedSpaceIds: string[]
  onSpaceChange: (spaceIds: string[]) => void
  isLoading?: boolean
}

export function SpaceFilter({
  spaces,
  selectedSpaceIds,
  onSpaceChange,
  isLoading,
}: SpaceFilterProps) {
  const { t } = useTranslation(['common', 'collection'])
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (spaceId: string) => {
      const newSelection = selectedSpaceIds.includes(spaceId)
        ? selectedSpaceIds.filter((id) => id !== spaceId)
        : [...selectedSpaceIds, spaceId]
      onSpaceChange(newSelection)
    },
    [selectedSpaceIds, onSpaceChange]
  )

  const handleClearAll = useCallback(() => {
    onSpaceChange([])
  }, [onSpaceChange])

  const selectedSpaces = spaces.filter((space) => selectedSpaceIds.includes(space.id))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {t('collection:filter.filter_by_space', 'Filter by Space')}
        </label>
        {selectedSpaceIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-auto py-0 px-2 text-xs"
          >
            {t('common:action.clear_all', 'Clear All')}
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading || spaces.length === 0}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              {selectedSpaceIds.length === 0 ? (
                <span className="text-muted-foreground">
                  {t('collection:filter.all_spaces', 'All Spaces')}
                </span>
              ) : selectedSpaceIds.length === 1 ? (
                <div className="flex items-center gap-2">
                  {selectedSpaces[0]?.color && (
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedSpaces[0].color }}
                    />
                  )}
                  <span className="truncate">{selectedSpaces[0]?.name}</span>
                </div>
              ) : (
                <span>
                  {selectedSpaceIds.length}{' '}
                  {t('collection:filter.spaces_selected', 'spaces selected')}
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('collection:filter.search_spaces', 'Search spaces...')} />
            <CommandEmpty>
              {t('collection:filter.no_spaces_found', 'No spaces found.')}
            </CommandEmpty>
            <CommandList className="max-h-64">
              <CommandGroup>
                {spaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    value={space.name}
                    onSelect={() => handleSelect(space.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedSpaceIds.includes(space.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {space.color && (
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: space.color }}
                        />
                      )}
                      <span className="truncate">{space.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected spaces as badges */}
      {selectedSpaceIds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {selectedSpaces.map((space) => (
            <Badge key={space.id} variant="secondary" className="gap-1">
              {space.color && (
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: space.color }} />
              )}
              <span>{space.name}</span>
              <button
                onClick={() => handleSelect(space.id)}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
