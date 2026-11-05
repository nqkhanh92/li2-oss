'use client'

import { useState, useRef, useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Check, Pencil, Trash2, Plus, Search } from 'lucide-react'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { ChannelForm } from '../../channels/form'
import { useParams } from 'next/navigation'
import {
  useCreateCampaignChannel,
  useGetCampaignChannelDropdown,
  useUpdateCampaignChannel,
} from '../../../hooks'
import { axiosApiInstance } from '@/shared/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { Typography } from '@/shared/components/ui/typography'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { cn } from '@/shared/lib/cn'

type ChannelManagerDialogProps = {
  value: string[]
  onChange: (channels: string[]) => void
  trigger?: React.ReactNode
}

export const ChannelManagerDialog = ({ value, onChange, trigger }: ChannelManagerDialogProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState('')
  const [editingChannel, setEditingChannel] = useState<
    DropdownData<'campaign_channels'>[number] | null
  >(null)
  const [localSelectedChannels, setLocalSelectedChannels] = useState<string[]>(value)

  const mainDialogRef = useRef<CustomDialogRef>(null)
  const createDialogRef = useRef<CustomDialogRef>(null)
  const editDialogRef = useRef<CustomDialogRef>(null)

  const { data: channelsData, isLoading } = useGetCampaignChannelDropdown(org_id)
  const { mutateAsync: createChannel, isPending: isCreating } = useCreateCampaignChannel(org_id)
  const { mutateAsync: updateChannel, isPending: isUpdating } = useUpdateCampaignChannel(
    org_id,
    editingChannel?.id || null
  )
  const { confirm } = useConfirmDialog()

  const filteredChannels = useMemo(() => {
    if (!channelsData) return []

    const filtered = searchValue.trim()
      ? channelsData.filter((ch) => ch.name.toLowerCase().includes(searchValue.toLowerCase()))
      : channelsData

    // Sort by ID to maintain consistent order
    return filtered.sort((a, b) => a.id.localeCompare(b.id))
  }, [channelsData, searchValue])

  const handleToggleChannel = (channelId: string) => {
    if (localSelectedChannels.includes(channelId)) {
      setLocalSelectedChannels(localSelectedChannels.filter((id) => id !== channelId))
    } else {
      setLocalSelectedChannels([...localSelectedChannels, channelId])
    }
  }

  const handleSelectAll = () => {
    if (localSelectedChannels.length === channelsData?.length) {
      setLocalSelectedChannels([])
    } else {
      setLocalSelectedChannels(channelsData?.map((ch) => ch.id) || [])
    }
  }

  const handleSave = () => {
    onChange(localSelectedChannels)
    mainDialogRef.current?.close()
  }

  const handleCancel = () => {
    setLocalSelectedChannels(value)
    mainDialogRef.current?.close()
  }

  const handleOpen = () => {
    setLocalSelectedChannels(value)
  }

  const handleCreateChannel = async (values: z.infer<typeof channelSchema>) => {
    try {
      const response = await createChannel(values)
      const newChannelId = response.data?.data?.id
      if (newChannelId) {
        setLocalSelectedChannels([...localSelectedChannels, newChannelId])
      }
      createDialogRef.current?.close()
    } catch (error) {
      console.error('Failed to create channel:', error)
    }
  }

  const handleUpdateChannel = async (values: z.infer<typeof channelSchema>) => {
    try {
      await updateChannel(values)
      editDialogRef.current?.close()
      setEditingChannel(null)
    } catch (error) {
      console.error('Failed to update channel:', error)
    }
  }

  const handleDeleteChannel = async (channel: DropdownData<'campaign_channels'>[number]) => {
    const confirmed = await confirm({
      title: 'Delete channel',
      description: `Are you sure you want to delete "${channel.name}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
    })

    if (confirmed && channel.id) {
      try {
        await axiosApiInstance.delete(`/organizations/${org_id}/campaign-channels/${channel.id}`)
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: ['campaign-channels', org_id],
        })
        queryClient.invalidateQueries({
          queryKey: ['campaign-channels-dropdown', org_id],
        })
        // Remove from local selected channels if it was selected
        setLocalSelectedChannels(localSelectedChannels.filter((id) => id !== channel.id))
      } catch (error) {
        console.error('Failed to delete channel:', error)
      }
    }
  }

  const handleStartEdit = (channel: DropdownData<'campaign_channels'>[number]) => {
    setEditingChannel(channel)
    editDialogRef.current?.open()
  }

  return (
    <>
      <CustomDialogV2
        title="Manage Channels"
        description="Select channels for your campaign and manage channel settings"
        size="sm"
        ref={mainDialogRef}
        button={
          trigger || (
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Manage Channels
            </Button>
          )
        }
        onOpenChange={(open) => {
          if (open) {
            handleOpen()
          }
        }}
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search channels..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Create Channel Dialog */}
            <CustomDialogV2
              title="Create Channel"
              button={
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              }
              size="xs"
              ref={createDialogRef}
            >
              <ChannelForm
                isLoading={isCreating}
                buttonText="Create"
                onSubmit={handleCreateChannel}
              />
            </CustomDialogV2>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  localSelectedChannels.length === channelsData?.length && channelsData.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <Typography size="sm" className="font-medium">
                Select All ({localSelectedChannels.length}/{channelsData?.length || 0})
              </Typography>
            </div>
          </div>

          {/* Channel List */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredChannels.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Typography size="sm">No channels found</Typography>
              </div>
            ) : (
              filteredChannels.map((channel) => {
                const isSelected = localSelectedChannels.includes(channel.id)

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors',
                      isSelected && 'bg-slate-50'
                    )}
                    onClick={() => handleToggleChannel(channel.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleChannel(channel.id)}
                      />
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: channel.color }}
                      />
                      <Typography size="sm" className="font-medium">
                        {channel.name}
                      </Typography>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEdit(channel)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChannel(channel)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </CustomDialogV2>
      {/* Edit Channel Dialog */}
      <CustomDialogV2 title="Edit Channel" size="xs" ref={editDialogRef}>
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
