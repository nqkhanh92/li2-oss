'use client'

import { useParams, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

export const ArtifactHeaderActions = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation('artifact')

  return (
    <Button
      variant="secondary"
      iconLeft={<Plus className="w-5 h-5" />}
      onClick={() => router.push(`/org/${org_id}/artifacts/create`)}
    >
      {t('list.create_cta')}
    </Button>
  )
}
