'use client'

import { updateUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
import { useForm, useWatch } from 'react-hook-form'
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
import { useDeleteUtmCampaign, useUpdateUtmCampaign } from '../../hooks/mutations'
import { useShowUtmCampaign } from '../../hooks'
import { useParams } from 'next/navigation'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { ChannelSelect } from '../channels/select-channels'
import { AddLinksForm } from './add-links'
import { Button } from '@/shared/components/ui/button'
import { useEffect, useMemo } from 'react'
import { Typography } from '@/shared/components/ui/typography'
import { Badge } from '@/shared/components/ui/badge'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { v4 as uuid } from 'uuid'

type Props = {
  initialValues: Awaited<ReturnType<typeof useShowUtmCampaign>>['data']
  campaignId: string
  onDelete?: () => void
}

export const UtmCampaignUpdateForm = ({ initialValues, campaignId, onDelete }: Props) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { mutateAsync, isPending } = useUpdateUtmCampaign(org_id, campaignId)

  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useDeleteUtmCampaign(
    org_id,
    campaignId
  )

  const { confirm } = useConfirmDialog()

  const defaultValues: z.infer<typeof updateUtmCampaignSchema> = useMemo(() => {
    const fields: z.infer<typeof updateUtmCampaignSchema> = {
      // ...initialValues,
      name: initialValues?.name || '',
      custom_utm_enabled: initialValues?.custom_utm_enabled ?? false,
      channels: initialValues?.utm_campaign_channels?.map((cc) => cc.channel_id) || [],
      start_date: initialValues?.start_date || undefined,
      end_date: initialValues?.end_date || undefined,
    }
    if (
      initialValues?.utm_campaign_touchpoints &&
      initialValues.utm_campaign_touchpoints.length > 0
    ) {
      fields.touchpoints = initialValues.utm_campaign_touchpoints.map((tp) => {
        return {
          touchpoint_id: tp.touchpoint_id,
          channel_id: tp.channel_id,
          utm_tags: tp.utm_tags ? (tp.utm_tags as any) : undefined,
          key: uuid(),
        }
      })
    }

    return fields
  }, [initialValues])

  const form = useForm<z.infer<typeof updateUtmCampaignSchema>>({
    resolver: zodResolver(updateUtmCampaignSchema),
    defaultValues: defaultValues,
  })

  const onSubmit = (data: z.infer<typeof updateUtmCampaignSchema>) => {
    mutateAsync(data)
  }
  const enableCustomUtm = useWatch({
    control: form.control,
    name: 'custom_utm_enabled',
  })

  const watchCampaignTouchpoints = useWatch({
    control: form.control,
    name: 'touchpoints',
  })
  const campaignCustomizeChannels = useMemo(() => {
    if (!enableCustomUtm) return []
    return watchCampaignTouchpoints?.map((tp) => tp.utm_tags?.utm_source).filter(Boolean) || []
  }, [watchCampaignTouchpoints, enableCustomUtm])

  const watchStartDate = useWatch({
    control: form.control,
    name: 'start_date',
  })
  const handleDelete = async () => {
    const result = await confirm({
      title: 'Delete campaign',
      description: 'Are you sure you want to delete this campaign?',
    })
    if (result) {
      const deleteResult = await deleteCampaign()
      if (deleteResult) {
        onDelete?.()
      }
    }
  }

  return (
    <div className="bg-background rounded-lg p-6 max-w-[720px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên chiến dịch</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
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
                    <FormLabel>End date</FormLabel>
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
            <FormField
              control={form.control}
              name="custom_utm_enabled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use custom utm</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!enableCustomUtm && (
              <FormField
                control={form.control}
                name="channels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channels</FormLabel>
                    <FormControl>
                      <ChannelSelect {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {enableCustomUtm && (
              <Typography>
                * Channels from UTM:
                <span className="flex gap-2">
                  {Array.from(new Set(campaignCustomizeChannels)).map((channel) => (
                    <Badge key={`${channel}-channel`} size={'xs'}>
                      {channel}
                    </Badge>
                  ))}
                </span>
              </Typography>
            )}
            <AddLinksForm />
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <LoadingButton type="submit" disabled={isPending || isDeleting} isLoading={isPending}>
              Update
            </LoadingButton>
            <LoadingButton
              type="button"
              disabled={isPending || isDeleting}
              variant={'destructive'}
              isLoading={isDeleting}
              onClick={() => handleDelete()}
            >
              Delete Campaign
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
