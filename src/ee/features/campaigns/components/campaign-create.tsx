'use client'
import { useCampaignBuilderStore } from '@/shared/stores/campaign-builder-store'
import { CustomDialog } from '@/shared/components/customize/custom-dialog'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { CampaignForm } from './forms/campaign-form'
import { campaignFormSchema } from '@/shared/schemas/campaigns'
import { z } from 'zod'
import { useCreateCampaign } from '@/ee/features/campaigns/hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import { BuilderWrapper } from '../builder/wrapper'
import { Builder } from '../builder/builder'

export const CampaignCreate = () => {
  const { org_id } = useParams()
  const nodes = useCampaignBuilderStore((state) => state.nodes)
  const edges = useCampaignBuilderStore((state) => state.edges)
  const { mutate: createCampaign, isPending } = useCreateCampaign(org_id as string)
  const router = useRouter()
  const onSubmit = (values: z.infer<typeof campaignFormSchema>) => {
    createCampaign(
      {
        ...values,
        nodes,
        edges,
      },
      {
        onSuccess: ({ data }) => {
          router.push(`/org/${org_id}/campaigns/${data.id}`)
        },
      }
    )
  }
  return (
    <ContentLayout
      title="Campaign create"
      className="py-0! px-0!"
      extra={
        <CustomDialog
          button={
            <div className="flex justify-end w-full">
              <Button>Save Campaign</Button>
            </div>
          }
          noFooter
          title="Create Campaign"
        >
          {({ close }) => {
            return <CampaignForm onSubmit={onSubmit} close={close} isPending={isPending} />
          }}
        </CustomDialog>
      }
    >
      <div className="h-[calc(100dvh-52px-60px)]">
        <BuilderWrapper>
          <Builder />
        </BuilderWrapper>
      </div>
    </ContentLayout>
  )
}
