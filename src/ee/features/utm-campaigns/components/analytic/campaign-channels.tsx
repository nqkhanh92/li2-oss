import { useTranslation } from 'react-i18next'
import { Hash } from 'lucide-react'
import { useGetCampaignChannelDropdown } from '../../hooks'

type Props = {
  data: Array<{
    id: string | null
    totalVisits: number
    totalUniqueVisits: number
  }>
  orgId: string
}

export const CampaignChannels = ({ data, orgId }: Props) => {
  const { t } = useTranslation(['analytic', 'dashboard'])
  const { data: channelDropdown } = useGetCampaignChannelDropdown(orgId)

  // Get channel name from dropdown
  const getChannelName = (channelId: string | null) => {
    if (!channelId) return 'Unknown Channel'
    const channel = channelDropdown?.find((ch) => ch.id === channelId)
    return channel?.name || channelId
  }

  const totalVisits = data.reduce((sum, channel) => sum + channel.totalVisits, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <p className="font-medium text-lg text-foreground">
          {t('dashboard:interaction_channels.label', 'Interaction channels')}
        </p>
      </div>
      <div className="flex flex-col md:flex-row lg:flex-nowrap flex-wrap gap-4 items-start md:items-center w-full">
        {data.map((channel, index) => (
          <div
            key={channel.id || `channel-${index}`}
            className="flex flex-1 gap-4 h-[60px] items-center pr-4"
          >
            <div className="bg-slate-50 flex gap-1 items-center justify-center rounded-lg shrink-0 size-[60px]">
              <Hash className="size-[32px] text-blue-500 stroke-[1.5]" />
            </div>
            <div className="flex flex-1 flex-col gap-2 min-w-0">
              <p className="font-normal text-base leading-6 text-slate-500">
                {getChannelName(channel.id)}
              </p>
              <div className="flex gap-1 items-end w-full">
                <p className="font-medium text-2xl leading-none text-slate-700">
                  {channel.totalVisits.toLocaleString()}
                </p>
                <p className="font-normal text-sm leading-5 text-slate-500">
                  ({((channel.totalVisits / totalVisits) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
