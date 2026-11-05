'use client'

import { useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useCreateFunnel } from '../hooks/mutations'
import { FunnelForm } from './funnel-form'
import { CreateFunnelInput } from '@/shared/schemas/funnels'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'

const FORM_ID = 'funnelCreateForm'

export const FunnelCreate = () => {
  const { t } = useTranslation('funnels')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutate: createFunnel, isPending } = useCreateFunnel(org_id)

  // Pre-fill from Link Journey deep link
  const step1Type = searchParams.get('step1_type')
  const step1Value = searchParams.get('step1_value')
  const sourceTpId = searchParams.get('source_tp_id')

  const initialData = useMemo<CreateFunnelInput | undefined>(() => {
    if (!step1Type || !step1Value) return undefined
    return {
      name: '',
      description: '',
      steps: [
        {
          name: '',
          pattern_type: step1Type as CreateFunnelInput['steps'][number]['pattern_type'],
          condition: 'equals',
          pattern: step1Value,
          is_required: true,
        },
      ],
    }
  }, [step1Type, step1Value])

  const handleCancel = () => router.push(`/org/${org_id}/funnels`)

  const handleSubmit = (values: CreateFunnelInput) => {
    createFunnel(values, {
      onSuccess: () => {
        router.push(`/org/${org_id}/funnels`)
      },
    })
  }

  return (
    <ContentLayout
      title="Create Funnel"
      backPath={`/org/${org_id}/funnels`}
      footer={
        <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
          <div className="flex gap-4 justify-center">
            <Button type="button" variant="tertiary" onClick={handleCancel}>
              {t('form.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={isPending} form={FORM_ID}>
              {t('form.createFunnel')}
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
        sourceTpId={sourceTpId}
        formId={FORM_ID}
      />
    </ContentLayout>
  )
}
