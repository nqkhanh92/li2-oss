import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Typography } from '@/shared/components/ui/typography'
import { useState, useRef, Suspense } from 'react'
import { ChannelSection as ChannelSectionType } from './use-channel-sections'
import { AddLinksPopover } from './add-links-popover'
import { LinkItemV2 } from './link-item-v2'
import { z } from 'zod'
import { utmCampaignTouchPointSchema } from '@/shared/schemas/utm-campaigns'
import { useGetTouchPointsWithCampaign } from '@/features/touch-points/hooks/queries'
import { useParams } from 'next/navigation'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { TouchPointUtmDataFormV2 } from '@/features/touch-points/components/forms/create-new/touch-point-utm-data-form-v2'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/components/ui/button'

type ChannelSectionProps = {
  section: ChannelSectionType
  channelOptions: { label: string; value: string; color: string }[]
  enableCustomizeUtm: boolean
  disabledTouchpointIds: string[]
  onAddLinks: (links: z.infer<typeof utmCampaignTouchPointSchema>[]) => void
  onRemoveLink: (key: string) => void
  onUpdateLink: (key: string, data: Partial<z.infer<typeof utmCampaignTouchPointSchema>>) => void
  onRemoveChannel?: (channelId: string) => void // For removing channel from campaign (normal mode)
  campaignName?: string
}

export const ChannelSection = ({
  section,
  channelOptions,
  enableCustomizeUtm,
  disabledTouchpointIds,
  onAddLinks,
  onRemoveLink,
  onUpdateLink,
  onRemoveChannel,
  campaignName,
}: ChannelSectionProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const utmDialogRef = useRef<CustomDialogRef>(null)

  const { data: touchPointData } = useGetTouchPointsWithCampaign(org_id)

  const handleEditUTM = (key: string) => {
    setEditingKey(key)
    utmDialogRef.current?.open()
  }

  const editingField = section.touchpoints.find((tp) => tp.key === editingKey)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
      {/* Channel Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div className="flex items-center gap-2">
            {section.channelColor && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: section.channelColor }}
              />
            )}
            <Typography className="font-semibold text-base">{section.channelName}</Typography>
            <Badge size="xs" className={cn(section.isNonChannel && 'bg-amber-100 text-amber-700')}>
              {section.touchpoints.length} {section.touchpoints.length === 1 ? 'link' : 'links'}
            </Badge>
          </div>

          {/* Delete Channel Button (Normal Mode, non-unassigned channels only) */}
          {!enableCustomizeUtm && !section.isNonChannel && section.channelId && onRemoveChannel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
              onClick={() => onRemoveChannel(section.channelId!)}
              type="button"
              title="Remove channel from campaign"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <AddLinksPopover
          channelId={section.channelId}
          channelName={section.channelName}
          channelOptions={channelOptions}
          enableCustomizeUtm={enableCustomizeUtm}
          disabledTouchpointIds={disabledTouchpointIds}
          onAddLinks={onAddLinks}
        />
      </div>

      {/* Touchpoints List */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          {section.touchpoints.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Typography size="sm">No links in this channel yet</Typography>
            </div>
          ) : (
            section.touchpoints.map((field) => (
              <LinkItemV2
                key={field.key}
                field={field}
                enableCustomizeUTM={enableCustomizeUtm}
                onRemove={() => onRemoveLink(field.key)}
                onEditUTM={enableCustomizeUtm ? () => handleEditUTM(field.key) : undefined}
                allTouchpoints={touchPointData}
                campaignName={campaignName}
                channelName={section.channelName}
              />
            ))
          )}
        </div>
      )}

      {/* UTM Dialog */}
      <CustomDialogV2
        ref={utmDialogRef}
        title="Edit UTM Parameters"
        description="Configure UTM parameters for this touchpoint"
        size="sm"
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            {editingField && (
              <TouchPointUtmDataFormV2
                key={`edit-utm-${editingKey}`}
                org_id={org_id}
                destination={''}
                close={() => setOpen(false)}
                onSubmit={(values) => {
                  if (editingKey) {
                    onUpdateLink(editingKey, {
                      utm_tags: values,
                    })
                  }
                  setOpen(false)
                  setEditingKey(null)
                }}
                defaultValues={editingField.utm_tags ?? undefined}
              />
            )}
          </Suspense>
        )}
      </CustomDialogV2>
    </div>
  )
}
