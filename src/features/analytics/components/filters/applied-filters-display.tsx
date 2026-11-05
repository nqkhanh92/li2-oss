'use client'

import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

interface Tag {
  id: string
  name: string
  color: string
}

interface TouchPoint {
  id: string
  name: string
}

interface Space {
  id: string
  name: string
  color?: string | null
}

interface AppliedFiltersDisplayProps {
  tags: Tag[]
  selectedTagIds: string[]
  touchPoints: TouchPoint[]
  selectedTpIds: string[]
  spaces?: Space[]
  selectedSpaceIds?: string[]
  onRemoveTag: (id: string) => void
  onRemoveTouchPoint: (id: string) => void
  onRemoveSpace?: (id: string) => void
  selectedUtmSources?: string[]
  selectedUtmMediums?: string[]
  selectedUtmCampaigns?: string[]
  onRemoveUtmSource?: (value: string) => void
  onRemoveUtmMedium?: (value: string) => void
  onRemoveUtmCampaign?: (value: string) => void
  selectedInteractionTypes?: string[]
  onRemoveInteractionType?: (value: string) => void
  selectedChannels?: string[]
  onRemoveChannel?: (value: string) => void
}

export const AppliedFiltersDisplay: React.FC<AppliedFiltersDisplayProps> = ({
  tags,
  selectedTagIds,
  touchPoints,
  selectedTpIds,
  spaces = [],
  selectedSpaceIds = [],
  onRemoveTag,
  onRemoveTouchPoint,
  onRemoveSpace,
  selectedUtmSources = [],
  selectedUtmMediums = [],
  selectedUtmCampaigns = [],
  onRemoveUtmSource,
  onRemoveUtmMedium,
  onRemoveUtmCampaign,
  selectedInteractionTypes = [],
  onRemoveInteractionType,
  selectedChannels = [],
  onRemoveChannel,
}) => {
  const { t } = useTranslation(['analytic'])

  // Check if there are any active filters
  const hasFilters =
    selectedTagIds.length > 0 ||
    selectedTpIds.length > 0 ||
    selectedSpaceIds.length > 0 ||
    selectedUtmSources.length > 0 ||
    selectedUtmMediums.length > 0 ||
    selectedUtmCampaigns.length > 0 ||
    selectedInteractionTypes.length > 0 ||
    selectedChannels.length > 0

  if (!hasFilters) return null

  // Get selected items
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id))
  const selectedTouchPoints = touchPoints.filter((tp) => selectedTpIds.includes(tp.id))
  const selectedSpaces = spaces.filter((space) => selectedSpaceIds.includes(space.id))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">{t('analytic:filter.active_filters')}</span>

      {/* Tag filters */}
      {selectedTags.map((tag) => (
        <Badge key={tag.id} variant="outline" className="gap-1.5">
          <div className="flex items-center gap-1.5">
            {/* Color indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span className="text-xs">
              {t('analytic:filter.tag')}: {tag.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveTag(tag.id)}
            aria-label={`Remove ${tag.name} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Touch Point (Link) filters */}
      {selectedTouchPoints.map((tp) => (
        <Badge key={tp.id} variant="outline" className="gap-1.5">
          <span className="text-xs">
            {t('analytic:filter.link')}: {tp.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveTouchPoint(tp.id)}
            aria-label={`Remove ${tp.name} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Space filters */}
      {selectedSpaces.map((space) => (
        <Badge key={space.id} variant="outline" className="gap-1.5">
          <div className="flex items-center gap-1.5">
            {/* Color indicator if available */}
            {space.color && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: space.color }}
              />
            )}
            <span className="text-xs">
              {t('analytic:filter.space')}: {space.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveSpace?.(space.id)}
            aria-label={`Remove ${space.name} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* UTM Source filters */}
      {selectedUtmSources.map((value) => (
        <Badge key={`utm_source_${value}`} variant="outline" className="gap-1.5">
          <span className="text-xs">
            {t('analytic:filter.utm_source')}: {value}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveUtmSource?.(value)}
            aria-label={`Remove ${value} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* UTM Medium filters */}
      {selectedUtmMediums.map((value) => (
        <Badge key={`utm_medium_${value}`} variant="outline" className="gap-1.5">
          <span className="text-xs">
            {t('analytic:filter.utm_medium')}: {value}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveUtmMedium?.(value)}
            aria-label={`Remove ${value} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* UTM Campaign filters */}
      {selectedUtmCampaigns.map((value) => (
        <Badge key={`utm_campaign_${value}`} variant="outline" className="gap-1.5">
          <span className="text-xs">
            {t('analytic:filter.utm_campaign')}: {value}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveUtmCampaign?.(value)}
            aria-label={`Remove ${value} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Channel filters */}
      {selectedChannels.map((value) => (
        <Badge key={`channel_${value}`} variant="outline" className="gap-1.5">
          <span className="text-xs">
            {t('analytic:filter.channel', 'Channel')}: {value}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveChannel?.(value)}
            aria-label={`Remove ${value} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Interaction Type filters */}
      {selectedInteractionTypes.map((value) => {
        const interactionTypeLabels: Record<string, string> = {
          LINK: t('dashboard:interaction_channels.short_link', 'Short Link'),
          QR: t('dashboard:interaction_channels.scan', 'QR Scan'),
          NFC: t('dashboard:interaction_channels.tap', 'NFC Tap'),
        }
        return (
          <Badge key={`interaction_type_${value}`} variant="outline" className="gap-1.5">
            <span className="text-xs">
              {t('analytic:filter.interaction_type', 'Interaction Type')}:{' '}
              {interactionTypeLabels[value] || value}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-3 w-3 p-0 hover:bg-transparent"
              onClick={() => onRemoveInteractionType?.(value)}
              aria-label={`Remove ${value} filter`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )
      })}
    </div>
  )
}
