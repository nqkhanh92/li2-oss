import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { LinkIcon, PlusIcon } from 'lucide-react'
import { useState, useRef, Suspense } from 'react'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { SelectTouchPoints } from '@/features/touch-points/components/select-touchpoints'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { TouchPointUtmDataFormV2 } from '@/features/touch-points/components/forms/create-new/touch-point-utm-data-form-v2'
import { useParams } from 'next/navigation'
import { Input } from '@/shared/components/ui/input'
import { FormLabel } from '@/shared/components/ui/form'
import { Skeleton } from '@/shared/components/ui/skeleton'

type AddLinksWithUtmPopoverProps = {
  disabledTouchpointIds: string[]
  onAddLinks: (links: z.infer<typeof utmCampaignTouchPointSchema>[]) => void
  defaultUtmSource?: string
}

export const AddLinksWithUtmPopover = ({
  disabledTouchpointIds,
  onAddLinks,
  defaultUtmSource,
}: AddLinksWithUtmPopoverProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const [open, setOpen] = useState(false)
  const [pendingLinks, setPendingLinks] = useState<
    Array<{
      touchpoint_id?: string
      destination?: string
      existingUtmTags?: z.infer<typeof utmCampaignTouchPointSchema>['utm_tags']
    }>
  >([])
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0)
  const [sharedUtmTemplate, setSharedUtmTemplate] = useState<
    z.infer<typeof utmCampaignTouchPointSchema>['utm_tags'] | null
  >(null)

  const utmDialogRef = useRef<CustomDialogRef>(null)
  const newLinkDialogRef = useRef<CustomDialogRef>(null)
  const templateSelectorRef = useRef<CustomDialogRef>(null)

  const handleExistingLinksSelected = (selectedRows: any[]) => {
    if (!selectedRows || selectedRows.length === 0) return

    // Prepare links with their existing UTM tags
    const links = selectedRows.map((tp) => ({
      touchpoint_id: tp.id,
      existingUtmTags: tp.utm_tags as z.infer<typeof utmCampaignTouchPointSchema>['utm_tags'],
    }))

    setPendingLinks(links)
    setCurrentLinkIndex(0)
    setOpen(false)

    // If only 1 link selected, use its default UTM data directly
    if (links.length === 1) {
      setSharedUtmTemplate(links[0].existingUtmTags || null)
      utmDialogRef.current?.open()
    } else {
      // Multiple links: show template selector first
      templateSelectorRef.current?.open()
    }
  }

  const handleNewLinkSubmit = (destination: string) => {
    setPendingLinks([{ destination }])
    setCurrentLinkIndex(0)
    newLinkDialogRef.current?.close()
    utmDialogRef.current?.open()
  }

  const handleTemplateSelected = (
    utmTags: z.infer<typeof utmCampaignTouchPointSchema>['utm_tags']
  ) => {
    // Store the template to apply to all links
    setSharedUtmTemplate(utmTags)
    templateSelectorRef.current?.close()

    // Apply template to all pending links and add them
    const completedLinks = pendingLinks.map(
      (link) =>
        ({
          touchpoint_id: link.touchpoint_id,
          destination: link.destination,
          channel_id: undefined,
          utm_tags: utmTags,
          type: link.touchpoint_id ? 'existing' : 'new',
          key: crypto.randomUUID(),
        } as z.infer<typeof utmCampaignTouchPointSchema>)
    )

    onAddLinks(completedLinks)

    // Reset state
    setPendingLinks([])
    setCurrentLinkIndex(0)
    setSharedUtmTemplate(null)
  }

  const handleUtmSubmit = (utmTags: z.infer<typeof utmCampaignTouchPointSchema>['utm_tags']) => {
    const currentLink = pendingLinks[currentLinkIndex]
    const completedLink: z.infer<typeof utmCampaignTouchPointSchema> = {
      touchpoint_id: currentLink.touchpoint_id,
      destination: currentLink.destination,
      channel_id: undefined,
      utm_tags: utmTags,
      type: currentLink.touchpoint_id ? 'existing' : 'new',
      key: crypto.randomUUID(),
    }

    // For single link or new link, just add it and close
    onAddLinks([completedLink])
    utmDialogRef.current?.close()
    setPendingLinks([])
    setCurrentLinkIndex(0)
    setSharedUtmTemplate(null)
  }

  const currentLink = pendingLinks[currentLinkIndex]

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
            <Suspense fallback={<Skeleton className="h-8 w-full" />}>
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
                  if (selectedRows) {
                    handleExistingLinksSelected(selectedRows)
                  }
                }}
              />
            </Suspense>
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

      {/* New Link Dialog */}
      <CustomDialogV2 title="Add new link" size="xs" ref={newLinkDialogRef}>
        <NewLinkDestinationForm onSubmit={handleNewLinkSubmit} />
      </CustomDialogV2>

      {/* Template Selection Dialog (for multiple existing links) */}
      <CustomDialogV2
        title="Select UTM Template"
        description={`Choose a template to apply to all ${pendingLinks.length} selected links`}
        size="sm"
        ref={templateSelectorRef}
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            <TouchPointUtmDataFormV2
              key="template-selector"
              org_id={org_id}
              destination=""
              close={() => {
                setOpen(false)
                setPendingLinks([])
                setCurrentLinkIndex(0)
                setSharedUtmTemplate(null)
              }}
              onSubmit={handleTemplateSelected}
              defaultValues={
                defaultUtmSource
                  ? {
                      utm_source: defaultUtmSource,
                      enabled: true,
                      overrideable: false,
                    }
                  : undefined
              }
            />
          </Suspense>
        )}
      </CustomDialogV2>

      {/* UTM Configuration Dialog (for single link or new link) */}
      <CustomDialogV2
        title="Configure UTM Parameters"
        description="Set UTM parameters for this link"
        size="sm"
        ref={utmDialogRef}
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            {currentLink && (
              <TouchPointUtmDataFormV2
                key={`utm-${currentLinkIndex}`}
                org_id={org_id}
                destination={currentLink.destination || ''}
                close={() => {
                  setOpen(false)
                  setPendingLinks([])
                  setCurrentLinkIndex(0)
                  setSharedUtmTemplate(null)
                }}
                onSubmit={handleUtmSubmit}
                defaultValues={
                  sharedUtmTemplate ??
                  currentLink.existingUtmTags ??
                  (defaultUtmSource
                    ? {
                        utm_source: defaultUtmSource,
                        enabled: true,
                        overrideable: false,
                      }
                    : undefined)
                }
              />
            )}
          </Suspense>
        )}
      </CustomDialogV2>
    </>
  )
}

// Simple form to get destination URL for new links
const NewLinkDestinationForm = ({ onSubmit }: { onSubmit: (destination: string) => void }) => {
  const [destination, setDestination] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <FormLabel>Destination URL</FormLabel>
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://example.com"
          type="url"
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (destination) {
              onSubmit(destination)
            }
          }}
          disabled={!destination}
        >
          Next: Configure UTM
        </Button>
      </div>
    </div>
  )
}
