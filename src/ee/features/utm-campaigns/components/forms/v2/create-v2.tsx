'use client'

import { createUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
import { useForm, useWatch, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useCreateUtmCampaign } from '../../../hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { Typography } from '@/shared/components/ui/typography'
import { useMemo } from 'react'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'
import { ChannelManagerDialog } from './channel-manager-dialog'
import { useGetCampaignChannelDropdown } from '../../../hooks'
import { useChannelSections } from './use-channel-sections'
import { ChannelSection } from './channel-section'
import { BulkAddLinksButton } from './bulk-add-links-button'
import { AddLinksPopover } from './add-links-popover'
import { AddLinksWithUtmPopover } from './add-links-with-utm-popover'
import { Settings2 } from 'lucide-react'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { useEffect, useRef } from 'react'

export const UtmCampaignCreateFormV2 = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()

  // Track previous mode to detect changes
  const prevModeRef = useRef<boolean | undefined>(undefined)

  const { mutateAsync, isPending } = useCreateUtmCampaign(org_id)

  const form = useForm<z.infer<typeof createUtmCampaignSchema>>({
    resolver: zodResolver(createUtmCampaignSchema),
    defaultValues: {
      name: '',
      custom_utm_enabled: false,
      channels: [],
      touchpoints: [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'touchpoints',
  })

  const onSubmit = async (data: z.infer<typeof createUtmCampaignSchema>) => {
    const res = await mutateAsync(data)
    if (res) {
      router.push(`/org/${org_id}/campaigns`)
    }
  }

  const enableCustomUtm = useWatch({
    control: form.control,
    name: 'custom_utm_enabled',
  })

  // Clear touchpoints when switching modes
  useEffect(() => {
    if (prevModeRef.current !== undefined && prevModeRef.current !== enableCustomUtm) {
      // Mode changed, clear touchpoints
      form.setValue('touchpoints', [])
    }
    prevModeRef.current = enableCustomUtm
  }, [enableCustomUtm, form])

  const watchChannels = useWatch({
    control: form.control,
    name: 'channels',
  })

  const watchTouchpoints = useWatch({
    control: form.control,
    name: 'touchpoints',
  })

  const watchStartDate = useWatch({
    control: form.control,
    name: 'start_date',
  })

  const watchCampaignName = useWatch({
    control: form.control,
    name: 'name',
  })

  const { data: channelData } = useGetCampaignChannelDropdown(org_id)

  const selectedChannelsList = useMemo(() => {
    return (
      channelData
        ?.filter((item) => watchChannels?.includes(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
        })) || []
    )
  }, [channelData, watchChannels])

  const channelOptions = useMemo(() => {
    return (
      channelData?.map((item) => ({
        value: item.id,
        label: item.name,
        color: item.color,
      })) || []
    )
  }, [channelData])

  const sections = useChannelSections({
    touchpoints: watchTouchpoints || [],
    selectedChannels: selectedChannelsList,
    enableCustomizeUTM: enableCustomUtm,
  })

  const disabledTpIds: string[] = useMemo(() => {
    return watchTouchpoints?.map((tp) => tp.touchpoint_id).filter(Boolean) || []
  }, [watchTouchpoints]) as string[]

  const handleAddLinks = (links: z.infer<typeof utmCampaignTouchPointSchema>[]) => {
    for (const link of links) {
      append(link)
    }
  }

  const handleRemoveLink = (key: string) => {
    const index = fields.findIndex((field) => field.key === key)
    if (index !== -1) {
      remove(index)
    }
  }

  const handleUpdateLink = (
    key: string,
    data: Partial<z.infer<typeof utmCampaignTouchPointSchema>>
  ) => {
    const index = fields.findIndex((field) => field.key === key)
    if (index !== -1) {
      update(index, { ...fields[index], ...data })
    }
  }

  const handleRemoveChannel = (channelId: string) => {
    // Remove all touchpoints associated with this channel
    const touchpointsToKeep = fields.filter((field) => field.channel_id !== channelId)
    form.setValue('touchpoints', touchpointsToKeep)

    // Remove channel from selected channels
    const updatedChannels = watchChannels?.filter((id) => id !== channelId) || []
    form.setValue('channels', updatedChannels)
  }

  return (
    <div className="bg-background rounded-lg p-6 max-w-[900px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            {/* Campaign Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter campaign name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DateTimePicker {...field} value={field.value ?? undefined} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        disabled={watchStartDate ? { before: new Date(watchStartDate) } : undefined}
                        {...field}
                        value={field.value ?? undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom UTM Toggle */}
            <FormField
              control={form.control}
              name="custom_utm_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">Use Custom UTM</FormLabel>
                    <Typography size="xs" className="text-slate-500">
                      Enable this to set custom UTM parameters for each link individually
                    </Typography>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Channel Management */}
            {!enableCustomUtm && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Typography className="font-medium">Channels</Typography>
                  <FormField
                    control={form.control}
                    name="channels"
                    render={({ field }) => (
                      <ChannelManagerDialog
                        value={field.value || []}
                        onChange={field.onChange}
                        trigger={
                          <Button variant="outline" className="gap-2" type="button">
                            <Settings2 className="h-4 w-4" />
                            Add Channels
                          </Button>
                        }
                      />
                    )}
                  />
                </div>
                {selectedChannelsList.length === 0 && (
                  <div className="text-center py-4 border border-dashed border-slate-300 rounded-lg">
                    <Typography size="sm" className="text-slate-500">
                      No channels selected. Click "Manage Channels" to add channels.
                    </Typography>
                  </div>
                )}
              </div>
            )}

            {/* Channel Sections */}
            {(enableCustomUtm || (selectedChannelsList.length > 0 && !enableCustomUtm)) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {/* Bulk Add Links Button (Normal Mode Only) */}
                  {!enableCustomUtm && selectedChannelsList.length > 0 && (
                    <BulkAddLinksButton
                      channelOptions={channelOptions}
                      selectedChannelIds={watchChannels || []}
                      onAddLinks={handleAddLinks}
                    />
                  )}

                  {/* Add Links Button (Customize UTM Mode) */}
                  {enableCustomUtm && (
                    <AddLinksWithUtmPopover
                      disabledTouchpointIds={disabledTpIds}
                      onAddLinks={handleAddLinks}
                    />
                  )}
                </div>

                {enableCustomUtm && watchTouchpoints && watchTouchpoints.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                    <Typography size="sm" className="text-slate-500">
                      Add links and configure their UTM parameters to organize them into channels
                    </Typography>
                  </div>
                )}

                {sections.map((section) => (
                  <ChannelSection
                    key={section.channelId || 'non-channel'}
                    section={section}
                    channelOptions={channelOptions}
                    enableCustomizeUtm={enableCustomUtm}
                    disabledTouchpointIds={disabledTpIds}
                    onAddLinks={handleAddLinks}
                    onRemoveLink={handleRemoveLink}
                    onUpdateLink={handleUpdateLink}
                    onRemoveChannel={!enableCustomUtm ? handleRemoveChannel : undefined}
                    campaignName={watchCampaignName}
                  />
                ))}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/org/${org_id}/campaigns`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
