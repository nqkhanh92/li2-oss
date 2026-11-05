import { FacebookIcon } from '@/shared/components/icons/facebook-icon'
import { TiktokIcon } from '@/shared/components/icons/tiktok-icon'
import { ZaloIcon } from '@/shared/components/icons/zalo-icon'
import { LinkIcon } from 'lucide-react'
import { z } from 'zod'
import type { Node, Edge } from '@xyflow/react'

export enum CampaignContentType {
  URL = 'URL',
  Zalo = 'ZALO_OA',
  Facebook = 'FACEBOOK',
  Tiktok = 'TIKTOK',
}

export const campaignContentTypes = {
  [CampaignContentType.URL]: { Icon: LinkIcon, label: 'URL' },
  [CampaignContentType.Zalo]: { Icon: ZaloIcon, label: 'Zalo OA' },
  [CampaignContentType.Facebook]: { Icon: FacebookIcon, label: 'Facebook' },
  [CampaignContentType.Tiktok]: { Icon: TiktokIcon, label: 'Tiktok' },
}
export const validateContent = (content_type: CampaignContentType, content_value: string) => {
  let isValid
  switch (content_type) {
    case CampaignContentType.URL:
      isValid = z.string().url().safeParse(content_value).success
      break
    case CampaignContentType.Zalo:
      isValid = /^https:\/\/(www\.)?zalo\.me\/[a-zA-Z0-9_-]{3,32}$/.test(content_value)
      break
    case CampaignContentType.Facebook:
      isValid = /^https:\/\/(www\.)?facebook\.com(\/?.*)?$/.test(content_value)
      break
    case CampaignContentType.Tiktok:
      isValid = /^https:\/\/www\.tiktok\.com(\/?.*)?$/.test(content_value)
      break
  }
  return isValid
}
export const campaignFormSchema = z.object({
  name: z.string().min(2).max(64),
  enabled: z.boolean().default(true),
  desc: z.string().optional(),
  nodes: z.any(),
  edges: z.any(),
})
