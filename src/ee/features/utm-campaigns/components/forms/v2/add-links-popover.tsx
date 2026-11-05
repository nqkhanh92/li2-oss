import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { LinkIcon, PlusIcon } from 'lucide-react'
import { useState, useRef, Suspense } from 'react'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { SelectTouchPoints } from '@/features/touch-points/components/select-touchpoints'
import { AddNewLinkForm } from '../new-link-form'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { AddLinksWithUtmPopover } from './add-links-with-utm-popover'

type AddLinksPopoverProps = {
  channelId?: string | null
  channelName?: string
  channelOptions: { label: string; value: string; color: string }[]
  enableCustomizeUtm: boolean
  disabledTouchpointIds: string[]
  onAddLinks: (links: z.infer<typeof utmCampaignTouchPointSchema>[]) => void
}

export const AddLinksPopover = ({
  channelId,
  channelName,
  channelOptions,
  enableCustomizeUtm,
  disabledTouchpointIds,
  onAddLinks,
}: AddLinksPopoverProps) => {
  const [open, setOpen] = useState(false)
  const newLinkDialogRef = useRef<CustomDialogRef>(null)

  // If custom UTM is enabled, use the specialized component
  if (enableCustomizeUtm) {
    return (
      <AddLinksWithUtmPopover
        disabledTouchpointIds={disabledTouchpointIds}
        onAddLinks={onAddLinks}
        defaultUtmSource={channelName}
      />
    )
  }

  // Normal mode - original behavior
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Links
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="flex flex-col gap-1">
            <SelectTouchPoints
              button={
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start gap-2 hover:bg-slate-100"
                >
                  <LinkIcon className="h-4 w-4" />
                  Add existing links
                </Button>
              }
              disabledIds={disabledTouchpointIds}
              value={[]}
              onChange={async (value, selectedRows) => {
                if (!selectedRows) return

                const links: z.infer<typeof utmCampaignTouchPointSchema>[] = []
                for (const touchpoint of selectedRows) {
                  links.push({
                    touchpoint_id: touchpoint.id,
                    channel_id: channelId || undefined,
                    utm_tags: touchpoint.utm_tags as z.infer<
                      typeof utmCampaignTouchPointSchema
                    >['utm_tags'],
                    type: 'existing',
                    key: crypto.randomUUID(),
                  })
                }
                onAddLinks(links)
                setOpen(false)
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-slate-100"
              onClick={() => {
                newLinkDialogRef.current?.open()
                setOpen(false)
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add new link
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CustomDialogV2 title="Add new link" size="xs" ref={newLinkDialogRef}>
        <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
          <AddNewLinkForm
            enableCustomizeUtm={enableCustomizeUtm}
            channelOptions={channelOptions}
            specificChannelId={channelId}
            onSubmit={(data) => {
              onAddLinks(data)
              newLinkDialogRef.current?.close()
            }}
          />
        </Suspense>
      </CustomDialogV2>
    </>
  )
}
