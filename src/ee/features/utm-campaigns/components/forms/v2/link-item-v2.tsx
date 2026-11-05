import { Edit2Icon, XIcon } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Typography } from '@/shared/components/ui/typography'
import { cn } from '@/shared/lib/cn'
import { TouchpointField } from './use-channel-sections'
import { useGetTouchPointsWithCampaign } from '@/features/touch-points/hooks/queries'
import { Button } from '@/shared/components/ui/button'

type LinkItemV2Props = {
  field: TouchpointField
  enableCustomizeUTM: boolean
  onRemove: () => void
  onEditUTM?: () => void
  allTouchpoints?: Awaited<ReturnType<typeof useGetTouchPointsWithCampaign>>['data']
  campaignName?: string
  channelName?: string
}

export const LinkItemV2 = ({
  field,
  enableCustomizeUTM,
  onRemove,
  onEditUTM,
  allTouchpoints,
  campaignName,
  channelName,
}: LinkItemV2Props) => {
  const fieldType = field.touchpoint_id ? 'existing' : 'new'
  const touchpoint = allTouchpoints?.find((tp) => tp.id === field.touchpoint_id)

  // Determine UTM values based on mode
  const utmValues = enableCustomizeUTM
    ? {
        campaign: field.utm_tags?.utm_campaign,
        medium: field.utm_tags?.utm_medium,
        term: field.utm_tags?.utm_term,
        content: field.utm_tags?.utm_content,
        source: field.utm_tags?.utm_source,
      }
    : {
        campaign: campaignName,
        source: channelName,
      }

  const hasUtmBadges = enableCustomizeUTM
    ? !!(
        utmValues.source ||
        utmValues.campaign ||
        utmValues.medium ||
        utmValues.term ||
        utmValues.content
      )
    : !!(utmValues.campaign || utmValues.source)

  return (
    <div className="group flex gap-3 bg-white border border-slate-200 px-4 py-3 rounded-lg hover:border-slate-300 transition-colors relative">
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Link info */}
        {fieldType === 'existing' && (
          <div className="flex gap-2 items-center">
            <Typography className="font-medium text-nowrap truncate max-w-[280px]">
              {touchpoint?.name}
            </Typography>
            <Typography size={'xs'} className="italic text-slate-500 text-nowrap truncate">
              ({touchpoint?.content_value})
            </Typography>
          </div>
        )}
        {fieldType === 'new' && (
          <div className="flex gap-2 items-center">
            <Badge size={'xs'} color="#10b981" variant="outline" className="font-medium">
              New Link
            </Badge>
            <Typography size={'xs'} className="text-slate-600 truncate max-w-[280px]">
              {field.destination}
            </Typography>
          </div>
        )}

        {/* UTM Badges */}
        {hasUtmBadges && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {enableCustomizeUTM ? (
              <>
                {utmValues.source && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-200 max-w-[150px]"
                  >
                    <span className="truncate">Source: {utmValues.source}</span>
                  </Badge>
                )}
                {utmValues.campaign && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 max-w-[150px]"
                  >
                    <span className="truncate">Campaign: {utmValues.campaign}</span>
                  </Badge>
                )}
                {utmValues.medium && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 max-w-[150px]"
                  >
                    <span className="truncate">Medium: {utmValues.medium}</span>
                  </Badge>
                )}
                {utmValues.term && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 max-w-[150px]"
                  >
                    <span className="truncate">Term: {utmValues.term}</span>
                  </Badge>
                )}
                {utmValues.content && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 max-w-[150px]"
                  >
                    <span className="truncate">Content: {utmValues.content}</span>
                  </Badge>
                )}
              </>
            ) : (
              <>
                {utmValues.campaign && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 max-w-[150px]"
                  >
                    <span className="truncate">Campaign: {utmValues.campaign}</span>
                  </Badge>
                )}
                {utmValues.source && (
                  <Badge
                    size={'xs'}
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-200 max-w-[150px]"
                  >
                    <span className="truncate">Source: {utmValues.source}</span>
                  </Badge>
                )}
              </>
            )}
          </div>
        )}

        {/* UTM Badge for customize mode - only show if not set */}
        {enableCustomizeUTM && !field.utm_tags?.utm_source && (
          <div className="flex items-center gap-2">
            <Badge
              size={'xs'}
              onClick={onEditUTM}
              className="cursor-pointer flex gap-1.5 items-center bg-red-100 text-red-700 hover:bg-red-200"
            >
              <span className="text-xs">Set UTM</span>
              <span className="text-red-600">*</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Remove button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
        type="button"
      >
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  )
}
