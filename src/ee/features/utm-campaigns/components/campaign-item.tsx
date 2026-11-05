import { UTMCampaign } from '@/core/types/utm-campaign.type'
import { cn } from '@/shared/lib/utils'
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, TagIcon, UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

export const CampaignItem = ({
  campaign,
  isSelected,
  selectedChannelId,
  onCampaignClick,
  onChannelClick,
}: {
  campaign: UTMCampaign
  isSelected: boolean
  selectedChannelId?: string | null
  onCampaignClick: () => void
  onChannelClick: (channelId: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Sync expanded state with selected state
  useEffect(() => {
    if (isSelected) {
      setIsExpanded(true)
    } else {
      setIsExpanded(false)
    }
  }, [isSelected])

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Campaign Parent */}
      <div
        className={cn(
          'p-4 cursor-pointer transition-all hover:bg-primary/5 bg-background',
          isSelected && !selectedChannelId ? 'bg-primary/5 border-l-4 border-l-primary' : ''
        )}
      >
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="mt-1 hover:bg-accent rounded p-1"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>

          <div className="flex-1" onClick={onCampaignClick}>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-base truncate">{campaign.name}</h3>

              {/* Touchpoints count */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TagIcon className="h-4 w-4" />
                <span>{campaign.utm_campaign_channels?.length || 0} channels</span>
                <span>{campaign.utm_campaign_touchpoints?.length || 0} links</span>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                {!campaign.start_date && !campaign.end_date ? (
                  <>Not scheduled</>
                ) : (
                  <>
                    <span>
                      {campaign.start_date
                        ? format(new Date(campaign.start_date), 'MMM dd, yyyy')
                        : 'No start date'}
                    </span>
                    <span>-</span>
                    <span>
                      {campaign.end_date
                        ? format(new Date(campaign.end_date), 'MMM dd, yyyy')
                        : 'No end date'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>{campaign.profiles.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Children */}
      {isExpanded &&
        campaign.utm_campaign_channels &&
        campaign.utm_campaign_channels.length > 0 && (
          <div className="border-t bg-background">
            {campaign.utm_campaign_channels.map((cc) => (
              <div
                key={cc.channel_id}
                onClick={() => onChannelClick(cc.channel_id)}
                className={cn(
                  'px-4 py-3 pl-12 cursor-pointer transition-all hover:bg-accent/50 border-b last:border-b-0',
                  selectedChannelId === cc.channel_id
                    ? 'bg-primary/5 border-l-4 border-l-primary'
                    : ''
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cc.campaign_channels.color }}
                  />
                  <span className="font-medium text-sm">{cc.campaign_channels.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
