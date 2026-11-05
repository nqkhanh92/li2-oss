import { useShowIntegration } from '@/features/integrations/hooks/queries'
import { useParams } from 'next/navigation'
import { IntegrationForm } from './form/integration-form'
import { updateIntegrationSchema } from '@/shared/schemas/integrations'
import { z } from 'zod'
import { LoadingMask } from '../../../shared/components/customize/loading-mask'

type Props = {
  close?: () => void
  id?: string
}
export const IntegrationDetail = ({ id, close }: Props) => {
  const { org_id, id: integrationId } = useParams<{
    org_id: string
    id?: string
  }>()
  const { data, isLoading } = useShowIntegration(org_id, id || integrationId)
  const onSubmit = (values: z.infer<typeof updateIntegrationSchema>) => {
    close?.()
  }
  return (
    <LoadingMask className="w-full" loading={isLoading}>
      {data && (
        <IntegrationForm
          key={data?.id}
          type={data?.type}
          readOnly
          initialData={data}
          onSubmit={onSubmit}
          close={close}
        />
      )}
    </LoadingMask>
  )
}
