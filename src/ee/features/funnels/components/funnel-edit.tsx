'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useGetFunnel } from '../hooks/queries'
import { useUpdateFunnel } from '../hooks/mutations'
import { FunnelForm } from './funnel-form'
import { CreateFunnelInput } from '@/shared/schemas/funnels'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'

const FORM_ID = 'funnelEditForm'

export const FunnelEdit = () => {
  const { t } = useTranslation('funnels')
  const { org_id, funnel_id } = useParams<{ org_id: string; funnel_id: string }>()
  const router = useRouter()
  const { data, isLoading } = useGetFunnel(org_id, funnel_id)
  const { mutate: updateFunnel, isPending } = useUpdateFunnel(org_id, funnel_id)

  const handleCancel = () => router.push(`/org/${org_id}/funnels`)

  const handleSubmit = (values: CreateFunnelInput) => {
    updateFunnel(values, {
      onSuccess: () => {
        router.push(`/org/${org_id}/funnels`)
      },
    })
  }

  if (isLoading) {
    return (
      <ContentLayout title="Edit Funnel" backPath={`/org/${org_id}/funnels`}>
        <div className="space-y-6">
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-24" />
          <Skeleton className="w-full h-48" />
        </div>
      </ContentLayout>
    )
  }

  const funnel = data?.data
  if (!funnel) return null

  const initialData: CreateFunnelInput = {
    name: funnel.name,
    description: funnel.description,
    steps: funnel.funnel_steps
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        name: s.name,
        pattern_type: s.pattern_type as CreateFunnelInput['steps'][number]['pattern_type'],
        condition: s.condition as CreateFunnelInput['steps'][number]['condition'],
        pattern: s.pattern,
        is_required: s.is_required,
        event_name: s.event_name ?? null,
      })),
  }

  return (
    <ContentLayout
      title="Edit Funnel"
      backPath={`/org/${org_id}/funnels`}
      footer={
        <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
          <div className="flex gap-4 justify-center">
            <Button type="button" variant="tertiary" onClick={handleCancel}>
              {t('form.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={isPending} form={FORM_ID}>
              {t('form.updateFunnel')}
            </LoadingButton>
          </div>
        </div>
      }
    >
      <FunnelForm
        onSubmit={handleSubmit}
        isPending={isPending}
        initialData={initialData}
        orgId={org_id}
        formId={FORM_ID}
      />
    </ContentLayout>
  )
}
