'use client'

import { useState, useRef, useEffect } from 'react'
import { TvIcon, X, ChevronDown, Pencil, Plus, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { ChannelForm } from './form'
import {
  useCreateCampaignChannel,
  useGetCampaignChannelDropdown,
  useUpdateCampaignChannel,
} from '../../hooks'
import { useParams } from 'next/navigation'
import { z } from 'zod'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { CampaignChannel } from '@/core/types/campaign-channel.type'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { inputVariants } from '@/features/touch-points/constants/variants'

type ChannelSelectProps = {
  value?: string[]
  onChange: (channels: string[]) => void
  placeholder?: string
  disabled?: boolean
}
export const ChannelSelect = ({
  value = [],
  onChange,
  placeholder = 'Select channels',
  disabled = false,
}: ChannelSelectProps) => {
  const { org_id } = useParams<{ org_id: string }>()

  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [editingChannel, setEditingChannel] = useState<
    DropdownData<'campaign_channels'>[number] | null
  >(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: channelsData, isLoading } = useGetCampaignChannelDropdown(org_id)

  const { mutateAsync: createChannel, isPending: isCreating } = useCreateCampaignChannel(org_id)
  const { mutateAsync: updateChannel, isPending: isUpdating } = useUpdateCampaignChannel(
    org_id,
    editingChannel?.id || null
  )

  const selectedChannels = (channelsData || []).filter((ch) => value.includes(ch.id))

  const handleToggleChannel = (channelValue: string) => {
    if (value.includes(channelValue)) {
      onChange(value.filter((v) => v !== channelValue))
    } else {
      onChange([...value, channelValue])
    }
  }

  const handleRemoveChannel = (channelValue: string, e: React.MouseEvent) => {
    if (disabled) return
    e.stopPropagation()
    onChange(value.filter((v) => v !== channelValue))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    if (disabled) return
    e.stopPropagation()
    onChange([])
  }

  const filteredChannels = (channelsData || []).filter((ch) =>
    ch.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const canCreate =
    searchValue.trim() &&
    !channelsData?.find((ch) => ch.name.toLowerCase() === searchValue.trim().toLowerCase())

  const createChannelDialogRef = useRef<CustomDialogRef>(null)
  const updateChannelDialogRef = useRef<CustomDialogRef>(null)

  useEffect(() => {
    if (open && !disabled) {
      // Use setTimeout to ensure the popover is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open, disabled])

  const handleCreateChannel = async (values: z.infer<typeof channelSchema>) => {
    try {
      const response = await createChannel(values)
      const newChannelId = response.data?.data?.id
      if (newChannelId) {
        onChange([...value, newChannelId])
      }
      createChannelDialogRef.current?.close()
      setSearchValue('')
    } catch (error) {
      console.error('Failed to create channel:', error)
    }
  }

  const handleUpdateChannel = async (values: z.infer<typeof channelSchema>) => {
    try {
      await updateChannel(values)
      updateChannelDialogRef.current?.close()
      setEditingChannel(null)
    } catch (error) {
      console.error('Failed to update channel:', error)
    }
  }

  const handleStartEdit = (
    channel: DropdownData<'campaign_channels'>[number],
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    setEditingChannel(channel)
    updateChannelDialogRef.current?.open()
  }

  return (
    <>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger disabled={disabled} asChild>
            <div
              className={cn(
                'w-full flex items-center gap-2 border border-transparent px-3 min-h-10 font-normal rounded-lg bg-transparent text-base transition-colors',
                'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                inputVariants({
                  variant: 'default',
                  size: 'default',
                }),
                'relative cursor-text outline-hidden ring-0 shadow-none'
              )}
              data-disabled={disabled}
              onClick={(e) => {
                if (disabled) return
                e.preventDefault()
                setOpen(true)
                inputRef.current?.focus()
              }}
            >
              <div className="flex flex-wrap items-center gap-1 pr-20">
                {selectedChannels.length > 0 && (
                  <>
                    {selectedChannels.map((channel) => (
                      <Badge
                        size={'xs'}
                        key={channel.id}
                        variant="secondary"
                        className="text-xs font-normal"
                        color={channel.color}
                      >
                        {channel.name}
                        <button
                          onClick={(e) => handleRemoveChannel(channel.id, e)}
                          className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={selectedChannels.length === 0 ? placeholder : ''}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => {
                    if (disabled) return
                    setOpen(true)
                  }}
                  disabled={disabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canCreate) {
                      createChannelDialogRef.current?.open()
                    }
                    if (e.key === 'Escape') {
                      setOpen(false)
                    }
                  }}
                  className="flex-1 min-w-[120px] border-none outline-hidden bg-transparent placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {selectedChannels.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="hover:bg-slate-100 rounded p-1"
                    type="button"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]!"
            align="start"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="max-h-[300px] overflow-y-auto">
              {filteredChannels.length === 0 && !canCreate ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No channels found
                </div>
              ) : (
                <div className="p-1 space-y-1">
                  {filteredChannels.map((channel) => {
                    const isSelected = value.includes(channel.id)

                    return (
                      <div
                        key={channel.id}
                        onClick={() => handleToggleChannel(channel.id)}
                        onMouseDown={(e) => e.preventDefault()}
                        className={cn(
                          'group flex items-center justify-between px-3 py-1 rounded-md cursor-pointer hover:bg-slate-100 select-none',
                          isSelected && 'bg-slate-50'
                        )}
                      >
                        <div
                          className="flex items-center gap-2 flex-1"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <span className="text-sm">{channel.name}</span>
                        </div>
                        <div className="flex items-center gap-1 relative w-8 h-8">
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:opacity-0 transition-opacity" />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleStartEdit(channel, e)}
                            onMouseDown={(e) => e.preventDefault()}
                            className="h-8 w-8 p-0 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 top-0"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {canCreate && (
                    <div
                      onClick={() => createChannelDialogRef.current?.open()}
                      onMouseDown={(e) => e.preventDefault()}
                      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 text-primary"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Create &quot;{searchValue.trim()}&quot;</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <CustomDialogV2 title="Create Channel" size={'xs'} ref={createChannelDialogRef}>
        <ChannelForm
          isLoading={isCreating}
          initialValues={{ name: searchValue }}
          buttonText="Create"
          onSubmit={handleCreateChannel}
        />
      </CustomDialogV2>
      <CustomDialogV2 title="Update Channel" size={'xs'} ref={updateChannelDialogRef}>
        <ChannelForm
          isLoading={isUpdating}
          buttonText="Update"
          onSubmit={handleUpdateChannel}
          initialValues={
            editingChannel ? { name: editingChannel.name, color: editingChannel.color } : undefined
          }
        />
      </CustomDialogV2>
    </>
  )
}
