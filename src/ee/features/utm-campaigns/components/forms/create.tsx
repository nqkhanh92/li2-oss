'use client'

import { createUtmCampaignSchema } from '@/shared/schemas/utm-campaigns'
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
import { useCreateUtmCampaign } from '../../hooks/mutations'
import { useParams } from 'next/navigation'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { ChannelSelect } from '../channels/select-channels'
import { AddLinksForm } from './add-links'
import { Button } from '@/shared/components/ui/button'
import { Typography } from '@/shared/components/ui/typography'
import { useMemo } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { useRouter } from 'next/navigation'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'

export const UtmCampaignCreateForm = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()

  const { mutateAsync, isPending } = useCreateUtmCampaign(org_id)

  const form = useForm<z.infer<typeof createUtmCampaignSchema>>({
    resolver: zodResolver(createUtmCampaignSchema),
    defaultValues: {
      name: '',
      custom_utm_enabled: false,
    },
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
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isPending}>
              Create
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
