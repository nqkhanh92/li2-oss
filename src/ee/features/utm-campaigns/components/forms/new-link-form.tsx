import { z } from 'zod'
import { useBulkCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useTransition } from 'react'
import { useParams } from 'next/navigation'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MultipleCommandSelect } from '@/shared/components/customize/multiple-command-select'
import { Input } from '@/shared/components/ui/input'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { v4 as uuid } from 'uuid'

const newLinkFormSchema = z.object({
  channel_ids: z.array(z.string().uuid()).optional(),
  destination: z.string().url(),
})

type NewLinkFormProps = {
  onSubmit: (data: z.infer<typeof utmCampaignTouchPointSchema>[]) => void
  channelOptions: { label: string; value: string }[]
  enableCustomizeUtm: boolean
  specificChannelId?: string | null // If set, auto-assign to this channel and hide selector
}

export const AddNewLinkForm = ({
  onSubmit,
  channelOptions,
  enableCustomizeUtm,
  specificChannelId,
}: NewLinkFormProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const form = useForm<z.infer<typeof newLinkFormSchema>>({
    resolver: zodResolver(newLinkFormSchema),
  })
  // const { mutateAsync } = useBulkCreateTouchPoint(org_id)
  // const [loading, startTransition] = useTransition()

  const handleSubmit = async (data: z.infer<typeof newLinkFormSchema>) => {
    const links: z.infer<typeof utmCampaignTouchPointSchema>[] = []
    
    // If specificChannelId is provided, use it (for adding within channel section)
    if (specificChannelId !== undefined) {
      links.push({
        touchpoint_id: undefined,
        channel_id: specificChannelId || undefined,
        utm_tags: undefined,
        type: 'new',
        destination: data.destination,
        key: uuid(),
      })
    } else if (!enableCustomizeUtm) {
      // Normal mode: create link for each selected channel
      if (data.channel_ids && data.channel_ids.length > 0) {
        for (const channel of data.channel_ids) {
          links.push({
            touchpoint_id: undefined,
            channel_id: channel,
            utm_tags: undefined,
            type: 'new',
            destination: data.destination,
            key: uuid(),
          })
        }
      } else {
        links.push({
          touchpoint_id: undefined,
          channel_id: undefined,
          utm_tags: undefined,
          type: 'new',
          destination: data.destination,
          key: uuid(),
        })
      }
    } else {
      // Customize UTM mode
      links.push({
        touchpoint_id: undefined,
        channel_id: undefined,
        utm_tags: undefined,
        type: 'new',
        destination: data.destination,
        key: uuid(),
      })
    }
    onSubmit(links)
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!enableCustomizeUtm && specificChannelId === undefined && (
          <FormField
            control={form.control}
            name="channel_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channels</FormLabel>
                <FormControl>
                  <MultipleCommandSelect
                    options={channelOptions}
                    placeholder="Select channel"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  For each channel selected, we will create a new link with the same destination
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2 justify-end">
          <LoadingButton
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            // isLoading={loading}
          >
            Add links
          </LoadingButton>
        </div>
      </div>
    </Form>
  )
}
