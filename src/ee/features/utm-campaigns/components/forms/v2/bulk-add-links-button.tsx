import { Button } from '@/shared/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useRef, Suspense } from 'react'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { AddNewLinkForm } from '../new-link-form'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'

type BulkAddLinksButtonProps = {
  channelOptions: { label: string; value: string; color: string }[]
  selectedChannelIds: string[]
  onAddLinks: (links: z.infer<typeof utmCampaignTouchPointSchema>[]) => void
}

export const BulkAddLinksButton = ({
  channelOptions,
  selectedChannelIds,
  onAddLinks,
}: BulkAddLinksButtonProps) => {
  const dialogRef = useRef<CustomDialogRef>(null)

  return (
    <>
      <Button variant="default" className="gap-2" onClick={() => dialogRef.current?.open()}>
        <PlusIcon className="h-4 w-4" />
        Quick add links
      </Button>

      <CustomDialogV2 title="Add link to multiple channels" size="xs" ref={dialogRef}>
        <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
          <AddNewLinkForm
            enableCustomizeUtm={false}
            channelOptions={channelOptions.filter((ch) => selectedChannelIds.includes(ch.value))}
            onSubmit={(data) => {
              onAddLinks(data)
              dialogRef.current?.close()
            }}
          />
        </Suspense>
      </CustomDialogV2>
    </>
  )
}
