'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Trash, MoreHorizontal } from 'lucide-react'
import { useGetEventRule } from '../hooks/queries'
import { useUpdateEventRule, useDeleteEventRule } from '../hooks/mutations'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { EventRuleForm } from './event-rule-form'
import type { CreateEventRuleInput } from '@/shared/schemas/event-rules'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

const FORM_ID = 'eventRuleEditForm'

const EventRuleEditSkeleton = () => (
  <div className="flex flex-col gap-6 md:flex-row md:items-start">
    <Card className="flex-1 min-w-0 pt-6 rounded-[8px]">
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <hr className="border-slate-200" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
    <Card className="w-full md:w-[252px] md:shrink-0 pt-6 rounded-[8px]">
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-[120px] w-full" />
      </CardContent>
    </Card>
  </div>
)

export const EventRuleEdit = () => {
  const { org_id, rule_id } = useParams<{ org_id: string; rule_id: string }>()
  const { t } = useTranslation('event-rules')
  const router = useRouter()
  const { data, isLoading } = useGetEventRule(org_id, rule_id)
  const { mutate: updateRule, isPending } = useUpdateEventRule(org_id, rule_id)
  const { mutateAsync: deleteRule } = useDeleteEventRule(org_id)
  const { confirm } = useConfirmDialog()

  const handleCancel = () => router.push(`/org/${org_id}/event-rules`)

  const handleSubmit = (values: CreateEventRuleInput) => {
    updateRule(values, {
      onSuccess: () => router.push(`/org/${org_id}/event-rules`),
    })
  }

  const handleDelete = () => {
    const rule = data?.data
    confirm({
      title: t('list.deleteTitle'),
      description: t('list.deleteDesc', { name: rule?.name ?? 'this rule' }),
      confirmButtonText: t('list.delete'),
      cancelButtonText: t('list.cancel'),
      onConfirm: async () => {
        await deleteRule(rule_id)
        router.push(`/org/${org_id}/event-rules`)
      },
    })
  }

  const rule = data?.data
  const initialData: Partial<CreateEventRuleInput> = rule
    ? { name: rule.name, ...(rule as any) }
    : {}

  return (
    <ContentLayout
      title={t('edit.title')}
      backPath={`/org/${org_id}/event-rules`}
      extra={
        !isLoading && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="flex justify-between">
                {t('list.delete')} <Trash className="w-4 h-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      footer={
        !isLoading && (
          <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
            <div className="flex gap-4 justify-center">
              <Button type="button" variant="tertiary" onClick={handleCancel}>
                {t('form.cancel')}
              </Button>
              <LoadingButton type="submit" isLoading={isPending} form={FORM_ID}>
                {t('edit.updateRule')}
              </LoadingButton>
            </div>
          </div>
        )
      }
    >
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <EventRuleEditSkeleton />
        ) : rule ? (
          <EventRuleForm
            onSubmit={handleSubmit}
            isPending={isPending}
            initialData={initialData}
            onCancel={handleCancel}
            submitLabel={t('edit.updateRule')}
            formId={FORM_ID}
          />
        ) : null}
      </div>
    </ContentLayout>
  )
}
