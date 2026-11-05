'use client'

import { notFound, useParams } from 'next/navigation'
import { useShowUtmCampaign } from '../hooks'
import { UtmCampaignUpdateForm } from './forms/update'

export const UtmCampaignDetail = () => {
  const { org_id, campaign_id } = useParams<{ org_id: string; campaign_id: string }>()
  const { data, isLoading, error } = useShowUtmCampaign(org_id, campaign_id)
  if (error) {
    notFound()
  }

  return (
    <div>{data && <UtmCampaignUpdateForm campaignId={campaign_id} initialValues={data} />}</div>
  )
}
