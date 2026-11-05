'use client'

import { Plus, FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'

export const ArtifactEmptyState = () => {
  const { t } = useTranslation('artifact')
  const { orgRouterPush } = useOrganizationStoreProvider()

  return (
    <div className="flex flex-col items-center pt-10 pb-14 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-[16px] bg-slate-50 border border-slate-200 mb-5">
        <FileUp className="w-6 h-6 text-slate-400" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{t('list.empty.title')}</h2>
      <p className="text-s text-slate-500 leading-relaxed max-w-sm mb-6">
        {t('list.empty.description')}
      </p>
      <Button
        iconLeft={<Plus className="h-4 w-4" />}
        onClick={() => orgRouterPush('/artifacts/create')}
      >
        {t('list.empty.cta')}
      </Button>
    </div>
  )
}
