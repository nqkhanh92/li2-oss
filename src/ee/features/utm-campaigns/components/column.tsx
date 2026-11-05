'use client'

import { UTMCampaign } from '@/core/types/utm-campaign.type'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/shared/components/ui/badge'
import { format } from 'date-fns'

export const utm_columns: ColumnDef<UTMCampaign>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'utm_campaign_channels',
    header: 'Channels',
    cell: ({ row }) => {
      const channels = row.original.utm_campaign_channels || []
      if (channels.length === 0) {
        return <span className="text-muted-foreground text-sm">No channels</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {channels.map((channel) => (
            <Badge
              key={channel.channel_id}
              color={channel.campaign_channels.color}
              size="xs"
              variant="secondary"
            >
              {channel.campaign_channels.name}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'utm_campaign_touchpoints',
    header: 'Touchpoints',
    cell: ({ row }) => {
      const touchpoints = row.original.utm_campaign_touchpoints || []
      return <span className="text-sm">{touchpoints.length}</span>
    },
  },
  {
    accessorKey: 'profiles',
    header: 'Created By',
    cell: ({ row }) => {
      const profile = row.original.profiles
      if (!profile) {
        return <span className="text-muted-foreground text-sm">Unknown</span>
      }
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{profile.name}</span>
          <span className="text-xs text-muted-foreground">{profile.email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'start_date',
    header: 'Start Date',
    cell: ({ row }) => {
      const date = row.original.start_date
      if (!date) return <span className="text-muted-foreground text-sm">-</span>
      return <span className="text-sm">{format(new Date(date), 'MMM dd, yyyy')}</span>
    },
  },
  {
    accessorKey: 'end_date',
    header: 'End Date',
    cell: ({ row }) => {
      const date = row.original.end_date
      if (!date) return <span className="text-muted-foreground text-sm">-</span>
      return <span className="text-sm">{format(new Date(date), 'MMM dd, yyyy')}</span>
    },
  },
]
