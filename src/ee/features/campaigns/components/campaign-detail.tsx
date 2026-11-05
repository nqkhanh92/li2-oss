'use client'
import { CampaignForm } from './forms/campaign-form'
import { campaignFormSchema } from '@/shared/schemas/campaigns'
import { z } from 'zod'
import { useUpdateCampaign } from '@/ee/features/campaigns/hooks/mutations'
import { useShowCampaign } from '@/ee/features/campaigns/hooks/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { CustomDialog } from '@/shared/components/customize/custom-dialog'
import { Button } from '@/shared/components/ui/button'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { BuilderWrapper } from '../builder/wrapper'
import { Builder } from '../builder/builder'
import { useCampaignBuilderStore } from '@/shared/stores/campaign-builder-store'
import { useCallback } from 'react'

export const CampaignDetail = () => {
  const { org_id, campaign_id } = useParams<{
    org_id: string
    campaign_id: string
  }>()
  const { mutate: updateCampaign, isPending: isUpdating } = useUpdateCampaign(org_id, campaign_id)
  const nodes = useCampaignBuilderStore((state) => state.nodes)
  const edges = useCampaignBuilderStore((state) => state.edges)
  const handleUpdate = useCallback(
    (values: z.infer<typeof campaignFormSchema>) => {
      updateCampaign({
        ...values,
        nodes,
        edges,
      })
    },
    [updateCampaign, nodes, edges]
  )
  const { data: campaign, isLoading } = useShowCampaign(org_id, campaign_id)
  return (
    <ContentLayout
      title={`Campaign ${campaign?.name}`}
      className="py-0! px-0!"
      extra={
        <CustomDialog
          button={
            <div className="flex justify-end w-full">
              <Button>Save Changes</Button>
            </div>
          }
          noFooter
          title="Update Campaign"
        >
          {({ close }) => {
            return (
              <CampaignForm
                initialData={campaign}
                onSubmit={handleUpdate}
                close={close}
                isPending={isUpdating}
              />
            )
          }}
        </CustomDialog>
      }
    >
      <div style={{ height: '100%' }}>
        {campaign && (
          <BuilderWrapper
            initialData={{
              nodes: campaign?.nodes || [],
              edges: campaign?.edges || [],
            }}
          >
            <Builder />
          </BuilderWrapper>
        )}
      </div>
    </ContentLayout>
  )
}
