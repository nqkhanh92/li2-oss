'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useCreateEventRule } from '../hooks/mutations'
import { EventRuleForm } from './event-rule-form'
import type { CreateEventRuleInput } from '@/shared/schemas/event-rules'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'

const FORM_ID = 'eventRuleCreateForm'

export const EventRuleCreate = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('event-rules')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutate: createRule, isPending } = useCreateEventRule(org_id)

  const initialData: Partial<CreateEventRuleInput> = {
    selector_path: searchParams.get('selector_path') ?? undefined,
    element_text: searchParams.get('element_text') ?? undefined,
    element_id: searchParams.get('element_id') ?? undefined,
    element_href: searchParams.get('element_href') ?? undefined,
    page_path: searchParams.get('page_path') ?? undefined,
  }

  const handleCancel = () => router.push(`/org/${org_id}/event-rules`)

  const handleSubmit = (values: CreateEventRuleInput) => {
    createRule(values, {
      onSuccess: () => {
        router.push(`/org/${org_id}/event-rules`)
      },
    })
  }

  return (
    <ContentLayout
      title={t('create.title')}
      backPath={`/org/${org_id}/event-rules`}
      footer={
        <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
          <div className="flex gap-4 justify-center">
            <Button type="button" variant="tertiary" onClick={handleCancel}>
              {t('form.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={isPending} form={FORM_ID}>
              {t('form.createRule')}
            </LoadingButton>
          </div>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto">
        <EventRuleForm
          onSubmit={handleSubmit}
          isPending={isPending}
          initialData={initialData}
          onCancel={handleCancel}
          formId={FORM_ID}
        />
      </div>
    </ContentLayout>
  )
}
